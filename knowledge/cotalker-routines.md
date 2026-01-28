# Cotalker Automation - Guía de Análisis y Optimización de Rutinas

## Propósito de este Documento

Este documento sirve como base de conocimiento para analizar y optimizar rutinas existentes en Cotalker. Cuando se proporcione una rutina para revisión:

1. **Analizar** la estructura y stages actuales
2. **Identificar** oportunidades de mejora basadas en las capacidades disponibles
3. **Proponer** optimizaciones concretas con justificación

---

## Conceptos Clave

### ¿Qué es una Rutina?

Una rutina es una secuencia de **stages** (pasos) que se ejecutan en orden, donde cada stage realiza una acción específica. Las rutinas pueden:
- Ejecutarse desde Workflows (cambios de estado)
- Dispararse por Bots (slash commands o surveys)
- Programarse en Schedules
- Activarse por SLAs

### Estructura de una Rutina

```
Rutina
├── maxIterations: número máximo de stages a ejecutar (considerar loops)
├── start: key del stage inicial
└── stages[]: array de stages
    ├── key: identificador único del stage
    ├── name: tipo de bot (ej: PBEmail, CCJS)
    ├── data: configuración específica del bot
    └── next: definición de flujo (SUCCESS, ERROR, DEFAULT)
```

---

## Capacidades Disponibles por Categoría

### Ejecución de Código y Lógica

| Capacidad | Bot Key | Uso Típico |
|-----------|---------|------------|
| Ejecutar JavaScript personalizado | `CCJS` | Transformar datos, lógica compleja, cálculos |
| Condicionales (if/else) | `FCIfElse` | Bifurcar flujo según condición |
| Switch simple | `FCSwitchOne` | Múltiples condiciones, ejecuta primera que cumple |
| Switch múltiple | `FCSwitchAll` | Múltiples condiciones en paralelo |
| Iteración sobre arrays | `FCEach` | Procesar listas de items |
| Esperar | `FCSleep` | Delays entre operaciones |

### Comunicación

| Capacidad | Bot Key | Uso Típico |
|-----------|---------|------------|
| Enviar email | `PBEmail` | Notificaciones, alertas, reportes |
| Enviar mensaje a canal | `PBMessage` | Notificaciones en plataforma |
| WhatsApp | `PBWhatsApp` | Notificaciones externas |
| Enviar GIF | `PBGiphy` | Mensajes visuales |

### Gestión de Tareas

| Capacidad | Bot Key | Uso Típico |
|-----------|---------|------------|
| Crear tarea | `PBCreateTask` | Iniciar workflows |
| Actualizar tarea | `PBUpdateTask` | Modificar datos de tarea |
| Cambiar estado | `PBChangeState` | Mover tarea en workflow |
| Duplicar tarea | `PBDuplicateTask` | Clonar tareas |
| Gestionar usuarios de tarea | `PBTaskAddEditor` | Asignar/desasignar personas |
| Obtener tarea desde canal | `PBChannelToTaskSE` | Contexto de tarea |

### Gestión de Canales

| Capacidad | Bot Key | Uso Típico |
|-----------|---------|------------|
| Crear canal | `PBCreateChannel` | Nuevos espacios de comunicación |
| Actualizar canal | `PBUpdateChannel` | Modificar configuración |
| Gestionar usuarios de canal | `PBChannelAddUser` | Control de acceso |
| Limpiar mensajes | `PBCleanChannel` | Mantenimiento |
| Obtener mensajes | `PBGetChannelMessages` | Lectura de historial |
| Copiar mensajes | `PBCopySurvey` | Migración de contenido |
| Ocultar mensajes | `PBHideMessages` | Moderación |

### Base de Datos (Properties/Elements)

| Capacidad | Bot Key | Uso Típico |
|-----------|---------|------------|
| Crear elemento | `PBCreateProperty` | Nuevos registros |
| Actualizar elemento | `PBUpdateProperty` | Modificar datos |

### Usuarios

| Capacidad | Bot Key | Uso Típico |
|-----------|---------|------------|
| Crear usuario | `PBCreateUser` | Onboarding automatizado |
| Actualizar usuario | `PBUpdateUser` | Gestión de perfiles |

### Formularios

| Capacidad | Bot Key | Uso Típico |
|-----------|---------|------------|
| Enviar formulario | `PBSendSurvey` | Solicitar información |
| Buscar respuestas | `PBAnswerChecker` | Consultar datos de forms |
| Modo edición de form | `PBEditableSurvey` | Permitir correcciones |

### Documentos y Archivos

| Capacidad | Bot Key | Uso Típico |
|-----------|---------|------------|
| Generar PDF | `PBPdf` | Reportes, documentos |
| Extraer datos de PDF | `PBPDFExtractor` | Procesamiento de documentos |
| Generar HTML | `PBTemplate` | Templates dinámicos |
| Excel/CSV a JSON | `PBSheet` | Importación de datos |
| Generar QR | `PBQRCode` | Códigos para tracking |

### Integraciones y Network

| Capacidad | Bot Key | Uso Típico |
|-----------|---------|------------|
| HTTP Request | `NWRequest` | Llamadas a APIs externas |
| Google Calendar | `PBGoogleCalendar` | Sincronización de eventos |
| Ejecutar bot legacy | `NWBotV2V3` | Compatibilidad |
| Action Button | `PBActionButton` | Interacciones de usuario |

---

## COTLang - Lenguaje de Expresiones

COTLang permite extraer y transformar datos dinámicamente en los campos de configuración.

### Comandos Principales

| Comando | Sintaxis | Propósito |
|---------|----------|-----------|
| `$VALUE` | `$VALUE#path\|to\|data` | Datos del contexto actual (trigger) |
| `$OUTPUT` | `$OUTPUT#stage_key#data\|field` | Resultado de stage anterior |
| `$ENV` | `$ENV#BASEURL` | Variables de entorno |
| `$CODE` | `$CODE#model#extractor#input` | Consultas a base de datos |
| `$JOIN` | `$JOIN#separator#val1#val2` | Concatenación |
| `$VAR` | `$VAR#variable_name` | Variables declaradas en rutina |
| `$TIME` | `$TIME#param1#param2` | Fechas relativas |

### Operadores de Transformación

| Operador | Ejemplo | Propósito |
|----------|---------|-----------|
| `[find=>key=value]` | `[find=>identifier=myfield]` | Buscar en array |
| `[filter=>key=value]` | `[filter=>status=active]` | Filtrar array |
| `[map=>field]` | `[map=>email]` | Extraer campo de cada elemento |
| `[size=>*]` | `[size=>*]` | Contar elementos |
| `[cast=>parseInt]` | `[cast=>parseInt]` | Convertir tipo |
| `[math=>add=N]` | `[math=>add=10]` | Operaciones matemáticas |
| `[date=>format=X]` | `[date=>format=DD-MM-YYYY]` | Formatear fecha |
| `[push=>string=X]` | `[push=>string=nuevo]` | Agregar a array |
| `[json=>parse]` | `[json=>parse]` | Parsear JSON |

### Ejemplo de Encadenamiento

```
$VALUE#data|[find=>identifier=usuarios]|process|[map=>email]|[push=>string=admin@empresa.com]
```

---

## Patrones de Optimización Comunes

### 1. Reducir Stages Redundantes

**Problema**: Múltiples stages haciendo operaciones que podrían consolidarse.

**Solución**: Usar `CCJS` para combinar lógica relacionada en un solo stage.

```javascript
// En lugar de 3 stages separados para obtener datos
const task = output.find(o => o.key === 'get_task').data;
const user = output.find(o => o.key === 'get_user').data;
const property = output.find(o => o.key === 'get_prop').data;

// Consolidar en CCJS con múltiples requests
const [task, user, property] = await Promise.all([
  axios.get(env.EXTERNAL_API_URL + '/api/tasks/' + input.taskId),
  axios.get(env.EXTERNAL_API_URL + '/api/users/' + input.userId),
  axios.get(env.EXTERNAL_API_URL + '/api/properties/' + input.propId)
]);
return { task: task.data, user: user.data, property: property.data };
```

### 2. Optimizar Iteraciones

**Problema**: `FCEach` con muchas iteraciones que podrían procesarse en batch.

**Solución**: Evaluar si la API soporta operaciones bulk o usar `CCJS` para procesar el array completo.

### 3. Manejo de Errores

**Problema**: Rutinas sin manejo de casos de error.

**Solución**: Usar los outputs `SUCCESS` y `ERROR` de cada stage para definir flujos alternativos.

### 4. Condicionales Innecesarios

**Problema**: Múltiples `FCIfElse` en cascada.

**Solución**: Usar `FCSwitchOne` o `FCSwitchAll` para múltiples condiciones, o consolidar lógica en `CCJS`.

### 5. Datos Hardcodeados

**Problema**: IDs, emails, URLs escritos directamente en la configuración.

**Solución**: Usar `$ENV`, `$CODE` para obtener datos dinámicamente, o pasar como parámetros del contexto.

### 6. Max Iterations Mal Calculado

**Problema**: `maxIterations` muy bajo (rutina se corta) o innecesariamente alto.

**Solución**: Contar stages + considerar loops de `FCEach`. Agregar margen razonable.

---

## Checklist de Análisis de Rutina

Al revisar una rutina, verificar:

- [ ] **Flujo lógico**: ¿El orden de stages tiene sentido?
- [ ] **Stages redundantes**: ¿Hay operaciones que podrían consolidarse?
- [ ] **Manejo de errores**: ¿Qué pasa si un stage falla?
- [ ] **Iteraciones**: ¿Los loops son eficientes? ¿Podrían ser batch?
- [ ] **Datos dinámicos**: ¿Hay valores hardcodeados que deberían ser dinámicos?
- [ ] **maxIterations**: ¿Está correctamente calculado?
- [ ] **Uso de COTLang**: ¿Se está aprovechando para simplificar?
- [ ] **Stage types apropiados**: ¿Se usa el bot correcto para cada tarea?
- [ ] **Outputs utilizados**: ¿Se aprovechan los datos de stages anteriores?
- [ ] **Contexto del trigger**: ¿Se usa toda la información disponible del contexto?

---

## Contextos según Trigger

Los datos disponibles en `$VALUE` dependen de cómo se dispara la rutina:

| Trigger | Datos Disponibles |
|---------|-------------------|
| Slash Command | `channel`, `user`, `cmdArgs`, `message` |
| Survey/Form | `answer`, `channel`, `user`, `data` |
| Workflow State Change | `task`, `taskGroup`, `channel`, `user`, estado anterior/nuevo |
| SLA | `task`, `taskGroup`, `sla`, tiempos |
| Schedule | Definido en configuración del schedule |

---

## Notas Técnicas

### Variables como Strings
Las variables en rutinas siempre se leen como strings. Aplicar `[cast=>parseInt]` o `[cast=>parseFloat]` cuando se USE la variable, no al declararla.

```javascript
// INCORRECTO
{ "key": "count", "value": "$VALUE#total|[cast=>parseInt]" }
{ "key": "newCount", "value": "$VAR#count|[math=>add=1]" }

// CORRECTO
{ "key": "count", "value": "$VALUE#total" }
{ "key": "newCount", "value": "($VAR#count)|[cast=>parseInt]|[math=>add=1]" }
```

### Caracteres a Escapar
En campos de configuración (excepto source code de CCJS): `= | ( ) [ ] #` deben escaparse con `\`

### Timeout de CCJS
Las funciones en Custom Javascript Code tienen timeout de 30 segundos.

### Librerías en CCJS
Disponibles: `axios`, `date-fns`, `form-data`, `qs`, `querystring`

---

## Referencias

- Documentación oficial: https://doc.cotalker.com/docs/documentation/automation/existing_routines
- Routine Builder: https://doc.cotalker.com/docs/documentation/automation/admin_routine
- COTLang: https://doc.cotalker.com/docs/documentation/automation/cotlang/admin_cotlangcompren