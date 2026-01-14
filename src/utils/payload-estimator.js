/**
 * Payload Estimator Utility
 *
 * Estimates JSON payload sizes for stages and operations
 */

import stringify from 'fast-json-stable-stringify';

/**
 * Calculate size of JSON object in bytes
 * @param {*} obj - Object to measure
 * @returns {number} Size in bytes
 */
export function calculatePayloadSize(obj) {
  try {
    const json = stringify(obj);
    return new TextEncoder().encode(json).length;
  } catch (error) {
    return 0;
  }
}

/**
 * Format bytes in human-readable format
 * @param {number} bytes - Size in bytes
 * @returns {string} Formatted string
 */
export function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Determine risk level based on payload size
 * @param {number} bytes - Size in bytes
 * @returns {string} Risk level (LOW, MEDIUM, HIGH, CRITICAL)
 */
export function getRiskLevel(bytes) {
  const MB_6 = 6 * 1024 * 1024;
  const MB_3 = 3 * 1024 * 1024;
  const MB_1 = 1 * 1024 * 1024;

  if (bytes >= MB_6) return 'CRITICAL';
  if (bytes >= MB_3) return 'HIGH';
  if (bytes >= MB_1) return 'MEDIUM';
  return 'LOW';
}

/**
 * Estimate array size based on item count and average item size
 * @param {number} itemCount - Number of items
 * @param {number} avgItemSize - Average size per item in bytes
 * @returns {number} Estimated total size
 */
export function estimateArraySize(itemCount, avgItemSize) {
  // Add overhead for JSON array brackets, commas, etc.
  const overhead = itemCount * 2;  // Commas and spaces
  return (itemCount * avgItemSize) + overhead;
}

/**
 * Estimate ObjectId size (MongoDB ObjectId is 24 characters)
 * @returns {number} Size in bytes
 */
export function getObjectIdSize() {
  return 24;  // "507f1f77bcf86cd799439011"
}

/**
 * Estimate typical service order (OS) object size
 * Based on analysis of trigger_formulario.js data
 * @returns {number} Estimated size in bytes
 */
export function getTypicalOSSize() {
  // Typical OS object includes:
  // - _id (24 bytes)
  // - schemaInstance fields (numero_os, rut_cliente, asset, repuestos, facturacion)
  // - Additional metadata
  // Estimated ~500-1000 bytes per OS object
  return 750;
}

/**
 * Estimate typical repuesto (spare part) object size
 * @returns {number} Estimated size in bytes
 */
export function getTypicalRepuestoSize() {
  // Simpler than OS, estimated ~200-400 bytes
  return 300;
}

/**
 * Estimate lista_precios entry size
 * @returns {number} Estimated size in bytes
 */
export function getTypicalPrecioSize() {
  // Contains: numero_os, item details, prices, etc.
  // Estimated ~150-300 bytes
  return 200;
}

/**
 * Estimate payload size for common Cotalker patterns
 * @param {string} pattern - Pattern type
 * @param {number} count - Item count
 * @returns {number} Estimated size in bytes
 */
export function estimatePatternSize(pattern, count) {
  switch (pattern) {
    case 'OS_ARRAY':
      return estimateArraySize(count, getTypicalOSSize());

    case 'REPUESTO_ARRAY':
      return estimateArraySize(count, getTypicalRepuestoSize());

    case 'PRECIO_ARRAY':
      return estimateArraySize(count, getTypicalPrecioSize());

    case 'OBJECTID_ARRAY':
      return estimateArraySize(count, getObjectIdSize());

    case 'SUBPROPERTY_ARRAY':
      // Subproperty is array of ObjectIds
      return estimateArraySize(count, getObjectIdSize());

    default:
      return 0;
  }
}

/**
 * Estimate iteration count from COTLang control expression
 * @param {string} expression - COTLang control expression
 * @param {Object} context - Optional context with known values
 * @returns {number} Estimated iteration count
 */
export function estimateIterationCount(expression, context = {}) {
  // If expression references known data, use that
  if (context.knownSizes && expression) {
    for (const [key, size] of Object.entries(context.knownSizes)) {
      if (expression.includes(key)) {
        return size;
      }
    }
  }

  // Default estimates based on pattern recognition
  if (expression.includes('ordenes_de_servicio') || expression.includes('os_')) {
    return 100;  // Conservative estimate for service orders
  }

  if (expression.includes('repuestos')) {
    return 50;  // Spare parts per order
  }

  if (expression.includes('clients') || expression.includes('clientes')) {
    return 20;  // Unique clients
  }

  if (expression.includes('uuids')) {
    return 50;  // UUIDs for survey answers
  }

  // Default
  return 10;
}

/**
 * Calculate delta size (reduction from optimization)
 * @param {number} originalSize - Original payload size
 * @param {number} optimizedSize - Optimized payload size
 * @returns {Object} Delta information
 */
export function calculateDelta(originalSize, optimizedSize) {
  const reduction = originalSize - optimizedSize;
  const percentage = originalSize > 0 ? reduction / originalSize : 0;

  return {
    originalSize,
    optimizedSize,
    reduction,
    percentage,
    originalFormatted: formatBytes(originalSize),
    optimizedFormatted: formatBytes(optimizedSize),
    reductionFormatted: formatBytes(reduction),
    percentageFormatted: Math.round(percentage * 100) + '%'
  };
}

/**
 * Estimate JSON Patch payload size
 * @param {Array} patches - Array of patch operations
 * @returns {number} Estimated size in bytes
 */
export function estimateJSONPatchSize(patches) {
  return calculatePayloadSize(patches);
}

/**
 * Compare full replacement vs incremental patch
 * @param {Array} fullArray - Full array
 * @param {Array} delta - Delta items
 * @returns {Object} Comparison data
 */
export function compareReplacementVsPatch(fullArray, delta) {
  const fullSize = calculatePayloadSize([{
    op: 'add',
    path: '/field',
    value: fullArray
  }]);

  const patchSize = calculatePayloadSize(
    delta.map(item => ({
      op: 'add',
      path: '/field/-',
      value: item
    }))
  );

  return calculateDelta(fullSize, patchSize);
}

export default {
  calculatePayloadSize,
  formatBytes,
  getRiskLevel,
  estimateArraySize,
  estimatePatternSize,
  estimateIterationCount,
  calculateDelta,
  estimateJSONPatchSize,
  compareReplacementVsPatch
};
