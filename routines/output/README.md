# Output Routines

Las rutinas optimizadas se guardan automáticamente aquí.

## Estructura de archivos

Cuando optimizas una rutina, Claude Code genera:

```
output/
├── optimized-{timestamp}.js       # Rutina optimizada
├── optimized-{timestamp}.diff     # Diff con la original
└── optimized-{timestamp}.md       # Documentación de cambios
```

## Ejemplo de salida

```javascript
// optimized-20260127-143022.js
module.exports = {
  surveyTriggers: [{
    triggers: [{
      version: "v3",
      start: "stage_inicial",
      stages: [
        // stages optimizados
      ]
    }]
  }]
};
```

## IMPORTANTE

- **Revisa SIEMPRE los cambios** antes de importar a MongoDB
- **Estos archivos NO se commitean** a git (están en .gitignore)
- Cada company tiene sus propias rutinas, por seguridad no las compartimos
