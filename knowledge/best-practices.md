# Mejores Prácticas para Rutinas Cotalker

Este documento centraliza las mejores prácticas para diseñar rutinas robustas, eficientes y con buena experiencia de usuario.

## 1. Notificaciones de Progreso

### Cuándo aplicar

Antes de cualquier etapa que pueda demorar **>5 segundos**:

- **Loops grandes**: FCEach con >50 iteraciones
- **NWRequest lentos**: Endpoints externos que demoran (APIs de terceros, procesamiento pesado)
- **CCJS pesado**: Procesamiento de arrays grandes, cálculos complejos
- **Múltiples NWRequest en secuencia**: 3+ llamadas consecutivas

### Implementación

```json
{
  "key": "notify_start_processing",
  "name": "PBMessage",
  "data": {
    "channel": "$ENV#PROGRESS_CHANNEL",
    "message": "⏳ Procesando [operación]... Esto puede tomar unos minutos."
  },
  "next": { "OK": "long_running_operation" }
}
```

**Variables a usar**:
- `$ENV#PROGRESS_CHANNEL`: Canal donde notificar progreso
- Mensaje claro indicando qué se está procesando y tiempo estimado

### Beneficios

- ✅ Usuario sabe que el bot está trabajando
- ✅ Reduce tickets de soporte ("¿por qué no responde?")
- ✅ Mejor experiencia de usuario
- ✅ Permite cancelaciones o ajustes si el usuario detecta un error

### Ejemplo completo

```json
[
  {
    "key": "notify_start",
    "name": "PBMessage",
    "data": {
      "channel": "$ENV#PROGRESS_CHANNEL",
      "message": "⏳ Procesando 200 propiedades... Esto puede tomar 2-3 minutos."
    },
    "next": { "OK": "process_properties" }
  },
  {
    "key": "process_properties",
    "name": "FCEach",
    "data": {
      "control": "$OUTPUT#get_properties#data",
      "target": "property"
    },
    "next": { "OK": "property_request" }
  },
  {
    "key": "property_request",
    "name": "NWRequest",
    "data": {
      "url": "/api/v2/properties/$VAR#property|_id"
    },
    "next": { "OK": "update_task" }
  },
  {
    "key": "update_task",
    "name": "PBUpdateTask",
    "data": { /* ... */ },
    "next": { "OK": "notify_complete" }
  },
  {
    "key": "notify_complete",
    "name": "PBMessage",
    "data": {
      "channel": "$ENV#PROGRESS_CHANNEL",
      "message": "✅ Procesamiento completado: 200 propiedades actualizadas."
    }
  }
]
```

---

## 2. Manejo de Errores Obligatorio

### Regla fundamental

**TODA etapa crítica debe tener `next.ERROR` configurado.**

### Etapas críticas (obligatorio)

- `NWRequest`: Endpoints pueden fallar (404, 500, timeout)
- `CCJS`: Errores de JavaScript (null reference, JSON parsing, etc.)
- `PBCreateTask`, `PBUpdateTask`, `PBChangeState`, `PBDuplicateTask`: Validaciones pueden fallar
- Cualquier etapa con lógica de negocio compleja

### Implementación mínima

```json
{
  "key": "critical_operation",
  "name": "NWRequest",
  "data": {
    "url": "/api/v2/properties/$VAR#propertyId",
    "method": "GET"
  },
  "next": {
    "OK": "next_step",
    "ERROR": "error_handler"
  }
}
```

### Error Handler Estándar

```json
{
  "key": "error_handler",
  "name": "PBMessage",
  "data": {
    "channel": "$ENV#ERROR_CHANNEL",
    "message": "❌ Error en [operación]: $VALUE#error|message\n\nPor favor contacte a soporte."
  }
}
```

**Template disponible**: `templates/stages/error-handler.json`

### Error Handler Avanzado (con logging)

Para rutinas críticas, guardar logs de errores:

```json
[
  {
    "key": "error_log",
    "name": "CCJS",
    "data": {
      "sourceCode": "return { errorLog: { stage: '[STAGE_NAME]', error: input.error, timestamp: new Date().toISOString(), context: input.VALUE } };"
    },
    "next": { "OK": "error_save" }
  },
  {
    "key": "error_save",
    "name": "NWRequest",
    "data": {
      "url": "$JOIN#/#($ENV#BASEURL)#api#v2#error-logs",
      "method": "POST",
      "body": "$OUTPUT#error_log#errorLog"
    },
    "next": {
      "OK": "error_notify",
      "ERROR": "error_notify"
    }
  },
  {
    "key": "error_notify",
    "name": "PBMessage",
    "data": {
      "channel": "$ENV#ERROR_CHANNEL",
      "message": "❌ Error en [STAGE_NAME]. Ver logs para detalles."
    }
  }
]
```

### Beneficios

- ✅ Errores no pasan desapercibidos
- ✅ Usuario recibe feedback inmediato
- ✅ Facilita debugging
- ✅ Evita rutinas "colgadas" o en estado inconsistente
- ✅ Permite monitoreo y alertas

---

## 3. Validación Temprana

### Principio

Validar datos de entrada **al inicio de la rutina**, antes de procesamiento costoso.

### Implementación

```json
{
  "key": "validate_input",
  "name": "FCSwitchOne",
  "data": {
    "control": "$VALUE#data|required_field",
    "cases": [
      { "value": "", "next": "error_missing_data" },
      { "default": true, "next": "process_data" }
    ]
  }
}
```

### Validaciones comunes

**Campo requerido vacío**:
```json
{
  "control": "$VALUE#data|field",
  "cases": [
    { "value": "", "next": "error_missing_field" },
    { "default": true, "next": "continue" }
  ]
}
```

**Formato incorrecto** (usando CCJS):
```json
{
  "key": "validate_email",
  "name": "CCJS",
  "data": {
    "sourceCode": "const email = input.VALUE.data.email; const isValid = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email); return { isValid };"
  },
  "next": {
    "OK": "check_valid"
  }
}
```

**Valores fuera de rango**:
```json
{
  "control": "$VALUE#data|quantity|[cast=>parseInt]",
  "cases": [
    { "operator": "<", "value": "0", "next": "error_negative_quantity" },
    { "operator": ">", "value": "1000", "next": "error_quantity_too_high" },
    { "default": true, "next": "process_order" }
  ]
}
```

### Beneficios

- ✅ Falla rápido (fail fast) antes de procesamiento costoso
- ✅ Mensajes de error claros y específicos
- ✅ Evita estados inconsistentes

---

## 4. Bypass para Casos Vacíos

### Principio

Evitar procesamiento innecesario cuando no hay datos que procesar.

### Cuándo aplicar

- Loops que frecuentemente reciben arrays vacíos (>30% de los casos)
- Procesamiento costoso que puede ser omitido
- Operaciones que consumen recursos (NWRequest, CCJS pesado)

### Implementación

```json
{
  "key": "check_has_items",
  "name": "FCSwitchOne",
  "data": {
    "control": "$OUTPUT#get_items#data|[size=>*]",
    "cases": [
      { "value": "0", "next": "skip_processing" },
      { "default": true, "next": "process_items" }
    ]
  }
}
```

**Template disponible**: `templates/stages/bypass-switch.json`

### Ejemplo completo

```json
[
  {
    "key": "get_pending_orders",
    "name": "NWRequest",
    "data": {
      "url": "/api/v2/orders?status=pending"
    },
    "next": { "OK": "check_has_orders" }
  },
  {
    "key": "check_has_orders",
    "name": "CCJS",
    "data": {
      "sourceCode": "return { hasOrders: Array.isArray(input.get_pending_orders.data) && input.get_pending_orders.data.length > 0 };"
    },
    "next": { "OK": "bypass_check" }
  },
  {
    "key": "bypass_check",
    "name": "FCSwitchOne",
    "data": {
      "control": "$OUTPUT#check_has_orders#hasOrders",
      "cases": [
        { "value": "false", "next": "notify_no_orders" },
        { "value": "true", "next": "process_orders" }
      ]
    }
  },
  {
    "key": "notify_no_orders",
    "name": "PBMessage",
    "data": {
      "channel": "$ENV#PROGRESS_CHANNEL",
      "message": "ℹ️ No hay órdenes pendientes para procesar."
    }
  },
  {
    "key": "process_orders",
    "name": "FCEach",
    "data": {
      "control": "$OUTPUT#get_pending_orders#data",
      "target": "order"
    }
  }
]
```

### Beneficios

- ✅ Reduce tiempo de ejecución cuando no hay datos
- ✅ Ahorra recursos (Lambda execution time, API calls)
- ✅ Mejora experiencia de usuario (respuesta más rápida)

### Trade-offs

Ver `knowledge/trade-offs.md` para cuándo NO usar bypass:
- Si el loop body es trivial (<1s)
- Si los casos vacíos son raros (<10%)
- Si agregar el bypass complica la lógica innecesariamente

---

## 5. Logs en Puntos Clave

### Cuándo usar

Para debugging en desarrollo o monitoreo en producción:

- Antes de operaciones críticas
- Después de transformaciones de datos complejas
- En puntos de decisión importantes (switches, validaciones)

### Implementación (desarrollo)

```json
{
  "key": "log_state",
  "name": "CCJS",
  "data": {
    "sourceCode": "console.log('[DEBUG] Estado en stage X:', JSON.stringify(input, null, 2)); return input;"
  },
  "next": { "OK": "next_stage" }
}
```

### Implementación (producción)

En producción, enviar logs a un endpoint de telemetría:

```json
{
  "key": "log_telemetry",
  "name": "NWRequest",
  "data": {
    "url": "$JOIN#/#($ENV#BASEURL)#api#v2#telemetry",
    "method": "POST",
    "body": {
      "event": "routine_checkpoint",
      "stage": "critical_operation",
      "timestamp": "$TIME#now#*",
      "metadata": "$OUTPUT#previous_stage#data"
    }
  },
  "next": { "OK": "continue", "ERROR": "continue" }
}
```

**Importante**: No loguear información sensible (passwords, tokens, PII).

---

## 6. Timeouts Apropiados

### Principio

Configurar timeouts adecuados para NWRequest según el tipo de endpoint.

### Configuración

**Endpoints rápidos** (APIs internas, cache):
```json
{
  "data": {
    "timeout": 5000  // 5 segundos
  }
}
```

**Endpoints lentos** (APIs externas, procesamiento pesado):
```json
{
  "data": {
    "timeout": 60000  // 60 segundos
  }
}
```

**Endpoints muy lentos** (exportaciones, reportes):
```json
{
  "data": {
    "timeout": 300000  // 5 minutos
  }
}
```

### Consideración

- Lambda timeout máximo: 15 minutos
- Default NWRequest timeout: 30 segundos
- Configurar timeout + error handler para evitar rutinas colgadas

---

## 7. Documentación Inline

### Uso de comentarios (no oficial)

Aunque JSON no soporta comentarios oficiales, puedes usar campos `_comment` para documentar:

```json
{
  "key": "complex_calculation",
  "name": "CCJS",
  "_comment": "Calcula el delta entre inventario actual y proyectado. Ver: PROJ-1234",
  "data": {
    "sourceCode": "/* ... */"
  }
}
```

**Nota**: Los comentarios con `_comment` son ignorados por Cotalker, pero ayudan al mantenimiento.

### Nombres descriptivos

Usar nombres de etapas claros y descriptivos:

❌ **Mal**:
```json
{ "key": "stage1", "name": "CCJS" }
{ "key": "req1", "name": "NWRequest" }
```

✅ **Bien**:
```json
{ "key": "calculate_order_total", "name": "CCJS" }
{ "key": "fetch_inventory_data", "name": "NWRequest" }
```

---

## Cuándo NO Aplicar Estas Prácticas

### Notificaciones de progreso NO necesarias

- ❌ Operaciones instantáneas (<2 segundos)
- ❌ Rutinas internas (no interactivas con usuarios)
- ❌ Rutinas batch/scheduled (no hay usuario esperando)
- ❌ Etapas que ya envían mensajes informativos

### Error handlers pueden omitirse

- ❌ Etapas puramente de control (FCSwitchOne, FCIfElse) sin lógica
- ❌ Etapas de log/debug no críticas
- ❌ Cuando toda la rutina está envuelta en try/catch global (poco común en Cotalker)

### Bypass switches no justificados

- ❌ Loop body trivial (<1 segundo de ejecución)
- ❌ Casos vacíos raros (<10% de frecuencia)
- ❌ Agrega complejidad sin beneficio medible

Ver `knowledge/trade-offs.md` para análisis detallado.

---

## Checklist de Mejores Prácticas

Antes de desplegar una rutina a producción, verificar:

- [ ] Todas las etapas críticas tienen `next.ERROR`
- [ ] Operaciones largas (>5s) tienen notificación de progreso
- [ ] Datos de entrada se validan al inicio
- [ ] Loops grandes tienen bypass para casos vacíos
- [ ] Timeouts configurados apropiadamente en NWRequest
- [ ] Nombres de etapas descriptivos
- [ ] Logs en puntos clave (opcional para debugging)
- [ ] No hay información sensible en logs o mensajes

---

## Priorización

**Alta prioridad** (obligatorio):
1. ✅ Manejo de errores en etapas críticas
2. ✅ Validación de entrada

**Media prioridad** (recomendado):
3. ✅ Notificaciones de progreso en operaciones largas
4. ✅ Bypass para casos vacíos frecuentes

**Baja prioridad** (opcional):
5. ⚪ Logs de telemetría
6. ⚪ Comentarios inline
7. ⚪ Timeouts customizados

---

## Referencias

- `knowledge/anti-patterns.json`: Anti-patterns relacionados
- `knowledge/optimization-patterns.md`: Patrones de optimización
- `knowledge/trade-offs.md`: Cuándo aplicar cada práctica
- `templates/stages/error-handler.json`: Template de error handler
- `templates/stages/progress-notification.json`: Template de notificación de progreso
