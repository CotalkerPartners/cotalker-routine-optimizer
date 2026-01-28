# Cotalker API Reference

**Generado:** 2026-01-27
**Versión API:** 2.0.0
**Descripción:** Make the most out of Cotalker's potential for your automation processes using its API tools.
You can find examples and how to use our API in [Partner & Technical Consultants Documentation](https://doc.cotalker.com/docs/documentation/documentation_overview)

---

## Índice

- [Properties](#properties)
- [Tasks](#tasks)
- [Users](#users)
- [Messages](#messages)
- [Channels](#channels)
- [Endpoints Batch](#endpoints-batch)

---

## Resumen de Endpoints

Total de endpoints disponibles: **100**

### Por Categoría

- **tasks**: 32 endpoints\n- **messages**: 15 endpoints\n- **properties**: 7 endpoints\n- **channels**: 5 endpoints\n- **users**: 5 endpoints\n- **answers**: 4 endpoints\n- **bots**: 4 endpoints\n- **propertyTypes**: 4 endpoints\n- **surveys**: 4 endpoints\n- **accessroles**: 3 endpoints\n- **groups**: 3 endpoints\n- **pbscripts**: 3 endpoints\n- **public-surveys**: 3 endpoints\n- **questions**: 3 endpoints\n- **surveychats**: 3 endpoints\n- **companies**: 2 endpoints\n

---

## Properties

Endpoints para gestión de propiedades (properties).

### `GET, POST` /properties/\n\n**Parámetros:**\n- `admin` (opcional): string\n- `search` (opcional): string\n- `limit` (opcional): number\n- `page` (opcional): number\n- `count` (opcional): boolean\n- `order_by` (opcional): string\n- `sort_by` (opcional): string\n- `ids` (opcional): array\n- `parent` (opcional): array\n- `propertyTypes` (opcional): array\n\n**POST**: Create new property
\n\n**Parámetros:**\n- `admin` (requerido): string\n- `debug` (opcional): string\n\n---\n\n### `GET` /properties/code/{codeId}\n\n**Parámetros:**\n- `admin` (requerido): string\n- `codeId` (requerido): string\n- `debug` (opcional): string\n\n---\n\n### `GET` /properties/export\n\n**GET**: Processes properties database by company and exports the properties documents into a .csv
\n\n---\n\n### `PATCH` /properties/jsonpatch/{id}\n\n**PATCH**: (RFC6902) Update property by id
\n\n**Parámetros:**\n- `admin` (requerido): string\n- `id` (requerido): string\n- `debug` (opcional): string\n\n---\n\n### `GET` /properties/relations\n\n**Parámetros:**\n- `admin` (requerido): string\n- `isActive` (opcional): string\n- `relation` (opcional): string\n- `property` (opcional): string\n- `limit` (opcional): number\n- `page` (opcional): number\n- `count` (opcional): string\n- `debug` (opcional): string\n\n---\n\n### `GET` /properties/superproperties/{id}\n\n**Parámetros:**\n- `admin` (requerido): string\n- `id` (requerido): string\n- `limit` (opcional): number\n- `page` (opcional): number\n- `count` (opcional): string\n- `isActive` (opcional): string\n- `debug` (opcional): string\n\n---\n\n### `GET, PATCH` /properties/{id}\n\n**Parámetros:**\n- `admin` (requerido): string\n- `id` (requerido): string\n- `debug` (opcional): string\n\n**PATCH**: Update property by id
\n\n**Parámetros:**\n- `admin` (requerido): string\n- `id` (requerido): string\n- `debug` (opcional): string\n\n---\n\n

## Tasks

Endpoints para gestión de tareas.

### `GET, POST` /tasks/group/\n\n**GET**: Get task groups
\n\n**POST**: Post a new task group document
\n\n---\n\n### `GET` /tasks/group/visibility\n\n**GET**: Get Visible TaskGroup _ids
\n\n---\n\n### `PATCH` /tasks/group/{groupid}\n\n**PATCH**: Update Task Group
\n\n---\n\n### `GET` /tasks/group/{id}\n\n**GET**: Get a task group document
\n\n---\n\n### `GET` /tasks/relations/{id}\n\n**GET**: Get Tasks related to other entities (User as assignee and Property as status, status1...status5, smState)
\n\n---\n\n### `POST` /tasks/{groupid}/bounds\n\n**POST**: Post answer
\n\n---\n\n### `GET` /tasks/{groupid}/bounds/{channelId}\n\n**GET**: Get all tasks binded to channel
\n\n---\n\n### `GET, POST` /tasks/{groupid}/filter\n\n**GET**: Get all active task filters
\n\n**POST**: create task filter
\n\n---\n\n### `GET, PATCH` /tasks/{groupid}/filter/{id}\n\n**GET**: Get task filter by id
\n\n**PATCH**: update task filter
\n\n---\n\n### `GET` /tasks/{groupid}/project\n\n**GET**: Get TaskProject data by projectCode
\n\n---\n\n### `GET, POST` /tasks/{groupid}/sla\n\n**GET**: get SLAs
\n\n**POST**: create SLA for state machine
\n\n---\n\n### `POST` /tasks/{groupid}/sla/executed\n\n**POST**: Update activeSlas for task
\n\n---\n\n### `GET` /tasks/{groupid}/sla/inuse\n\n**GET**: Get slas in use
\n\n---\n\n### `GET` /tasks/{groupid}/sla/smstatemachine/{stateMachineId}\n\n**GET**: get all SMSLA for a StateMachine
\n\n---\n\n### `GET, PATCH` /tasks/{groupid}/sla/{slaId}\n\n**GET**: get SLA by id
\n\n**PATCH**: update SLA for state machine
\n\n---\n\n### `GET` /tasks/{groupid}/sm/nextsmstate\n\n**GET**: get possible SMStates for task
\n\n---\n\n### `GET, POST` /tasks/{groupid}/sm/smstate\n\n**GET**: get all SMStates for task group
\n\n**POST**: create SMState for task group
\n\n---\n\n### `GET` /tasks/{groupid}/sm/smstate/all\n\n**GET**: get all SMStates for task group
\n\n---\n\n### `GET, PATCH` /tasks/{groupid}/sm/smstate/{smstateid}\n\n**GET**: get SMState by id
\n\n**PATCH**: update SMState for task group
\n\n---\n\n### `GET, POST` /tasks/{groupid}/sm/smstatemachine\n\n**GET**: get all SMStateMachines for task group
\n\n**POST**: create SMStateMachine for task group
\n\n---\n\n

## Endpoints Batch

Endpoints que permiten operaciones en múltiples entidades.

### POST /messages/multi

Envío de múltiples mensajes en una sola llamada.

### POST /tasks/{groupid}/task/multi

Operaciones batch sobre múltiples tasks.

**Importante:** Este es el ÚNICO endpoint multi/batch para tasks.

---

## Endpoints NO Disponibles

Los siguientes endpoints **NO EXISTEN** en la API de Cotalker:

- ❌ `/api/v2/properties/superproperties/multi` - NO existe
- ❌ `/api/v2/properties/multi` - NO existe

### Alternativas

Para obtener múltiples properties, usar:

```
GET /properties/?ids=id1,id2,id3&admin=true
```

El endpoint `/properties/` acepta un parámetro `ids` que permite consultar múltiples properties.

---

## Notas de Uso

### Properties

- Para obtener UNA superproperty: `GET /properties/superproperties/{id}`
- Para obtener MÚLTIPLES properties: `GET /properties/?ids=id1,id2,id3`
- Para JSON Patch: `PATCH /properties/jsonpatch/{id}`

### Tasks

- Búsqueda: `POST /tasks/{groupid}/task/all` (con body de query)
- Batch operations: `POST /tasks/{groupid}/task/multi`
- Individual: `GET /tasks/{groupid}/task/{taskId}`

### Authentication

Todos los endpoints requieren:
- Header `Authorization: Bearer <token>`
- Param `admin=true` (para operaciones admin)

---

**Documentación completa:** https://doc.cotalker.com/docs/documentation/documentation_overview

