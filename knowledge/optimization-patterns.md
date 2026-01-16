# Optimization Patterns for Cotalker Routines

This document describes technical optimization patterns applicable to Cotalker bot routines. For domain-specific Cotalker knowledge, see `domain-specific.md`. For decision guidance, see `trade-offs.md`.

## Core Optimization Strategies

### 1. Incremental JSON Patch

**Problem:** Sending complete arrays in HTTP PATCH requests creates large payloads (>6MB) that exceed AWS Lambda limits.

**Solution:** Use incremental JSON Patch operations:
- `op: "add"` with `path: "/-"` to append new items
- `op: "remove"` with index-based paths to delete items
- `op: "replace"` for complete field substitution when semantically appropriate

**Benefits:**
- Reduces payload size by sending only changes
- Follows HTTP PATCH RFC 6902 semantics
- Protects downstream endpoints from overload

**When to use full replacement:** See `trade-offs.md` for scenarios where full state is acceptable.

---

### 2. Loop Linearization (N+1 Query Elimination)

**Problem:** Iteration blocks (FCEach) containing network requests generate O(n) sequential API calls, causing timeouts.

**Pattern:** Replace iteration with batch operations:

```
Before (Anti-pattern):
FCEach → NWRequest per iteration (200+ calls)

After (Optimized):
CCJS (prepare batch query) → Single NWRequest (/multi endpoint) → CCJS (consolidate results)
```

**Benefits:**
- Reduces network calls from O(n) to O(1)
- Decreases latency (1 batch call vs n sequential calls)
- Avoids Lambda timeout issues

**Implementation strategies:**
- Batch processing via `/multi` endpoints
- Consolidated CCJS stages computing all changes in single pass
- Individual operations only when bulk operations lack required atomicity

**Network call reduction example:**
- Before: 200 iterations × 250ms/call = 50 seconds
- After: 1 batch call × 2 seconds = 2 seconds (96% improvement)

---

### 3. Delta Processing

**Problem:** Sending complete datasets when only a subset changed wastes bandwidth and processing time.

**Pattern:** Compute and send only the difference (delta) between current and new state.

**Implementation approaches:**

#### Set-based Deduplication (Simple)
Best for: Arrays of primitive values (IDs, strings, numbers)

```javascript
const currentSet = new Set(currentItems);
const delta = newItems.filter(id => !currentSet.has(id));
return { itemsToAdd: delta };
```

**Complexity:** O(n + m) where n = current size, m = new size

#### Map-based Comparison (Complex Objects)
Best for: Arrays of objects requiring deep comparison

```javascript
const currentMap = new Map(currentItems.map(item => [item.id, item]));
const delta = newItems.filter(item => {
  const existing = currentMap.get(item.id);
  return !existing || JSON.stringify(existing) !== JSON.stringify(item);
});
```

**Complexity:** O(n + m × k) where k = serialization cost

#### Diff Algorithm Libraries
Best for: Large datasets (>10,000 items), complex change tracking

- `fast-diff`: Myers diff algorithm (LCS-based)
- `diff-match-patch`: Google's diff library
- `deep-diff`: Object tree comparison

**Trade-offs:** Higher computational cost for diff vs simpler Set/Map approaches. See `trade-offs.md`.

---

### 4. CCJS Consolidation

**Problem:** Multiple similar CCJS stages processing data separately increase stage count and execution overhead.

**Pattern:** Merge related transformations into single CCJS stage.

**Example:**
```
Before:
CCJS (parse data) → CCJS (filter) → CCJS (transform) → CCJS (format)

After:
CCJS (parse + filter + transform + format in one pass)
```

**Benefits:**
- Reduces stage transitions (overhead ~50-100ms per transition)
- Enables optimization opportunities (one-pass processing)
- Simplifies debugging (single stage to inspect)

**When to keep separate:** See `trade-offs.md` for modularity vs performance trade-offs.

---

### 5. Bypass Switches (Conditional Execution Guards)

**Problem:** Loops and expensive operations execute even when input data is empty.

**Pattern:** Add FCSwitchOne conditional check before expensive operations:

```
Before:
CCJS (prepare data) → FCEach (may be empty) → NWRequest

After:
CCJS (prepare data, return hasItems boolean)
  → FCSwitchOne (check hasItems)
    → TRUE: FCEach → NWRequest
    → FALSE: skip to next stage
```

**When to add bypass:**
- Empty data frequency >30% (see `trade-offs.md` for calculation)
- Loop body contains expensive operations (network I/O, heavy computation)
- Cost of check < cost of empty execution

**Cost-benefit analysis:**
- Bypass switch overhead: ~50ms
- Empty FCEach iteration: ~200ms minimum
- Break-even: If empty case occurs >20% of the time

---

### 6. Error Handling Centralization

**Problem:** Missing or inconsistent error handling across stages.

**Pattern:** Create global error handler stage and route all critical stage errors to it:

```javascript
{
  "key": "send_error_message",
  "name": "PBMessage",
  "data": {
    "channelIds": ["$VALUE#channel"],
    "message": "Error: ($OUTPUT#failed_stage#error|message)"
  }
}

// All NWRequest and PBScript stages:
{
  "next": {
    "SUCCESS": "next_stage",
    "ERROR": "send_error_message"
  }
}
```

**Benefits:**
- Consistent error reporting
- Centralized error logging/monitoring
- Better user experience (clear error messages)

---

## Performance Considerations

### Complexity Analysis

**Avoid Nested Loops:**
- Nested FCEach creates O(n²) complexity
- Example: 100 outer × 100 inner = 10,000 iterations
- Solution: Flatten data in CCJS, use single loop with batch operations

**Efficient Data Structures:**
- Set/Map for membership testing: O(1) vs Array.includes: O(n)
- Break-even point: ~100 elements
- Impact scales with data size (1000 elements: 1000x faster with Set)

### Execution Time Optimization

**Lambda timeout considerations:**
- Maximum execution time: 15 minutes (AWS Lambda hard limit)
- Typical target: <30 seconds for user-facing workflows
- Network call budget: ~250ms per API call average

**Estimation formula:**
```
Total time ≈ (network calls × 250ms) + (CCJS stages × 100ms) + (transitions × 50ms)
```

**Example calculation:**
- 500 sequential NWRequest calls: 500 × 250ms = 125 seconds
- Batched into 5 requests: 5 × 2000ms = 10 seconds (92% improvement)

### Memory Optimization

**Return only necessary data:**
- Don't pass complete datasets between stages
- Extract only required fields in CCJS
- Use projection in API queries when available

**Example:**
```javascript
// Bad: Returns all data
return { allOrders: orders };

// Good: Returns only IDs for next stage
return { orderIds: orders.map(o => o.id) };
```

**Payload size limits:**
- AWS Lambda: 6MB request/response
- Target: <1MB for safety margin
- Monitor: Use payload analyzer to estimate sizes

---

## Robustness Patterns

### Safe JSON Parsing

Always handle JSON.parse errors in CCJS:

```javascript
const safeJSON = (val, defaultValue) => {
  if (val == null) return defaultValue;
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (trimmed === "") return defaultValue;
    try {
      return JSON.parse(trimmed);
    } catch {
      return defaultValue;
    }
  }
  return val;
};

// Usage
const data = safeJSON(input, []);
```

**Alternative:** Use schema validation libraries (Zod, Yup) if available in runtime.

### Input Normalization

Handle multiple input formats defensively:

```javascript
// Ensure array
const items = Array.isArray(data.items)
  ? data.items
  : (data.items || []);

// Ensure object
const config = typeof data.config === 'object' && data.config !== null
  ? data.config
  : {};

// Fallback chains
const value = data.primary
  || data.secondary
  || data.fallback
  || defaultValue;
```

### Authorization Headers

All NWRequest stages accessing protected endpoints must include:

```javascript
{
  "headers": { "admin": true },
  "defaultAuth": true
}
```

**Note:** This is Cotalker-specific. See `domain-specific.md`.

---

## Scalability Considerations

### Growth Impact Analysis

Project performance under data growth scenarios:

| Metric | Current | 2x Growth | 5x Growth | 10x Growth |
|--------|---------|-----------|-----------|------------|
| Array size | 100 | 200 | 500 | 1000 |
| Network calls (N+1) | 100 | 200 | 500 | 1000 |
| Execution time | 25s | 50s | 125s | 250s |
| **After optimization** | **2s** | **2s** | **2s** | **2s** |

### Horizontal Scaling Patterns

**When single routine can't handle load:**
- Split processing into multiple Lambda invocations
- Use queue-based architecture (SQS, EventBridge)
- Implement pagination for large datasets
- Consider async processing for non-critical paths

---

## Monitoring and Observability

### Key Metrics to Track

1. **Execution time** per routine execution
2. **Network call count** per execution
3. **Payload sizes** (request/response)
4. **Error rate** by stage type
5. **Loop iteration counts** (actual vs estimated)

### Performance Budgets

Set budgets based on business requirements:

```javascript
{
  "executionTime": {
    "target": "5s",
    "max": "30s"
  },
  "networkCalls": {
    "target": 5,
    "max": 20
  },
  "payloadSize": {
    "target": "100KB",
    "max": "1MB"
  }
}
```

Alert when budgets exceeded, investigate optimization opportunities.

---

## References

- `trade-offs.md`: Decision guidance for when to apply each pattern
- `domain-specific.md`: Cotalker-specific implementation details
- `cotlang-reference.md`: COTLang expression language syntax
- `anti-patterns.json`: Automated detection rules
