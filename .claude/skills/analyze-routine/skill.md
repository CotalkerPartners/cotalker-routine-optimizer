# Analyze Routine

Analiza una rutina Cotalker completa: detecta anti-patterns, estima performance, genera reporte.

## Usage

```
/analyze-routine
```

## What this skill does

1. **Lee la rutina** desde `routines/input/current.json`
2. **Carga knowledge base** completa (7 archivos en `knowledge/`)
3. **Parsea la rutina** (si es compleja >100 stages) o lee directamente
4. **Detecta anti-patterns** usando knowledge-driven approach:
   - N+1 queries (FCEach con NWRequest)
   - Payloads grandes (>6MB)
   - Full array replacements
   - Missing error handling
   - Unsafe JSON parsing
   - Nested loops
5. **Estima impacto**:
   - Network calls totales
   - Payload sizes
   - Performance bajo crecimiento (2x, 5x, 10x)
6. **Crea sesión** automáticamente con timestamp
7. **Guarda resultados**:
   - `input.json` - Copia de rutina original
   - `analysis.md` - Reporte completo con:
     - Overview (stages, loops, network requests)
     - Anti-patterns detectados (severity, stage, recommendation)
     - Performance estimates
     - COTLang issues (si hay)
   - `README.md` - Metadata de la sesión
8. **Muestra resumen** en terminal

## Steps to follow

### 1. Read routine
```javascript
import { readFileSync } from 'fs';

const routineContent = readFileSync('routines/input/current.json', 'utf-8');
const routine = JSON.parse(routineContent);
```

### 2. Load knowledge base
Read all files in `knowledge/`:
- `anti-patterns.json` - Pattern definitions
- `optimization-patterns.md` - Solutions
- `cotlang-reference.md` - Syntax validation
- `cotalker-routines.md` - Platform reference
- Others as needed

### 3. Parse (optional, for complex routines)
```javascript
import { parseRoutineFile, findLoops, getLoopBody, findNetworkRequests } from './src/parsers/routine-parser.js';

// Only if routine has >100 stages or complex analysis needed
const parsed = parseRoutineFile('routines/input/current.json');
const trigger = parsed.surveyTriggers[0];

// Quick analysis helpers
const loops = findLoops(trigger.graph);
const networkRequests = findNetworkRequests(trigger.stages);
```

### 4. Detect anti-patterns
Use knowledge-driven approach (NOT hardcoded rules):

**N+1 Pattern**:
- Find all FCEach loops
- Check if loop body contains NWRequest stages
- Estimate: iterations × network calls per iteration
- Severity: CRITICAL if >500 calls

**Large Payload**:
- Find NWRequest with `op: "replace"` and large arrays
- Estimate payload size
- Severity: CRITICAL if >6MB, HIGH if >3MB

**Missing Error Handling**:
- Find stages without `next.ERROR`
- Identify critical stages (NWRequest, PBUpdateTask, etc.)
- Severity: HIGH for critical stages

**Unsafe JSON Parsing**:
- Find CCJS stages with `JSON.parse()` without try/catch
- Severity: MEDIUM

### 5. Create session and save
```javascript
import { createSession, saveToSession, createSessionReadme } from './src/utils/session-manager.js';

const session = createSession();

// Save original routine
saveToSession('input.json', routineContent, session);

// Save analysis
const analysisMarkdown = generateAnalysisMarkdown(issues, stats);
saveToSession('analysis.md', analysisMarkdown, session);

// Create session README
createSessionReadme(session, {
  originalFile: 'routines/input/current.json',
  totalStages: stages.length,
  networkRequests: networkRequestCount,
  loops: loopCount
});
```

### 6. Generate analysis report
Format as Markdown:

```markdown
# Routine Analysis Report

## Overview
- **Total Stages**: 61
- **Network Requests**: 25
- **Loops**: 5
- **Error Handlers**: 2 (33% coverage)

## Anti-patterns Detected

### 🔴 CRITICAL (2 issues)

#### N+1 Query Pattern
**Stage**: `iterar_propiedades`
**Type**: FCEach loop with NWRequest

Current state:
- 200 iterations × 5 network calls = 1,000 total calls
- Estimated time: ~4 minutes

At 10x growth:
- 2,000 iterations × 5 = 10,000 calls
- Estimated time: ~40 minutes ⚠️ EXCEEDS LAMBDA LIMIT

**Recommendation**: Use batch endpoint `/api/v2/properties/multi`
**Expected improvement**: 1,000 calls → 1 call (99.9% reduction)

### 🟠 HIGH (5 issues)

#### Large Payload
**Stage**: `update_asset_data`
**Type**: Full array replacement

Estimated payload: 8.2 MB > 6MB Lambda limit
Risk: RequestEntityTooLargeException (413 error)

**Recommendation**: Use incremental JSON Patch with `op: "add"`, `path: "/-"`
**Expected improvement**: 8.2MB → ~500KB (94% reduction)

## Performance Estimates

### Current vs Optimized

| Metric | Current | Optimized | Improvement |
|--------|---------|-----------|-------------|
| Network calls | 1,000 | 5 | 99.5% |
| Payload size | 8.2 MB | 450 KB | 95% |
| Execution time | ~4 min | ~6 sec | 98% |

### Growth Projection (10x data)

| Scenario | Current | Optimized |
|----------|---------|-----------|
| Network calls | 10,000 | 5 |
| Execution time | ~40 min ⚠️ | ~6 sec ✅ |

## COTLang Issues

No syntax errors found.

## Recommendations Priority

1. **Immediate** (CRITICAL):
   - Fix N+1 pattern in `iterar_propiedades`
   - Reduce payload in `update_asset_data`

2. **Before production** (HIGH):
   - Add error handlers to 3 critical stages
   - Validate batch endpoint exists

3. **When possible** (MEDIUM):
   - Consolidate CCJS stages
   - Add bypass switches to loops
```

### 7. Display summary
Show concise summary in terminal:

```
✅ Análisis completo

Rutina: [nombre]
- Stages: 61
- Network requests: 25
- Loops: 5

Issues detectados:
🔴 CRITICAL: 2
🟠 HIGH: 5
🟡 MEDIUM: 10
⚪ LOW: 3

Archivos guardados en:
.sessions/2026-01-27_14-30-22/
- input.json
- analysis.md
- README.md

Ver reporte completo: .sessions/latest/analysis.md
```

## Important notes

- **Always use session manager** to save files
- **Read ALL knowledge files** - don't skip
- **Be specific** in recommendations (exact stage keys, line numbers if using parser)
- **Estimate impact** quantitatively (network calls, bytes, time)
- **Prioritize by severity** - CRITICAL first
- **Include growth projection** - helps user understand future risk

## Knowledge base priority

1. `knowledge/anti-patterns.json` - Pattern definitions
2. `knowledge/optimization-patterns.md` - Solutions
3. `knowledge/cotalker-routines.md` - Stage types and capabilities

## Output structure

Session directory should contain:
```
.sessions/TIMESTAMP/
├── README.md          # Session metadata
├── input.json         # Original routine
└── analysis.md        # Full analysis report
```

## Example invocation

User types: `/analyze-routine`

You:
1. Read `routines/input/current.json`
2. Load knowledge base
3. Detect patterns
4. Create session
5. Save analysis
6. Show summary
