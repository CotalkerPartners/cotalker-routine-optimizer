# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This repository contains optimized routines (bot workflows) for the Cotalker Billing Bot, designed to avoid AWS Lambda `RequestEntityTooLargeException` (413 errors) and timeouts when handling payloads larger than 6MB. The codebase implements three main operations on Service Orders (OS - Ordenes de Servicio):

1. **Agregar (Add)**: Adding service orders to billing assets
2. **Modificar (Modify)**: Modifying prices and services in existing orders
3. **Retirar (Remove)**: Removing service orders from billing assets

## Key Architecture Concepts

### Optimization Strategy
The routines use **incremental JSON Patch** instead of sending complete arrays back to the server:
- `op: "add"` with `path: "/-"` to append new items
- `op: "remove"` with index-based paths to delete items
- `op: "replace"` for complete field substitution

This delta processing protects downstream endpoints from payload overload.

### Linearization Pattern
Iteration blocks (loops) that generated hundreds of network calls have been eliminated. Instead, the routines use:
- Batch processing via `/multi` endpoints
- Consolidated CCJS (Custom Code JavaScript) stages that compute all changes in a single step
- Individual client updates only when bulk operations are not robust enough

### Core Data Structures

**Asset de Facturación (Billing Asset)**: The central property containing:
- `schemaInstance.ordenes_de_servicio`: Array of service order IDs
- `subproperty`: Array of all related property IDs (orders + parts)
- `schemaInstance.lista_precios`: JSON stringified array of pricing data

**OS (Orden de Servicio)**: Service order properties with:
- `schemaInstance.numero_os`: The order number
- `schemaInstance.rut_cliente`: Client tax ID
- `schemaInstance.asset`: Associated asset ID
- `schemaInstance.repuestos`: Array of spare part IDs
- `schemaInstance.facturacion`: Billing items (may be stringified JSON)

## Directory Structure

- `agregar/`: Add operation routines
  - `formate_update_os`: CCJS logic for computing incremental patches when adding OS
  - `add_ccjs`: Price calculation logic (handles facturacion parsing with ST* filtering)

- `modificar/`: Modify operation routines
  - `consolidate_modify_logic.js`: Consolidated CCJS that processes price updates, service additions, and non-charged items based on survey answers

- `retirar/`: Remove operation routines
  - `ccjs_subproperty_remove`: Main removal logic generating patches for OS, subproperties, and lista_precios
  - `ccjs_format_client_patches`: Client-specific patch formatting

- `tools/`: Utility scripts
  - `parse_log.py`: Python tool for analyzing truncated Cotalker logs, emergency error scanning

- Root-level files:
  - `trigger_formulario.js`: Original bot trigger configuration (MongoDB export format)
  - `trigger_formulario_optimized.js`: Optimized version of the trigger
  - `temp_trigger.js`: Working version during development
  - `debug_*.js`: Debugging helpers for syntax and module issues

## Cotalker Bot Workflow Structure

Bot configurations are MongoDB documents with the following key structure:

```javascript
{
  surveyTriggers: [{
    triggers: [{
      version: "v3",
      start: "stage_key",  // Entry point
      stages: [
        {
          key: "stage_key",
          name: "StageType",  // FCSwitchOne, NWRequest, CCJS, FCEach, PBScript
          data: { /* configuration */ },
          next: { /* routing */ }
        }
      ]
    }]
  }]
}
```

### Common Stage Types

- **FCSwitchOne**: Conditional routing based on data values
- **FCEach**: Iteration over arrays (use sparingly due to performance)
- **NWRequest**: HTTP requests to Cotalker API
- **CCJS**: Custom JavaScript execution (data transformations)
- **PBScript**: Backend script for batch operations
- **PBMessage**: Send messages to channels
- **PBChangeState**: Change task state in workflow

## COTLang V3 (Cotalker Expression Language)

COTLang is the expression language used within bot stage configurations to access data, transform values, and construct dynamic content. It is essential for configuring `NWRequest`, `CCJS`, `FCSwitchOne`, and other stage types.

### Syntax Fundamentals

**Delimiters:**
- `|` (Pipe): Navigates object keys or array elements (e.g., `data|user|name`)
- `#` (Hash): Separates command arguments (e.g., `$JOIN#separator#arg1#arg2`)

**Escaping:**
- Special characters (`|`, `#`, `(`, `)`, `[`, `]`) must be escaped with `\` in literals
- Code blocks use triple backticks, only backticks need escaping inside

**Functions:**
- Syntax: `[functionName=>arg=value]`
- Can be chained with pipes: `$VALUE#path|[find=>id=123]|[map=>name]`

### Core Commands

#### `$VALUE` - Access Current Context
Extracts data from the current trigger context (task, survey answer, message).

```
$VALUE#sentAnswer|data|[find=>identifier=que_realizar_asp_fact]|process|0
```
Common paths:
- `$VALUE#_id` - Current task ID
- `$VALUE#channel` - Current channel ID
- `$VALUE#sentAnswer|data` - Survey answer data array
- `$VALUE#extensions|activo_facturacion|repuestos_os` - Custom extension data

#### `$OUTPUT` - Stage Chaining
Accesses output from a previous stage in the routine.

```
$OUTPUT#get_asset#data|data|_id
$OUTPUT#format_update_os#data|jsonPatch
$OUTPUT#ccjs_remove_logic#data|tasksOSsToUpdate
```

**Pattern:** `$OUTPUT#stage_key#path|to|value`

This is critical for passing data between stages. For example:
- CCJS stage `format_update_os` returns `{jsonPatch: [...], tasksOSsToUpdate: [...]}`
- NWRequest stage uses `$OUTPUT#format_update_os#data|jsonPatch` as request body
- PBScript stage uses `$OUTPUT#format_update_os#data|tasksOSsToUpdate` for batch updates

#### `$JOIN` - String Concatenation
Joins multiple values with a separator.

```
$JOIN#/#($ENV#BASEURL)#api#v2#properties#jsonpatch#($OUTPUT#get_asset#data|data|_id)
```

Result: `https://www.cotalker.com/api/v2/properties/jsonpatch/507f1f77bcf86cd799439011`

**Pattern:** `$JOIN#separator#part1#part2#...`
- Use `()` to embed other commands: `($VALUE#id)`
- Empty separator: `$JOIN##Hello#World` → "HelloWorld"

#### `$ENV` - Environment Variables
Accesses Cotalker environment configuration.

```
$ENV#BASEURL  →  https://www.cotalker.com
```

Always use `$ENV#BASEURL` for constructing API URLs to ensure compatibility across environments (staging, production).

#### `$CODE` - Object Reference Generation
Generates Cotalker ObjectIds from identifiers.

```
$CODE#user#email#user@example.com
$CODE#channel#code#channel_code
$CODE#property#id#property_id
```

#### `$$TIME` - Timestamp Generation
Generates Unix epoch timestamps with offsets.

```
$$TIME#days#-1     →  Timestamp for 24 hours ago
$$TIME#hours#2     →  Timestamp for 2 hours from now
```

### Transformation Functions

Functions transform data in pipelines. Common patterns from this codebase:

#### Array Operations
```
[find=>identifier=ordenes_de_servicio_asp_fact]  // Find first match
[filter=>status=active]                          // Filter array
[map=>_id]                                       // Extract field from all items
[size=>*]                                        // Get array length
```

**Real example from trigger:**
```
$VALUE#sentAnswer|data|[find=>identifier=ordenes_de_servicio_asp_fact]|process
```
This finds the survey question with identifier "ordenes_de_servicio_asp_fact" and extracts the processed values.

#### Data Conversion
```
[json=>parse]      // Parse JSON string to object
[json=>stringify]  // Convert object to JSON string
[cast=>parseInt]   // Convert to integer
[toString=>|]      // Join array with separator
```

**Real example:**
```
$VALUE#sentAnswer|data|[find=>identifier=agregar_precios]|responses|0|[json=>parse]|uuids
```

#### Date Formatting
```
[date=>format=DD-MM-YYYY]
[date=>format=DD-MM-YYYY HH:mm@America/Santiago]
```

### Context Types

Different trigger sources provide different `$VALUE` structures:

| Trigger Type | Available Fields | Example Access Pattern |
|--------------|------------------|------------------------|
| **State Survey** | Task object + `sentAnswer` | `$VALUE#sentAnswer\|data\|[find=>identifier=field_id]` |
| **Slash Command** | `channel`, `message`, `cmdArgs` | `$VALUE#cmdArgs\|0` |
| **Workflow Start** | `answer`, `meta` | `$VALUE#answer\|responses` |

**This codebase uses State Survey triggers**, so `$VALUE` contains:
- Direct task fields: `_id`, `channel`, `taskGroup`, `extensions`
- Survey data: `sentAnswer|data` (array of question responses)

### Common Patterns in This Codebase

#### 1. Extracting Survey Answer by Identifier
```
$VALUE#sentAnswer|data|[find=>identifier=ordenes_de_servicio_asp_fact]|process
```
Finds the question with that identifier and returns the processed answer values (typically IDs).

#### 2. Building API URLs
```
$JOIN#/#($ENV#BASEURL)#api#v2#properties#jsonpatch#($OUTPUT#get_asset#data|data|_id)
```
Constructs dynamic URLs using environment base + stage output.

#### 3. Passing Data Between Stages
```
// CCJS stage "format_update_os" data input:
{
  "asset": "$OUTPUT#get_asset#data|data",
  "answerOS": "$VALUE#sentAnswer|data|[find=>identifier=ordenes_de_servicio_asp_fact]|process"
}

// Later NWRequest uses CCJS output:
{
  "body": "$OUTPUT#format_update_os#data|jsonPatch"
}
```

#### 4. Conditional Routing (FCSwitchOne)
```
{
  "lexpression": "$VALUE#sentAnswer|data|[find=>identifier=que_realizar_asp_fact]|process|0",
  "rcaseA": true,
  "rcaseB": "false",
  "rcaseC": "fin",
  "rcaseD": "aprobado"
}
```
Routes to different stages based on the value matched.

#### 5. Array Channel IDs
```
{
  "channelIds": ["$VALUE#channel"]
}
```
Note: Even for single values, must be wrapped in array for `channelIds`.

### Debugging COTLang Expressions

**Common mistakes:**
1. **Missing pipes vs hashes**: `$VALUE#path|to|value` not `$VALUE#path#to#value`
2. **Incorrect function syntax**: `[find=>id=value]` not `[find=id=value]`
3. **Wrong context**: Using `$VALUE#data` when it should be `$VALUE#sentAnswer|data`
4. **Unescaped special chars**: `price|cost` needs escaping if it's a literal

**Testing approach:**
1. Add a debug `PBMessage` stage that outputs the expression value
2. Check stage output in logs (use `parse_log.py`)
3. Verify the context structure matches expectations

## Robustness Patterns

### Safe JSON Parsing
All CCJS routines include the `safeJSON` helper:
```javascript
const safeJSON = (val, def) => {
  if (val == null) return def;
  if (typeof val === "string") {
    const s = val.trim();
    try { return JSON.parse(s); } catch { return def; }
  }
  return val;
};
```

### Bypass Switches
Conditional stages check for empty data before making network requests:
- `check_clients_add`: Skips if no clients to update
- `check_clients_remove`: Skips if no clients to process
- `check_modify_answers`: Skips if no price modifications

### Authorization Headers
All `NWRequest` stages must include:
```javascript
{
  headers: { admin: true },
  defaultAuth: true
}
```

### Global Error Handling
A `send_error_message` stage catches failures from any step and sends detailed error reports to the user's channel.

## Working with CCJS Routines

CCJS (Custom Code JavaScript) files are JavaScript snippets that execute within the Cotalker runtime. They:
- Receive input via the `data` object, populated using COTLang expressions in the stage configuration
- Must `return` an object with computed values that can be accessed by subsequent stages via `$OUTPUT#stage_key#data|field`
- Cannot use external imports or Node.js APIs (pure JavaScript only)
- Are defined inline in the stage's `data.src` field or referenced by name

**Relationship with COTLang:**
The CCJS stage configuration uses COTLang to map values into the `data` object:
```javascript
{
  "key": "format_update_os",
  "name": "CCJS",
  "data": {
    "src": "const asset = data.asset; ...",  // JavaScript code
    "data": {                                // COTLang expressions map to data object
      "asset": "$OUTPUT#get_asset#data|data",
      "answerOS": "$VALUE#sentAnswer|data|[find=>identifier=ordenes_de_servicio_asp_fact]|process"
    }
  }
}
```

Inside the CCJS code, `data.asset` and `data.answerOS` will contain the evaluated COTLang values.

### Input Normalization Pattern
Always handle multiple input formats:
```javascript
const answerOS = (Array.isArray(data.answerOS) && data.answerOS.length)
  ? data.answerOS
  : (data.answerOS_ || []);
```

### Set-based Deduplication
Use Sets for efficient filtering:
```javascript
const currentSubSet = new Set(Array.isArray(asset.subproperty) ? asset.subproperty : []);
const SubsToPatch = totalIncoming.filter(id => !currentSubSet.has(id));
```

## Common Operations

### Testing CCJS Logic Locally
Since CCJS files are pure JavaScript:
1. Create a mock `data` object with representative inputs
2. Run with Node.js: `node agregar/formate_update_os`
3. Verify the returned `jsonPatch` structure

### Debugging Bot Execution
1. Check execution logs in `logs/` directory (JSON format)
2. Use `parse_log.py` for truncated logs:
   ```bash
   python tools/parse_log.py logs/1767902503994.json
   ```
3. Look for `status: "ERROR"` in stage outputs
4. Check for timeout indicators (log cuts off mid-execution)

### Validating Trigger Syntax
Use the verification script:
```bash
node verify_trigger.js
```

## Data Flow Examples

### Add Operation Flow
1. User submits form with new OS data
2. `add_ccjs` parses facturacion, filters ST* codes, builds price array
3. `formate_update_os` computes delta (only new IDs)
4. `update_asset` applies JSON Patch to billing asset
5. `patch_multiple_tasks_add` updates task states in batch
6. Individual client updates if needed

### Remove Operation Flow
1. User selects OS to remove
2. `ccjs_subproperty_remove` consolidates:
   - OS IDs to remove from `ordenes_de_servicio`
   - Repuesto IDs to remove from `subproperty`
   - Entries to filter from `lista_precios`
   - Client mapping for side-effect updates
3. Single PATCH to billing asset with all changes
4. Individual client updates via iteration
5. Batch task state updates (deleted status)

### Modify Operation Flow
1. User answers survey with price changes, services, non-charged items
2. `consolidate_modify_logic.js` extracts from answers based on identifiers:
   - `seleccione_repuesto`, `precio_repuesto_`, `tipo_cobro` → Price updates
   - `numero_os_servicio`, `servicio_prestado`, `precio_servicio` → Service additions
   - `repuestos_no_cobrados`, `cantidad_utilizada`, etc. → Non-charged items
3. Updates `lista_precios` with all modifications
4. Generates replace patch for the entire field

## Important Notes

- **ST* Filtering**: Item codes starting with "ST" are filtered out in add operations (see `filterOutST` in `agregar/add_ccjs`)
- **Double Stringify**: `lista_precios` is often double-stringified (`JSON.stringify(JSON.stringify(array))`) in legacy data
- **Client Updates**: Client properties track which assets are associated via `schemaInstance` fields
- **Facturacion Parsing**: The `facturacion` field can be array, object, or stringified JSON - always normalize
- **Index-based Removal**: When removing from arrays, collect indices and process in reverse order (`unshift` instead of `push`)

## Performance Considerations

- Avoid nested `FCEach` loops - linearize with bulk operations
- Limit `maxIterations` to reasonable values (100 max)
- Use Sets for membership testing instead of array `.includes()`
- Return only delta data to subsequent stages, not full datasets
- Prefer `/-` append over rewriting entire arrays
