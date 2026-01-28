# Optimize Routine

Analiza y optimiza automáticamente una rutina Cotalker aplicando patrones probados.

## Usage

```
/optimize-routine
```

## What this skill does

1. **Analiza** (como `/analyze-routine`)
2. **Identifica optimizaciones aplicables**:
   - Loop linearization (N+1 → batch)
   - Incremental patches (full array → delta)
   - Error handler injection
   - CCJS consolidation
   - Bypass switches
3. **Valida prerrequisitos**:
   - Batch endpoints existen (curl)
   - Rutinas referenciadas existen (API)
4. **Genera rutina optimizada**
5. **Guarda en sesión**:
   - `input.json` - Original
   - `optimized.json` - Optimizada
   - `analysis.md` - Qué cambió y por qué
   - `changes.diff` - Diferencias visuales
   - `performance-estimate.md` - Mejoras esperadas

## Steps to follow

### 1. Analyze (reuse analyze-routine logic)
Run full analysis to identify issues.

### 2. Identify applicable optimizations

For each anti-pattern detected, map to solution:

**N+1 Query** → **Loop Linearization**:
- Remove FCEach loop
- Add CCJS to prepare batch IDs
- Add single NWRequest to `/multi` endpoint
- Validate batch endpoint exists with curl

**Large Payload** → **Incremental Patch**:
- Add CCJS with delta computation (use `templates/ccjs/deltaComputation.js`)
- Change `op: "replace"` to `op: "add"` with `path: "/-"`
- Add bypass switch if array might be empty

**Missing Error Handling** → **Error Handler**:
- Add centralized error handler stage (use `templates/stages/error-handler.json`)
- Connect critical stages to error handler via `next.ERROR`

**Unsafe JSON Parsing** → **Safe JSON**:
- Replace direct `JSON.parse()` with safe version (use `templates/ccjs/safeJSON.js`)

### 3. Validate prerequisites

**Before optimizing N+1 patterns**:
```javascript
// Check if batch endpoint exists
import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);

const batchEndpoint = 'https://www.cotalker.com/api/v2/properties/multi';
const { stdout } = await execAsync(`curl -I -X POST "${batchEndpoint}"`);

if (stdout.includes('200') || stdout.includes('201')) {
  console.log('✅ Batch endpoint exists');
} else if (stdout.includes('404')) {
  console.warn('⚠️  Batch endpoint not found - may need different approach');
  // Ask user if they want to proceed or use different endpoint
}
```

**Before optimizing PBRoutine references**:
```javascript
// Check if referenced routines exist
const referencedRoutines = findPBRoutineStages(routine);
// Ask user for token if needed, then validate
```

### 4. Generate optimized routine

Use templates from `templates/` directory:

**Example: Loop Linearization**

Original:
```javascript
{
  "key": "iterar_propiedades",
  "name": "FCEach",
  "data": {
    "control": "$OUTPUT#get_items#data",
    "target": "item"
  },
  "next": {
    "STEP": "fetch_property",
    "END": "consolidate"
  }
},
{
  "key": "fetch_property",
  "name": "NWRequest",
  "data": {
    "url": "/api/v2/properties/$VAR#item|_id",
    "method": "GET"
  },
  "next": {
    "OK": "iterar_propiedades"
  }
}
```

Optimized:
```javascript
{
  "key": "prepare_batch",
  "name": "CCJS",
  "data": {
    "sourceCode": "const items = input.get_items.data || [];\nconst ids = items.map(i => i._id);\nreturn { ids };"
  },
  "next": {
    "OK": "fetch_properties_batch"
  }
},
{
  "key": "fetch_properties_batch",
  "name": "NWRequest",
  "data": {
    "url": "/api/v2/properties/multi",
    "method": "POST",
    "body": {
      "ids": "$OUTPUT#prepare_batch#ids"
    }
  },
  "next": {
    "OK": "consolidate"
  }
}
```

**Example: Incremental Patch**

Use `templates/ccjs/deltaComputation.js`:
```javascript
{
  "key": "compute_delta",
  "name": "CCJS",
  "data": {
    "sourceCode": "// Read from templates/ccjs/deltaComputation.js\nconst safeJSON = (val, def) => {\n  if (val == null) return def;\n  try { return JSON.parse(val); } catch { return def; }\n};\n\nconst current = Array.isArray(input.currentItems) ? input.currentItems : [];\nconst incoming = Array.isArray(input.incomingItems) ? input.incomingItems : [];\n\nconst currentSet = new Set(current);\nconst delta = incoming.filter(id => !currentSet.has(id));\n\nconst jsonPatch = delta.map(id => ({\n  op: \"add\",\n  path: \"/schemaInstance/items/-\",\n  value: id\n}));\n\nreturn { jsonPatch, hasDelta: delta.length > 0 };"
  },
  "next": {
    "OK": "apply_patch"
  }
}
```

### 5. Create session and save

```javascript
import { createSession, saveToSession } from './src/utils/session-manager.js';

const session = createSession();

// Save original
saveToSession('input.json', JSON.stringify(originalRoutine, null, 2), session);

// Save optimized
saveToSession('optimized.json', JSON.stringify(optimizedRoutine, null, 2), session);

// Save analysis
const analysis = generateOptimizationAnalysis(changes);
saveToSession('analysis.md', analysis, session);

// Save diff
const diff = generateDiff(originalRoutine, optimizedRoutine);
saveToSession('changes.diff', diff, session);

// Save performance estimate
const perfEstimate = generatePerformanceEstimate(beforeMetrics, afterMetrics);
saveToSession('performance-estimate.md', perfEstimate, session);
```

### 6. Generate analysis document

Format:
```markdown
# Optimization Analysis

## Summary

Applied 3 optimizations to improve performance and prevent errors.

## Changes Made

### 1. Loop Linearization - `iterar_propiedades`

**Issue**: N+1 query pattern (200 iterations × 5 network calls = 1,000 calls)

**Solution**: Batch operation via `/api/v2/properties/multi`

**Changes**:
- ✅ Validated batch endpoint exists (curl returned 200)
- ❌ Removed: `iterar_propiedades` (FCEach loop)
- ❌ Removed: `fetch_property` (NWRequest in loop)
- ✅ Added: `prepare_batch` (CCJS to prepare IDs)
- ✅ Added: `fetch_properties_batch` (Single NWRequest)

**Impact**:
- Network calls: 1,000 → 1 (99.9% reduction)
- Execution time: ~4 min → ~5 sec (98% faster)
- At 10x growth: Still ~5 sec (vs 40 min unoptimized)

### 2. Incremental Patch - `update_asset_data`

**Issue**: Full array replacement (payload 8.2MB > 6MB limit)

**Solution**: Delta computation + incremental JSON Patch

**Changes**:
- ✅ Added: `compute_delta` (CCJS using template deltaComputation.js)
- ✅ Modified: `update_asset_data` body
  - Changed: `op: "replace"` → `op: "add"`
  - Changed: `path: "/items"` → `path: "/items/-"`
  - Changed: `value: "$OUTPUT#ccjs#allItems"` → `value: "$OUTPUT#compute_delta#jsonPatch"`

**Impact**:
- Payload size: 8.2MB → ~450KB (95% reduction)
- Risk eliminated: No more 413 errors
- At 10x growth: ~4.5MB (still under 6MB limit)

### 3. Error Handler Injection

**Issue**: 5 critical stages without error handling

**Solution**: Centralized error handler

**Changes**:
- ✅ Added: `error_handler` stage (using template error-handler.json)
- ✅ Modified: 5 stages to connect to error handler via `next.ERROR`

**Impact**:
- Error visibility: 0% → 100%
- Failure detection: Manual → Automatic
- Recovery: None → Graceful degradation

## Performance Comparison

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Network calls | 1,000 | 5 | 99.5% |
| Payload size | 8.2 MB | 450 KB | 95% |
| Execution time | ~4 min | ~6 sec | 98% |
| Error handling | 33% | 100% | +67% |

## Testing Recommendations

1. **Test in development** first with small dataset
2. **Verify batch endpoint** returns expected data format
3. **Test delta computation** with edge cases (empty arrays, duplicates)
4. **Monitor error handler** to ensure proper routing
5. **Load test** with 2x, 5x data to validate estimates

## Deployment

1. Review `optimized.json`
2. Test in dev environment
3. Import to MongoDB:
   ```bash
   mongoimport --db cotalker_db --collection routines \
     --file .sessions/latest/optimized.json
   ```
4. Monitor first production run
```

### 7. Display summary

```
✅ Optimización completa

Cambios aplicados:
1. Loop linearization (iterar_propiedades)
   1,000 calls → 1 call (99.9% faster)

2. Incremental patch (update_asset_data)
   8.2MB → 450KB (95% smaller)

3. Error handlers agregados
   5 stages ahora tienen manejo de errores

Performance:
- Network calls: 1,000 → 5
- Payload: 8.2MB → 450KB
- Tiempo: ~4min → ~6sec

Archivos guardados en:
.sessions/latest/
- optimized.json      (rutina lista para importar)
- analysis.md         (cambios detallados)
- changes.diff        (diferencias visuales)
- performance-estimate.md

⚠️  IMPORTANTE: Testea en desarrollo antes de producción
```

## Important notes

- **Always validate endpoints** before generating batch operations
- **Use templates** from `templates/` - don't write from scratch
- **Preserve existing logic** - only optimize problematic parts
- **Test assumptions** - validate batch endpoints exist with curl
- **Document trade-offs** - explain why each optimization was chosen
- **Generate working code** - ensure CCJS syntax is correct

## When to ask user

- If batch endpoint doesn't exist (404)
- If multiple optimization strategies are possible
- If optimization requires external dependency
- If user needs to provide API token for validation

## Output structure

```
.sessions/TIMESTAMP/
├── README.md
├── input.json
├── optimized.json           # Ready to import
├── analysis.md              # What changed and why
├── changes.diff             # Visual diff
└── performance-estimate.md  # Expected improvements
```
