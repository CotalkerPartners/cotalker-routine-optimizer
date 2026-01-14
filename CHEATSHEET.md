# Cheatsheet - Cotalker Optimizer

## Comandos Principales

```bash
# Análisis completo
node src/cli.js analyze <archivo.js>

# Solo críticos (problemas que causan downtime)
node src/cli.js analyze <archivo.js> --severity critical

# Solo problemas de memoria/payload
node src/cli.js analyze <archivo.js> --checks payload,patch

# Solo problemas de timeout
node src/cli.js analyze <archivo.js> --checks loop,scalability

# Exportar a JSON
node src/cli.js analyze <archivo.js> -f json > reporte.json
```

## Severidades

| Nivel | Significado | Acción |
|-------|-------------|--------|
| 🔴 CRITICAL | Error garantizado (413 o timeout) | Arreglar AHORA |
| 🟠 HIGH | Alto riesgo de fallo | Arreglar antes de producción |
| 🟡 MEDIUM | Debería optimizarse | Planear mejora |
| ⚪ LOW | Optimización menor | Nice to have |

## Tipos de Problemas

### Memoria (Error 413)
- `LARGE_PAYLOAD` - Payload >6MB
- `FULL_ARRAY_PATCH` - Enviando array completo vs delta
- `MISSING_DELTA_COMPUTATION` - Sin deduplicación

**Solución:** Delta computation + JSON Patch incremental

### Timeout
- `ITERATION_WITH_NETWORK_CALLS` - N+1 pattern en loops
- `GROWTH_PROJECTION` - Timeout a 10x growth
- `NESTED_FCEACH_LOOPS` - Loops anidados O(n²)

**Solución:** Batch operations + linearización

### Performance
- `ARRAY_INCLUDES_IN_LOOP` - O(n²) con includes
- `MISSING_OPTIMIZATION` - Sin Set-based filtering
- `HIGH_NETWORK_USAGE` - Demasiados requests

**Solución:** Set operations + consolidación

## Checks Disponibles

| Check | Detecta | Ejemplo |
|-------|---------|---------|
| `loop` | FCEach con network calls | N+1 queries |
| `payload` | Tamaño de payloads | >6MB = 413 |
| `patch` | Estrategia de patches | Full array vs delta |
| `scalability` | Proyecciones de timeout | 10x growth |

## Métricas Clave

### Network Calls
```
Antes: 850 calls
Después: 5 calls
Reducción: 99%
```
**Interpretación:** 850 requests HTTP → 5 (batch)

### Payload Size
```
Antes: 8.2 MB
Después: 450 KB
Reducción: 95%
```
**Interpretación:** Evita error 413 (límite 6MB)

### Execution Time
```
Antes: ~213 segundos (3.5 min)
Después: ~6 segundos
Reducción: 97%
```
**Interpretación:** Evita timeout

### Proyección 10x
```
Current: 2 min
10x: 22 min ⚠️ EXCEDE LÍMITE
Optimized: 27 sec
```
**Interpretación:** Fallará a escala sin optimización

## Interpretación Rápida

### ✅ TODO OK
```
✓ No issues found!
```
Rutina bien optimizada.

### ⚠️ AVISOS
```
Found 15 issue(s)
  Critical: 0
  High: 2
  Medium: 10
  Low: 3
```
Revisar HIGH, optimizar MEDIUM cuando sea posible.

### 🔴 PELIGRO
```
Found 32 issue(s)
  Critical: 2  ← ACCIÓN INMEDIATA
  High: 6
  Medium: 19
  Low: 5
```
Arreglar CRITICAL antes de deploy.

## Soluciones Comunes

### Loop con Network Calls

**Antes:**
```javascript
{
  "key": "iterar_",
  "name": "FCEach",
  "data": { "control": "$VALUE#uuids" },
  "next": { "STEP": "fetch_data" }  // ← NWRequest
}
```

**Después:**
```javascript
// 1. CCJS prepara batch
{
  "key": "prepare_batch",
  "name": "CCJS",
  "data": {
    "src": "const query = data.uuids.map(id => `_id=${id}`).join('&'); return { query };"
  }
}

// 2. Single NWRequest
{
  "key": "fetch_batch",
  "name": "NWRequest",
  "data": {
    "url": "$JOIN##($ENV#BASEURL)#/api/v2/answers?#($OUTPUT#prepare_batch#data|query)"
  }
}
```

### Full Array Patch

**Antes:**
```javascript
{
  "body": [{
    "op": "add",
    "path": "/ordenes_de_servicio",
    "value": "$OUTPUT#ccjs#data|allOrders"  // ← Array completo
  }]
}
```

**Después:**
```javascript
// CCJS computa delta
const currentSet = new Set(asset.ordenes_de_servicio);
const delta = incoming.filter(id => !currentSet.has(id));
const jsonPatch = delta.map(id => ({
  op: "add",
  path: "/ordenes_de_servicio/-",  // ← Incremental
  value: id
}));
return { jsonPatch };
```

### Delta Computation Template

```javascript
// Copiar de templates/ccjs/deltaComputation.js
const safeJSON = (val, def) => {
  if (val == null) return def;
  try { return JSON.parse(val); } catch { return def; }
};

const current = Array.isArray(data.current) ? data.current : [];
const incoming = Array.isArray(data.incoming) ? data.incoming : [];

const currentSet = new Set(current);
const delta = incoming.filter(id => !currentSet.has(id));

return { delta, hasDelta: delta.length > 0 };
```

## Referencias Rápidas

| Documento | Contenido |
|-----------|-----------|
| `QUICKSTART.md` | Guía completa de uso |
| `README.md` | Documentación técnica |
| `knowledge/optimization-patterns.md` | Patrones de optimización |
| `templates/ccjs/*.js` | Código reutilizable |

## Workflow Recomendado

1. **Analizar:** `node src/cli.js analyze rutina.js`
2. **Filtrar críticos:** `--severity critical`
3. **Ver soluciones:** Leer `recommendation` de cada issue
4. **Aplicar templates:** Copiar de `templates/`
5. **Re-analizar:** Verificar mejoras

## Tips

💡 **Usa --severity critical para QA rápido**
💡 **Exporta JSON para integrar en CI/CD**
💡 **Compara antes/después con las métricas**
💡 **Templates en templates/ son copy-paste ready**
