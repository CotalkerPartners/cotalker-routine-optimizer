/**
 * JSON Patch Generation Templates
 *
 * Provides helper functions for generating JSON Patch operations (RFC 6902).
 *
 * Operations:
 * - add: Add new items to arrays or set object properties
 * - remove: Remove items from arrays by index
 * - replace: Replace entire field value
 *
 * Best practices:
 * - Use "/-" path for append operations (auto-increments)
 * - Process removals in reverse order (highest index first)
 * - Prefer incremental operations over full replacements
 */

/**
 * Generate ADD operations for array append (incremental)
 * @param {string} path - JSON Pointer path (e.g., "/schemaInstance/ordenes_de_servicio")
 * @param {Array} items - Items to add
 * @returns {Array} Array of patch operations
 */
const generateAddPatches = (path, items) => {
  const patches = [];
  const itemsArray = Array.isArray(items) ? items : [];

  itemsArray.forEach(item => {
    if (item != null) {  // Skip null/undefined
      patches.push({
        op: "add",
        path: `${path}/-`,  // "/-" appends to end of array
        value: item
      });
    }
  });

  return patches;
};

/**
 * Generate REMOVE operations for array items (by index)
 * IMPORTANT: Indices must be in reverse order (highest first)
 * @param {string} path - JSON Pointer path
 * @param {Array} indices - Indices to remove (should be sorted descending)
 * @returns {Array} Array of patch operations
 */
const generateRemovePatches = (path, indices) => {
  const patches = [];
  const indicesArray = Array.isArray(indices) ? indices : [];

  // Sort descending to ensure highest indices removed first
  const sortedIndices = [...indicesArray].sort((a, b) => b - a);

  sortedIndices.forEach(idx => {
    if (typeof idx === 'number' && idx >= 0) {
      patches.push({
        op: "remove",
        path: `${path}/${idx}`
      });
    }
  });

  return patches;
};

/**
 * Generate REPLACE operation for entire field
 * @param {string} path - JSON Pointer path
 * @param {*} value - New value (can be any JSON type)
 * @returns {Object} Single patch operation
 */
const generateReplacePatch = (path, value) => {
  return {
    op: "replace",
    path: path,
    value: value
  };
};

/**
 * Find indices of items to remove
 * @param {Array} currentArray - Current array
 * @param {Set} itemsToRemoveSet - Set of items to remove
 * @returns {Array} Indices in reverse order
 */
const findRemovalIndices = (currentArray, itemsToRemoveSet) => {
  const indices = [];

  currentArray.forEach((item, index) => {
    if (itemsToRemoveSet.has(item)) {
      indices.unshift(index);  // Add to front (reverse order)
    }
  });

  return indices;
};

// Example usage in CCJS stage:
/*
// ADD operation (incremental)
const currentOSs = asset.schemaInstance.ordenes_de_servicio || [];
const incomingOSs = data.answerOS || [];

const currentSet = new Set(currentOSs);
const delta = incomingOSs.filter(id => !currentSet.has(id));

const addPatches = generateAddPatches("/schemaInstance/ordenes_de_servicio", delta);

// REMOVE operation
const idsToRemove = data.removeOS || [];
const removeSet = new Set(idsToRemove);
const removeIndices = findRemovalIndices(currentOSs, removeSet);
const removePatches = generateRemovePatches("/schemaInstance/ordenes_de_servicio", removeIndices);

// REPLACE operation (only when necessary)
const newListaPrecios = computeNewListaPrecios(data);
const replacePatch = generateReplacePatch(
  "/schemaInstance/lista_precios",
  JSON.stringify(newListaPrecios)  // Stringify if field expects string
);

// Combine all patches
const jsonPatch = [
  ...addPatches,
  ...removePatches,
  replacePatch
];

return { jsonPatch };
*/

// Complete example: Add new OS, remove old OS, update lista_precios
/*
const asset = data.asset;
const incomingOSs = data.incomingOS || [];
const removeOSs = data.removeOS || [];

const currentOSs = asset.schemaInstance.ordenes_de_servicio || [];
const currentSet = new Set(currentOSs);

// Compute additions
const deltaAdd = incomingOSs.filter(id => !currentSet.has(id));

// Compute removals
const removeSet = new Set(removeOSs);
const removeIndices = findRemovalIndices(currentOSs, removeSet);

// Filter lista_precios
const listaPrecios = safeJSON(asset.schemaInstance.lista_precios, []);
const numeroOsToRemove = new Set(removeOSs.map(os => os.numero_os));
const filteredLista = listaPrecios.filter(item =>
  !numeroOsToRemove.has(String(item.numero_os))
);

// Generate all patches
const jsonPatch = [
  ...generateAddPatches("/schemaInstance/ordenes_de_servicio", deltaAdd),
  ...generateRemovePatches("/schemaInstance/ordenes_de_servicio", removeIndices),
  generateReplacePatch("/schemaInstance/lista_precios", JSON.stringify(filteredLista))
];

return {
  jsonPatch,
  tasksToUpdate: deltaAdd,
  tasksToDelete: removeOSs
};
*/
