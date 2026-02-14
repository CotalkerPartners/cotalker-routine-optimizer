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

Cada vez que una rutina se dispara, se toma un **snapshot del contexto** que rodea al trigger. Este snapshot se almacena en formato JSON siguiendo los modelos de datos de Cotalker y es accesible vía `$VALUE` en COTLang.

### Tabla completa de triggers y contextos

| # | Trigger | Contexto (`$VALUE`) | Descripción |
|---|---------|---------------------|-------------|
| 1 | **Slash Command** | `{ channel: COTChannel, message: COTMessage, cmdArgs: string[] }` | Bot disparado con comando `/` en un canal específico |
| 2 | **Global Slash Command** | `{ channel: COTChannel, message: COTMessage, cmdArgs: string[] }` | Bot global disparado con comando `/` en cualquier canal |
| 3 | **Channel Survey** | `{ ...COTAnswer, messages: COTMessage }` | Bot disparado por survey específico en canal específico |
| 4 | **Global Survey** | `{ ...COTAnswer, messages: COTMessage }` | Bot disparado por survey específico en cualquier canal |
| 5 | **Schedule** | `{ /* body personalizado */ }` | Ejecución programada (única o recurrente con cron) |
| 6 | **Workflow Start** | `{ answer: COTAnswer, meta: { parentTask: ObjectId, taskGroup: ObjectId } }` | Survey disparado antes de iniciar un nuevo workflow |
| 7 | **Post Workflow Start** | `{ task: COTTask, parent: COTTask }` | Disparado después de que inicia el workflow |
| 8 | **State Survey (State Start Form)** | `{ ...COTTask, sentAnswer: COTAnswer }` | Disparado dentro de una tarea por survey en estados específicos |
| 9 | **Changed State** | `{ ...COTTask }` | Disparado cuando una tarea cambia de estado |
| 10 | **SLA** | `{ taskId: ObjectId, taskGroupId: ObjectId, ChannelID: ObjectId }` | Evento temporal basado en duración de tarea en un estado |

### Acceso a datos por trigger (ejemplos COTLang)

**Slash Command / Global Slash Command:**
```
$VALUE#channel|nameDisplay          → Nombre del canal
$VALUE#message|content              → Contenido del mensaje
$VALUE#cmdArgs|0                    → Primer argumento del comando
$VALUE#channel|_id                  → ID del canal
$VALUE#message|sentBy               → ID del usuario que envió el comando
```

**Channel Survey / Global Survey** (COTAnswer spread):
```
$VALUE#data|[find=>identifier=campo_nombre]|process|0    → Valor de un campo del formulario
$VALUE#survey                                             → ID del survey respondido
$VALUE#user                                               → ID del usuario que respondió
$VALUE#channel                                            → ID del canal
$VALUE#messages|content                                   → Mensaje asociado
```

**Workflow Start:**
```
$VALUE#answer|data|[find=>identifier=campo]|process|0    → Campo del formulario de inicio
$VALUE#meta|parentTask                                    → ID de la tarea padre
$VALUE#meta|taskGroup                                     → ID del task group
```

**Post Workflow Start:**
```
$VALUE#task|_id                     → ID de la tarea recién creada
$VALUE#task|name                    → Nombre de la tarea
$VALUE#task|channel                 → ID del canal de la tarea
$VALUE#task|smState                 → Estado actual del workflow
$VALUE#task|assignee                → Asignado de la tarea
$VALUE#task|taskGroup               → Task group
$VALUE#parent|_id                   → ID de la tarea padre (si existe)
```

**State Survey (State Start Form)** (COTTask spread + sentAnswer):
```
$VALUE#_id                          → ID de la tarea (spread de COTTask)
$VALUE#name                         → Nombre de la tarea
$VALUE#smState                      → Estado actual
$VALUE#assignee                     → Asignado
$VALUE#channel                      → Canal de la tarea
$VALUE#sentAnswer|data|[find=>identifier=campo]|process|0  → Campo del formulario
```

**Changed State** (COTTask spread):
```
$VALUE#_id                          → ID de la tarea
$VALUE#name                         → Nombre de la tarea
$VALUE#smState                      → Nuevo estado (ya cambiado)
$VALUE#assignee                     → Asignado
$VALUE#channel                      → Canal de la tarea
$VALUE#taskGroup                    → Task group
$VALUE#status                       → Property de estado
```

**SLA:**
```
$VALUE#taskId                       → ID de la tarea
$VALUE#taskGroupId                  → ID del task group
$VALUE#ChannelID                    → ID del canal
```

### Modelos de datos de contexto

#### COTChannel (campos más usados en rutinas)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `_id` | ObjectId | ID único del canal |
| `company` | ObjectId | ID de la company |
| `group` | ObjectId | ID del grupo padre |
| `nameCode` | string | Código del canal (único, lowercase, max 60 chars) |
| `nameDisplay` | string | Nombre visible del canal |
| `userIds` | ObjectId[] | IDs de usuarios miembros |
| `bots` | ObjectId[] | IDs de bots asignados |
| `propertyIds` | ObjectId[] | IDs de properties asociadas |
| `isActive` | boolean | Si el canal está activo |
| `isPrivate` | boolean | Si el canal es privado |
| `isDirect` | boolean | Si es mensaje directo |
| `createdAt` | ISODate | Fecha de creación |
| `modifiedAt` | ISODate | Última modificación |
| `settings.write` | string | `"all"` o `"none"` |

#### COTMessage (campos más usados en rutinas)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `_id` | ObjectId | ID del mensaje |
| `channel` | ObjectId | Canal donde se envió |
| `content` | string | Texto del mensaje |
| `contentType` | string | Tipo: `text/plain`, `application/vnd.cotalker.survey`, etc. |
| `sentBy` | ObjectId | ID del usuario que envió |
| `createdAt` | number | Timestamp Unix de creación |
| `answer` | string | Referencia a respuesta de survey (formato: `uuid#surveyId`) |
| `responses` | object[] | Respuestas de survey (si aplica) |
| `responses[].cdata` | string[] | Datos de la respuesta |
| `responses[].cref` | ObjectId | Referencia a la pregunta |
| `form.id` | ObjectId | ID principal del formulario |

#### COTAnswer (campos más usados en rutinas)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `_id` | ObjectId | ID de la respuesta |
| `uuid` | ObjectId | Código de identificación (usado como referencia) |
| `survey` | ObjectId | ID del survey respondido |
| `formId` | ObjectId | ID único del formulario enviado |
| `user` | ObjectId | Usuario que respondió |
| `channel` | ObjectId | Canal donde se respondió |
| `company` | ObjectId | Company |
| `properties` | ObjectId[] | Properties usadas en el survey |
| `data` | COTAnswerData[] | **Array de respuestas del formulario** |
| `createdAt` | ISODate | Fecha de envío |
| `modifiedAt` | ISODate | Última modificación |

**COTAnswerData** (cada elemento del array `data`):

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `identifier` | string | **Identificador del campo** (usado en `[find=>identifier=X]`) |
| `contentType` | string | Tipo de contenido del campo |
| `code` | string[] | Códigos internos de la respuesta |
| `display` | string[] | Valores de display |
| `responses` | string[] | Respuestas del usuario |
| `process` | string[] | **Valores procesados** (el que más se usa para obtener datos) |
| `question` | ObjectId | ID de la pregunta |

**Patrón típico para acceder a un campo de formulario:**
```
$VALUE#data|[find=>identifier=nombre_campo]|process|0
```
Esto busca en el array `data` el elemento con `identifier` = `nombre_campo`, toma su array `process` y obtiene el primer valor.

#### COTTask (campos más usados en rutinas)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `_id` | ObjectId | ID de la tarea |
| `name` | string | Nombre de la tarea |
| `serial` | number | Número serial secuencial |
| `channel` | ObjectId | Canal/workspace de la tarea |
| `taskGroup` | ObjectId | Task group al que pertenece |
| `company` | ObjectId | Company |
| `smState` | ObjectId | **Estado actual del workflow** |
| `smStateMachine` | ObjectId | State machine del workflow |
| `assignee` | ObjectId | Usuario asignado como responsable |
| `editors` | ObjectId[] | Usuarios editores |
| `followers` | ObjectId[] | Usuarios seguidores |
| `visibility` | ObjectId[] | Usuarios con visibilidad limitada |
| `status` | ObjectId | Property representando estado actual |
| `status1` - `status5` | ObjectId | Properties de campos adicionales |
| `asset` | ObjectId | Property de clasificación por activo |
| `extensions` | object | Campos adicionales (collections como additional fields) |
| `answers` | ObjectId[] | Respuestas de surveys en el canal |
| `parent` | ObjectId | Tarea padre (jerarquía) |
| `child` | ObjectId[] | Tareas hijas |
| `startDate` | ISODate | Fecha de inicio |
| `endDate` | ISODate | Fecha límite (deadline) |
| `closedAt` | ISODate | Fecha de cierre (null si abierta) |
| `createdAt` | ISODate | Fecha de creación |
| `createdBy` | ObjectId | Usuario que creó la tarea |
| `modifiedAt` | ISODate | Última modificación |
| `isActive` | boolean | Si está activa |
| `info` | string | Información adicional |

#### COTTaskGroup (campos más usados en rutinas)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `_id` | ObjectId | ID del task group |
| `group` | ObjectId | Grupo asociado |
| `company` | ObjectId | Company |
| `collectionName` | string | Código del workflow group (`groups.nameCode`) |
| `flowType` | string | `"state-machine"` o `"free"` |
| `initialStateMachine` | ObjectId | State machine inicial |
| `botUser` | ObjectId | Bot automático asociado |
| `isActive` | boolean | Si está activo |
| `defaultView` | string | Vista por defecto: `list`, `kanban`, `calendar`, `gantt`, `grid` |
| `createdAt` | ISODate | Fecha de creación |

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

### Límite de Payload en CCJS (Lambda)
**CRÍTICO**: Los stages CCJS se ejecutan como funciones Lambda. Cuando un CCJS recibe datos vía COTLang (ej: `$OUTPUT#stage#data`), las expresiones COTLang se resuelven a JSON y se pasan en el **body del request HTTP** que invoca al Lambda. Si el JSON resultante supera **~6MB**, la invocación falla con `RequestEntityTooLargeException`.

**Síntoma**: Rutina funciona en desarrollo con pocos datos pero falla en producción con volumen real.

**Solución**: No pasar datos grandes como input al CCJS vía COTLang. En su lugar, mover la llamada de red **dentro** del CCJS usando `axios`:

```javascript
// ❌ MAL: NWRequest obtiene datos → CCJS los recibe como input vía COTLang
// Flujo: get_all_items (NWRequest) → process_data (CCJS)
{
  "key": "get_all_items",
  "name": "NWRequest",
  "data": { "url": "/api/v2/properties/?limit=10000" },
  "next": { "OK": "process_data" }
}
{
  "key": "process_data",
  "name": "CCJS",
  "data": {
    "input": "$OUTPUT#get_all_items#data"  // COTLang resuelve a 15MB → body del request al Lambda → FALLA
  }
}

// ✅ BIEN: Eliminar el NWRequest y hacer el fetch dentro del CCJS con axios
{
  "key": "process_data",
  "name": "CCJS",
  "data": {
    "sourceCode": "const response = await axios.get(env.BASEURL + '/api/v2/properties/?limit=10000', { headers: { Authorization: 'Bearer ' + env.TOKEN } }); const items = response.data.data; /* procesar items aquí */ return { result: items.length };"
  }
}
```

**Alternativas** cuando no se puede hacer todo en un CCJS:
1. Pasar solo IDs (payload pequeño) y que el CCJS descargue datos completos con `axios`
2. Paginar el procesamiento dividiendo en chunks <6MB

### Librerías en CCJS
Disponibles: `axios`, `date-fns`, `form-data`, `qs`, `querystring`

---

## Referencias

- Documentación oficial: https://doc.cotalker.com/docs/documentation/automation/existing_routines
- Routine Builder: https://doc.cotalker.com/docs/documentation/automation/admin_routine
- COTLang: https://doc.cotalker.com/docs/documentation/automation/cotlang/admin_cotlangcompren