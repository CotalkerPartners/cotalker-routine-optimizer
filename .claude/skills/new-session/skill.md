# New Session

Crea una nueva sesión de optimización con timestamp, copia la rutina actual y prepara el workspace.

## Usage

```
/new-session
```

## What this skill does

1. **Crea nueva sesión** con timestamp único
2. **Copia rutina original** de `routines/input/current.json` a la sesión
3. **Genera README** con metadata básica
4. **Muestra path** de la sesión para trabajar
5. **Actualiza symlink** `latest` para apuntar a nueva sesión

## Steps to follow

### 1. Create session

```javascript
import { createSession } from './src/utils/session-manager.js';

const session = createSession();
// Returns: { id: '2026-01-27_14-30-22', dir: '.sessions/2026-01-27_14-30-22', isNew: true }
```

### 2. Copy original routine

```javascript
import { readFileSync } from 'fs';
import { saveToSession } from './src/utils/session-manager.js';

const routineContent = readFileSync('routines/input/current.json', 'utf-8');
saveToSession('input.json', routineContent, session);
```

### 3. Generate session README

```javascript
import { createSessionReadme } from './src/utils/session-manager.js';

// Parse basic info
const routine = JSON.parse(routineContent);
const stages = routine.surveyTriggers?.[0]?.triggers?.[0]?.stages || [];
const networkRequests = stages.filter(s => s.name === 'NWRequest').length;
const loops = stages.filter(s => s.name === 'FCEach').length;

createSessionReadme(session, {
  originalFile: 'routines/input/current.json',
  totalStages: stages.length,
  networkRequests,
  loops
});
```

### 4. Display session info

```
✅ Nueva sesión creada

Session ID: 2026-01-27_14-30-22
Directory: .sessions/2026-01-27_14-30-22

Archivos iniciales:
- input.json  (rutina original copiada)
- README.md   (metadata básica)

Symlink actualizado:
.sessions/latest → 2026-01-27_14-30-22

Rutina info:
- Stages: 61
- Network requests: 25
- Loops: 5

Listo para trabajar!
Usa /analyze-routine o /optimize-routine para comenzar.
```

## When to use this skill

- **Antes de empezar** una nueva optimización
- **Para comparar** diferentes approaches (crea múltiples sesiones)
- **Para organizar** trabajo en progress

## Important notes

- Session ID es timestamp: `YYYY-MM-DD_HH-MM-SS`
- Symlink `latest` siempre apunta a sesión más reciente
- Cada sesión es independiente - puedes tener múltiples en paralelo
- Session manager se encarga de crear directorios automáticamente

## Output structure

```
.sessions/
├── 2026-01-27_14-30-22/      # Nueva sesión
│   ├── README.md              # Metadata
│   └── input.json             # Rutina original
└── latest -> 2026-01-27_14-30-22/
```
