# Create Routine

Crea una rutina Cotalker nueva desde cero a partir de requerimientos de negocio en español. Usa un flujo de dos fases: primero diseño (con aprobación), luego generación del JSON.

## Usage

```
/create-routine
```

## What this skill does

1. **Recopila el requerimiento** de negocio del usuario (en español)
2. **Carga knowledge base** de creación y referencia de plataforma
3. **Identifica** el tipo de flujo, trigger, entidades e integraciones
4. **Selecciona template base** de `templates/routines/`
5. **Fase 1 - Diseño**: Genera diagrama Mermaid + tabla de stages + data flow + variables
6. **ESPERA aprobación** del usuario antes de continuar
7. **Fase 2 - Generación**: Genera `routine.json` completo con best practices aplicadas
8. **Genera `setup-guide.md`** con instrucciones de importación y configuración
9. **Guarda artefactos** en sesión: `requirement.md`, `design.md`, `routine.json`, `setup-guide.md`
10. **Muestra resumen** con próximos pasos

## Steps to follow

### 1. Collect business requirement

Ask the user (if not provided) to describe the business rule in Spanish. Capture:
- What should happen (the process)
- What triggers it (form submission, state change, schedule, etc.)
- What entities are involved (tasks, properties, users, channels)
- What integrations are needed (API calls, notifications, etc.)

Save the requirement as `requirement.md` in the session.

### 2. Load knowledge base

Read these files in order of priority:
1. `knowledge/routine-creation-guide.md` - Central creation guide
2. `knowledge/cotalker-routines.md` - Platform reference (stage types, triggers, COTLang)
3. `knowledge/cotlang-reference.md` - COTLang V3 syntax reference
4. `knowledge/best-practices.md` - Best practices to apply
5. `knowledge/cotalker-api-reference.md` - API endpoints for NWRequest stages

### 3. Identify flow type and select template

Using the stage selection matrix in `knowledge/routine-creation-guide.md`:

| Keywords in requirement | Template |
|---|---|
| aprobar, rechazar, autorizar, solicitud | `templates/routines/approval-workflow.json` |
| sincronizar, importar, exportar, migrar | `templates/routines/data-sync.json` |
| notificar, alertar, avisar, escalar | `templates/routines/notification-rules.json` |
| crear, editar, eliminar, formulario, ABM | `templates/routines/crud-operation.json` |
| programado, diario, semanal, pendientes, batch | `templates/routines/scheduled-task.json` |

Read the selected template to understand the base structure.

### 4. Phase 1 - Generate design

Generate `design.md` with:

```markdown
# Diseño de Rutina: [NOMBRE]

## Requerimiento
[Resumen del requerimiento]

## Tipo de Flujo
[Patrón seleccionado] (basado en `templates/routines/[template].json`)

## Diagrama de Flujo
```mermaid
graph TD
    [diagrama con todos los stages, incluyendo error paths]
```

## Stages
| # | Key | Tipo | Propósito | Datos Clave |
|---|-----|------|-----------|-------------|
| 1 | validar_datos | FCSwitchOne | Validar entrada | control: $VALUE#data |
| ... | ... | ... | ... | ... |

## Data Flow
1. **Entrada**: [Qué datos llegan del trigger]
2. **Transformaciones**: [Cómo se procesan los datos]
3. **Salida**: [Qué datos se generan/modifican]

## Variables a Configurar
| Placeholder | Descripción | Ejemplo |
|-------------|-------------|---------|
| [COMPANY_ID] | ID de la empresa | 507f1f77bcf86cd799439011 |
| ... | ... | ... |

## maxIterations
[Cálculo: stages + loops × iteraciones + 20% margen]
```

**IMPORTANT**: Present the design to the user and **WAIT FOR APPROVAL** before proceeding to Phase 2. Ask explicitly: "¿Apruebas este diseño? Si tienes cambios, indícalos y ajustaré antes de generar el JSON."

### 5. Phase 2 - Generate routine JSON (after approval)

Generate `routine.json` as a complete MongoDB document:

```json
{
  "_comment": "Rutina generada por Cotalker Routine Optimizer. [DESCRIPTION]",
  "company": "[COMPANY_ID]",
  "isActive": true,
  "maxIterations": [CALCULATED],
  "surveyTriggers": [{
    "triggers": [{
      "version": "v3",
      "start": "first_stage_key",
      "stages": [/* all stages with best practices */]
    }]
  }]
}
```

Ensure all best practices are applied:
- ✅ Error handler centralizado
- ✅ `next.ERROR` en todos los stages críticos
- ✅ Validación de entrada como primer stage
- ✅ Bypass switch antes de loops
- ✅ Notificación de progreso antes de operaciones largas
- ✅ `_comment` en cada stage
- ✅ Stage keys descriptivos (`verbo_sustantivo`)
- ✅ Placeholders documentados

### 6. Generate setup guide

Generate `setup-guide.md` with:

```markdown
# Guía de Configuración: [NOMBRE]

## 1. Preparación
- [ ] Tener acceso de admin a Cotalker
- [ ] Identificar los IDs de tu ambiente

## 2. Reemplazar Placeholders
| Placeholder | Dónde encontrar el valor |
|-------------|------------------------|
| [COMPANY_ID] | Admin > Settings > Company ID |
| ... | ... |

## 3. Importar Rutina
1. Conectarse a MongoDB
2. Insertar documento en colección `routines`
3. Verificar que `isActive: true`

## 4. Configurar Trigger
[Instrucciones específicas según tipo de trigger]

## 5. Verificación
- [ ] Ejecutar rutina con datos de prueba
- [ ] Verificar que notificaciones llegan
- [ ] Verificar que error handler funciona
- [ ] Verificar que datos se crean/actualizan correctamente
```

### 7. Save to session and show summary

```javascript
import { createSession, saveToSession, createSessionReadme } from './src/utils/session-manager.js';

const session = createSession();

saveToSession('requirement.md', requirementContent, session);
saveToSession('design.md', designContent, session);
saveToSession('routine.json', JSON.stringify(routine, null, 2), session);
saveToSession('setup-guide.md', setupGuideContent, session);

createSessionReadme(session, {
  type: 'creation',
  routineName: routineName,
  templateUsed: templateName,
  totalStages: stageCount,
  trigger: triggerType
});
```

Show summary:
```
✅ Rutina creada exitosamente

Rutina: [nombre]
- Template base: [template]
- Stages: [count]
- Trigger: [type]
- Best practices aplicadas: [list]

Archivos guardados en:
.sessions/[TIMESTAMP]/
- requirement.md    (requerimiento original)
- design.md         (diseño aprobado)
- routine.json      (rutina lista para importar)
- setup-guide.md    (guía de configuración)
- README.md         (metadata de sesión)

Próximos pasos:
1. Revisar routine.json
2. Reemplazar placeholders según setup-guide.md
3. Importar a MongoDB
4. Configurar trigger
5. Probar con datos de prueba
```

## Important notes

- **Always in Spanish**: Requirements, documentation, and messages in Spanish
- **Two phases are mandatory**: NEVER skip Phase 1 design approval
- **Use templates**: Always start from a template, don't create from scratch
- **Apply all best practices**: Error handlers, validation, bypass, progress notifications
- **Save to session**: All artifacts to `.sessions/TIMESTAMP/`
- **Placeholders**: Use `[PLACEHOLDER]` format for environment-specific values
- **No `_id`**: Don't include MongoDB `_id` in generated routines (auto-generated on import)
- **Stage naming**: Always `verbo_sustantivo` in snake_case

## Knowledge base priority

1. `knowledge/routine-creation-guide.md` - Central creation guide
2. `knowledge/cotalker-routines.md` - Platform reference
3. `knowledge/cotlang-reference.md` - COTLang syntax
4. `knowledge/best-practices.md` - Best practices
5. `knowledge/cotalker-api-reference.md` - API reference

## Output structure

Session directory should contain:
```
.sessions/TIMESTAMP/
├── README.md          # Session metadata
├── requirement.md     # Original business requirement
├── design.md          # Phase 1: Mermaid + stage table + data flow
├── routine.json       # Phase 2: Complete MongoDB document
└── setup-guide.md     # Phase 2: Import and configuration guide
```

## Example invocation

User types: `/create-routine`

You:
1. Ask for business requirement (if not provided)
2. Load knowledge base
3. Identify flow type → select template
4. Generate design (Mermaid + table + data flow)
5. Present design → WAIT for approval
6. (After approval) Generate routine.json + setup-guide.md
7. Save all to session
8. Show summary with next steps
