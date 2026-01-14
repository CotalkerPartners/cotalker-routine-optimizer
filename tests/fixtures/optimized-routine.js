{
    "_id" : ObjectId("67ddd013c4a4a74947fcc770"),
    "company" : ObjectId("66a7c4a4eae95f9126a748fe"),
    "taskGroup" : ObjectId("67db30d2c4a4a74947ace8fd"),
    "isActive" : true,
    "property" : ObjectId("67ddcfe7c4a4a7494708775d"),
    "type" : "in-progress",
    "stateMachine" : ObjectId("67db30d2c4a4a749475becdf"),
    "subtask" : {
        "triggers" : [

        ],
        "target" : null
    },
    "next" : [
        {
            "triggers" : [

            ],
            "target" : ObjectId("67db31f7c4a4a74947ff731f"),
            "canChange" : [
                "none"
            ],
            "requiredSurvey" : null,
            "permissions" : [

            ],
            "_id" : ObjectId("696549a95eb44cff634e337c")
        }
    ],
    "surveyTriggers" : [
        {
            "triggers" : [
                {
                    "version" : "v3",
                    "start" : "get_asset",
                    "maxIterations" : NumberInt(100),
                    "priority" : NumberInt(4),
                    "stages" : [
                        {
                            "key" : "select_option",
                            "name" : "FCSwitchOne",
                            "version" : null,
                            "data" : {
                                "lexpression" : "$VALUE#sentAnswer|data|[find=>identifier=que_realizar_asp_fact]|process|0",
                                "rcaseA" : true,
                                "rcaseB" : "false",
                                "rcaseC" : "fin",
                                "rcaseD" : "aprobado",
                                "rcaseE" : "null"
                            },
                            "next" : {
                                "CASE_A" : "get_os_subproperties_add",
                                "CASE_B" : "ccjs_remove_logic",
                                "CASE_C" : "join_uuids",
                                "CASE_D" : "change_state",
                                "CASE_E" : "",
                                "DEFAULT" : ""
                            },
                            "variables" : [

                            ],
                            "isCritical" : true,
                            "risks" : "",
                            "_id" : ObjectId("696549a95eb44cff634e337f"),
                            "customNetworkRequest" : [

                            ]
                        },
                        {
                            "key" : "update_asset",
                            "name" : "NWRequest",
                            "version" : "2.0.0",
                            "data" : {
                                "url" : "$JOIN#/#($ENV#BASEURL)#api#v2#properties#jsonpatch#($OUTPUT#get_asset#data|data|_id)",
                                "method" : "PATCH",
                                "headers" : {
                                    "admin" : "true"
                                },
                                "defaultAuth" : true,
                                "queryString" : {
                                    "debug" : true
                                },
                                "body" : "$OUTPUT#format_update_os#data|jsonPatch"
                            },
                            "next" : {
                                "SUCCESS" : "check_clients_add",
                                "ERROR" : "send_error_message"
                            },
                            "variables" : [

                            ],
                            "isCritical" : false,
                            "risks" : "",
                            "_id" : ObjectId("696530aeebfffa7c79bb38ea"),
                            "customNetworkRequest" : [

                            ]
                        },
                        {
                            "key" : "get_asset",
                            "name" : "NWRequest",
                            "version" : "2.0.0",
                            "data" : {
                                "url" : "$JOIN#/#($ENV#BASEURL)#api#v2#properties#($VALUE#asset)",
                                "method" : "GET",
                                "headers" : {
                                    "admin" : true
                                },
                                "defaultAuth" : true,
                                "queryString" : {
                                    "debug" : true
                                }
                            },
                            "next" : {
                                "SUCCESS" : "select_option",
                                "ERROR" : "send_error_message"
                            },
                            "variables" : [

                            ],
                            "isCritical" : false,
                            "risks" : "",
                            "_id" : ObjectId("689a469151459e940fbe5dc6"),
                            "customNetworkRequest" : [

                            ]
                        },
                        {
                            "key" : "format_update_os",
                            "name" : "CCJS",
                            "version" : "2.0.3",
                            "data" : {
                                "src" : "const asset = data.asset; const ossSubproperties = data.ossSubproperties || []; const osObjectsRaw = (Array.isArray(data.osObjects) ? data.osObjects : (data.osObjects_ || [])); const clientToAssetMap = {}; const uniqueClientsSet = new Set(); const isValidObjectId = (id) => { return typeof id === 'string' && /^[0-9a-f]{24}$/i.test(id); }; const incomingOSsFromForm = osObjectsRaw.map(os => { let obj = {}; if (typeof os === 'string') { try { obj = JSON.parse(os) || {}; } catch (e) { obj = {}; } } else { obj = os || {}; } const rc = obj?.schemaInstance?.rut_cliente; const as = obj?.schemaInstance?.asset || obj?._id; if (rc && typeof rc === 'string' && as) { if (!clientToAssetMap[rc]) clientToAssetMap[rc] = new Set(); clientToAssetMap[rc].add(as); uniqueClientsSet.add(rc); } return obj?._id; }).filter(id => id && isValidObjectId(id)); const answerOS = (Array.isArray(data.answerOS) && data.answerOS.length) ? data.answerOS : (data.answerOS_ || []); const repuestosRaw = (Array.isArray(data.repuestos) && data.repuestos.length) ? data.repuestos : (data.repuestos_ || []); const repuestos_os = Array.isArray(data.repuestos_os) ? data.repuestos_os : []; const jsonPatch = []; if (!asset?.schemaInstance?.ordenes_de_servicio) { throw new Error(`El asset de id ${asset?._id} no posee en su schema el campo \"ordenes de servicio\"`); } const repuestosParsed = repuestosRaw.map(r => { if (typeof r === 'string') { try { return JSON.parse(r); } catch { return {}; } } return (r && typeof r === 'object') ? r : {}; }); const repuestosFromSchema = repuestosParsed.flatMap(r => Array.isArray(r?.schemaInstance?.repuestos) ? r.schemaInstance.repuestos : [] ); const currentSubSet = new Set(Array.isArray(asset.subproperty) ? asset.subproperty : []); const currentOSsSet = new Set(Array.isArray(asset.schemaInstance.ordenes_de_servicio) ? asset.schemaInstance.ordenes_de_servicio : []); const nuevos_repuestos = [...new Set([...repuestosFromSchema, ...repuestos_os])].filter(id => id && isValidObjectId(id)); const incomingOSs = [...new Set([...answerOS, ...incomingOSsFromForm, ...ossSubproperties.map(e => e._id)])].filter(id => id && isValidObjectId(id)); const OSsToPatch = incomingOSs.filter(id => !currentOSsSet.has(id)); const totalIncoming = [...new Set([...incomingOSs, ...nuevos_repuestos])]; const SubsToPatch = totalIncoming.filter(id => !currentSubSet.has(id)); OSsToPatch.forEach(id => { jsonPatch.push({ op: \"add\", path: \"/schemaInstance/ordenes_de_servicio/-\", value: id }); }); SubsToPatch.forEach(id => { jsonPatch.push({ op: \"add\", path: \"/subproperty/-\", value: id }); }); const clientsList = [...uniqueClientsSet].filter(c => c && typeof c === 'string'); return { jsonPatch, tasksOSsToUpdate: OSsToPatch, nuevos_repuestos: SubsToPatch, uniqueClients: clientsList, hasClients: clientsList.length > 0, clientMapping: Object.fromEntries(Object.entries(clientToAssetMap).map(([k,v]) => [k, [...v]])) };",
                                "data" : {
                                    "asset" : "$OUTPUT#get_asset#data|data",
                                    "answerOS" : "$VALUE#sentAnswer|data|[find=>identifier=ordenes_de_servicio_asp_fact]|process",
                                    "osObjects" : "$VALUE#sentAnswer|data|[find=>identifier=ordenes_de_servicio_asp_fact]|responses",
                                    "ossSubproperties" : "$OUTPUT#get_os_subproperties_add#data",
                                    "repuestos" : "$VALUE#sentAnswer|data|[find=>identifier=ordenes_de_servicio_asp_fact]|responses",
                                    "repuestos_os" : "$VALUE#extensions|activo_facturacion|repuestos_os",
                                    "answerOS_" : "$VALUE#sentAnswer|data|[find=>identifier=ordenes_de_servicio_asp_fact_]|process",
                                    "osObjects_" : "$VALUE#sentAnswer|data|[find=>identifier=ordenes_de_servicio_asp_fact_]|responses",
                                    "repuestos_" : "$VALUE#sentAnswer|data|[find=>identifier=ordenes_de_servicio_asp_fact_]|responses"
                                }
                            },
                            "next" : {
                                "SUCCESS" : "update_asset",
                                "ERROR" : "send_error_message"
                            },
                            "variables" : [

                            ],
                            "isCritical" : false,
                            "risks" : "",
                            "_id" : ObjectId("69651576ebfffa7c79bb1909"),
                            "customNetworkRequest" : [

                            ]
                        },
                        {
                            "key" : "format_delete_os",
                            "name" : "CCJS",
                            "version" : "2.0.3",
                            "data" : {
                                "src" : "const asset = data.asset;\nconst osToDelete = data.osToDelete;\nconst ossSubproperties = data.ossSubproperties;\n\nconst jsonPatch = []\n\nif(!ossSubproperties?.length) {\n  throw new Error(`El asset de id ${asset?._id} no posse subpropiedades de tipo ordenes de servicio`)\n}\n\nif(!asset?.schemaInstance?.ordenes_de_servicio) {\n  throw new Error(`El asset de id ${asset?._id} no posse en su schema el campo \"ordenes de servicio\"`)\n}\n\nif(ossSubproperties.lenth !== asset.schemaInstance.ordenes_de_servicio.lenth) {\n  throw new Error(`Las subpropiedades de tipo ordenes de servicio del asset de id ${asset._id} no tienen el mismo largo que las propiedades dentro del schema \"ordenes de servicio\"`)\n}\n\nif(ossSubproperties.some(e => !asset.schemaInstance.ordenes_de_servicio.includes(e._id))) {\n  throw new Error(`Hay elementos distintos en el asset de id ${asset._id}, pues hay incongruencias entre las subpropiedades de tipo ordenes de servicio y el campo del schema \"ordenes de servicio\"`)\n}\n\nconst newOSs = ossSubproperties.filter(e => !osToDelete.includes(e._id)).map(e => e._id)\n\nconst allSubproperties = asset.subproperty.filter(e => !osToDelete.includes(e))\n\njsonPatch.push({\"op\":\"add\",\"path\":\"/subproperty\",\"value\":allSubproperties})\njsonPatch.push({\"op\":\"add\",\"path\":\"/schemaInstance/ordenes_de_servicio\",\"value\":newOSs})\n\nreturn {jsonPatch,tasksOSsToUpdate:osToDelete}\n",
                                "data" : {
                                    "asset" : "$OUTPUT#get_asset#data|data",
                                    "osToDelete" : "$VALUE#sentAnswer|data|[find=>identifier=ordenes_de_servicio_eliminar_asp_fact]|process",
                                    "ossSubproperties" : "$OUTPUT#get_os_subproperties_delete#data"
                                }
                            },
                            "next" : {
                                "SUCCESS" : "update_asset_delete_os",
                                "ERROR" : "send_error_message"
                            },
                            "variables" : [

                            ],
                            "isCritical" : false,
                            "risks" : "",
                            "_id" : ObjectId("689be37d94c491b6f0bb4f74"),
                            "customNetworkRequest" : [

                            ]
                        },
                        {
                            "key" : "update_asset_delete_os",
                            "name" : "NWRequest",
                            "version" : "2.0.0",
                            "data" : {
                                "url" : "$JOIN#/#($ENV#BASEURL)#api#v2#properties#jsonpatch#($OUTPUT#get_asset#data|data|_id)",
                                "method" : "PATCH",
                                "headers" : {
                                    "admin" : true
                                },
                                "defaultAuth" : true,
                                "queryString" : {
                                    "debug" : true
                                },
                                "body" : "$OUTPUT#format_delete_os#data|jsonPatch"
                            },
                            "next" : {
                                "SUCCESS" : "patch_multiple_tasks_delete",
                                "ERROR" : "send_error_message"
                            },
                            "variables" : [

                            ],
                            "isCritical" : false,
                            "risks" : "",
                            "_id" : ObjectId("689b709e94c491b6f0b6e32e"),
                            "customNetworkRequest" : [

                            ]
                        },
                        {
                            "key" : "change_state",
                            "name" : "PBChangeState",
                            "version" : "2.1.0",
                            "data" : {
                                "tid" : "$VALUE#_id",
                                "smState" : "67db31f7c4a4a74947ff731f",
                                "taskGroup" : "$VALUE#taskGroup"
                            },
                            "next" : {
                                "ERROR" : "send_error_message"
                            },
                            "variables" : [

                            ],
                            "isCritical" : false,
                            "risks" : "",
                            "_id" : ObjectId("68839fbe12719bfc38b206c9"),
                            "customNetworkRequest" : [

                            ]
                        },
                        {
                            "key" : "patch_multiple_tasks_add",
                            "name" : "PBScript",
                            "version" : null,
                            "data" : {
                                "data" : {
                                    "state" : "67e46408c4a4a74947b6d9d2",
                                    "target_tsk_group" : "66a9165e8abf773cfe6efd8e",
                                    "assets" : "$OUTPUT#format_update_os#data|tasksOSsToUpdate"
                                },
                                "code" : "patch_multiple_tasks"
                            },
                            "next" : {
                                "SUCCESS" : "add_message",
                                "ERROR" : "send_error_message"
                            },
                            "variables" : [

                            ],
                            "isCritical" : false,
                            "risks" : "",
                            "_id" : ObjectId("6965077afc784172a0f33044"),
                            "customNetworkRequest" : [

                            ]
                        },
                        {
                            "key" : "patch_multiple_tasks_delete",
                            "name" : "PBScript",
                            "version" : null,
                            "data" : {
                                "data" : {
                                    "state" : "66a92d378abf773cfe6f968f",
                                    "target_tsk_group" : "66a9165e8abf773cfe6efd8e",
                                    "assets" : "$OUTPUT#ccjs_remove_logic#data|tasksOSsToUpdate"
                                },
                                "code" : "patch_multiple_tasks"
                            },
                            "next" : {
                                "SUCCESS" : "delete_message",
                                "ERROR" : "send_error_message"
                            },
                            "variables" : [

                            ],
                            "isCritical" : false,
                            "risks" : "",
                            "_id" : ObjectId("696549a95eb44cff634e3387"),
                            "customNetworkRequest" : [

                            ]
                        },
                        {
                            "key" : "add_message",
                            "name" : "PBMessage",
                            "version" : "2.1.0",
                            "data" : {
                                "content" : "Se han agregado con éxito nuevas ordenes de servicio a la solicitud de prefactura",
                                "contentType" : "text/system",
                                "sentBy" : "66a7c4a4eae95f9126a74947",
                                "channelIds" : [
                                    "$VALUE#channel"
                                ]
                            },
                            "next" : {
                                "SUCCESS" : "add_ccjs",
                                "ERROR" : "send_error_message"
                            },
                            "variables" : [

                            ],
                            "isCritical" : false,
                            "risks" : "",
                            "_id" : ObjectId("6859a83f5fe23d780b2885df"),
                            "customNetworkRequest" : [

                            ]
                        },
                        {
                            "key" : "delete_message",
                            "name" : "PBMessage",
                            "version" : "2.1.0",
                            "data" : {
                                "content" : "Se han eliminado con éxito ordenes de servicio a la solicitud de prefactura",
                                "contentType" : "text/system",
                                "sentBy" : "66a7c4a4eae95f9126a74947",
                                "channelIds" : [
                                    "$VALUE#channel"
                                ]
                            },
                            "next" : {
                                "SUCCESS" : "mensaje_metabase_2",
                                "ERROR" : "send_error_message"
                            },
                            "variables" : [

                            ],
                            "isCritical" : false,
                            "risks" : "",
                            "_id" : ObjectId("696549a95eb44cff634e3389"),
                            "customNetworkRequest" : [

                            ]
                        },
                        {
                            "key" : "iterar_",
                            "name" : "FCEach",
                            "version" : "3.0.0",
                            "data" : {
                                "control" : "$VALUE#sentAnswer|data|[find=>identifier=agregar_precios]|responses|0|[json=>parse]|uuids",
                                "target" : "uuid"
                            },
                            "next" : {
                                "STEP" : "red",
                                "DONE" : "ccjs"
                            },
                            "variables" : [

                            ],
                            "isCritical" : false,
                            "_id" : ObjectId("6841dfef87a07505aea00840"),
                            "customNetworkRequest" : [

                            ]
                        },
                        {
                            "key" : "ccjs",
                            "name" : "CCJS",
                            "version" : "2.0.3",
                            "data" : {
                                "src" : "const iterar = data?.iterar || [];\nconst response = iterar.map(iteracion => iteracion.results).flat();\n\n// Aquí ajustamos: si resumen es string, parseamos, si no, asumimos que ya es array JSON\nconst resumen = typeof data.resumen === \"string\" \n  ? JSON.parse(data.resumen) \n  : Array.isArray(data.resumen) \n    ? data.resumen \n    : [];\n\nconst objeto = response\n  .filter(item => item.result?.data?.data)\n  .map(item => item.result.data.data)\n  .flat();\nconst todosLosDatos = objeto.map(item => item.data).flat();\n\nconst identificadores = [\n  \"seleccione_repuesto\",\n  \"precio_repuesto_\",\n  \"tipo_cobro\"\n];\nconst itemsFiltrados = todosLosDatos.filter(item => identificadores.includes(item.identifier));\n\nconst seleccion = itemsFiltrados.filter(item => item.identifier === \"seleccione_repuesto\");\nconst precioCrudo = itemsFiltrados.filter(item => item.identifier === \"precio_repuesto_\");\nconst garantia = itemsFiltrados.filter(item => item.identifier === \"tipo_cobro\");\n\nconst detalle = seleccion.map((item, index) => ({\n  repuesto: JSON.parse(item?.responses?.[0] || '{}')?.schemaInstance?.codigo_sap || null,\n  precio: parseFloat(precioCrudo[index]?.process?.[0] || \"0\"),\n  garantia: JSON.parse(garantia[index]?.responses?.[0] || '{}')?.schemaInstance?.codigo_sap || \"\"\n}));\n\n// Actualizamos resumen con nuevos precios y tipoCobro\nconst resumenActualizado = resumen.map(os => {\n  const articulosActualizados = os.articulos.map(articulo => {\n    const nuevoDato = detalle.find(d => d.repuesto === articulo.itemCode);\n    if (nuevoDato) {\n      return {\n        ...articulo,\n        precio: nuevoDato.precio,\n        tipoCobro: nuevoDato.garantia || articulo.tipoCobro\n      };\n    }\n    return articulo;\n  });\n  return {\n    ...os,\n    articulos: articulosActualizados\n  };\n});\n\nreturn {\n  resumenActualizado: JSON.stringify(resumenActualizado)\n};\n",
                                "data" : {
                                    "iterar" : "$OUTPUT#iterar_#iterationResults",
                                    "resumen" : "$VALUE#extensions|activo_facturacion|lista_precios"
                                }
                            },
                            "next" : {
                                "SUCCESS" : "patch",
                                "ERROR" : "send_error_message"
                            },
                            "variables" : [

                            ],
                            "isCritical" : false,
                            "risks" : "",
                            "_id" : ObjectId("6965150ffc784172a0f34e74"),
                            "customNetworkRequest" : [

                            ]
                        },
                        {
                            "key" : "red",
                            "name" : "NWRequest",
                            "version" : "2.0.0",
                            "data" : {
                                "url" : "$JOIN#/#($ENV#BASEURL)#api#v2#answers#($VALUE#uuid)",
                                "method" : "GET",
                                "headers" : {
                                    "admin" : true
                                },
                                "defaultAuth" : true
                            },
                            "next" : {
                                "SUCCESS" : "",
                                "ERROR" : "send_error_message"
                            },
                            "variables" : [

                            ],
                            "isCritical" : false,
                            "risks" : "",
                            "_id" : ObjectId("6859fb955fe23d780b2a9a82"),
                            "customNetworkRequest" : [

                            ]
                        },
                        {
                            "key" : "mensaje",
                            "name" : "PBMessage",
                            "version" : "2.1.0",
                            "data" : {
                                "content" : "$JOIN##(```[Ir al cuadro resumen]```)#(```(```)#(https://bi.staging.cotalker.com/public/dashboard/)#(```21afef8b-2a62-4498-9b78-c2f96f892953?tarea_id=```)#($VALUE#_id)#(```&n_os=666```)#(```#hide_parameters=tarea_id,n_os```)#(```)```)",
                                "contentType" : "text/system",
                                "sentBy" : "66a7c4a4eae95f9126a74949",
                                "channelIds" : [
                                    "$VALUE#channel"
                                ]
                            },
                            "next" : {
                                "SUCCESS" : "ccjs_repuestos",
                                "ERROR" : "send_error_message"
                            },
                            "variables" : [

                            ],
                            "isCritical" : false,
                            "risks" : "",
                            "_id" : ObjectId("687fd66834dd6700e0aa20b7"),
                            "customNetworkRequest" : [

                            ]
                        },
                        {
                            "key" : "get_os_subproperties_add",
                            "name" : "NWRequest",
                            "version" : "2.0.0",
                            "data" : {
                                "url" : "$JOIN#/#($ENV#BASEURL)#api#v1#properties#find",
                                "method" : "POST",
                                "headers" : {
                                    "admin" : true
                                },
                                "defaultAuth" : true,
                                "queryString" : {
                                    "debug" : true
                                },
                                "body" : {
                                    "_id" : {
                                        "$in" : "$OUTPUT#get_asset#data|data|subproperty"
                                    },
                                    "propertyType" : "activo_de_llamadas_y_os"
                                }
                            },
                            "next" : {
                                "SUCCESS" : "format_update_os",
                                "ERROR" : "send_error_message"
                            },
                            "variables" : [

                            ],
                            "isCritical" : false,
                            "risks" : "",
                            "_id" : ObjectId("689be37d94c491b6f0bb4f7f"),
                            "customNetworkRequest" : [

                            ]
                        },
                        {
                            "key" : "get_os_subproperties_delete",
                            "name" : "NWRequest",
                            "version" : "2.0.0",
                            "data" : {
                                "url" : "$JOIN#/#($ENV#BASEURL)#api#v1#properties#find",
                                "method" : "POST",
                                "headers" : {
                                    "admin" : true
                                },
                                "defaultAuth" : true,
                                "queryString" : {
                                    "debug" : true
                                },
                                "body" : {
                                    "_id" : {
                                        "$in" : "$OUTPUT#get_asset#data|data|subproperty"
                                    },
                                    "propertyType" : "activo_de_llamadas_y_os"
                                }
                            },
                            "next" : {
                                "SUCCESS" : "format_delete_os",
                                "ERROR" : "send_error_message"
                            },
                            "variables" : [

                            ],
                            "isCritical" : false,
                            "risks" : "",
                            "_id" : ObjectId("689be37d94c491b6f0bb4f80"),
                            "customNetworkRequest" : [

                            ]
                        },
                        {
                            "key" : "patch",
                            "name" : "NWRequest",
                            "version" : "2.0.0",
                            "data" : {
                                "url" : "$JOIN#/#($ENV#BASEURL)#api#v2#properties#jsonpatch#($OUTPUT#get_asset#data|data|_id)",
                                "method" : "patch",
                                "headers" : {
                                    "admin" : true
                                },
                                "defaultAuth" : true,
                                "body" : [
                                    {
                                        "op" : "add",
                                        "path" : "/schemaInstance/lista_precios",
                                        "value" : "$OUTPUT#ccjs#data|resumenActualizado"
                                    }
                                ]
                            },
                            "next" : {
                                "SUCCESS" : "iterar_servicio",
                                "ERROR" : "send_error_message"
                            },
                            "variables" : [

                            ],
                            "isCritical" : false,
                            "risks" : "",
                            "_id" : ObjectId("689be37d94c491b6f0bb4f81"),
                            "customNetworkRequest" : [

                            ]
                        },
                        {
                            "key" : "add_ccjs",
                            "name" : "CCJS",
                            "version" : "2.0.3",
                            "data" : {
                                "src" : "// --- Helpers base ---\nconst safeJSON = (val, def) => {\n  if (val == null) return def;\n  if (typeof val === \"string\") {\n    const s = val.trim();\n    try { return JSON.parse(s); } catch { return def; }\n  }\n  if (Array.isArray(val) || typeof val === \"object\") return val;\n  return def;\n};\nconst s = v => (v == null ? \"\" : String(v).trim());\n\n// --- Helpers para parsear arreglo de OS desde una fuente flexible ---\nconst parseOSArray = (src) => {\n  if (Array.isArray(src)) {\n    return src.map(x => (typeof x === \"string\" ? safeJSON(x, {}) : x)).filter(Boolean);\n  }\n  if (typeof src === \"string\") {\n    const parsed = safeJSON(src, null);\n    if (Array.isArray(parsed)) return parsed.filter(Boolean);\n    if (parsed && typeof parsed === \"object\") return [parsed];\n    return [];\n  }\n  if (src && typeof src === \"object\") return [src];\n  return [];\n};\n\n// --- Parseo de nuevaOS con fallback a nuevaOS_ ---\nlet nuevaOSArr = parseOSArray(data.nuevaOS);\nif (!nuevaOSArr.length) {\n  nuevaOSArr = parseOSArray(data.nuevaOS_);\n}\n\n/* ---------------- SIN reparador de JSON \"facturacion\" ----------------\n   Versión simple: intenta usar tal cual si ya es array/objeto; si es string,\n   intenta JSON.parse una sola vez. Sin salvage, sin clip, sin balanceos.\n-----------------------------------------------------------------------*/\nconst parseFacturacionSimple = (schema) => {\n  const raw = schema?.facturacion;\n  const info = {\n    raw: raw == null ? null : (typeof raw === \"string\" ? raw : null),\n    parse_ok: false,\n    error: null\n  };\n\n  if (Array.isArray(raw)) {\n    info.parse_ok = true;\n    return { arr: raw, info };\n  }\n  if (raw && typeof raw === \"object\") {\n    info.parse_ok = true;\n    return { arr: [raw], info };\n  }\n  const str = s(raw);\n  if (!str) return { arr: [], info };\n\n  try {\n    const val = JSON.parse(str);\n    info.parse_ok = true;\n    return { arr: Array.isArray(val) ? val : [val], info };\n  } catch (e) {\n    info.error = String(e?.message || e);\n    return { arr: [], info };\n  }\n};\n\n// Excluir códigos que empiezan con \"ST\" manteniendo alineación\nconst filterOutST = (codes, qtys) => {\n  const outCodes = [];\n  const outQtys  = [];\n  const n = Math.max(codes.length, qtys.length);\n  for (let i = 0; i < n; i++) {\n    const code = s(codes[i]);\n    const qty  = s(qtys[i] ?? \"1\");\n    if (!code) continue;\n    if (code.toUpperCase().startsWith(\"ST\")) continue; // excluir ST*\n    outCodes.push(code);\n    outQtys.push(qty);\n  }\n  return { codes: outCodes, qtys: outQtys };\n};\n\n// --- Construcción de repuestos_os SOLO desde facturacion (sin reparación) y excluyendo ST* ---\nconst facturacion_debug = [];\nconst repuestos_os = nuevaOSArr.map(osObj => {\n  const schema = osObj?.schemaInstance || {};\n  const osNum = s(schema.numero_os) || null;\n  const tecnico = s(schema.tecnico) || null;\n\n  const { arr: factArr, info } = parseFacturacionSimple(schema);\n  facturacion_debug.push({ numero_os: osNum, ...info });\n\n  const items = factArr.flatMap(f => Array.isArray(f.articulos) ? f.articulos : []);\n  const codes = items.map(a => s(a?.itemCode)).filter(Boolean);\n  const qtys  = items.map(a => s(a?.cantidad ?? \"1\"));\n  const filtered = filterOutST(codes, qtys);\n\n  return {\n    numero_os: osNum,\n    codigoRepuestos: filtered.codes,\n    cantidadRepuestos: filtered.qtys,\n    tecnico\n  };\n});\n\n// Arrays planos (ya filtrados)\nconst codigo_repuesto = repuestos_os.flatMap(r => r.codigoRepuestos);\nconst cantidad_repuestos = repuestos_os.flatMap(r => r.cantidadRepuestos);\n\n// Centro de costo\nlet centroCosto = null;\nif (nuevaOSArr.length) {\n  const schema0 = nuevaOSArr[0]?.schemaInstance || {};\n  centroCosto = schema0?.centro_costo ?? null;\n  if (!centroCosto) {\n    const { arr: fact0 } = parseFacturacionSimple(schema0);\n    const art0 = Array.isArray(fact0?.[0]?.articulos) ? fact0[0].articulos[0] : null;\n    if (art0?.centroCosto) centroCosto = art0.centroCosto;\n  }\n}\n\n/* ---------------- APPEND de precios (sin dedup y sin filtrar ST aquí) ---------------- */\n\nconst preciosBase = (() => {\n  if (typeof data.precios === \"string\") {\n    const parsed = safeJSON(data.precios, []);\n    return Array.isArray(parsed) ? parsed : [];\n  }\n  return Array.isArray(data.precios) ? data.precios : [];\n})();\n\nconst normalizeArticulo = (a, schema) => ({\n  itemCode: s(a?.itemCode),\n  itemName: s(a?.itemName),\n  cantidad: s(a?.cantidad ?? \"1\"),\n  tipoCobro: s(a?.tipoCobro || \"CC\"),\n  centroCosto: (a?.centroCosto ?? schema?.centro_costo ?? null),\n  precio: a?.precio ?? 0,\n  costo: a?.costo ?? 0\n});\n\nconst nuevos = [];\nnuevaOSArr.forEach(osObj => {\n  const schema = osObj?.schemaInstance || {};\n  const osNum = s(schema.numero_os);\n\n  const parsed = parseFacturacionSimple(schema);\n  let factArr = parsed.arr;\n\n  // Si no hay facturación válida, devolvemos vacío para ese OS\n  if (!factArr.length) {\n    if (osNum) nuevos.push({ numero_os: osNum, articulos: [] });\n    return;\n  }\n\n  // Agregar artículos normalizados a \"nuevos\"\n  factArr.forEach(fact => {\n    const numero_os = s(fact?.numero_os || osNum);\n    if (!numero_os) return;\n    const artsRaw = Array.isArray(fact.articulos) ? fact.articulos : [];\n    const articulos = artsRaw.map(a => normalizeArticulo(a, schema));\n    nuevos.push({ numero_os, articulos });\n  });\n});\n\n/* --- Fusión: reemplazar entradas vacías por las nuevas del mismo numero_os --- */\nconst preciosBaseMutable = Array.isArray(preciosBase) ? preciosBase.slice() : [];\nconst emptySpotMap = {};\nfor (let i = 0; i < preciosBaseMutable.length; i++) {\n  const it = preciosBaseMutable[i] || {};\n  const k = s(it.numero_os);\n  const len = Array.isArray(it.articulos) ? it.articulos.length : 0;\n  if (k && len === 0) {\n    (emptySpotMap[k] ||= []).push(i);\n  }\n}\n\nnuevos.forEach(nv => {\n  const k = s(nv.numero_os);\n  const slots = emptySpotMap[k];\n  if (slots && slots.length) {\n    const idx = slots.shift();          // rellena la primera vacía\n    preciosBaseMutable[idx] = nv;\n  } else {\n    preciosBaseMutable.push(nv);        // si no hay vacías, agrega\n  }\n});\n\nconst preciosFinal = preciosBaseMutable;\n\n// ---- Retorno final ----\nreturn {\n  // Arrays de repuestos (sin ST*)\n  repuestos_os,\n  codigo_repuesto,\n  cantidad_repuestos,\n\n  // Centro de costo\n  centroCosto,\n\n  // Precios (stringify + array) — reemplaza vacías\n  precios: JSON.stringify(preciosFinal),\n  precios_array: preciosFinal,\n\n  // DEBUG/REPORTE simple (sin reparaciones)\n  facturacion_debug\n};",
                                "data" : {
                                    "precios" : "$VALUE#extensions|activo_facturacion|lista_precios",
                                    "nuevaOS" : "$VALUE#sentAnswer|data|[find=>identifier=ordenes_de_servicio_asp_fact]|responses",
                                    "nuevaOS_" : "$VALUE#sentAnswer|data|[find=>identifier=ordenes_de_servicio_asp_fact_]|responses"
                                }
                            },
                            "next" : {
                                "SUCCESS" : "mensaje_sap",
                                "ERROR" : "send_error_message"
                            },
                            "variables" : [

                            ],
                            "isCritical" : false,
                            "risks" : "",
                            "_id" : ObjectId("696530aeebfffa7c79bb38fb"),
                            "customNetworkRequest" : [

                            ]
                        },
                        {
                            "key" : "remove_ccjs",
                            "name" : "CCJS",
                            "version" : "2.0.3",
                            "data" : {
                                "src" : "// 1. Parsear resumen (puede venir doblemente stringificado)\nlet resumenString = data.resumen || \"[]\";\nlet resumen = [];\ntry {\n  let temp = JSON.parse(resumenString);\n  resumen = typeof temp === \"string\" ? JSON.parse(temp) : temp;\n} catch (e) {\n  console.error(\"Error al parsear resumen:\", e);\n  resumen = [];\n}\n\n// 2. Parsear deleteOS: es un array de strings JSON, extraer numero_os de cada uno\nconst deleteOSArray = Array.isArray(data.deleteOS) ? data.deleteOS : [];\nconst numeroOsAEliminar = [];\n\nfor (const osString of deleteOSArray) {\n  try {\n    const osParsed = JSON.parse(osString);\n    const numOS = osParsed?.schemaInstance?.numero_os;\n    if (numOS) {\n      numeroOsAEliminar.push(String(numOS));\n    }\n  } catch (e) {\n    console.error(\"Error al parsear deleteOS item:\", e);\n  }\n}\n\n// 3. Filtrar resumen eliminando los numero_os que aparecen en numeroOsAEliminar\nconst resumenFiltrado = resumen.filter(\n  item => !numeroOsAEliminar.includes(String(item.numero_os))\n);\n\n// 4. Stringify para devolver en el mismo formato\nconst resumenFiltradoString = JSON.stringify(resumenFiltrado);\n\n// 5. (Opcional) actualizar data.resumen\ndata.resumen = resumenFiltradoString;\n\n// 6. Retornar resultado\nreturn resumenFiltradoString;\n",
                                "data" : {
                                    "resumen" : "$VALUE#extensions|activo_facturacion|lista_precios",
                                    "deleteOS" : "$VALUE#sentAnswer|data|[find=>identifier=ordenes_de_servicio_eliminar_asp_fact]|responses"
                                }
                            },
                            "next" : {
                                "SUCCESS" : "patch_3",
                                "ERROR" : "send_error_message"
                            },
                            "variables" : [

                            ],
                            "isCritical" : false,
                            "risks" : "",
                            "_id" : ObjectId("696549a95eb44cff634e3392"),
                            "customNetworkRequest" : [

                            ]
                        },
                        {
                            "key" : "patch_2",
                            "name" : "NWRequest",
                            "version" : "2.0.0",
                            "data" : {
                                "url" : "$JOIN#/#($ENV#BASEURL)#api#v2#properties#jsonpatch#($OUTPUT#get_asset#data|data|_id)",
                                "method" : "patch",
                                "headers" : {
                                    "admin" : true
                                },
                                "defaultAuth" : true,
                                "body" : [
                                    {
                                        "op" : "add",
                                        "path" : "/schemaInstance/lista_precios",
                                        "value" : "$OUTPUT#ccjs_servicios#data|resumenActualizado"
                                    }
                                ]
                            },
                            "next" : {
                                "SUCCESS" : "iterar_no_cobrados",
                                "ERROR" : "send_error_message"
                            },
                            "variables" : [

                            ],
                            "isCritical" : false,
                            "risks" : "",
                            "_id" : ObjectId("689c8e3994c491b6f0bee501"),
                            "customNetworkRequest" : [

                            ]
                        },
                        {
                            "key" : "patch_3",
                            "name" : "NWRequest",
                            "version" : "2.0.0",
                            "data" : {
                                "url" : "$JOIN#/#($ENV#BASEURL)#api#v2#properties#jsonpatch#($OUTPUT#get_asset#data|data|_id)",
                                "method" : "patch",
                                "headers" : {
                                    "admin" : true
                                },
                                "defaultAuth" : true,
                                "body" : [
                                    {
                                        "op" : "add",
                                        "path" : "/schemaInstance/lista_precios",
                                        "value" : "$OUTPUT#remove_ccjs#data"
                                    }
                                ]
                            },
                            "next" : {
                                "SUCCESS" : "mensaje_metabase_2",
                                "ERROR" : "send_error_message"
                            },
                            "variables" : [

                            ],
                            "isCritical" : false,
                            "risks" : "",
                            "_id" : ObjectId("696549a95eb44cff634e3394"),
                            "customNetworkRequest" : [

                            ]
                        },
                        {
                            "key" : "call_bot",
                            "name" : "NWRequest",
                            "version" : "2.0.0",
                            "data" : {
                                "url" : "$JOIN#/#($ENV#BASEURL)#api#v1#bots#run#(68595cdf5fe23d780b269e39)",
                                "method" : "post",
                                "defaultAuth" : true,
                                "body" : {
                                    "channelTask" : "$VALUE#channel",
                                    "repuestos" : "$OUTPUT#add_ccjs#data|codigo_repuesto",
                                    "cliente" : "$VALUE#sentAnswer|data|[find=>identifier=cual_tipo_contract_asp_fact]|process|0",
                                    "rut" : "$VALUE#sentAnswer|data|[find=>identifier=clientes_asp_fact_]|responses|0|[json=>parse]|name|display",
                                    "repuestos_os" : "$OUTPUT#add_ccjs#data|repuestos_os",
                                    "centroCosto" : "$OUTPUT#add_ccjs#data|centroCosto",
                                    "rut_" : "$VALUE#sentAnswer|data|[find=>identifier=clientes_asp_fact]|responses|0|[json=>parse]|name|display"
                                }
                            },
                            "next" : {
                                "SUCCESS" : "mensaje_metabase",
                                "ERROR" : "send_error_message"
                            },
                            "variables" : [

                            ],
                            "isCritical" : false,
                            "risks" : "",
                            "_id" : ObjectId("68b72a285341b795aa47d858"),
                            "customNetworkRequest" : [

                            ]
                        },
                        {
                            "key" : "iterar_servicio",
                            "name" : "FCEach",
                            "version" : "3.0.0",
                            "data" : {
                                "control" : "$VALUE#sentAnswer|data|[find=>identifier=agregar_servicios]|responses|0|[json=>parse]|uuids",
                                "target" : "uuid"
                            },
                            "next" : {
                                "STEP" : "red_2",
                                "DONE" : "ccjs_servicios"
                            },
                            "variables" : [

                            ],
                            "isCritical" : false,
                            "risks" : "",
                            "_id" : ObjectId("685a01c85fe23d780b2aa8bf"),
                            "customNetworkRequest" : [

                            ]
                        },
                        {
                            "key" : "red_2",
                            "name" : "NWRequest",
                            "version" : "2.0.0",
                            "data" : {
                                "url" : "$JOIN#/#($ENV#BASEURL)#api#v2#answers#($VALUE#uuid)",
                                "method" : "get",
                                "headers" : {
                                    "admin" : true
                                },
                                "defaultAuth" : true
                            },
                            "next" : {
                                "SUCCESS" : "",
                                "ERROR" : "send_error_message"
                            },
                            "variables" : [

                            ],
                            "isCritical" : false,
                            "risks" : "",
                            "_id" : ObjectId("68657de49c2d61f3d6799dca"),
                            "customNetworkRequest" : [

                            ]
                        },
                        {
                            "key" : "ccjs_servicios",
                            "name" : "CCJS",
                            "version" : "2.0.3",
                            "data" : {
                                "src" : "const iterar   = data?.iterar || [];\nconst response = iterar.map(it => it.results).flat();\nconst resumenRaw = data.resumen;\nconst centroCosto = data.centroCosto;\n\nconst objeto        = response.filter(r => r.result?.data?.data).map(r => r.result.data.data).flat();\nconst todosLosDatos = objeto.map(o => o.data).flat();\n\n// ---------- S E R V I C I O S ----------\nconst identificadores = [\n  \"numero_os_servicio\",\n  \"servicio_prestado\",\n  \"precio_servicio\"\n];\n\nconst datosServicio = todosLosDatos.filter(d => identificadores.includes(d.identifier));\n\nconst numeroOSArr = datosServicio.filter(d => d.identifier === \"numero_os_servicio\");\nconst servicioArr = datosServicio.filter(d => d.identifier === \"servicio_prestado\");\nconst precioArr   = datosServicio.filter(d => d.identifier === \"precio_servicio\");\n\nconst detalle = numeroOSArr.map((item, i) => ({\n  numeroOS : JSON.parse(item?.responses?.[0] || \"0\"),\n  servicio : JSON.parse(servicioArr[i]?.responses?.[0] || \"{}\")?.schemaInstance?.codigo_sap || null,\n  nombre   : JSON.parse(servicioArr[i]?.responses?.[0] || \"{}\")?.name?.display || null,\n  precio   : parseFloat(precioArr[i]?.responses?.[0] || \"0\")\n}));\n\n// ---------- P A R S E A R   R E S U M E N ----------\nlet resumen = [];\n\ntry {\n  resumen = JSON.parse(resumenRaw);\n} catch {\n  resumen = [];\n}\n\n// ---------- A C T U A L I Z A R   R E S U M E N ----------\nconst resumenActualizado = resumen.map(os => {\n  const centroCostoBase = centroCosto || \"\";\n\n  const serviciosEnOS = detalle.filter(d => d.numeroOS?.toString() === os.numero_os?.toString());\n\n  const codigosExistentes = new Set((os.articulos || []).map(a => a.itemCode));\n\n  const nuevosArticulos = serviciosEnOS\n    .filter(s => s.servicio && !codigosExistentes.has(s.servicio))\n    .map(s => ({\n      itemCode    : s.servicio,\n      itemName    : s.nombre,\n      costo       : 0,\n      precio      : s.precio,\n      centroCosto : centroCostoBase,\n      cantidad    : 1,\n      tipoCobro   : \"CC\" \n    }));\n\n  return {\n    ...os,\n    articulos: [...(os.articulos || []), ...nuevosArticulos]\n  };\n});\n\n// ---------- R E T O R N A R ----------\nreturn {\n  resumenActualizado: JSON.stringify(resumenActualizado)\n};\n",
                                "data" : {
                                    "iterar" : "$OUTPUT#iterar_servicio#iterationResults",
                                    "resumen" : "$OUTPUT#ccjs#data|resumenActualizado",
                                    "centroCosto" : "$VALUE#extensions|activo_facturacion|centro_de_costo"
                                }
                            },
                            "next" : {
                                "SUCCESS" : "patch_2",
                                "ERROR" : "send_error_message"
                            },
                            "variables" : [

                            ],
                            "isCritical" : false,
                            "risks" : "",
                            "_id" : ObjectId("6899f88894c491b6f0a9e9b5"),
                            "customNetworkRequest" : [

                            ]
                        },
                        {
                            "key" : "mensaje_sap",
                            "name" : "PBMessage",
                            "version" : "2.1.0",
                            "data" : {
                                "content" : "Iniciando conexión con SAP, por favor espere...",
                                "contentType" : "text/system",
                                "sentBy" : "66a7c4a4eae95f9126a74949",
                                "channelIds" : [
                                    "$VALUE#channel"
                                ]
                            },
                            "next" : {
                                "SUCCESS" : "patch_repuestos",
                                "ERROR" : "send_error_message"
                            },
                            "variables" : [

                            ],
                            "isCritical" : false,
                            "risks" : "",
                            "_id" : ObjectId("689111f52713219b9d72367c"),
                            "customNetworkRequest" : [

                            ]
                        },
                        {
                            "key" : "mensaje_metabase",
                            "name" : "PBMessage",
                            "version" : "2.1.0",
                            "data" : {
                                "content" : "$JOIN##(```[Ir al cuadro resumen]```)#(```(```)#(https://bi.staging.cotalker.com/public/dashboard/)#(```21afef8b-2a62-4498-9b78-c2f96f892953?tarea_id=```)#($VALUE#_id)#(```&n_os=666```)#(```#hide_parameters=tarea_id,n_os```)#(```)```)",
                                "contentType" : "text/system",
                                "sentBy" : "66a7c4a4eae95f9126a74949",
                                "channelIds" : [
                                    "$VALUE#channel"
                                ]
                            },
                            "next" : {
                                "ERROR" : "send_error_message"
                            },
                            "variables" : [

                            ],
                            "isCritical" : false,
                            "risks" : "",
                            "_id" : ObjectId("689111f52713219b9d72367d"),
                            "customNetworkRequest" : [

                            ]
                        },
                        {
                            "key" : "mensaje_metabase_2",
                            "name" : "PBMessage",
                            "version" : "2.1.0",
                            "data" : {
                                "content" : "$JOIN##(```[Ir al cuadro resumen]```)#(```(```)#(https://bi.staging.cotalker.com/public/dashboard/)#(```21afef8b-2a62-4498-9b78-c2f96f892953?tarea_id=```)#($VALUE#_id)#(```&n_os=666```)#(```#hide_parameters=tarea_id,n_os```)#(```)```)",
                                "contentType" : "text/system",
                                "sentBy" : "66a7c4a4eae95f9126a74949",
                                "channelIds" : [
                                    "$VALUE#channel"
                                ]
                            },
                            "next" : {
                                "SUCCESS" : "",
                                "ERROR" : "send_error_message"
                            },
                            "variables" : [

                            ],
                            "isCritical" : false,
                            "risks" : "",
                            "_id" : ObjectId("685b02f55fe23d780b30eec7"),
                            "customNetworkRequest" : [

                            ]
                        },
                        {
                            "key" : "iterar_no_cobrados",
                            "name" : "FCEach",
                            "version" : "3.0.0",
                            "data" : {
                                "control" : "$VALUE#sentAnswer|data|[find=>identifier=agregar_no_cobrados]|responses|0|[json=>parse]|uuids",
                                "target" : "uuid"
                            },
                            "next" : {
                                "STEP" : "red_3",
                                "DONE" : "condicional_extras"
                            },
                            "variables" : [

                            ],
                            "isCritical" : false,
                            "risks" : "",
                            "_id" : ObjectId("68839fbe12719bfc38b206e0"),
                            "customNetworkRequest" : [

                            ]
                        },
                        {
                            "key" : "ccjs_no_cobrados",
                            "name" : "CCJS",
                            "version" : "2.0.3",
                            "data" : {
                                "src" : "const iterar = data?.iterar || [];\nconst response = iterar.map(it => it.results).flat();\nconst resumenRaw = data.resumen;\n\n// Helper para parseo seguro\nconst safeJSON = (s, def = {}) => {\n  if (typeof s !== \"string\") return def;\n  try { return JSON.parse(s); } catch { return def; }\n};\n\n// Parsear resumen si viene como string\nlet resumen = [];\ntry {\n  resumen = typeof resumenRaw === \"string\"\n    ? JSON.parse(resumenRaw)\n    : Array.isArray(resumenRaw)\n      ? resumenRaw\n      : [];\n} catch {\n  resumen = [];\n}\n\nconst objeto = response\n  .filter(r => r.result?.data?.data)\n  .map(r => r.result.data.data)\n  .flat();\n\nconst todosLosDatos = objeto.map(o => o.data).flat();\n\n// ---------- R E P U E S T O S   N O   C O B R A D O S ----------\nconst identificadores = [\n  \"repuestos_no_cobrados\",\n  \"cantidad_utilizada\",\n  \"precio_no_cobrado\",\n  \"tipo_no_cobro\",\n  \"numero_os_asociada\",\n  \"centro_costo_no\"\n];\n\nconst datosRepuestos = todosLosDatos.filter(d => identificadores.includes(d.identifier));\n\nconst repuestosArr   = datosRepuestos.filter(d => d.identifier === \"repuestos_no_cobrados\");\nconst cantidadArr    = datosRepuestos.filter(d => d.identifier === \"cantidad_utilizada\");\nconst precioArr      = datosRepuestos.filter(d => d.identifier === \"precio_no_cobrado\");\nconst tipoArr        = datosRepuestos.filter(d => d.identifier === \"tipo_no_cobro\");\nconst numeroOSArr    = datosRepuestos.filter(d => d.identifier === \"numero_os_asociada\");\nconst centroCostoArr = datosRepuestos.filter(d => d.identifier === \"centro_costo_no\");\n\n// En lugar de mapear a un objeto único por numero_os (que agrupa y elimina duplicados),\n// solo precomputamos los \"extras\" que se agregarán por numero_os.\n// Luego, al construir el resultado, recorremos el RESUMEN original tal cual (preserva 43).\nconst nuevosPorOS = {};\n\nrepuestosArr.forEach((item, i) => {\n  const repuestoParsed = safeJSON(item?.responses?.[0] || \"{}\", {});\n  const schema = repuestoParsed?.schemaInstance || {};\n\n  const cantidad = Number(cantidadArr[i]?.responses?.[0]) || 0;\n  const precio   = Number(precioArr[i]?.responses?.[0]) || 0;\n\n  const tipoParsed = safeJSON(tipoArr[i]?.responses?.[0] || \"{}\", {});\n  const tipoSchema = tipoParsed?.schemaInstance || {};\n\n  // Normaliza numeroOS a string y reemplaza vacío por \"0\"\n  let numeroOS = numeroOSArr[i]?.responses?.[0];\n  numeroOS = (numeroOS == null || numeroOS === \"\") ? \"0\" : String(numeroOS);\n\n  // Intento de obtener centroCosto desde el primer resumen que coincida (solo como referencia)\n  let centroCosto = null;\n  const resumenMatch = resumen.find(r => String(r?.numero_os ?? \"\") === numeroOS);\n  if (resumenMatch && Array.isArray(resumenMatch.articulos)) {\n    const firstWithCentro = resumenMatch.articulos.find(a => a?.centroCosto);\n    if (firstWithCentro) centroCosto = firstWithCentro.centroCosto;\n  }\n\n  // Si no se pudo desde resumen, intenta desde el campo dedicado\n  if (!centroCosto) {\n    const centroParsed = safeJSON(centroCostoArr[i]?.responses?.[0] || \"{}\", {});\n    centroCosto = centroParsed?.schemaInstance?.codigo_sap || null;\n  }\n\n  const articulo = {\n    itemCode: schema?.codigo || null,\n    itemName: repuestoParsed?.name?.display || null,\n    cantidad,\n    precio,\n    tipoCobro: tipoSchema?.codigo_sap || null,\n    centroCosto,\n    costo: 0\n  };\n\n  if (!nuevosPorOS[numeroOS]) nuevosPorOS[numeroOS] = [];\n  nuevosPorOS[numeroOS].push(articulo);\n});\n\n// Construye el resultado PRESERVANDO el array original de resumen (incluye duplicados y orden)\nconst resultado = (Array.isArray(resumen) ? resumen : []).map(r => {\n  const key = String(r?.numero_os ?? \"0\");\n  const base = Array.isArray(r.articulos) ? r.articulos : [];\n  const extras = nuevosPorOS[key] || [];\n  return {\n    numero_os: key,\n    articulos: [...base, ...extras]\n  };\n});\n\n// ---- NORMALIZACIÓN solicitada: \"ST_Mobra\" -> \"ST_MOBRA\" ----\nconst resultadoNormalizado = resultado.map(os => ({\n  ...os,\n  articulos: (os.articulos || []).map(a => ({\n    ...a,\n    itemCode: a?.itemCode === \"ST_Mobra\" ? \"ST_MOBRA\" : a?.itemCode\n  }))\n}));\n\n// Devuelve exactamente la misma cantidad de elementos que llegaron en `resumen`\nreturn {\n  resumen: JSON.stringify(resultadoNormalizado), // string (como ya lo usas)\n  resumenArray: resultadoNormalizado             // array con los 43 items\n};",
                                "data" : {
                                    "iterar" : "$OUTPUT#iterar_no_cobrados#iterationResults",
                                    "resumen" : "$OUTPUT#ccjs_servicios#data|resumenActualizado"
                                }
                            },
                            "next" : {
                                "SUCCESS" : "patch_no_cobrados",
                                "ERROR" : "send_error_message"
                            },
                            "variables" : [

                            ],
                            "isCritical" : false,
                            "risks" : "",
                            "_id" : ObjectId("6899f88894c491b6f0a9e9ba"),
                            "customNetworkRequest" : [

                            ]
                        },
                        {
                            "key" : "patch_no_cobrados",
                            "name" : "NWRequest",
                            "version" : "2.0.0",
                            "data" : {
                                "url" : "$JOIN#/#($ENV#BASEURL)#api#v2#properties#jsonpatch#($OUTPUT#get_asset#data|data|_id)",
                                "method" : "patch",
                                "headers" : {
                                    "admin" : true
                                },
                                "defaultAuth" : true,
                                "body" : [
                                    {
                                        "op" : "add",
                                        "path" : "/schemaInstance/lista_precios",
                                        "value" : "$OUTPUT#ccjs_no_cobrados#data|resumen"
                                    }
                                ]
                            },
                            "next" : {
                                "SUCCESS" : "mensaje",
                                "ERROR" : "send_error_message"
                            },
                            "variables" : [

                            ],
                            "isCritical" : false,
                            "risks" : "",
                            "_id" : ObjectId("688cc7192713219b9d5ec4dd"),
                            "customNetworkRequest" : [

                            ]
                        },
                        {
                            "key" : "red_3",
                            "name" : "NWRequest",
                            "version" : "2.0.0",
                            "data" : {
                                "url" : "$JOIN#/#($ENV#BASEURL)#api#v2#answers#($VALUE#uuid)",
                                "method" : "get",
                                "headers" : {
                                    "admin" : true
                                },
                                "defaultAuth" : true
                            },
                            "next" : {
                                "SUCCESS" : "",
                                "ERROR" : "send_error_message"
                            },
                            "variables" : [

                            ],
                            "isCritical" : false,
                            "risks" : "",
                            "_id" : ObjectId("687ffdd95a643b3720918865"),
                            "customNetworkRequest" : [

                            ]
                        },
                        {
                            "key" : "patch_repuestos",
                            "name" : "NWRequest",
                            "version" : "2.0.0",
                            "data" : {
                                "url" : "$JOIN#/#($ENV#BASEURL)#api#v2#properties#jsonpatch#($OUTPUT#get_asset#data|data|_id)",
                                "method" : "patch",
                                "headers" : {
                                    "admin" : true
                                },
                                "defaultAuth" : true,
                                "body" : [
                                    {
                                        "op" : "add",
                                        "path" : "/schemaInstance/repuestos_os",
                                        "value" : "$OUTPUT#format_update_os#data|nuevos_repuestos"
                                    },
                                    {
                                        "op" : "add",
                                        "path" : "/schemaInstance/lista_precios",
                                        "value" : "$OUTPUT#add_ccjs#data|precios"
                                    }
                                ]
                            },
                            "next" : {
                                "SUCCESS" : "call_bot",
                                "ERROR" : "send_error_message"
                            },
                            "variables" : [

                            ],
                            "isCritical" : false,
                            "risks" : "",
                            "_id" : ObjectId("696549a95eb44cff634e33a0"),
                            "customNetworkRequest" : [

                            ]
                        },
                        {
                            "key" : "descontar_repuestos",
                            "name" : "NWRequest",
                            "version" : "2.0.0",
                            "data" : {
                                "url" : "$JOIN#/#($ENV#BASEURL)#api#v2#properties#code#($OUTPUT#ccjs_repuestos#data|secuencia)",
                                "method" : "get",
                                "headers" : {
                                    "admin" : true
                                },
                                "defaultAuth" : true
                            },
                            "next" : {
                                "SUCCESS" : "ccjs_descontar_stock",
                                "ERROR" : "send_error_message"
                            },
                            "variables" : [

                            ],
                            "isCritical" : false,
                            "risks" : "",
                            "_id" : ObjectId("689c8e3994c491b6f0bee50f"),
                            "customNetworkRequest" : [

                            ]
                        },
                        {
                            "key" : "ccjs_repuestos",
                            "name" : "CCJS",
                            "version" : "2.0.3",
                            "data" : {
                                "src" : "const iterar     = data?.iterar ?? [];\nconst id_usuario = data?.id_usuario ?? \"\";\n\n// --- helpers ---\nconst safeParse = (str, def = {}) => { try { return JSON.parse(str); } catch { return def; } };\nconst sanitize  = str => String(str ?? \"\").toLowerCase().replace(/[^a-z0-9]/g, \"\");\n\n// --- flatten iterar ---\nconst results       = iterar.flatMap(it => it?.results || []);\nconst bloques       = results.flatMap(r => r?.result?.data?.data || []);\nconst todosLosDatos = bloques.flatMap(b => b?.data || []);\n\n// --- 1) repuesto (codigo) ---\nconst itemRep = todosLosDatos.find(d => safeParse(d?.responses?.[0] || \"{}\")?.schemaInstance?.codigo);\nconst parsedItem   = safeParse(itemRep?.responses?.[0] || \"{}\");\nconst id_repuestos = parsedItem?.schemaInstance?.codigo ?? \"\";\n\n// --- 2) numero_os: toma la fuente confiable ----\n// a) desde id_usuario (ya trae la OS correcta)\nconst usuarios = typeof id_usuario === \"string\"\n  ? safeParse(id_usuario, [])\n  : Array.isArray(id_usuario) ? id_usuario : [id_usuario];\n\nconst numero_os_fromUsuarios = usuarios?.[0]?.numero_os ?? \"\";\n\n// b) opcional: intenta encontrarlo en todosLosDatos si viene en algún schemaInstance.numero_os\nconst numero_os_fromDatos = (() => {\n  const hit = todosLosDatos.find(d => {\n    const si = safeParse(d?.responses?.[0] || \"{}\").schemaInstance || {};\n    return si.numero_os;\n  });\n  return hit ? safeParse(hit.responses?.[0] || \"{}\").schemaInstance.numero_os : \"\";\n})();\n\n// Usa prioridad: usuarios > datos > nada\nconst numero_os = String(numero_os_fromUsuarios || numero_os_fromDatos || \"\");\n\n// --- 3) técnicoID si coincide la OS ---\nconst match = usuarios.find(u => String(u?.numero_os) === numero_os);\nconst tecnicoID = match?.tecnico?.[0]?.ID ?? \"\";\n\n// --- 4) secuencia ---\nconst secuencia = tecnicoID\n  ? `repuesto_${sanitize(id_repuestos)}_user_${sanitize(tecnicoID)}`\n  : \"\";\n\n// --- retorno (quita debug al final) ---\nreturn {\n  secuencia,\n  numero_os,\n  tecnicoID,\n  id_repuestos\n};\n",
                                "data" : {
                                    "iterar" : "$OUTPUT#iterar_no_cobrados#iterationResults",
                                    "id_usuario" : "$VALUE#extensions|activo_facturacion|tecnico_os"
                                }
                            },
                            "next" : {
                                "SUCCESS" : "descontar_repuestos",
                                "ERROR" : "send_error_message"
                            },
                            "variables" : [

                            ],
                            "isCritical" : false,
                            "risks" : "",
                            "_id" : ObjectId("6899f88894c491b6f0a9e9bf"),
                            "customNetworkRequest" : [

                            ]
                        },
                        {
                            "key" : "ccjs_descontar_stock",
                            "name" : "CCJS",
                            "version" : "2.0.3",
                            "data" : {
                                "src" : "const stock_inicial = Number(data?.stock_inicial ?? 0);\nconst iterar        = data?.iterar ?? [];\n\n// Aplanar iterar\nconst results       = iterar.flatMap(it => it?.results || []);\nconst bloques       = results.flatMap(r => r?.result?.data?.data || []);\nconst todosLosDatos = bloques.flatMap(b => b?.data || []);\n\n// helper simple\nconst toNum = v => (typeof v === 'number' ? v : Number(String(v).trim()) || 0);\n\n// Sumar cantidad_utilizada leyendo responses[0]\nconst cantidad_utilizada = todosLosDatos\n  .filter(d => d?.identifier === \"cantidad_utilizada\")\n  .reduce((acc, d) => {\n    const raw = d?.responses?.[0] ?? d?.value ?? 0;\n    return acc + toNum(raw);\n  }, 0);\n\nconst stock_final = stock_inicial - cantidad_utilizada;\n\nreturn { stock_inicial, cantidad_utilizada, stock_final };\n",
                                "data" : {
                                    "stock_inicial" : "$OUTPUT#descontar_repuestos#data|data|schemaInstance|stock",
                                    "iterar" : "$OUTPUT#iterar_no_cobrados#iterationResults"
                                }
                            },
                            "next" : {
                                "SUCCESS" : "patch_stock",
                                "ERROR" : "send_error_message"
                            },
                            "variables" : [

                            ],
                            "isCritical" : false,
                            "risks" : "",
                            "_id" : ObjectId("689c8e3994c491b6f0bee511"),
                            "customNetworkRequest" : [

                            ]
                        },
                        {
                            "key" : "patch_stock",
                            "name" : "NWRequest",
                            "version" : "2.0.0",
                            "data" : {
                                "url" : "$JOIN#/#($ENV#BASEURL)#api#v2#properties#jsonpatch#($OUTPUT#descontar_repuestos#data|data|_id)",
                                "method" : "PATCH",
                                "headers" : {
                                    "admin" : "true"
                                },
                                "defaultAuth" : true,
                                "body" : [
                                    {
                                        "op" : "add",
                                        "path" : "/schemaInstance/stock",
                                        "value" : "$OUTPUT#ccjs_descontar_stock#data|stock_final"
                                    }
                                ]
                            },
                            "next" : {
                                "SUCCESS" : "mensaje_descuento",
                                "ERROR" : "send_error_message"
                            },
                            "variables" : [

                            ],
                            "isCritical" : false,
                            "risks" : "",
                            "_id" : ObjectId("689c8e3994c491b6f0bee512"),
                            "customNetworkRequest" : [

                            ]
                        },
                        {
                            "key" : "get_user",
                            "name" : "NWRequest",
                            "version" : "2.0.0",
                            "data" : {
                                "url" : "$JOIN#/#($ENV#BASEURL)#api#v2#users#($OUTPUT#ccjs_repuestos#data|tecnicoID)",
                                "method" : "GET",
                                "headers" : {
                                    "admin" : "true"
                                },
                                "defaultAuth" : true
                            },
                            "next" : {
                                "SUCCESS" : "ccjs_bot",
                                "ERROR" : "send_error_message"
                            },
                            "variables" : [

                            ],
                            "isCritical" : false,
                            "risks" : "",
                            "_id" : ObjectId("689a421651459e940fbec589"),
                            "customNetworkRequest" : [

                            ]
                        },
                        {
                            "key" : "ccjs_bot",
                            "name" : "CCJS",
                            "version" : "2.0.3",
                            "data" : {
                                "src" : "const asset   = data?.asset ?? {};\nconst usuario = data?.usuario?.data ?? {};\n\nconst body = {\n  asset,\n  usuario\n};\n\nreturn body;",
                                "data" : {
                                    "asset" : "$OUTPUT#descontar_repuestos#data|data",
                                    "usuario" : "$OUTPUT#get_user#data"
                                }
                            },
                            "next" : {
                                "SUCCESS" : "call_bot",
                                "ERROR" : "send_error_message"
                            },
                            "variables" : [

                            ],
                            "isCritical" : false,
                            "risks" : "",
                            "_id" : ObjectId("689b0d1e51459e940fbff36e"),
                            "customNetworkRequest" : [

                            ]
                        },
                        {
                            "key" : "condicional_extras",
                            "name" : "FCSwitchOne",
                            "version" : null,
                            "data" : {
                                "lexpression" : "$VALUE#sentAnswer|data|[find=>identifier=agregar_no_cobrados]|process|hasUUIDs",
                                "rcaseA" : true
                            },
                            "next" : {
                                "CASE_A" : "mensaje_sap_2",
                                "DEFAULT" : "mensaje_metabase_2"
                            },
                            "variables" : [

                            ],
                            "isCritical" : false,
                            "risks" : "",
                            "_id" : ObjectId("688cc4b02713219b9d5e9a75"),
                            "customNetworkRequest" : [

                            ]
                        },
                        {
                            "key" : "mensaje_sap_2",
                            "name" : "PBMessage",
                            "version" : "2.1.0",
                            "data" : {
                                "content" : "Iniciando conexión con sap...",
                                "contentType" : "text/system",
                                "sentBy" : "66a7c4a4eae95f9126a74949",
                                "channelIds" : [
                                    "$VALUE#channel"
                                ]
                            },
                            "next" : {
                                "SUCCESS" : "mensaje_metabase_2",
                                "ERROR" : "send_error_message"
                            },
                            "variables" : [

                            ],
                            "isCritical" : false,
                            "risks" : "",
                            "_id" : ObjectId("688cc4b02713219b9d5e9a76"),
                            "customNetworkRequest" : [

                            ]
                        },
                        {
                            "key" : "mensaje_descuento",
                            "name" : "PBMessage",
                            "version" : "2.1.0",
                            "data" : {
                                "content" : "Los repuestos fueron descontados de la bodega del técnico asociado a la OS.",
                                "contentType" : "text/system",
                                "sentBy" : "66a7c4a4eae95f9126a74949",
                                "channelIds" : [
                                    "$VALUE#channel"
                                ]
                            },
                            "next" : {
                                "SUCCESS" : "get_user",
                                "ERROR" : "send_error_message"
                            },
                            "variables" : [

                            ],
                            "isCritical" : false,
                            "risks" : "",
                            "_id" : ObjectId("689c8e3994c491b6f0bee513"),
                            "customNetworkRequest" : [

                            ]
                        },
                        {
                            "key" : "join_uuids",
                            "name" : "CCJS",
                            "version" : "2.0.3",
                            "data" : {
                                "src" : "const clean = (arr) => Array.isArray(arr) ? arr.filter(x => x && typeof x === 'string') : [];\nconst uuids = [\n    ...clean(data.precios),\n    ...clean(data.servicios),\n    ...clean(data.no_cobrados)\n];\nconst unique = [...new Set(uuids)];\nconst queryString = 'count=true&limit=1000&' + unique.map(id => `answerUuids=${id}`).join('&');\nreturn { uniqueUUIDs: unique, hasUUIDs: unique.length > 0, queryString: queryString };",
                                "data" : {
                                    "precios" : "$VALUE#sentAnswer|data|[find=>identifier=agregar_precios]|responses|0|[json=>parse]|uuids",
                                    "servicios" : "$VALUE#sentAnswer|data|[find=>identifier=agregar_servicios]|responses|0|[json=>parse]|uuids",
                                    "no_cobrados" : "$VALUE#sentAnswer|data|[find=>identifier=agregar_precios_no_cobrados]|responses|0|[json=>parse]|uuids"
                                }
                            },
                            "next" : {
                                "SUCCESS" : "check_modify_answers",
                                "ERROR" : "send_error_message"
                            }
                        },
                        {
                            "key" : "check_modify_answers",
                            "name" : "FCSwitchOne",
                            "version" : null,
                            "data" : {
                                "lexpression" : "$OUTPUT#join_uuids#data|hasUUIDs",
                                "rcaseA" : true
                            },
                            "next" : {
                                "CASE_A" : "find_modify_answers",
                                "DEFAULT" : "patch_final_prices"
                            }
                        },
                        {
                            "key" : "find_modify_answers",
                            "name" : "NWRequest",
                            "version" : "2.0.0",
                            "data" : {
                                "url" : "$JOIN##($ENV#BASEURL)#/api/v2/answers?#($OUTPUT#join_uuids#data|queryString)",
                                "method" : "GET",
                                "headers" : {
                                    "admin" : "true"
                                },
                                "defaultAuth" : true,
                            },
                            "next" : {
                                "SUCCESS" : "consolidate_modify_logic",
                                "ERROR" : "send_error_message"
                            }
                        },
                        {
                            "key" : "consolidate_modify_logic",
                            "name" : "CCJS",
                            "version" : "2.0.3",
                            "data" : {
                                "src" : "const safeJSON = (val, def) => { if (val == null) return def; if (typeof val === 'string') { const s = val.trim(); try { return JSON.parse(s); } catch { return def; } } return val; }; const resumenRaw = data.resumen; const centroCostoGeneral = data.centroCosto; const answers = Array.isArray(data.answers) ? data.answers : []; let resumen = safeJSON(resumenRaw, []); const allBlocks = answers.flatMap(ans => ans?.data?.data || []); const allData = allBlocks.flatMap(b => b?.data || []); const seleccion = allData.filter(d => d.identifier === 'seleccione_repuesto'); const precioCrudo = allData.filter(d => d.identifier === 'precio_repuesto_'); const garantia = allData.filter(d => d.identifier === 'tipo_cobro'); const maxLenPrecios = Math.max(seleccion.length, precioCrudo.length, garantia.length); const detallePrecios = Array.from({length: maxLenPrecios}, (_, index) => ({ repuesto: safeJSON(seleccion[index]?.responses?.[0], {})?.schemaInstance?.codigo_sap || null, precio: parseFloat(precioCrudo[index]?.process?.[0] || '0'), garantia: safeJSON(garantia[index]?.responses?.[0], {})?.schemaInstance?.codigo_sap || '' })).filter(d => d.repuesto); const numeroOSServ = allData.filter(d => d.identifier === 'numero_os_servicio'); const servicioArr = allData.filter(d => d.identifier === 'servicio_prestado'); const precioServArr = allData.filter(d => d.identifier === 'precio_servicio'); const maxLenServicios = Math.max(numeroOSServ.length, servicioArr.length, precioServArr.length); const detalleServicios = Array.from({length: maxLenServicios}, (_, i) => ({ numeroOS: safeJSON(numeroOSServ[i]?.responses?.[0], '0'), servicio: safeJSON(servicioArr[i]?.responses?.[0], {})?.schemaInstance?.codigo_sap || null, nombre: safeJSON(servicioArr[i]?.responses?.[0], {})?.name?.display || null, precio: parseFloat(precioServArr[i]?.responses?.[0] || '0') })).filter(s => s.servicio && s.numeroOS !== '0'); const repuestosNo = allData.filter(d => d.identifier === 'repuestos_no_cobrados'); const cantNo = allData.filter(d => d.identifier === 'cantidad_utilizada'); const precioNo = allData.filter(d => d.identifier === 'precio_no_cobrado'); const tipoNo = allData.filter(d => d.identifier === 'tipo_no_cobro'); const nOSNo = allData.filter(d => d.identifier === 'numero_os_asociada'); const cCostoNo = allData.filter(d => d.identifier === 'centro_costo_no'); const maxLenNoCobrados = Math.max(repuestosNo.length, cantNo.length, precioNo.length, tipoNo.length, nOSNo.length, cCostoNo.length); const detalleNoCobrados = Array.from({length: maxLenNoCobrados}, (_, i) => { const repParsed = safeJSON(repuestosNo[i]?.responses?.[0], {}); const tipoParsed = safeJSON(tipoNo[i]?.responses?.[0], {}); const cCostoParsed = safeJSON(cCostoNo[i]?.responses?.[0], {}); const numeroOS = String(nOSNo[i]?.responses?.[0] || '0'); let centroCosto = cCostoParsed?.schemaInstance?.codigo_sap || null; if (!centroCosto) { const resumenMatch = resumen.find(r => String(r?.numero_os || '0') === numeroOS); if (resumenMatch?.articulos?.length) { const firstWithCentro = resumenMatch.articulos.find(a => a?.centroCosto); if (firstWithCentro) centroCosto = firstWithCentro.centroCosto; } } if (!centroCosto) centroCosto = centroCostoGeneral || null; return { itemCode: repParsed?.schemaInstance?.codigo || null, itemName: repParsed?.name?.display || null, cantidad: Number(cantNo[i]?.responses?.[0]) || 0, precio: Number(precioNo[i]?.responses?.[0]) || 0, tipoCobro: tipoParsed?.schemaInstance?.codigo_sap || null, centroCosto, numeroOS }; }).filter(n => n.itemCode); let finalResumen = resumen.map(os => { const osKey = String(os.numero_os || '0'); let articulos = Array.isArray(os.articulos) ? [...os.articulos] : []; articulos = articulos.map(articulo => { const matchingPrecio = detallePrecios.find(d => d.repuesto === articulo.itemCode); if (matchingPrecio) { return { ...articulo, precio: matchingPrecio.precio, tipoCobro: matchingPrecio.garantia || articulo.tipoCobro }; } return articulo; }); const serviciosParaEstaOS = detalleServicios.filter(s => String(s.numeroOS) === osKey); serviciosParaEstaOS.forEach(s => { if (s.servicio && !articulos.some(a => a.itemCode === s.servicio)) { articulos.push({ itemCode: s.servicio, itemName: s.nombre, costo: 0, precio: s.precio, centroCosto: centroCostoGeneral || '', cantidad: 1, tipoCobro: 'CC' }); } }); const noCobradosParaEstaOS = detalleNoCobrados.filter(n => String(n.numeroOS) === osKey); noCobradosParaEstaOS.forEach(n => { const exists = articulos.some(a => a.itemCode === n.itemCode && a.cantidad === n.cantidad && Math.abs(a.precio - n.precio) < 0.01); if (!exists) { articulos.push({ itemCode: n.itemCode, itemName: n.itemName, cantidad: n.cantidad, precio: n.precio, tipoCobro: n.tipoCobro, centroCosto: n.centroCosto, costo: 0 }); } }); return { ...os, articulos }; }); finalResumen = finalResumen.map(os => ({ ...os, articulos: (os.articulos || []).map(a => ({ ...a, itemCode: a?.itemCode === 'ST_Mobra' ? 'ST_MOBRA' : a?.itemCode })) })); return { resumen: JSON.stringify(finalResumen), jsonPatch: [{ op: 'replace', path: '/schemaInstance/lista_precios', value: finalResumen }] };",
                                "data" : {
                                    "resumen" : "$VALUE#extensions|activo_facturacion|lista_precios",
                                    "centroCosto" : "$VALUE#sentAnswer|data|[find=>identifier=ordenes_de_servicio_asp_fact]|responses|0|schemaInstance|centro_costo",
                                    "answers" : "$OUTPUT#find_modify_answers#data"
                                }
                            },
                            "next" : {
                                "SUCCESS" : "patch_final_prices",
                                "ERROR" : "send_error_message"
                            }
                        },
                        {
                            "key" : "patch_final_prices",
                            "name" : "NWRequest",
                            "version" : "2.0.0",
                            "data" : {
                                "url" : "$JOIN#/#($ENV#BASEURL)#api#v2#properties#jsonpatch#($OUTPUT#get_asset#data|data|_id)",
                                "method" : "PATCH",
                                "headers" : {
                                    "admin" : true
                                },
                                "defaultAuth" : true,
                                "body" : "$OUTPUT#consolidate_modify_logic#data|jsonPatch"
                            },
                            "next" : {
                                "SUCCESS" : "modify_message",
                                "ERROR" : "send_error_message"
                            }
                        },
                        {
                            "key" : "modify_message",
                            "name" : "PBMessage",
                            "version" : "2.1.0",
                            "data" : {
                                "content" : "Se ha modificado con éxito la solicitud de prefactura",
                                "contentType" : "text/system",
                                "sentBy" : "66a7c4a4eae95f9126a74947",
                                "channelIds" : [
                                    "$VALUE#channel"
                                ]
                            },
                            "next" : {
                                "SUCCESS" : "mensaje_metabase_2",
                                "ERROR" : "send_error_message"
                            }
                        },
                        {
                            "key" : "mensaje_sap_2",
                            "name" : "PBMessage",
                            "version" : "2.1.0",
                            "data" : {
                                "content" : "Iniciando conexión con sap...",
                                "contentType" : "text/system",
                                "sentBy" : "66a7c4a4eae95f9126a74949",
                                "channelIds" : [
                                    "$VALUE#channel"
                                ]
                            },
                            "next" : {
                                "ERROR" : "send_error_message"
                            },
                            "variables" : [

                            ],
                            "isCritical" : false,
                            "risks" : "",
                            "_id" : ObjectId("688cc4b02713219b9d5e9a76"),
                            "customNetworkRequest" : [

                            ]
                        },
                        {
                            "key" : "mensaje_descuento",
                            "name" : "PBMessage",
                            "version" : "2.1.0",
                            "data" : {
                                "content" : "Los repuestos fueron descontados de la bodega del técnico asociado a la OS.",
                                "contentType" : "text/system",
                                "sentBy" : "66a7c4a4eae95f9126a74949",
                                "channelIds" : [
                                    "$VALUE#channel"
                                ]
                            },
                            "next" : {
                                "SUCCESS" : "get_user",
                                "ERROR" : "send_error_message"
                            },
                            "variables" : [

                            ],
                            "isCritical" : false,
                            "_id" : ObjectId("688cc7192713219b9d5ec4e9"),
                            "customNetworkRequest" : [

                            ]
                        },
                        {
                            "key" : "check_clients_add",
                            "name" : "FCSwitchOne",
                            "version" : null,
                            "data" : {
                                "lexpression" : "$OUTPUT#format_update_os#data|hasClients",
                                "rcaseA" : true
                            },
                            "next" : {
                                "CASE_A" : "iterar_clients_add",
                                "DEFAULT" : "patch_multiple_tasks_add"
                            }
                        },
                        {
                            "key" : "iterar_clients_add",
                            "name" : "FCEach",
                            "version" : "3.0.0",
                            "data" : {
                                "control" : "$OUTPUT#format_update_os#data|uniqueClients",
                                "target" : "clientId"
                            },
                            "next" : {
                                "STEP" : "get_client_add",
                                "DONE" : "patch_multiple_tasks_add"
                            }
                        },
                        {
                            "key" : "get_client_add",
                            "name" : "NWRequest",
                            "version" : "2.0.0",
                            "data" : {
                                "url" : "$JOIN#/#($ENV#BASEURL)#api#v2#properties#($VALUE#clientId)",
                                "method" : "GET",
                                "headers" : { "admin" : "true" },
                                "defaultAuth" : true
                            },
                            "next" : {
                                "SUCCESS" : "ccjs_calc_client_add",
                                "ERROR" : "iterar_clients_add"
                            }
                        },
                        {
                            "key" : "ccjs_calc_client_add",
                            "name" : "CCJS",
                            "version" : "2.0.3",
                            "data" : {
                                "src" : "const client = data.client;\nconst mapping = data.mapping || {};\nconst clientId = client._id;\nconst assetsToAdd = mapping[clientId] || [];\nconst currentSubs = new Set(Array.isArray(client.subproperty) ? client.subproperty : []);\n\nconst delta = assetsToAdd.filter(id => id && !currentSubs.has(id));\nconst patch = delta.map(id => ({ op: \"add\", path: \"/subproperty/-\", value: id }));\n\nreturn { patch, hasPatch: patch.length > 0 };",
                                "data" : {
                                    "client" : "$OUTPUT#get_client_add#data|data",
                                    "mapping" : "$OUTPUT#format_update_os#data|clientMapping"
                                }
                            },
                            "next" : {
                                "SUCCESS" : "patch_client_individual_add",
                                "ERROR" : "iterar_clients_add"
                            }
                        },
                        {
                            "key" : "patch_client_individual_add",
                            "name" : "NWRequest",
                            "version" : "2.0.0",
                            "data" : {
                                "url" : "$JOIN#/#($ENV#BASEURL)#api#v2#properties#jsonpatch#($VALUE#clientId)",
                                "method" : "PATCH",
                                "headers" : { "admin" : "true" },
                                "defaultAuth" : true,
                                "body" : "$OUTPUT#ccjs_calc_client_add#data|patch"
                            },
                            "next" : {
                                "SUCCESS" : "iterar_clients_add",
                                "ERROR" : "iterar_clients_add"
                            }
                        },
                        {
                            "key" : "iterar_remove",
                            "name" : "FCEach",
                            "version" : "3.0.0",
                            "data" : {
                                "control" : "$VALUE#sentAnswer|data|[find=>identifier=ordenes_de_servicio_eliminar_asp_fact]|responses",
                                "target" : "os"
                            },
                            "next" : {
                                "STEP" : "ccjs_subproperty_remove",
                                "DONE" : "get_os_subproperties_delete"
                            },
                            "variables" : [

                            ],
                            "isCritical" : false,
                            "_id" : ObjectId("689b709e94c491b6f0b6e35a"),
                            "customNetworkRequest" : [

                            ]
                        },

                        {
                            "key" : "mensaje_metabase_3",
                            "name" : "PBMessage",
                            "version" : "2.1.0",
                            "data" : {
                                "content" : "$JOIN##(```[Ir al cuadro resumen]```)#(```(```)#(https://bi.staging.cotalker.com/public/dashboard/)#(```21afef8b-2a62-4498-9b78-c2f96f892953?tarea_id=```)#($VALUE#_id)#(```&n_os=666```)#(```#hide_parameters=tarea_id,n_os```)#(```)```)",
                                "contentType" : "text/system",
                                "sentBy" : "66a7c4a4eae95f9126a74949",
                                "channelIds" : [
                                    "$VALUE#channel"
                                ]
                            },
                            "next" : {
                                "SUCCESS" : "",
                                "ERROR" : "send_error_message"
                            },
                            "variables" : [

                            ],
                            "isCritical" : false,
                            "_id" : ObjectId("689c8e3994c491b6f0bee523"),
                            "customNetworkRequest" : [

                            ]
                        },
                        {
                            "key" : "ccjs_subproperty_remove",
                            "name" : "CCJS",
                            "version" : "2.0.3",
                            "data" : {
                                "src" : "const asset = data.asset;\nconst ossToRemoveRaw = (Array.isArray(data.ossToRemove) ? data.ossToRemove : []);\n\nconst clientToAssetMap = {};\nconst uniqueClientsSet = new Set();\nconst numeroOsAEliminar = new Set();\n\nconst idsToRemove = new Set(ossToRemoveRaw.map(os => {\n  let obj = {};\n  if (typeof os === 'string') {\n    try { obj = JSON.parse(os) || {}; } catch (e) { obj = {}; }\n  } else {\n    obj = os || {};\n  }\n  const id = obj?._id || obj?.$id;\n  const numOS = obj?.schemaInstance?.numero_os;\n  if (numOS) numeroOsAEliminar.add(String(numOS));\n  const rc = obj?.schemaInstance?.rut_cliente;\n  const as = obj?.schemaInstance?.asset;\n  if (rc && typeof rc === 'string' && as) {\n    if (!clientToAssetMap[rc]) clientToAssetMap[rc] = new Set();\n    clientToAssetMap[rc].add(as);\n    uniqueClientsSet.add(rc);\n  }\n  return id;\n}).filter(id => id && typeof id === 'string'));\n\nconst jsonPatch = [];\nif (!asset) { throw new Error('No se recibió el asset de facturación para procesar el retiro.'); }\n\nconst repuestosToRemove = new Set();\nossToRemoveRaw.forEach(os => {\n  let obj = {};\n  if (typeof os === 'string') {\n    try { obj = JSON.parse(os) || {}; } catch (e) { obj = {}; }\n  } else {\n    obj = os || {};\n  }\n  const schema = obj?.schemaInstance || {};\n  if (Array.isArray(schema.repuestos)) { schema.repuestos.forEach(r => repuestosToRemove.add(r)); }\n});\n\nconst currentOSs = Array.isArray(asset.schemaInstance?.ordenes_de_servicio) ? asset.schemaInstance.ordenes_de_servicio : [];\nconst osIndices = [];\ncurrentOSs.forEach((id, index) => { if (idsToRemove.has(id)) osIndices.unshift(index); });\nosIndices.forEach(idx => { jsonPatch.push({ op: 'remove', path: `/schemaInstance/ordenes_de_servicio/${idx}` }); });\n\nconst currentSubs = Array.isArray(asset.subproperty) ? asset.subproperty : [];\nconst subIndices = [];\ncurrentSubs.forEach((id, index) => { if (idsToRemove.has(id) || repuestosToRemove.has(id)) { subIndices.unshift(index); } });\nsubIndices.forEach(idx => { jsonPatch.push({ op: 'remove', path: `/subproperty/${idx}` }); });\n\nlet listaPreciosRaw = data.lista_precios || '[]';\nlet listaPrecios = [];\ntry {\n  let temp = JSON.parse(listaPreciosRaw);\n  listaPrecios = typeof temp === 'string' ? JSON.parse(temp) : temp;\n} catch (e) { listaPrecios = []; }\n\nif (Array.isArray(listaPrecios)) {\n  const listaFiltrada = listaPrecios.filter(item => !numeroOsAEliminar.has(String(item.numero_os)));\n  jsonPatch.push({ op: 'replace', path: '/schemaInstance/lista_precios', value: JSON.stringify(listaFiltrada) });\n}\n\nconst clientsList = [...uniqueClientsSet].filter(c => c && typeof c === 'string');\nreturn { \n    jsonPatch, \n    tasksOSsToRemove: [...idsToRemove], \n    repuestosRemoved: [...repuestosToRemove], \n    uniqueClients: clientsList,\n    hasClients: clientsList.length > 0,\n    clientMapping: Object.fromEntries(Object.entries(clientToAssetMap).map(([k,v]) => [k, [...v]]))\n};",
                                "data" : {
                                    "asset" : "$OUTPUT#get_asset#data|data",
                                    "ossToRemove" : "$VALUE#sentAnswer|data|[find=>identifier=ordenes_de_servicio_eliminar_asp_fact]|responses",
                                    "lista_precios" : "$VALUE#extensions|activo_facturacion|lista_precios"
                                }
                            },
                            "next" : {
                                "SUCCESS" : "update_billing_asset",
                                "ERROR" : "send_error_message"
                            },
                            "variables" : [

                            ],
                            "isCritical" : false,
                            "risks" : "",
                            "_id" : ObjectId("696549a95eb44cff634e33b6"),
                            "customNetworkRequest" : [

                            ]
                        },
                        {
                            "key" : "update_billing_asset",
                            "name" : "NWRequest",
                            "version" : "2.0.0",
                            "data" : {
                                "url" : "$JOIN#/#($ENV#BASEURL)#api#v2#properties#jsonpatch#($OUTPUT#get_asset#data|data|_id)",
                                "method" : "PATCH",
                                "headers" : {
                                    "admin" : "true"
                                },
                                "defaultAuth" : true,
                                "body" : "$OUTPUT#ccjs_remove_logic#data|jsonPatch"
                            },
                            "next" : {
                                "SUCCESS" : "check_clients_remove",
                                "ERROR" : "send_error_message"
                            },
                            "variables" : [

                            ],
                            "isCritical" : false,
                            "_id" : ObjectId("696549a95eb44cff634e33b7"),
                            "customNetworkRequest" : [

                            ]
                        },
                        {
                            "key" : "check_clients_remove",
                            "name" : "FCSwitchOne",
                            "version" : null,
                            "data" : {
                                "lexpression" : "$OUTPUT#ccjs_remove_logic#data|hasClients",
                                "rcaseA" : true
                            },
                            "next" : {
                                "CASE_A" : "iterar_clients_remove",
                                "DEFAULT" : "patch_multiple_tasks_delete"
                            }
                        },
                        {
                            "key" : "iterar_clients_remove",
                            "name" : "FCEach",
                            "version" : "3.0.0",
                            "data" : {
                                "control" : "$OUTPUT#ccjs_remove_logic#data|uniqueClients",
                                "target" : "clientId"
                            },
                            "next" : {
                                "STEP" : "get_client_remove",
                                "DONE" : "patch_multiple_tasks_delete"
                            }
                        },
                        {
                            "key" : "get_client_remove",
                            "name" : "NWRequest",
                            "version" : "2.0.0",
                            "data" : {
                                "url" : "$JOIN#/#($ENV#BASEURL)#api#v2#properties#($VALUE#clientId)",
                                "method" : "GET",
                                "headers" : { "admin" : "true" },
                                "defaultAuth" : true
                            },
                            "next" : {
                                "SUCCESS" : "ccjs_calc_client_remove",
                                "ERROR" : "iterar_clients_remove"
                            }
                        },
                        {
                            "key" : "ccjs_calc_client_remove",
                            "name" : "CCJS",
                            "version" : "2.0.3",
                            "data" : {
                                "src" : "const client = data.client;\nconst tasksToRemove = new Set(data.tasksToRemove || []);\nconst currentSubs = Array.isArray(client.subproperty) ? client.subproperty : [];\nconst patch = [];\n\n// Encontrar índices de atrás hacia adelante para no invalidarlos\nconst indices = [];\ncurrentSubs.forEach((id, idx) => {\n  if (tasksToRemove.has(id)) indices.unshift(idx);\n});\n\nindices.forEach(idx => {\n  patch.push({ op: \"remove\", path: `/subproperty/${idx}` });\n});\n\nreturn { patch, hasPatch: patch.length > 0 };",
                                "data" : {
                                    "client" : "$OUTPUT#get_client_remove#data|data",
                                    "tasksToRemove" : "$OUTPUT#ccjs_remove_logic#data|tasksOSsToUpdate"
                                }
                            },
                            "next" : {
                                "SUCCESS" : "patch_client_individual_remove",
                                "ERROR" : "iterar_clients_remove"
                            }
                        },
                        {
                            "key" : "patch_client_individual_remove",
                            "name" : "NWRequest",
                            "version" : "2.0.0",
                            "data" : {
                                "url" : "$JOIN#/#($ENV#BASEURL)#api#v2#properties#jsonpatch#($VALUE#clientId)",
                                "method" : "PATCH",
                                "headers" : { "admin" : "true" },
                                "defaultAuth" : true,
                                "body" : "$OUTPUT#ccjs_calc_client_remove#data|patch"
                            },
                            "next" : {
                                "SUCCESS" : "iterar_clients_remove",
                                "ERROR" : "iterar_clients_remove"
                            }
                        },
                        {
                            "key" : "ccjs_remove_logic",
                            "name" : "CCJS",
                            "version" : "2.0.3",
                            "data" : {
                                "src" : "const asset = data.asset; const ossToRemoveRaw = (Array.isArray(data.ossToRemove) ? data.ossToRemove : []); const uniqueClients = new Set(); const numeroOsAEliminar = new Set(); const idsToRemove = new Set(ossToRemoveRaw.map(os => { const obj = (typeof os === 'string') ? JSON.parse(os) : os; const id = obj?._id || obj?.$id; const numOS = obj?.schemaInstance?.numero_os; if (numOS) numeroOsAEliminar.add(String(numOS)); const clienteId = obj?.schemaInstance?.cliente || obj?.schemaInstance?.rut_cliente; if (clienteId && typeof clienteId === 'string') uniqueClients.add(clienteId); return id; }).filter(id => id && typeof id === 'string')); const jsonPatch = []; if (!asset) throw new Error(\"No se recibió el asset de facturación.\"); const repuestosToRemove = new Set(); ossToRemoveRaw.forEach(os => { const obj = (typeof os === 'string') ? JSON.parse(os) : os; const schema = obj?.schemaInstance || {}; if (Array.isArray(schema.repuestos)) schema.repuestos.forEach(r => repuestosToRemove.add(String(r))); }); const currentOSs = Array.isArray(asset.schemaInstance?.ordenes_de_servicio) ? asset.schemaInstance.ordenes_de_servicio : []; const osIndices = []; currentOSs.forEach((id, index) => { if (idsToRemove.has(String(id))) osIndices.unshift(index); }); osIndices.forEach(idx => { jsonPatch.push({ op: \"remove\", path: `/schemaInstance/ordenes_de_servicio/${idx}` }); }); const currentSubs = Array.isArray(asset.subproperty) ? asset.subproperty : []; const subIndices = []; currentSubs.forEach((id, index) => { if (idsToRemove.has(String(id)) || repuestosToRemove.has(String(id))) subIndices.unshift(index); }); subIndices.forEach(idx => { jsonPatch.push({ op: \"remove\", path: `/subproperty/${idx}` }); }); let listaPreciosRaw = data.lista_precios || \"[]\"; let listaPrecios = []; try { listaPrecios = JSON.parse(listaPreciosRaw); if (typeof listaPrecios === 'string') listaPrecios = JSON.parse(listaPrecios); } catch (e) { listaPrecios = []; } if (Array.isArray(listaPrecios)) { const listaFiltrada = listaPrecios.filter(item => !numeroOsAEliminar.has(String(item.numero_os))); jsonPatch.push({ op: \"replace\", path: \"/schemaInstance/lista_precios\", value: JSON.stringify(listaFiltrada) }); } const clientsList = [...uniqueClients]; return { jsonPatch, tasksOSsToUpdate: [...idsToRemove], uniqueClients: clientsList, hasClients: clientsList.length > 0 };",
                                "data" : {
                                    "asset" : "$OUTPUT#get_asset#data|data",
                                    "ossToRemove" : "$VALUE#sentAnswer|data|[find=>identifier=ordenes_de_servicio_eliminar_asp_fact]|responses",
                                    "lista_precios" : "$VALUE#extensions|activo_facturacion|lista_precios"
                                }
                            },
                            "next" : {
                                "SUCCESS" : "update_billing_asset",
                                "ERROR" : "send_error_message"
                            },
                            "variables" : [

                            ],
                            "isCritical" : false,
                            "_id" : ObjectId("696549a95eb44cff634e33bb"),
                            "customNetworkRequest" : [

                            ]
                        },
                        {
                            "key" : "send_error_message",
                            "name" : "PBMessage",
                            "version" : "2.1.0",
                            "data" : {
                                "content" : "⚠️ Ha ocurrido un error en la rutina de facturación. Por favor contacte a soporte técnico para revisar los logs del bot.",
                                "contentType" : "text/system",
                                "sentBy" : "66a7c4a4eae95f9126a74949",
                                "channelIds" : [
                                    "$VALUE#channel"
                                ]
                            },
                            "next" : {
                                "SUCCESS" : "",
                                "ERROR" : "send_error_message"
                            },
                            "variables" : [

                            ],
                            "isCritical" : false,
                            "risks" : "",
                            "_id" : ObjectId("696549a95eb44cff634e33bc"),
                            "customNetworkRequest" : [

                            ]
                        }
                    ],
                    "name" : "",
                    "description" : "",
                    "_id" : ObjectId("696549a95eb44cff634e337e")
                }
            ],
            "surveyId" : ObjectId("67f7e4ea35d34c17858da0d1"),
            "_id" : ObjectId("696549a95eb44cff634e337d")
        }
    ],
    "createdAt" : ISODate("2025-03-21T20:47:43.593+0000"),
    "modifiedAt" : ISODate("2026-01-12T19:21:13.743+0000"),
    "__v" : NumberInt(92)
}
