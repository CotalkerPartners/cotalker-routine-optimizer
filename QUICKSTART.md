# Guía de Inicio Rápido - Cotalker Optimizer

## Instalación

```bash
cd /Users/juliocotalker/Develop/cotalker-optimizer
npm install
```

## Uso Básico

### 1. Analizar una Rutina

**Análisis completo (todos los checks):**
```bash
node src/cli.js analyze <ruta-a-tu-rutina.js>
```

Ejemplo:
```bash
node src/cli.js analyze tests/fixtures/original-routine.js
```

### 2. Ver Solo Problemas Críticos

```bash
node src/cli.js analyze <rutina.js> --severity critical
```

Esto te muestra solo:
- Timeouts potenciales (>10 min a 10x growth)
- Payloads >6MB (error 413)
- Loops con 200+ network calls

### 3. Analizar Aspectos Específicos

**Solo memoria/payload:**
```bash
node src/cli.js analyze <rutina.js> --checks payload,patch
```

**Solo timeout/escalabilidad:**
```bash
node src/cli.js analyze <rutina.js> --checks loop,scalability
```

**Checks disponibles:**
- `loop` - Detecta loops con N+1 patterns
- `payload` - Estima tamaños de payloads
- `patch` - Analiza estrategias de JSON Patch
- `scalability` - Proyecta timeouts y crecimiento

### 4. Exportar Resultados en JSON

```bash
node src/cli.js analyze <rutina.js> -f json > reporte.json
```

## Interpretando los Resultados

### Niveles de Severidad

- **🔴 CRITICAL** - Acción inmediata requerida
  - Payload >6MB → Error 413 garantizado
  - Timeout >15min a 10x → Excede límite Lambda

- **🟠 HIGH** - Alta prioridad antes de producción
  - Payload >3MB → Alto riesgo de 413
  - Timeout >5min a 10x → Riesgo de timeout
  - 200+ network calls → Performance crítica

- **🟡 MEDIUM** - Optimización recomendada
  - Payload >1MB → Debería optimizarse
  - 50-200 network calls → Puede mejorar

- **⚪ LOW** - Mejoras menores
  - Código puede ser más eficiente

### Métricas Importantes

**Network Calls:**
- Antes: Total de llamadas en implementación actual
- Después: Llamadas con optimización (batch)
- Reducción: % de mejora esperado

**Payload Size:**
- Antes: Tamaño actual estimado
- Después: Con delta computation
- Reducción: Ahorro de memoria/bandwidth

**Execution Time:**
- Proyección a 10x growth
- Tiempo actual vs optimizado
- Identifica si hay riesgo de timeout

## Ejemplo Práctico

### Problema Detectado:

```
⛔ CRITICAL: FCEach loop contains 5 network request(s) (N+1 query pattern)
  Stage: iterar_remove

  Current: 100 iterations × 5 network calls = 500 total calls
  At 10x: 1,000 iterations × 5 = 5,000 calls (~22 minutes) ⚠️ TIMEOUT

  Recommendation: Convert to batch operation
  Expected after optimization: 1 network call (~5 seconds)
```

### Lo Que Significa:

1. **Problema:** Loop itera 100 veces, cada iteración hace 5 requests HTTP
2. **Impacto Actual:** ~2 minutos de ejecución
3. **Impacto Futuro:** A 10x crecimiento = 22 minutos (excede límite Lambda)
4. **Solución:** Consolidar en 1 batch request + CCJS processing

### Cómo Solucionarlo:

Ver templates en:
- `templates/ccjs/deltaComputation.js` - Para calcular deltas
- `templates/ccjs/jsonPatch.js` - Para generar patches incrementales
- `knowledge/optimization-patterns.md` - Patrones de optimización

## Formatos de Entrada Soportados

La herramienta acepta:

1. **Módulos JavaScript:**
```javascript
module.exports = {
  surveyTriggers: [...]
};
```

2. **MongoDB JSON Export:**
```json
{
  "_id": ObjectId("..."),
  "surveyTriggers": [...]
}
```

Ambos formatos se parsean automáticamente.

## Tips

### Para Rutinas en Producción:

1. **Primero:** Analiza con `--severity critical`
   - Identifica problemas que pueden causar downtime

2. **Segundo:** Revisa proyecciones de escalabilidad
   - ¿A 10x growth sigue funcionando?

3. **Tercero:** Optimiza payload si >1MB
   - Previene errores 413 futuros

### Para Desarrollo:

1. **Durante diseño:** Ejecuta análisis completo
2. **Antes de merge:** Verifica que no haya CRITICAL
3. **Después de cambios:** Compara métricas

## Opciones Avanzadas

### Combinar Filtros

```bash
# Solo críticos de payload y loops
node src/cli.js analyze rutina.js --checks payload,loop --severity critical
```

### Analizar Múltiples Rutinas

```bash
for file in rutinas/*.js; do
  echo "=== Analyzing $file ==="
  node src/cli.js analyze "$file" --severity high
done
```

## Troubleshooting

### Error: "Could not find module.exports"

Tu archivo debe exportar el objeto de configuración:
```javascript
module.exports = { ... };
```

O ser JSON válido con `surveyTriggers`.

### Error: "Failed to parse"

Verifica que tu archivo sea:
- JavaScript válido, o
- JSON válido de MongoDB (con ObjectId, NumberInt, etc.)

### No detecta issues esperados

Verifica que el check esté habilitado:
```bash
node src/cli.js analyze rutina.js --checks loop,payload,patch,scalability
```

## Próximos Pasos

1. **Obtener documentación API Cotalker** - Para mejorar precisión de estimaciones
2. **Versiones de rutinas** - Para comparar antes/después de optimizaciones
3. **Ejecutar en tus rutinas** - Identifica problemas específicos de tu caso

## Contacto

Para bugs o sugerencias, edita directamente el código en:
- `/Users/juliocotalker/Develop/cotalker-optimizer/`

## Referencias

- `README.md` - Documentación completa
- `knowledge/optimization-patterns.md` - Estrategias de optimización
- `knowledge/cotlang-reference.md` - Sintaxis de COTLang
- `templates/` - Ejemplos de código optimizado
