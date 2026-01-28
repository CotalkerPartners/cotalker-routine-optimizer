# Input Routines

Coloca aquí la rutina que quieres optimizar.

## Pasos

1. **Exporta la rutina desde MongoDB** de tu company Cotalker
2. **Guarda el archivo** en esta carpeta como:
   - `current.json` (recomendado - export directo de MongoDB), O
   - `current.js` (si prefieres formato JavaScript)
3. **Ejecuta**: `npm run assist` desde la raíz del proyecto
4. **Claude Code** analizará y optimizará la rutina

## Formatos soportados

### Formato JSON (MongoDB export - RECOMENDADO)

Guarda como **`current.json`**:

```json
{
  "_id": {"$oid": "507f1f77bcf86cd799439011"},
  "name": "Mi rutina",
  "surveyTriggers": [{
    "triggers": [{
      "version": "v3",
      "start": "stage_inicial",
      "stages": [
        {
          "key": "stage_inicial",
          "name": "PBMessage",
          "data": {
            "message": "Hola"
          },
          "next": {
            "OK": "END"
          }
        }
      ]
    }]
  }]
}
```

El parser automáticamente convierte:
- `ObjectId("...")` → strings
- `NumberInt(123)` → números
- `ISODate("...")` → strings

### Formato JavaScript (alternativo)

Guarda como **`current.js`**:

```javascript
module.exports = {
  _id: ObjectId("507f1f77bcf86cd799439011"),
  name: "Mi rutina",
  surveyTriggers: [{
    triggers: [{
      version: "v3",
      start: "stage_inicial",
      stages: [
        // tus stages aquí
      ]
    }]
  }]
};
```

## Exportando desde MongoDB

### Usando MongoDB Compass
1. Abre tu collection `routines`
2. Encuentra tu rutina
3. Click derecho → Copy Document
4. Pega en `current.json`

### Usando mongosh
```bash
mongosh "mongodb://..."
use cotalker_db
db.routines.findOne({_id: ObjectId("...")})
# Copia el output a current.json
```

### Usando mongoexport
```bash
mongoexport --db cotalker_db --collection routines \
  --query '{"_id": {"$oid": "..."}}' \
  --out routines/input/current.json
```

## IMPORTANTE

- **Cada company tiene su propio token**, por eso debes exportar manualmente la rutina
- **No commitees este archivo** a git (está en .gitignore)
- El archivo se sobreescribe cada vez que trabajas con una nueva rutina
- Si necesitas mantener múltiples rutinas simultáneamente, usa nombres descriptivos:
  - `current-companyA.json`
  - `current-companyB.json`
  - Luego ejecuta: `npm start -- assist routines/input/current-companyA.json`
