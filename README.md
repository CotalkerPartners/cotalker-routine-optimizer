# Cotalker Routine Optimizer

Asistente inteligente para optimización de rutinas Cotalker, diseñado para usarse con **Claude Code CLI**.

Este proyecto detecta anti-patterns, valida endpoints y rutinas referenciadas, estima payloads, y genera versiones optimizadas de rutinas de forma interactiva.

## Características

- **Análisis guiado por conocimiento**: Claude Code usa `knowledge/` base para detectar anti-patterns
- **Validación en tiempo real**: Verifica endpoints con curl, rutinas referenciadas vía API, sintaxis COTLang
- **Optimización inteligente**: Propone y genera optimizaciones basadas en patrones probados
- **Templates reutilizables**: CCJS snippets y stage configs para optimizaciones comunes
- **Context-aware**: Cada company tiene su token, las rutinas se cargan manualmente

## Casos de uso reales resueltos

- AWS Lambda `RequestEntityTooLargeException` (413) por payloads >6MB
- Timeouts por N+1 queries (FCEach loops con NWRequest)
- Problemas de escalabilidad bajo crecimiento de datos

## Instalación

```bash
npm install
```

## Uso con Claude Code

### 1. Exporta tu rutina desde MongoDB

Desde tu MongoDB de Cotalker, exporta la rutina que quieres optimizar:

```bash
# Opción A: Usando MongoDB Compass
# 1. Abre collection "routines"
# 2. Encuentra tu rutina
# 3. Click derecho → Copy Document
# 4. Pega en un archivo .json

# Opción B: Usando mongosh
mongosh "mongodb://..."
use cotalker_db
db.routines.findOne({_id: ObjectId("...")})
# Copia el output

# Opción C: Usando mongoexport
mongoexport --db cotalker_db --collection routines \
  --query '{"_id": {"$oid": "..."}}' \
  --out routine.json
```

### 2. Coloca la rutina en `routines/input/current.json`

```bash
cp ~/Downloads/mi-rutina-exportada.json routines/input/current.json
```

**IMPORTANTE**:
- Cada company de Cotalker tiene su propio token de API, por eso debes cargar las rutinas manualmente
- Este archivo NO se commitea a git (.gitignore configurado)
- Puede contener datos sensibles

### 3. Trabaja directamente con Claude Code

**No necesitas ejecutar comandos CLI**. Simplemente interactúa con Claude Code en este proyecto:

```
Tú: "Revisa @routines/input/current.json y detecta anti-patterns"

Claude Code:
- Lee el JSON
- Carga knowledge base completa
- Analiza usando patrones definidos
- Reporta problemas con severidad y recomendaciones

Tú: "Optimiza los loops con network calls"

Claude Code:
- Identifica N+1 patterns
- Valida endpoints con curl si es necesario
- Genera versión optimizada
- Guarda en nueva sesión: .sessions/2026-01-27_14-30-22/
  ├── input.json (copia original)
  ├── optimized.json (versión mejorada)
  ├── analysis.md (análisis detallado)
  └── changes.diff (diferencias)

Tú: "Valida que todos los endpoints existan"

Claude Code:
- Extrae todos los NWRequest
- Ejecuta curl para cada endpoint
- Reporta cuáles existen y cuáles no
```

### 4. Archivos generados se organizan automáticamente

Todos los archivos generados durante una optimización van a `.sessions/`:

```
.sessions/
├── 2026-01-27_14-30-22/        # Primera optimización
│   ├── README.md
│   ├── input.json
│   ├── optimized.json
│   ├── analysis.md
│   └── changes.diff
│
├── 2026-01-27_15-08-15/        # Segunda optimización
│   └── ...
│
└── latest -> 2026-01-27_15-08-15/  # Symlink a última
```

**Beneficios**:
- ✅ Root del repo siempre limpio
- ✅ Historial de optimizaciones
- ✅ Fácil de revisar cada sesión
- ✅ Fácil de limpiar: `rm -rf .sessions/*`

## Estructura del proyecto

```
cotalker-routine-optimizer/
├── routines/
│   └── input/
│       ├── current.json            # ← COLOCA TU RUTINA AQUÍ
│       └── README.md               # Instrucciones de export
│
├── .sessions/                      # Archivos generados (auto-creado, en .gitignore)
│   ├── 2026-01-27_14-30-22/        # Cada optimización = carpeta con timestamp
│   │   ├── README.md               # Metadata de la sesión
│   │   ├── input.json              # Copia de rutina original
│   │   ├── optimized.json          # Rutina optimizada
│   │   ├── analysis.md             # Análisis detallado
│   │   ├── changes.diff            # Diferencias
│   │   └── ...otros archivos...
│   ├── 2026-01-27_15-08-15/
│   └── latest -> 2026-01-27_15-08-15/  # Symlink a última sesión
│
├── knowledge/                      # Knowledge base (Claude Code lee todo)
│   ├── optimization-patterns.md    # Patrones de optimización probados
│   ├── anti-patterns.json          # Anti-patterns a detectar
│   ├── cotlang-reference.md        # Sintaxis COTLang V3
│   ├── cotalker-api-reference.md   # Referencia API Cotalker
│   ├── domain-specific.md          # Conocimiento del dominio
│   ├── trade-offs.md               # Trade-offs de optimización
│   └── cotalker-routines.md        # Conocimiento completo de plataforma
│
├── templates/                      # Templates para código generado
│   ├── ccjs/                       # Snippets JavaScript reutilizables
│   │   ├── safeJSON.js
│   │   ├── deltaComputation.js
│   │   └── jsonPatch.js
│   └── stages/                     # Configuraciones de stages
│       ├── error-handler.json
│       └── bypass-switch.json
│
├── src/
│   ├── parsers/
│   │   └── routine-parser.js       # Parser de rutinas (utilidad opcional)
│   ├── utils/
│   │   ├── session-manager.js      # Manejo de sesiones de optimización
│   │   ├── logger.js
│   │   └── file-finder.js
│   └── cli.js                      # CLI minimalista (opcional)
│
└── tests/
    ├── fixtures/
    │   ├── original-routine.js     # Test input
    │   └── optimized-routine.js    # Expected output
    └── parsers/                    # Tests unitarios
```

## Knowledge Base

Claude Code lee automáticamente toda la carpeta `knowledge/` para entender:

### Archivos de conocimiento

- **`optimization-patterns.md`**: Guía completa de optimización Cotalker
  - Patrones probados del repositorio `rutinas Cotalker`
  - COTLang V3 reference completo
  - Estrategias de data flow y robustez

- **`anti-patterns.json`**: Definición estructurada de anti-patterns
  - N+1 queries (FCEach + NWRequest)
  - Full array replacements
  - Missing error handlers
  - Nested loops

- **`cotlang-reference.md`**: Sintaxis COTLang V3
  - Comandos ($VALUE, $OUTPUT, $JOIN, etc.)
  - Funciones ([find=>], [filter=>], etc.)
  - Contextos (StateSurvey, StateTask, etc.)

- **`cotalker-api-reference.md`**: API Cotalker
  - Endpoints disponibles
  - Batch operations (`/multi`)
  - Rate limits y mejores prácticas

- **`domain-specific.md`**: Conocimiento del dominio
  - Modelos de datos comunes
  - Workflows típicos

- **`trade-offs.md`**: Trade-offs de optimización
  - Cuándo usar cada pattern
  - Pros y contras

- **`cotalker-routines.md`**: Guía completa de la plataforma Cotalker
  - Todos los bot types disponibles (categorías completas)
  - COTLang operadores y funciones
  - Patrones de optimización comunes
  - Checklist de análisis de rutinas
  - Contextos según trigger (Slash Command, Survey, Workflow, SLA, Schedule)
  - Notas técnicas (variables, timeout, librerías disponibles en CCJS)

### Estrategias clave de optimización

1. **JSON Patch Incrementales**: `op: "add"` con `path: "/-"` en vez de reemplazo completo
2. **Delta Processing**: Computar y enviar solo items nuevos (Set-based dedup)
3. **Loop Linearization**: FCEach → batch via `/multi` endpoints
4. **CCJS Consolidation**: Merge de stages similares en single-pass
5. **Bypass Switches**: Checks condicionales para saltar operaciones vacías
6. **Error Handling**: Routing centralizado de errores

## Ejemplos de interacción

### Ejemplo 1: Detección y optimización de N+1

```
Usuario: "Analiza esta rutina y detecta problemas"

Claude Code:
✅ Rutina parseada: 61 stages, 25 network requests, 5 loops
⚠️  CRITICAL: N+1 query pattern detectado
   Stage: iterar_propiedades
   Pattern: FCEach → NWRequest
   Estimado: 200+ network calls

   Recomendación: Usar endpoint batch /multi

Usuario: "Optimízalo"

Claude Code:
[Genera código optimizado usando templates/ccjs/deltaComputation.js]
✅ Optimización completa
   - Network calls: 200 → 1
   - Payload reducido: 8MB → 500KB
   - Archivo guardado: routines/output/optimized-20260127.js
```

### Ejemplo 2: Validación de endpoints

```
Usuario: "Valida que todos los endpoints existan"

Claude Code:
Validando endpoints con curl...
✅ GET /api/v2/properties - 200 OK
✅ POST /api/v2/survey/instance - 200 OK
❌ GET /api/v2/oldendpoint - 404 Not Found

⚠️  El endpoint /api/v2/oldendpoint no existe.
   ¿Era un endpoint antiguo? ¿Debería usar otro?
```

### Ejemplo 3: Validación de rutinas referenciadas

```
Usuario: "Verifica las rutinas que ejecuta este workflow"

Claude Code:
Detectadas 2 rutinas referenciadas:
1. 507f1f77bcf86cd799439011 (en stage: ejecutar_validacion)
2. 60a1b2c3d4e5f678901234ab (en stage: proceso_secundario)

Validando con API...
✅ Rutina 507f1f77bcf86cd799439011 existe: "Validación de datos"
❌ Rutina 60a1b2c3d4e5f678901234ab no encontrada

⚠️  La rutina proceso_secundario referencia una rutina que no existe.
   ¿Fue eliminada? ¿Necesitas actualizarla?
```

## Validación en tiempo real

Claude Code puede validar proactivamente:

### 1. Endpoints con curl
```javascript
// Stage con endpoint dudoso
{
  "url": "/api/v2/some/endpoint",
  "method": "POST"
}

// Claude Code ejecuta:
curl -X POST https://www.cotalker.com/api/v2/some/endpoint -I

// Y reporta si existe o no
```

### 2. Rutinas referenciadas
```javascript
// Stage que ejecuta otra rutina
{
  "name": "PBRoutine",
  "data": {
    "routine": "507f1f77bcf86cd799439011"
  }
}

// Claude Code valida con API Cotalker que existe
```

### 3. Sintaxis COTLang
```javascript
// Expresión potencialmente incorrecta
"$VALUE#data|[find=identifier=campo]"  // ❌ Sintaxis incorrecta

// Claude Code detecta y sugiere:
"$VALUE#data|[find=>identifier=campo]" // ✅ Sintaxis correcta
```

## Testing

```bash
npm test
```

Run specific test suite:
```bash
npm test -- tests/parsers/routine-parser.test.js
```

## Development

```bash
# Watch mode
npm run test:watch

# Lint
npm run lint
```

## IMPORTANTE: Seguridad

- **Cada company de Cotalker tiene su propio token**
- **Las rutinas pueden contener datos sensibles**
- **NUNCA commitees `routines/input/*.js` ni `routines/output/*.js` a git**
- El .gitignore ya está configurado para ignorar estos archivos
- Solo commitea: código fuente, knowledge base, templates

## Workflow típico

1. **Exportar rutina** desde MongoDB de tu company
2. **Guardar** en `routines/input/current.json`
3. **Interactuar con Claude Code** directamente en este proyecto:
   ```
   "Revisa @routines/input/current.json y detecta anti-patterns"
   "Optimiza los loops con network calls"
   "Valida que los endpoints existan"
   ```
4. **Claude Code automáticamente**:
   - Crea nueva sesión en `.sessions/TIMESTAMP/`
   - Analiza usando knowledge base
   - Valida con curl/API cuando sea necesario
   - Genera archivos optimizados organizados
5. **Revisar** resultados en `.sessions/latest/`
   - `optimized.json` - Rutina lista para usar
   - `analysis.md` - Explicación de cambios
   - `changes.diff` - Diferencias visuales
6. **Importar** rutina optimizada a MongoDB (manualmente tras testing)

## License

MIT

## Author

Julio Cotalker
