# Validate Endpoints

Valida que todos los endpoints usados en la rutina existan y estén accesibles.

## Usage

```
/validate-endpoints
```

## What this skill does

1. **Lee la rutina** desde `routines/input/current.json`
2. **Extrae todos los endpoints** de stages `NWRequest`
3. **Ejecuta curl** para cada endpoint único
4. **Reporta status**:
   - ✅ 200/201: Endpoint OK
   - ⚠️ 404: Endpoint no existe
   - ⚠️ 403: Sin permisos
   - ❌ Error de conexión
5. **Identifica endpoints deprecados o problemáticos**
6. **Guarda reporte** en sesión

## Steps to follow

### 1. Read routine and extract endpoints

```javascript
import { readFileSync } from 'fs';

const routine = JSON.parse(readFileSync('routines/input/current.json', 'utf-8'));

// Extract all NWRequest stages
function extractEndpoints(routine) {
  const endpoints = [];
  const stages = routine.surveyTriggers?.[0]?.triggers?.[0]?.stages || [];

  for (const stage of stages) {
    if (stage.name === 'NWRequest') {
      const url = stage.data?.url || '';
      const method = stage.data?.method || 'GET';

      // Parse URL (may contain COTLang expressions)
      let cleanUrl = url;

      // Remove COTLang variables for validation
      cleanUrl = cleanUrl.replace(/\$OUTPUT#[^#\s]+#[^\s\)]+/g, '{OUTPUT}');
      cleanUrl = cleanUrl.replace(/\$VALUE#[^\s\)]+/g, '{VALUE}');
      cleanUrl = cleanUrl.replace(/\$VAR#[^\s\|\)]+/g, '{VAR}');
      cleanUrl = cleanUrl.replace(/\$ENV#BASEURL/g, 'https://www.cotalker.com');
      cleanUrl = cleanUrl.replace(/\$JOIN#[^#]+#/g, '');

      // Parse path
      const urlParts = cleanUrl.match(/\/api\/v\d+\/[^\s\?]*/);
      if (urlParts) {
        endpoints.push({
          stage: stage.key,
          method,
          path: urlParts[0],
          fullUrl: cleanUrl,
          originalUrl: url
        });
      }
    }
  }

  return endpoints;
}

const endpoints = extractEndpoints(routine);
```

### 2. Validate each endpoint with curl

```javascript
import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);

async function validateEndpoint(endpoint) {
  const baseUrl = 'https://www.cotalker.com';
  const url = baseUrl + endpoint.path;

  try {
    // Use HEAD request if possible, fallback to method specified
    const method = endpoint.method === 'GET' ? 'HEAD' : endpoint.method;
    const { stdout } = await execAsync(`curl -I -X ${method} "${url}" -s -w "\\n%{http_code}"`);

    // Extract status code
    const lines = stdout.trim().split('\n');
    const statusCode = lines[lines.length - 1];

    return {
      ...endpoint,
      status: parseInt(statusCode),
      exists: statusCode.startsWith('2') || statusCode.startsWith('3'),
      error: null
    };
  } catch (error) {
    return {
      ...endpoint,
      status: null,
      exists: false,
      error: error.message
    };
  }
}

// Validate all endpoints
const results = await Promise.all(
  endpoints.map(ep => validateEndpoint(ep))
);
```

### 3. Categorize results

```javascript
const successful = results.filter(r => r.exists);
const notFound = results.filter(r => r.status === 404);
const forbidden = results.filter(r => r.status === 403);
const errors = results.filter(r => r.error);

console.log(`
Validation Results:
✅ ${successful.length} endpoints OK
⚠️  ${notFound.length} endpoints not found (404)
⚠️  ${forbidden.length} endpoints forbidden (403)
❌ ${errors.length} connection errors
`);
```

### 4. Check for common issues

```javascript
// Check for deprecated endpoints
const deprecatedPatterns = [
  '/api/v1/',           // Old API version
  '/api/v2/answers',    // Often deprecated
  '/external/',         // External endpoints may change
];

const deprecated = results.filter(r =>
  deprecatedPatterns.some(pattern => r.path.includes(pattern))
);

if (deprecated.length > 0) {
  console.warn('⚠️  Found potentially deprecated endpoints:');
  deprecated.forEach(d => {
    console.warn(`  - ${d.path} (stage: ${d.stage})`);
  });
}

// Check for batch alternatives
const loopEndpoints = results.filter(r =>
  r.path.includes('/{') || r.originalUrl.includes('$VAR')
);

if (loopEndpoints.length > 0) {
  console.log('💡 These endpoints are used in loops - consider batch alternatives:');
  loopEndpoints.forEach(e => {
    const batchPath = e.path.replace(/\/\{[^\}]+\}/, '/multi');
    console.log(`  - ${e.path} → ${batchPath}?`);
  });
}
```

### 5. Create session and save report

```javascript
import { createSession, saveToSession } from './src/utils/session-manager.js';

const session = createSession();

// Save validation report
const report = generateValidationReport(results, deprecated);
saveToSession('validation-report.md', report, session);

// Save machine-readable results
saveToSession('endpoints.json', JSON.stringify(results, null, 2), session);
```

### 6. Generate validation report

Format as Markdown:
```markdown
# Endpoint Validation Report

**Generated**: 2026-01-27 14:30:22
**Total Endpoints**: 15

## Summary

- ✅ **12 endpoints OK** (200/201)
- ⚠️  **2 endpoints not found** (404)
- ⚠️  **1 endpoint forbidden** (403)
- ❌ **0 connection errors**

## Results by Status

### ✅ Successful (200/201)

| Stage | Method | Path | Status |
|-------|--------|------|--------|
| get_properties | GET | /api/v2/properties | 200 |
| get_survey | GET | /api/v2/survey/instance | 200 |
| update_task | PATCH | /api/v2/task/instance | 200 |
| ... | ... | ... | ... |

### ⚠️  Not Found (404)

| Stage | Method | Path | Issue |
|-------|--------|------|-------|
| fetch_old_data | GET | /api/v2/oldendpoint | Endpoint no existe |
| get_legacy_info | GET | /api/v1/properties | API v1 deprecada |

**Action Required**:
- `fetch_old_data`: Este endpoint fue eliminado. ¿Usar `/api/v2/properties` en su lugar?
- `get_legacy_info`: API v1 está deprecada. Migrar a `/api/v2/properties`

### ⚠️  Forbidden (403)

| Stage | Method | Path | Issue |
|-------|--------|------|-------|
| admin_operation | POST | /api/v2/admin/settings | Sin permisos admin |

**Action Required**:
- Verificar permisos del token usado
- Este endpoint requiere rol admin

## Potentially Deprecated Endpoints

⚠️  **2 endpoints may be deprecated**:

1. `/api/v1/properties` (stage: get_legacy_info)
   - API v1 is deprecated, use v2

2. `/api/v2/answers` (stage: fetch_answers)
   - This endpoint is often deprecated, verify it's still supported

## Batch Operation Opportunities

💡 **3 endpoints are used in loops** - consider batch alternatives:

1. `/api/v2/properties/{id}` → `/api/v2/properties/multi`
   - Stage: `fetch_property` (in loop `iterar_propiedades`)
   - Benefit: 200 calls → 1 call

2. `/api/v2/task/instance/{id}` → `/api/v2/task/instance/multi`
   - Stage: `update_task_item` (in loop `iterar_tasks`)
   - Benefit: 50 calls → 1 call

## Recommendations

1. **Fix 404s**: Update or remove stages using non-existent endpoints
2. **Check 403s**: Verify token permissions
3. **Consider batch**: Replace loop endpoints with `/multi` variants
4. **Deprecation check**: Migrate from v1 to v2 APIs
5. **Re-validate**: After making changes, run `/validate-endpoints` again
```

### 7. Display summary

```
✅ Validación de endpoints completa

Resultados:
✅ 12 endpoints OK
⚠️  2 endpoints no encontrados (404)
⚠️  1 endpoint sin permisos (403)

Issues críticos:
1. /api/v2/oldendpoint (404) - Stage: fetch_old_data
   → Endpoint eliminado, considerar alternativa

2. /api/v2/admin/settings (403) - Stage: admin_operation
   → Sin permisos admin

Oportunidades de optimización:
💡 3 endpoints usados en loops
   Considera usar batch alternatives (/multi)

Reporte completo:
.sessions/latest/validation-report.md
.sessions/latest/endpoints.json
```

## Important notes

- **Use HEAD requests** when possible (faster than GET/POST)
- **Handle COTLang variables** - replace with placeholders for validation
- **Check for batch alternatives** - suggest `/multi` endpoints for loops
- **Identify deprecated patterns** - API v1, old paths, etc.
- **Respect rate limits** - don't spam the API
- **Parse carefully** - URLs may contain complex COTLang expressions

## Common COTLang patterns in URLs

```javascript
// $ENV#BASEURL
"$ENV#BASEURL#/api/v2/properties"
→ "https://www.cotalker.com/api/v2/properties"

// $JOIN
"$JOIN#/#($ENV#BASEURL)#api#v2#properties"
→ "https://www.cotalker.com/api/v2/properties"

// $OUTPUT (replace with placeholder)
"/api/v2/properties/$OUTPUT#get_id#data|_id"
→ "/api/v2/properties/{OUTPUT}"

// $VAR (replace with placeholder)
"/api/v2/properties/$VAR#item|_id"
→ "/api/v2/properties/{VAR}"
```

## Output structure

```
.sessions/TIMESTAMP/
├── validation-report.md   # Human-readable report
└── endpoints.json         # Machine-readable results
```

## When to ask user

- If endpoint returns 404 and you're unsure of alternative
- If token is needed for validation (403)
- If you find multiple deprecated endpoints and need guidance on migration
