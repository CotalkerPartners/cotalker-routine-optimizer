# Guía de Organización de Archivos

## 📁 Dónde Subir Archivos Según su Propósito

### 1️⃣ Rutinas de Cotalker para Analizar

**Ubicación:** `tests/fixtures/`

```bash
tests/fixtures/
├── original-routine.js          # Ya incluido (ejemplo)
├── optimized-routine.js          # Ya incluido (ejemplo)
├── mi-rutina-facturacion.js      # ← TUS RUTINAS AQUÍ
├── rutina-inventario.js
├── rutina-servicios.js
└── produccion/
    ├── billing-bot-v1.js
    └── billing-bot-v2.js
```

**Comando para analizar:**
```bash
node src/cli.js analyze tests/fixtures/mi-rutina-facturacion.js
```

---

### 2️⃣ Documentación de Cotalker API

**Ubicación:** `knowledge/cotalker-api/`

```bash
knowledge/
├── cotlang-reference.md          # Ya incluido
├── optimization-patterns.md      # Ya incluido
├── anti-patterns.json            # Ya incluido
└── cotalker-api/                 # ← CREA ESTE DIRECTORIO
    ├── api-reference.md          # Documentación de endpoints
    ├── stage-types.md            # Tipos de stages (FCEach, NWRequest, etc.)
    ├── limits.md                 # Límites AWS Lambda, payload sizes
    ├── batch-operations.md       # Endpoints /multi, batch patterns
    └── examples/
        ├── network-request.json
        └── ccjs-examples.json
```

**Cómo crear el directorio:**
```bash
cd /Users/juliocotalker/Develop/cotalker-optimizer
mkdir -p knowledge/cotalker-api/examples
```

**Tipo de contenido:**
- Documentación de endpoints API de Cotalker
- Límites de payload (6MB, etc.)
- Tipos de stages disponibles
- Ejemplos de configuración

---

### 3️⃣ Templates de Código Optimizado

**Ubicación:** `templates/`

```bash
templates/
├── ccjs/
│   ├── safeJSON.js              # Ya incluido
│   ├── deltaComputation.js      # Ya incluido
│   ├── jsonPatch.js             # Ya incluido
│   └── batchOperations.js       # ← NUEVOS TEMPLATES AQUÍ
│       └── clientUpdate.js
└── stages/
    ├── error-handler.json       # Ya incluido
    ├── bypass-switch.json       # Ya incluido
    └── batch-request.json       # ← NUEVOS TEMPLATES AQUÍ
```

**Tipo de contenido:**
- Fragmentos de código CCJS reutilizables
- Configuraciones de stages optimizadas
- Patrones de batch operations

---

### 4️⃣ Configuraciones de Detección

**Ubicación:** `knowledge/anti-patterns.json`

Para agregar más patrones detectables, edita:

```bash
knowledge/anti-patterns.json
```

**Ejemplo de nuevo patrón:**
```json
{
  "patterns": [
    {
      "id": "TU_NUEVO_PATRON",
      "severity": "HIGH",
      "detect": {
        "stageType": "NWRequest",
        "urlPattern": "/api/v2/properties/(?!jsonpatch)"
      },
      "message": "Descripción del problema",
      "recommendation": "Cómo solucionarlo",
      "reference": "documentation.md:line"
    }
  ]
}
```

---

### 5️⃣ Versiones de Rutinas (Antes/Después)

**Ubicación:** `tests/fixtures/versions/`

```bash
tests/fixtures/versions/
├── billing-bot/
│   ├── v1-original.js           # Versión sin optimizar
│   ├── v2-optimized.js          # Versión optimizada
│   └── comparison-report.json   # Resultados de análisis
└── inventory-bot/
    ├── v1-original.js
    └── v2-optimized.js
```

**Cómo crear:**
```bash
mkdir -p tests/fixtures/versions/billing-bot
mkdir -p tests/fixtures/versions/inventory-bot
```

**Uso:**
```bash
# Analizar versión original
node src/cli.js analyze tests/fixtures/versions/billing-bot/v1-original.js

# Analizar versión optimizada
node src/cli.js analyze tests/fixtures/versions/billing-bot/v2-optimized.js

# Comparar resultados
diff <(node src/cli.js analyze v1-original.js -f json) \
     <(node src/cli.js analyze v2-optimized.js -f json)
```

---

### 6️⃣ Logs de Cotalker para Análisis

**Ubicación:** `logs/`

```bash
logs/
├── 1767902503994.json           # Ya incluido (ejemplo)
└── production/                  # ← LOGS DE PRODUCCIÓN AQUÍ
    ├── 2024-01-14-error-413.json
    ├── 2024-01-15-timeout.json
    └── analysis/
        └── parsed-errors.json
```

**Herramienta existente:**
```bash
# Ya tienes el parser de logs
python tools/parse_log.py logs/production/2024-01-14-error-413.json
```

---

### 7️⃣ Datos de Estimación (Opcional)

**Ubicación:** `knowledge/data-estimates.json`

Para mejorar precisión de estimaciones:

```bash
knowledge/data-estimates.json
```

**Contenido:**
```json
{
  "averageSizes": {
    "ordenServicio": 750,
    "repuesto": 300,
    "cliente": 200,
    "listaPrecios": 200
  },
  "typicalCounts": {
    "ordenesServicio": 100,
    "repuestosPorOS": 5,
    "clientesUnicos": 20
  },
  "apiLimits": {
    "lambdaPayload": 6291456,
    "lambdaTimeout": 900000,
    "requestTimeout": 30000
  }
}
```

---

## 📋 Estructura Recomendada Final

```
cotalker-optimizer/
├── tests/fixtures/
│   ├── original-routine.js       ✓ Ejemplo
│   ├── optimized-routine.js      ✓ Ejemplo
│   ├── TUS_RUTINAS_AQUI/         ← Subir aquí
│   └── versions/                 ← Versiones comparativas
│
├── knowledge/
│   ├── cotalker-api/             ← Docs de Cotalker
│   │   ├── api-reference.md
│   │   ├── stage-types.md
│   │   └── examples/
│   ├── data-estimates.json       ← Métricas reales
│   └── anti-patterns.json        ← Editar para nuevos patrones
│
├── templates/
│   ├── ccjs/                     ← Nuevos templates CCJS
│   └── stages/                   ← Nuevos templates de stages
│
└── logs/
    └── production/               ← Logs de producción
```

---

## 🚀 Comandos Rápidos

### Analizar Nueva Rutina

```bash
# Copiar tu rutina
cp /ruta/a/tu/rutina.js tests/fixtures/mi-rutina.js

# Analizar
node src/cli.js analyze tests/fixtures/mi-rutina.js
```

### Agregar Documentación

```bash
# Crear directorio si no existe
mkdir -p knowledge/cotalker-api

# Agregar documentación
cp /ruta/a/docs-cotalker.md knowledge/cotalker-api/api-reference.md
```

### Agregar Template

```bash
# Agregar nuevo template CCJS
nano templates/ccjs/mi-template.js

# Agregar nuevo template de stage
nano templates/stages/mi-stage.json
```

---

## 💡 Tips

1. **Rutinas**: Mantén nombres descriptivos
   - ✅ `billing-bot-v2-optimized.js`
   - ❌ `rutina1.js`

2. **Versiones**: Usa estructura clara
   - `v1-original.js` vs `v2-optimized.js`
   - Incluye fecha: `2024-01-15-billing-optimized.js`

3. **Documentación**: Estructura por temas
   - `api-reference.md` - Endpoints
   - `stage-types.md` - Tipos de stages
   - `limits.md` - Límites técnicos

4. **Templates**: Comenta bien el código
   - Incluye ejemplo de uso
   - Documenta parámetros
   - Muestra input/output esperado

---

## ❓ Preguntas Frecuentes

**P: ¿Puedo analizar rutinas fuera del proyecto?**
R: Sí, usa rutas absolutas:
```bash
node src/cli.js analyze /ruta/completa/a/rutina.js
```

**P: ¿Cómo organizo múltiples proyectos?**
R: Crea subdirectorios en fixtures:
```bash
tests/fixtures/
├── proyecto-a/
├── proyecto-b/
└── proyecto-c/
```

**P: ¿Dónde guardo resultados de análisis?**
R: Crea directorio de reportes:
```bash
mkdir -p reports
node src/cli.js analyze rutina.js -f json > reports/analisis-2024-01-15.json
```

---

## 📞 Siguiente Paso

Cuando subas archivos nuevos:

1. **Rutinas nuevas** → `tests/fixtures/`
2. **Docs Cotalker** → `knowledge/cotalker-api/`
3. **Templates** → `templates/ccjs/` o `templates/stages/`
4. **Configuración** → `knowledge/anti-patterns.json` o `knowledge/data-estimates.json`

**¡Y analiza!** 🚀
```bash
node src/cli.js analyze tests/fixtures/TU_ARCHIVO.js
```
