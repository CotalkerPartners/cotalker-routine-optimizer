# Claude Code Skills

Este proyecto incluye 6 skills para facilitar el trabajo con rutinas Cotalker.

## Skills disponibles

### 1. `/analyze-routine`
Analiza una rutina completa: detecta anti-patterns, estima performance, genera reporte.

**Uso**: `/analyze-routine`

**Output**: Reporte completo en `.sessions/latest/analysis.md`

---

### 2. `/optimize-routine`
Analiza y optimiza automáticamente aplicando patrones probados.

**Uso**: `/optimize-routine`

**Output**: Rutina optimizada en `.sessions/latest/optimized.json`

---

### 3. `/validate-endpoints`
Valida que todos los endpoints usados existan y estén accesibles.

**Uso**: `/validate-endpoints`

**Output**: Reporte de validación en `.sessions/latest/validation-report.md`

---

### 4. `/document-routine`
Genera documentación completa con diagrams, stats, data flow.

**Uso**: `/document-routine [--format md|html|json] [--include-analysis]`

**Output**: Documentación en `.sessions/latest/documentation.{format}`

---

### 5. `/new-session`
Crea nueva sesión de optimización con timestamp.

**Uso**: `/new-session`

**Output**: Nueva sesión en `.sessions/TIMESTAMP/`

---

### 6. `/validate-routines`
Valida que rutinas referenciadas (PBRoutine) existan en el sistema.

**Uso**: `/validate-routines [--token YOUR_TOKEN]`

**Output**: Reporte en `.sessions/latest/routine-validation-report.md`

---

## Workflow típico

```bash
# 1. Crear nueva sesión
/new-session

# 2. Analizar rutina
/analyze-routine

# 3. Validar endpoints y rutinas
/validate-endpoints
/validate-routines

# 4. Optimizar
/optimize-routine

# 5. Documentar
/document-routine --include-analysis
```

## Notas

- Todos los skills usan el **session manager** automáticamente
- Archivos se guardan en `.sessions/TIMESTAMP/`
- Symlink `.sessions/latest/` apunta siempre a la sesión más reciente
- Skills son **composables** - puedes usarlos juntos o por separado
