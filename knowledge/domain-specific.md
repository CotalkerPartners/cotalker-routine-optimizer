# Cotalker-Specific Domain Knowledge

This document contains business rules, data structures, and platform-specific details for the Cotalker Billing Bot system. This information is separate from general optimization patterns to avoid coupling technical patterns with domain logic.

---

## Cotalker Bot Workflow Structure

### Routine Configuration Format

Bot configurations are MongoDB documents with this structure:

```javascript
{
  _id: ObjectId("..."),
  name: "Billing Bot Routine",
  channel: ObjectId("..."),
  group: ObjectId("..."),
  isActive: true,
  surveyTriggers: [{
    triggers: [{
      version: "v3",
      start: "entry_stage_key",
      stages: [
        {
          key: "unique_stage_identifier",
          name: "StageType",
          data: { /* stage-specific configuration */ },
          next: {
            SUCCESS: "next_stage_key",
            ERROR: "error_handler_key"
          }
        }
      ]
    }]
  }]
}
```

### Stage Types Reference

| Stage Type | Purpose | Common Use Cases |
|------------|---------|------------------|
| **FCSwitchOne** | Conditional routing | Route based on survey answer, status |
| **FCEach** | Array iteration | Process multiple items (avoid with NWRequest) |
| **NWRequest** | HTTP API call | CRUD operations on Cotalker API |
| **CCJS** | Custom JavaScript | Data transformation, delta computation |
| **PBScript** | Backend batch script | Bulk updates, multi-entity operations |
| **PBMessage** | Send message | User notifications, error reporting |
| **PBChangeState** | Task state change | Workflow progression |
| **FCMerge** | Merge data streams | Combine parallel processing results |
| **FCJoinPath** | Join data paths | Combine related data |
| **FCAccumulator** | Accumulate values | Sum, count, collect over iterations |

---

## Billing Bot Data Structures

### Asset de Facturación (Billing Asset)

**Purpose:** Central property containing all billing-related data for a client

**Key Fields:**
```javascript
{
  _id: ObjectId("..."),
  schemaInstance: {
    ordenes_de_servicio: [          // Array of service order IDs
      ObjectId("os1"),
      ObjectId("os2"),
      // ... may contain hundreds of IDs
    ],
    lista_precios: "[[...]]",        // Double-stringified JSON array
    cliente: ObjectId("..."),        // Client property reference
    // other billing metadata
  },
  subproperty: [                     // All related property IDs
    ObjectId("os1"),                 // Service orders
    ObjectId("os2"),
    ObjectId("part1"),               // Spare parts
    ObjectId("part2"),
    // ... may contain thousands of IDs
  ]
}
```

**Performance Characteristics:**
- `ordenes_de_servicio`: Typically 50-500 elements
- `subproperty`: Typically 200-2000 elements
- `lista_precios`: JSON string, typically 10KB-500KB when parsed

**Common Operations:**
- Add OS → Append to `ordenes_de_servicio` + `subproperty`
- Remove OS → Remove from both arrays + update `lista_precios`
- Modify price → Update `lista_precios` JSON

---

### OS (Orden de Servicio / Service Order)

**Purpose:** Individual service order with billing items and parts

**Key Fields:**
```javascript
{
  _id: ObjectId("..."),
  schemaInstance: {
    numero_os: "OS-2024-001",        // Order number (string)
    rut_cliente: "12345678-9",       // Client tax ID
    asset: ObjectId("..."),           // Reference to billing asset
    repuestos: [                      // Array of spare part IDs
      ObjectId("part1"),
      ObjectId("part2")
    ],
    facturacion: "[...]",             // May be array, object, or stringified JSON
    estado: "pendiente",              // Order status
    fecha: ISODate("..."),
    // other service order fields
  }
}
```

**Data Format Variations:**
The `facturacion` field can appear in multiple formats due to legacy data:
- Array: `[{ codigo: "ST001", precio: 1000 }]`
- Object: `{ items: [...] }`
- Stringified JSON: `"[{\"codigo\":\"ST001\"}]"`
- Double-stringified: `"\"[{\\\"codigo\\\":\\\"ST001\\\"}]\""`

**Always normalize** using `safeJSON` helper.

---

### Client Property

**Purpose:** Tracks which billing assets are associated with a client

**Key Fields:**
```javascript
{
  _id: ObjectId("..."),
  schemaInstance: {
    rut: "12345678-9",
    nombre: "Cliente SA",
    activos_facturacion: [            // Billing assets for this client
      ObjectId("asset1"),
      ObjectId("asset2")
    ]
  }
}
```

**Update Pattern:**
When adding/removing OS, client properties need updates to maintain associations.

---

## Business Rules

### ST* Code Filtering

**Rule:** Item codes starting with "ST" are filtered out in add operations.

**Reason:** ST codes represent stock items that shouldn't appear in billing.

**Implementation:**
```javascript
const filterOutST = (items) => {
  return items.filter(item => !item.codigo?.startsWith('ST'));
};
```

**Location:** `agregar/add_ccjs.js` (see implementation for details)

**Impact:** Reduces lista_precios size by 10-30% typically.

---

### Double Stringify Pattern

**Problem:** Legacy data has `lista_precios` double-stringified:
```javascript
// Double stringified (legacy)
lista_precios: "\"[{\\\"codigo\\\":\\\"ST001\\\"}]\""

// Single stringified (correct)
lista_precios: "[{\"codigo\":\"ST001\"}]"
```

**Detection:**
```javascript
const isDoubleStringified = (str) => {
  return typeof str === 'string' &&
         str.startsWith('"') &&
         str.endsWith('"');
};
```

**Normalization:**
```javascript
const normalizeLista = (value) => {
  let parsed = safeJSON(value, []);
  if (typeof parsed === 'string') {
    parsed = safeJSON(parsed, []);  // Second parse for double-stringified
  }
  return Array.isArray(parsed) ? parsed : [];
};
```

---

### Index-Based Array Removal

**Rule:** When removing multiple items from arrays, collect indices and process in **reverse order**.

**Reason:** Removing from beginning shifts all subsequent indices.

**Correct Pattern:**
```javascript
const indicesToRemove = [2, 5, 7];  // Sorted ascending

// Build patches in reverse
const patches = [];
indicesToRemove.reverse().forEach(index => {
  patches.push({
    op: "remove",
    path: `/schemaInstance/ordenes_de_servicio/${index}`
  });
});
```

**Incorrect Pattern:**
```javascript
// BAD: Indices shift after first removal
[2, 5, 7].forEach(index => {
  patches.push({ op: "remove", path: `/field/${index}` });
});
// After removing index 2, what was at 5 is now at 4!
```

---

## Cotalker API Specifics

### Authorization Headers

All `NWRequest` stages must include:

```javascript
{
  "headers": { "admin": true },
  "defaultAuth": true
}
```

**Explanation:**
- `admin: true`: Bypass certain permission checks
- `defaultAuth: true`: Use bot's service account credentials

**Security Note:** Only use `admin: true` in trusted bot contexts.

---

### Batch Endpoints (`/multi`)

Cotalker provides batch endpoints for bulk operations:

**Pattern:**
```javascript
POST /api/v2/properties/multi/jsonpatch
Body: [
  { _id: "id1", patches: [{...}] },
  { _id: "id2", patches: [{...}] },
  { _id: "id3", patches: [{...}] }
]
```

**Limits:**
- Maximum 100 entities per batch
- Maximum 6MB total payload
- Timeout: 30 seconds

**Error Handling:**
- Batch is atomic: all succeed or all fail
- Partial failures not supported
- Use individual updates if atomicity not required

---

### JSON Patch Endpoint

**Endpoint:** `POST /api/v2/properties/jsonpatch/:propertyId`

**Request Format:**
```javascript
{
  "patches": [
    { "op": "add", "path": "/schemaInstance/field/-", "value": "newValue" },
    { "op": "remove", "path": "/schemaInstance/field/3" },
    { "op": "replace", "path": "/schemaInstance/status", "value": "active" }
  ]
}
```

**Path Syntax:**
- `/schemaInstance/field`: Root field access
- `/schemaInstance/field/0`: Array index access
- `/schemaInstance/field/-`: Array append (add to end)
- `/schemaInstance/nested/deep/field`: Nested object access

**Operations:**
- `add`: Create or append
- `remove`: Delete field or array element
- `replace`: Update existing value
- `move`: Move value from one path to another
- `copy`: Copy value from one path to another
- `test`: Assert value matches (validation)

---

## COTLang Context Specifics

### State Survey Context

This codebase uses **State Survey** triggers, providing this `$VALUE` structure:

```javascript
{
  // Task fields (direct access)
  _id: ObjectId("task123"),
  channel: ObjectId("channel456"),
  taskGroup: ObjectId("group789"),
  status: "pending",

  // Survey answer (nested)
  sentAnswer: {
    data: [
      {
        identifier: "ordenes_de_servicio_asp_fact",
        process: [ObjectId("os1"), ObjectId("os2")],
        responses: [...]
      },
      {
        identifier: "que_realizar_asp_fact",
        process: ["agregar"],
        responses: [...]
      }
    ]
  },

  // Extensions (custom data)
  extensions: {
    activo_facturacion: {
      repuestos_os: [ObjectId("part1"), ObjectId("part2")]
    }
  }
}
```

### Common Survey Identifiers

| Identifier | Type | Purpose |
|------------|------|---------|
| `ordenes_de_servicio_asp_fact` | Property selector | User selects service orders |
| `que_realizar_asp_fact` | Radio button | Action: agregar/modificar/retirar |
| `agregar_precios` | JSON input | Price data for new items |
| `seleccione_repuesto` | Property selector | Select spare part |
| `precio_repuesto_` | Number input | Price for spare part |
| `tipo_cobro` | Dropdown | Charging type |
| `repuestos_no_cobrados` | Property multi-selector | Non-charged items |

### Extraction Patterns

**Get selected service orders:**
```javascript
const osIds = "$VALUE#sentAnswer|data|[find=>identifier=ordenes_de_servicio_asp_fact]|process";
// Returns: [ObjectId("os1"), ObjectId("os2")]
```

**Get selected action:**
```javascript
const action = "$VALUE#sentAnswer|data|[find=>identifier=que_realizar_asp_fact]|process|0";
// Returns: "agregar" or "modificar" or "retirar"
```

**Get JSON input:**
```javascript
const priceData = "$VALUE#sentAnswer|data|[find=>identifier=agregar_precios]|responses|0|[json=>parse]";
// Returns: { precios: [...], descuentos: [...] }
```

---

## Data Flow Patterns

### Add Operation Flow

1. User submits form with new OS data
2. `add_ccjs` stage:
   - Parses `facturacion` field
   - Filters out ST* codes
   - Builds price array
3. `formate_update_os` stage:
   - Computes delta (only new IDs)
   - Generates JSON patches for `ordenes_de_servicio` and `subproperty`
4. `update_asset` stage:
   - Applies JSON Patch to billing asset
5. `patch_multiple_tasks_add` stage:
   - Updates task states in batch via PBScript
6. `update_clients` stage (if needed):
   - Individual client property updates

**Performance:**
- Before optimization: 200+ network calls, 60+ seconds
- After optimization: 3 network calls, <5 seconds

---

### Remove Operation Flow

1. User selects OS to remove
2. `ccjs_subproperty_remove` stage consolidates:
   - OS IDs to remove from `ordenes_de_servicio`
   - Repuesto IDs to remove from `subproperty`
   - Entries to filter from `lista_precios`
   - Client mapping for side-effect updates
3. Single PATCH to billing asset with all changes
4. Individual client updates via iteration (when needed)
5. Batch task state updates (mark as deleted)

**Consolidation benefits:**
- 1 write to asset instead of 3 separate writes
- Atomic update ensures consistency
- Reduced risk of partial failure

---

### Modify Operation Flow

1. User answers survey with price changes, services, non-charged items
2. `consolidate_modify_logic.js` extracts from answers:
   - `seleccione_repuesto`, `precio_repuesto_`, `tipo_cobro` → Price updates
   - `numero_os_servicio`, `servicio_prestado`, `precio_servicio` → Service additions
   - `repuestos_no_cobrados`, `cantidad_utilizada` → Non-charged items
3. Updates `lista_precios` with all modifications
4. Generates replace patch for the entire field

**Design decision:** Uses `op: "replace"` instead of granular patches because:
- Price list structure is complex (nested objects)
- Computing fine-grained diff is expensive
- Full replacement is simpler and more reliable
- Payload size is acceptable (<100KB typically)

See `trade-offs.md` for when full replacement is appropriate.

---

## Debugging and Troubleshooting

### Common Data Issues

**Empty arrays appearing as objects:**
```javascript
// Sometimes API returns {} instead of []
const items = Array.isArray(data.items) ? data.items : [];
```

**Null vs undefined vs empty string:**
```javascript
// Handle all three
const value = data.field || defaultValue;
```

**Missing nested properties:**
```javascript
// Safe navigation
const deep = data?.level1?.level2?.level3 ?? 'default';
```

### Log Analysis

Use `tools/parse_log.py` for truncated Cotalker logs:

```bash
python tools/parse_log.py logs/1767902503994.json
```

**What it does:**
- Recovers truncated JSON
- Extracts stage-by-stage execution
- Highlights errors and warnings
- Shows data flow between stages

### Validation Script

Check trigger syntax before deployment:

```bash
node verify_trigger.js
```

**Checks performed:**
- Valid JavaScript syntax
- COTLang expression validity
- Stage key uniqueness
- Next routing consistency
- Required fields presence

---

## Performance Baselines

### Typical Execution Metrics

| Operation | Stages | Network Calls | Execution Time | Payload Size |
|-----------|--------|---------------|----------------|--------------|
| Add (optimized) | 8 | 3 | 3-5s | 50-200KB |
| Modify (optimized) | 6 | 2 | 2-4s | 30-100KB |
| Remove (optimized) | 7 | 4 | 4-6s | 40-150KB |
| Add (unoptimized) | 15 | 200+ | 60-90s | 8-12MB |

### Data Volume Ranges

**Small deployment:**
- Service orders: 50-100
- Spare parts: 100-300
- Total properties: 200-500

**Medium deployment:**
- Service orders: 200-500
- Spare parts: 500-1500
- Total properties: 1000-2500

**Large deployment:**
- Service orders: 500-2000
- Spare parts: 2000-8000
- Total properties: 5000-15000

Optimizations are **critical** for medium and large deployments.

---

## References

- Cotalker API documentation: (internal)
- COTLang reference: `cotlang-reference.md`
- Optimization patterns: `optimization-patterns.md`
- Trade-off decisions: `trade-offs.md`
