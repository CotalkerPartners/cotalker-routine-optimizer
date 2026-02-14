# Optimization Trade-offs and Decision Guide

This document provides guidance on **when** to apply optimization patterns, considering trade-offs between performance, complexity, maintainability, and business requirements.

**Philosophy:** Not all optimizations are worth applying. Choose optimizations based on measured impact, not assumptions.

---

## Delta vs Full State

### Use Delta Computation When:

✅ **Array size is large (>1000 elements)**
- Delta computation overhead is negligible compared to transmission cost
- Reduces payload by 70-95% in typical update scenarios

✅ **Payload size exceeds 1MB**
- Avoids Lambda 6MB hard limit
- Reduces network transfer time significantly

✅ **High update frequency**
- Updates happen multiple times per minute
- Bandwidth savings compound over time

✅ **Incremental updates are semantically correct**
- Order doesn't matter (sets, not ordered lists)
- No dependency between items

### Use Full State When:

❌ **First initialization / fresh start**
- No previous state exists to compare against
- Delta computation would return entire dataset anyway

❌ **Reset or synchronization operations**
- Explicit requirement to "reset to this exact state"
- Delta could cause drift if intermediate updates were missed

❌ **Small datasets (<100 elements, <100KB payload)**
- Delta computation cost > transmission savings
- Added complexity not worth marginal benefit

❌ **Simpler error recovery required**
- Full state provides idempotent retry semantics
- Delta requires complex rollback/replay logic

❌ **State comparison is expensive**
- Complex nested objects requiring deep comparison
- Serialization cost > transmission savings

### Example Decision Matrix

| Scenario | Array Size | Frequency | State Type | Recommendation |
|----------|-----------|-----------|------------|----------------|
| User preferences | 10 fields | Low | Simple | **Full state** - simplicity wins |
| Shopping cart | 50 items | Medium | Simple | **Either** - marginal benefit |
| Product catalog | 5000 items | High | Complex | **Delta** - significant savings |
| Initial sync | 10000 items | Once | Any | **Full state** - no baseline |
| Real-time updates | Variable | Very high | Simple | **Delta** - bandwidth critical |

---

## Bypass Switches (Conditional Guards)

### Add Bypass Switch When:

✅ **Empty case frequency >30%**
- Calculation: (empty executions / total executions) × 100
- Monitor production metrics to determine actual frequency

✅ **Loop body is expensive**
- Contains network calls (>100ms per call)
- Heavy computation (>500ms)
- Multiple nested stages

✅ **Cost of check < cost of empty execution**
- Switch overhead: ~50ms
- Empty loop minimum: ~200ms
- Benefit: 150ms saved when empty

### Skip Bypass Switch When:

❌ **Loop is guaranteed to have data**
- Previous validation ensures non-empty
- Upstream stage filters out empty cases
- Business logic guarantees data presence

❌ **Loop body is trivial (<50ms total)**
- Simple transformations
- No network I/O
- Bypass overhead exceeds loop cost

❌ **Empty case is rare (<10%)**
- Cost of adding switch > total time saved
- Added complexity not justified

❌ **Code complexity impact is high**
- Breaking encapsulation
- Requires duplicate checking logic
- Harder to maintain

### Calculation Example

**Scenario:** Loop processes client updates, empty 40% of the time

```
Without bypass:
- Empty executions: 400 × 200ms = 80,000ms
- Non-empty executions: 600 × 5000ms = 3,000,000ms
- Total: 3,080,000ms

With bypass:
- Empty executions: 400 × 50ms = 20,000ms (just the check)
- Non-empty executions: 600 × (50ms + 5000ms) = 3,030,000ms
- Total: 3,050,000ms

Savings: 30,000ms (1% improvement)
```

**Decision:** Worth adding if implementation is simple (<30 lines of code)

---

## CCJS Consolidation vs Modularity

### Consolidate Stages When:

✅ **Stages are tightly coupled**
- Data flows sequentially A → B → C
- Each stage depends only on previous
- No branching between stages

✅ **Stage transition overhead is significant**
- Multiple small transformations (each <100ms)
- Total overhead (50ms × 5 stages = 250ms) is meaningful
- Consolidated version would be <500ms total

✅ **Debugging is not impacted**
- Logic remains clear in consolidated form
- Can add internal comments/structure
- Complexity doesn't increase significantly

### Keep Stages Separate When:

❌ **Stages have different error handling needs**
- Stage A can retry, Stage B cannot
- Different error recovery strategies
- Separate monitoring requirements

❌ **Stages are conditionally executed**
- Branching logic between stages
- Not all stages run in every execution
- Consolidation would require complex internal routing

❌ **Testing complexity increases**
- Separate stages enable isolated unit tests
- Consolidated stage would need complex mocking
- Debugging becomes harder

❌ **Code reusability suffers**
- Individual stages are reused in other routines
- Consolidation creates duplication
- Modularity has architectural value

### Example Comparison

**Scenario:** Parse → Validate → Transform → Format

```javascript
// Modular (4 stages, ~200ms overhead)
Stage 1: Parse JSON (50ms)
Stage 2: Validate schema (30ms)
Stage 3: Transform data (100ms)
Stage 4: Format output (40ms)
Total: 220ms + 200ms overhead = 420ms

// Consolidated (1 stage, ~50ms overhead)
Stage 1: Parse + Validate + Transform + Format (220ms)
Total: 220ms + 50ms overhead = 270ms

Savings: 150ms (35% improvement)
```

**Decision:** Consolidate if:
- Validation logic is simple
- Transformation is straightforward
- All steps always run together

---

## Loop Iteration Limits

### Hard Limits (Infrastructure)

**AWS Lambda:**
- Maximum execution time: 15 minutes (900,000ms)
- Memory: 128MB - 10GB (configurable)
- Payload: 6MB request/response (aplica a invocación de CCJS: el COTLang se resuelve a JSON y se pasa en el body)

**Cotalker API Rate Limits:**
- 500 puntos por ventana de 5 segundos, 10 puntos por request
- Máximo: 50 requests/5s, 10 requests/s, 600 requests/min
- Exceder el límite retorna HTTP 429 (Too Many Requests)

### Soft Limits (Best Practices)

**User-facing workflows (interactive):**
- Target: <5 seconds total
- Maximum: <30 seconds
- Users expect immediate feedback

**Background processing (async):**
- Target: <2 minutes
- Maximum: <10 minutes
- Longer processes should use queues

### Calculate Your Own Limits

**Formula:**
```
Max iterations = (Time budget - Fixed overhead) / Time per iteration

Example:
- Time budget: 30 seconds (30,000ms)
- Fixed overhead: 2 seconds (parsing, setup)
- Time per iteration: 250ms (network call)
- Max iterations: (30,000 - 2,000) / 250 = 112
```

**Configurable approach:**

```javascript
// In routine configuration
const config = {
  timeoutMs: 30000,        // Business requirement
  fixedOverheadMs: 2000,   // Measured in production
  avgIterationTimeMs: 250, // Measured in production
  safetyMargin: 0.8        // 20% buffer
};

const maxIterations = Math.floor(
  (config.timeoutMs - config.fixedOverheadMs)
  / config.avgIterationTimeMs
  * config.safetyMargin
);
// Result: ~89 iterations (with 20% safety buffer)
```

### Iteration Threshold Recommendations

| Loop Body Type | Warning | Error | Critical |
|----------------|---------|-------|----------|
| Trivial (no I/O) | 10,000 | 50,000 | 100,000 |
| Light computation | 1,000 | 5,000 | 10,000 |
| Network call (cached) | 500 | 1,000 | 2,000 |
| Network call (uncached) | 100 | 500 | 1,000 |
| Heavy computation | 50 | 200 | 500 |

**These are guidelines, not rules.** Measure actual performance and adjust based on:
- Production data volume
- SLA requirements
- Infrastructure limits
- Cost constraints

---

## Implementation Strategy Selection

### Set vs Map vs Diff Algorithm

**Use Set when:**
- Comparing primitive values (strings, numbers, IDs)
- Need simple presence check
- Performance: O(n + m)

```javascript
const existing = new Set(currentIds);
const delta = newIds.filter(id => !existing.has(id));
```

**Use Map when:**
- Comparing complex objects
- Need to access associated data
- Performance: O(n + m)

```javascript
const existingMap = new Map(current.map(item => [item.id, item]));
const delta = incoming.filter(item => {
  const existing = existingMap.get(item.id);
  return !existing || hasChanged(existing, item);
});
```

**Use Diff Library when:**
- Very large datasets (>10,000 items)
- Need detailed change tracking (add/remove/modify)
- LCS algorithm provides better results
- Performance: O(n × m) worst case, O(n + m) typical

```javascript
import { diffArrays } from 'diff';
const changes = diffArrays(currentIds, newIds);
// Returns: [{ added: [...], removed: [...], value: [...] }]
```

### Complexity Comparison

| Method | Time | Space | Best For |
|--------|------|-------|----------|
| Set | O(n+m) | O(n) | Simple ID arrays |
| Map | O(n+m) | O(n) | Object arrays |
| fast-diff | O(n+m) typical | O(min(n,m)) | Large sorted arrays |
| deep-diff | O(n×m) | O(max(n,m)) | Deep object trees |

---

## Error Handling Strategy

### Add Global Error Handler When:

✅ **Routine is user-facing**
- Users need clear error feedback
- Silent failures create support burden
- Error messaging is critical to UX

✅ **Multiple failure points exist**
- 5+ stages that can fail
- Centralized handling reduces duplication
- Consistent error format required

✅ **Error recovery is possible**
- Can retry failed operations
- Can log for later replay
- Can notify support team

### Skip Global Error Handler When:

❌ **Errors should halt immediately**
- Critical security checks
- Data integrity validations
- No recovery possible

❌ **Different errors need different handling**
- Network errors → retry
- Validation errors → user message
- Data errors → rollback
- Centralized handler can't differentiate

### Error Handling Levels

**Level 1: Silent (Log only)**
- Non-critical errors
- Background processing
- Auto-retry handles most cases

**Level 2: Notify (Log + Alert)**
- Important but not urgent
- Admin notification
- Business metrics affected

**Level 3: User Feedback (Log + Alert + Message)**
- User-initiated action failed
- Immediate user notification required
- Clear action items for user

**Level 4: System Halt (Log + Alert + Stop)**
- Data corruption risk
- Security violation
- Immediate intervention needed

---

## Cost-Benefit Analysis Template

Use this template to justify optimization decisions:

```markdown
## Optimization: [Name]

### Current State
- Execution time: [X]ms
- Network calls: [Y]
- Payload size: [Z]KB
- Error rate: [W]%

### Proposed Optimization
- Expected execution time: [X']ms
- Expected network calls: [Y']
- Expected payload size: [Z']KB
- Expected error rate: [W']%

### Benefits
- Time saved: [X - X']ms ([%] improvement)
- Calls reduced: [Y - Y'] ([%] improvement)
- Payload reduced: [Z - Z']KB ([%] improvement)

### Costs
- Development time: [H] hours
- Code complexity: [+N] lines
- Testing effort: [T] test cases
- Maintenance impact: [Low/Medium/High]

### Decision
- [ ] Implement (benefits > costs)
- [ ] Defer (costs > benefits currently)
- [ ] Reject (fundamental trade-off not acceptable)

### Justification
[Explain decision based on business context]
```

---

## Summary Decision Tree

```
Is performance problematic?
├─ No → Don't optimize (premature optimization)
└─ Yes → Measure actual impact
    ├─ <10% improvement → Not worth complexity
    └─ >10% improvement → Continue analysis
        ├─ High complexity added → Consider alternatives
        └─ Low complexity added → Implement
            ├─ Add tests
            ├─ Add monitoring
            └─ Document decision
```

**Remember:** Optimize for readability first, performance second. Only optimize when measurements justify the complexity.
