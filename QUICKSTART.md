# Quick Start - Cotalker Routine Optimizer

Asistente inteligente para optimizar rutinas Cotalker con Claude Code.

## Setup (una vez)

```bash
npm install
```

## Workflow básico

### 1. Exporta tu rutina desde MongoDB

```bash
# MongoDB Compass: Click derecho → Copy Document
# O usando mongosh:
db.routines.findOne({_id: ObjectId("...")})
```

### 2. Guárdala en el proyecto

```bash
cp ~/Downloads/mi-rutina.json routines/input/current.json
```

### 3. Trabaja con Claude Code

```
"Revisa @routines/input/current.json y optimízala"
```

Claude Code automáticamente:
- ✅ Analiza usando knowledge base
- ✅ Detecta anti-patterns
- ✅ Valida endpoints con curl
- ✅ Genera versión optimizada
- ✅ Guarda todo en `.sessions/TIMESTAMP/`

### 4. Revisa resultados

```bash
ls .sessions/latest/
# - optimized.json  (rutina mejorada)
# - analysis.md     (qué cambió)
# - changes.diff    (diferencias)
```

## Comandos útiles

```bash
# Ver última sesión
ls -la .sessions/latest/

# Limpiar sesiones antiguas
rm -rf .sessions/*

# Organizar archivos del root (si tienes archivos sueltos)
bash scripts/organize-existing-files.sh
```

## Ejemplos de interacción

```
# Análisis
"Detecta anti-patterns en la rutina"
"¿Cuántos stages tiene? ¿Hay loops problemáticos?"

# Validación
"Valida que todos los endpoints existan"
"Verifica las rutinas referenciadas"

# Optimización
"Optimiza el loop iterar_propiedades"
"Reduce el payload de update_task"
"Agrega manejo de errores"

# Documentación
"Genera documentación en Markdown con diagrama Mermaid"
```

## Anti-patterns comunes

### N+1 Query
**Problema**: FCEach loop con NWRequest (200+ llamadas)
**Solución**: Batch endpoint `/multi` (1 llamada)

### Payload grande
**Problema**: `op: "replace"` envía array completo (>6MB)
**Solución**: `op: "add"` con `path: "/-"` (incremental)

### Sin error handling
**Problema**: Stages críticos sin `next.ERROR`
**Solución**: Agregar error handlers centralizados

## Estructura

```
routines/input/current.json    # Tu rutina aquí
.sessions/                      # Archivos generados (auto)
  └── latest/
      ├── optimized.json
      ├── analysis.md
      └── changes.diff
knowledge/                      # Knowledge base
templates/                      # Templates de código
```

## Más info

- **README.md** - Documentación completa
- **CLAUDE.md** - Instrucciones para Claude Code
- **knowledge/** - Patrones y referencias
