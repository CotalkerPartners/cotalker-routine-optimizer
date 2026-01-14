# Cotalker Optimizer

CLI tool to analyze and optimize Cotalker bot routines, detecting anti-patterns, estimating payload sizes, validating COTLang syntax, and generating optimized versions.

## Features

- **Loop Analyzer**: Detects problematic FCEach loops with network calls (N+1 patterns)
- **Payload Analyzer**: Estimates payload sizes and identifies potential 413 errors (>6MB)
- **COTLang Validator**: Validates syntax and usage of COTLang expressions
- **JSON Patch Analyzer**: Detects full array replacements that could be incremental
- **Scalability Analyzer**: Projects growth impact (2x, 5x, 10x data growth)
- **Optimizers**: Automatically generate optimized versions of routines
- **Interactive Mode**: Guided wizard for step-by-step optimization

## Installation

```bash
npm install
```

## Usage

### Analyze a Routine

```bash
npm start analyze tests/fixtures/original-routine.js
```

Options:
- `--output-format <json|markdown|html>` - Report format (default: markdown)
- `--severity <all|critical|high>` - Filter by severity level
- `--checks <loop,payload,syntax,patch>` - Select specific analyzers

### Generate Optimized Version

```bash
npm start optimize tests/fixtures/original-routine.js --output optimized.js
```

Options:
- `--apply <loop,ccjs,patch,errors>` - Select which optimizations to apply
- `--dry-run` - Preview changes without writing files

### Interactive Mode

```bash
npm start interactive tests/fixtures/original-routine.js
```

Guided wizard that walks through each optimization opportunity.

### Validate COTLang Expression

```bash
npm start validate-cotlang "\$VALUE#sentAnswer|data|[find=>identifier=field]" --context StateSurvey
```

## Architecture

```
cotalker-optimizer/
├── src/
│   ├── cli.js                      # Entry point
│   ├── analyzers/                  # Analysis modules
│   │   ├── loop-analyzer.js        # FCEach detection
│   │   ├── payload-analyzer.js     # Size estimation
│   │   ├── cotlang-validator.js    # Syntax validation
│   │   ├── jsonpatch-analyzer.js   # Patch strategy
│   │   └── scalability-analyzer.js # Growth projections
│   ├── optimizers/                 # Optimization modules
│   │   ├── loop-linearizer.js      # FCEach → batch
│   │   ├── ccjs-consolidator.js    # Merge CCJS stages
│   │   ├── patch-optimizer.js      # Incremental patches
│   │   └── error-handler-injector.js # Error routing
│   ├── generators/
│   │   ├── report-generator.js     # Reports
│   │   └── routine-generator.js    # Optimized routines
│   ├── parsers/
│   │   ├── routine-parser.js       # Parse trigger files
│   │   └── cotlang-parser.js       # Parse expressions
│   └── utils/
│       ├── stage-graph.js          # Dependency graph
│       ├── payload-estimator.js    # Size calculations
│       └── logger.js               # Console output
├── knowledge/
│   ├── cotlang-reference.md        # COTLang syntax guide
│   ├── optimization-patterns.md    # Optimization strategies
│   └── anti-patterns.json          # Detection rules
├── templates/
│   ├── ccjs/                       # CCJS code templates
│   │   ├── safeJSON.js
│   │   ├── deltaComputation.js
│   │   └── jsonPatch.js
│   └── stages/                     # Stage templates
│       ├── error-handler.json
│       └── bypass-switch.json
└── tests/
    ├── fixtures/
    │   ├── original-routine.js     # Test input
    │   └── optimized-routine.js    # Expected output
    └── analyzers/                  # Unit tests
```

## Knowledge Base

The tool leverages proven optimization patterns from the `rutinas Cotalker` repository:

### Key Optimization Strategies

1. **JSON Patch Incrementales**: Use `op: "add"` with path `/-` for append operations instead of full array replacement
2. **Delta Processing**: Compute and send only new items using Set-based deduplication
3. **Loop Linearization**: Replace FCEach with batch operations via `/multi` endpoints
4. **CCJS Consolidation**: Merge multiple similar CCJS stages into single-pass processing
5. **Bypass Switches**: Add conditional checks to skip empty operations
6. **Error Handling**: Route errors to centralized handler for better observability

### Anti-Patterns Detected

- FCEach with enclosed NWRequest (N+1 queries)
- Full array replacements (should use incremental patches)
- Missing error routing on critical stages
- Loops without bypass switches
- Incorrect COTLang delimiters
- Missing delta computation
- Unsafe JSON parsing
- Array.includes() in loops (O(n²))
- Nested FCEach loops

## Examples

### Example 1: Loop Detection

**Input:**
```javascript
{
  "key": "iterar_",
  "name": "FCEach",
  "data": { "control": "$VALUE#uuids", "target": "uuid" }
}
```

**Output:**
```
⚠️  CRITICAL: Problematic Loop Detected
  Stage: iterar_
  Pattern: FCEach → NWRequest
  Estimated network calls: 200+

  Recommendation: Replace with batch operation
```

### Example 2: Payload Analysis

**Input:**
```javascript
{
  "body": [{
    "op": "add",
    "path": "/schemaInstance/ordenes_de_servicio",
    "value": "$OUTPUT#ccjs#data|allOrders"
  }]
}
```

**Output:**
```
⚠️  HIGH: Large Payload Detected
  Estimated size: 8.2 MB
  Risk: May exceed Lambda limit

  Recommendation: Use incremental patches with path "/-"
```

## Testing

```bash
npm test
```

Run specific test suite:
```bash
npm test -- tests/analyzers/loop-analyzer.test.js
```

## Development

```bash
# Watch mode
npm run test:watch

# Lint
npm run lint
```

## License

MIT

## Author

Julio Cotalker
