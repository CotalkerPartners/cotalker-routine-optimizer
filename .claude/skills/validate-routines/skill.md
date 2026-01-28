# Validate Routines

Valida que todas las rutinas referenciadas en stages `PBRoutine` existan en el sistema.

## Usage

```
/validate-routines [--token YOUR_TOKEN]
```

**Options**:
- `--token`: Token de autenticación de Cotalker (o usa variable `COTALKER_TOKEN`)

## What this skill does

1. **Lee la rutina** desde `routines/input/current.json`
2. **Busca stages `PBRoutine`** que ejecutan otras rutinas
3. **Extrae IDs de rutinas** referenciadas
4. **Solicita token** (si no está en env o argumento)
5. **Valida cada rutina** vía API de Cotalker
6. **Reporta** cuáles existen y cuáles no
7. **Guarda reporte** en sesión

## Steps to follow

### 1. Read routine and find PBRoutine stages

```javascript
import { readFileSync } from 'fs';

const routine = JSON.parse(readFileSync('routines/input/current.json', 'utf-8'));
const stages = routine.surveyTriggers?.[0]?.triggers?.[0]?.stages || [];

// Find all PBRoutine stages
const pbRoutineStages = stages.filter(s => s.name === 'PBRoutine');

// Extract routine IDs
const referencedRoutines = pbRoutineStages.map(stage => ({
  stageKey: stage.key,
  routineId: stage.data?.routine
})).filter(r => r.routineId);

console.log(`Found ${referencedRoutines.length} referenced routines`);
```

### 2. Also check NWRequest stages that might call routine endpoints

```javascript
// Some NWRequest stages might execute routines
const nwRequestStages = stages.filter(s =>
  s.name === 'NWRequest' &&
  s.data?.url?.includes('/routines/')
);

// Extract routine IDs from URLs
nwRequestStages.forEach(stage => {
  const url = stage.data.url;
  const match = url.match(/\/routines\/([a-f0-9]{24})/);
  if (match) {
    referencedRoutines.push({
      stageKey: stage.key,
      routineId: match[1],
      viaEndpoint: true
    });
  }
});
```

### 3. Get authentication token

```javascript
// Check for token in arguments or environment
let token = options.token || process.env.COTALKER_TOKEN;

if (!token) {
  console.log('⚠️  Token de autenticación requerido para validar rutinas');
  console.log('Opciones:');
  console.log('  1. Usar variable de entorno: export COTALKER_TOKEN="your_token"');
  console.log('  2. Pasar como argumento: /validate-routines --token YOUR_TOKEN');

  // Ask user
  token = await askUserForToken();

  if (!token) {
    console.log('❌ No se puede validar sin token. Mostrando solo IDs encontrados:');
    referencedRoutines.forEach(r => {
      console.log(`  - ${r.routineId} (stage: ${r.stageKey})`);
    });
    return;
  }
}
```

### 4. Validate each routine via API

```javascript
async function validateRoutine(routineId, token) {
  const url = `https://www.cotalker.com/api/v2/routines/${routineId}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      return {
        routineId,
        exists: true,
        name: data.name || 'Unnamed',
        isActive: data.isActive !== false,
        error: null
      };
    } else {
      return {
        routineId,
        exists: false,
        name: null,
        isActive: null,
        error: `HTTP ${response.status}: ${response.statusText}`
      };
    }
  } catch (error) {
    return {
      routineId,
      exists: false,
      name: null,
      isActive: null,
      error: error.message
    };
  }
}

// Validate all
const results = await Promise.all(
  referencedRoutines.map(r =>
    validateRoutine(r.routineId, token).then(result => ({
      ...result,
      stageKey: r.stageKey,
      viaEndpoint: r.viaEndpoint || false
    }))
  )
);
```

### 5. Categorize results

```javascript
const existing = results.filter(r => r.exists);
const missing = results.filter(r => !r.exists);
const inactive = existing.filter(r => !r.isActive);

console.log(`
Validation Results:
✅ ${existing.length} rutinas encontradas
❌ ${missing.length} rutinas NO encontradas
⚠️  ${inactive.length} rutinas inactivas
`);
```

### 6. Check for common issues

```javascript
// Check for deprecated or migrated routines
const potentialIssues = [];

missing.forEach(r => {
  if (r.error?.includes('404')) {
    potentialIssues.push({
      ...r,
      issue: 'Routine deleted or migrated',
      action: 'Update stage or remove reference'
    });
  } else if (r.error?.includes('403')) {
    potentialIssues.push({
      ...r,
      issue: 'No permission to access routine',
      action: 'Check token permissions'
    });
  } else {
    potentialIssues.push({
      ...r,
      issue: 'Connection error',
      action: 'Verify API availability'
    });
  }
});

inactive.forEach(r => {
  potentialIssues.push({
    ...r,
    issue: 'Routine exists but is inactive',
    action: 'Verify if this is intentional'
  });
});
```

### 7. Create session and save report

```javascript
import { createSession, saveToSession } from './src/utils/session-manager.js';

const session = createSession();

// Save validation report
const report = generateRoutineValidationReport(results, potentialIssues);
saveToSession('routine-validation-report.md', report, session);

// Save machine-readable results
saveToSession('routines.json', JSON.stringify(results, null, 2), session);
```

### 8. Generate validation report

Format as Markdown:
```markdown
# Routine Validation Report

**Generated**: 2026-01-27 14:30:22
**Total Referenced Routines**: 5

## Summary

- ✅ **4 rutinas encontradas**
- ❌ **1 rutina NO encontrada**
- ⚠️  **1 rutina inactiva**

## Results

### ✅ Found (4)

| Stage | Routine ID | Name | Status |
|-------|-----------|------|--------|
| ejecutar_validacion | 507f1f77bcf86cd799439011 | Validación de datos | Active |
| proceso_secundario | 507f1f77bcf86cd799439012 | Proceso adicional | Active |
| cleanup_routine | 507f1f77bcf86cd799439013 | Cleanup automatizado | Inactive ⚠️ |
| generate_report | 507f1f77bcf86cd799439014 | Generación reportes | Active |

### ❌ Not Found (1)

| Stage | Routine ID | Error | Action Required |
|-------|-----------|-------|-----------------|
| old_process | 507f1f77bcf86cd799439999 | 404 Not Found | Routine deleted - update or remove stage |

## Issues Detected

### 🔴 Critical Issues (1)

#### Missing Routine Reference
**Stage**: `old_process`
**Routine ID**: 507f1f77bcf86cd799439999

This routine no longer exists in the system. The stage will fail when executed.

**Action Required**:
1. Check if routine was migrated (new ID?)
2. Remove stage if no longer needed
3. Replace with updated routine ID if available

### ⚠️  Warnings (1)

#### Inactive Routine
**Stage**: `cleanup_routine`
**Routine ID**: 507f1f77bcf86cd799439013

This routine exists but is marked as inactive. It may not execute as expected.

**Action Required**:
- Verify if this is intentional
- Activate routine if it should be running
- Update workflow if inactive state is correct

## Recommendations

1. **Fix missing reference**: Update or remove `old_process` stage
2. **Review inactive routine**: Check `cleanup_routine` status
3. **Re-validate**: After making changes, run `/validate-routines` again
4. **Document dependencies**: Consider documenting which routines depend on which

## Referenced Routines Details

### ejecutar_validacion (507f1f77bcf86cd799439011)
- **Name**: Validación de datos
- **Status**: Active ✅
- **Used in**: Stage `ejecutar_validacion`
- **Purpose**: Validates incoming survey data

### proceso_secundario (507f1f77bcf86cd799439012)
- **Name**: Proceso adicional
- **Status**: Active ✅
- **Used in**: Stage `proceso_secundario`
- **Purpose**: Secondary processing logic

### cleanup_routine (507f1f77bcf86cd799439013)
- **Name**: Cleanup automatizado
- **Status**: Inactive ⚠️
- **Used in**: Stage `cleanup_routine`
- **Purpose**: Cleanup temporary data

### generate_report (507f1f77bcf86cd799439014)
- **Name**: Generación reportes
- **Status**: Active ✅
- **Used in**: Stage `generate_report`
- **Purpose**: Generates activity reports
```

### 9. Display summary

```
✅ Validación de rutinas completa

Resultados:
✅ 4 rutinas encontradas
❌ 1 rutina NO encontrada
⚠️  1 rutina inactiva

Issues críticos:
❌ Rutina 507f1f77bcf86cd799439999 no existe
   Stage: old_process
   → Fue eliminada o migrada

Advertencias:
⚠️  Rutina cleanup_routine está inactiva
   → Verificar si es intencional

Reporte completo:
.sessions/latest/routine-validation-report.md
.sessions/latest/routines.json
```

## Important notes

- **Token required**: Cannot validate without authentication
- **Company-specific**: Each company has different routines and access
- **Check permissions**: Token must have read access to routines
- **Respect rate limits**: Don't spam API with validations
- **Inactive vs missing**: Both are issues but different severity

## Security considerations

- **Never commit tokens** to git
- **Use environment variables** for production
- **Token has broad access** - treat it securely
- **Log validation requests** for audit purposes

## Output structure

```
.sessions/TIMESTAMP/
├── routine-validation-report.md   # Human-readable report
└── routines.json                  # Machine-readable results
```

## When to ask user

- If no token is available (env or argument)
- If token returns 403 (insufficient permissions)
- If missing routine needs decision (remove? replace? update?)
- If multiple inactive routines found (intentional?)
