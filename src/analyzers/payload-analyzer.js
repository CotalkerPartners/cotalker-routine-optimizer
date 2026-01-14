/**
 * Payload Analyzer
 *
 * Estimates payload sizes for NWRequest stages and detects:
 * - Requests that may exceed 6MB limit (AWS Lambda)
 * - Full array replacements vs incremental operations
 * - Large data transfers that could be optimized
 */

import {
  calculatePayloadSize,
  formatBytes,
  getRiskLevel,
  estimatePatternSize,
  estimateArraySize,
  getTypicalOSSize,
  getObjectIdSize
} from '../utils/payload-estimator.js';

/**
 * Analyze payloads in routine
 * @param {Object} routine - Parsed routine
 * @param {Object} options - Analysis options
 * @returns {Array} Array of issues found
 */
export function analyzePayloads(routine, options = {}) {
  const issues = [];

  routine.surveyTriggers.forEach(trigger => {
    const { graph } = trigger;

    // Find all NWRequest stages
    graph.stageMap.forEach((stage, key) => {
      if (stage.name === 'NWRequest') {
        const payloadIssues = analyzeNWRequest(graph, key, stage, options);
        issues.push(...payloadIssues);
      }

      // Also check CCJS stages that prepare large data
      if (stage.name === 'CCJS') {
        const ccjsIssues = analyzeCCJSPayload(graph, key, stage, options);
        issues.push(...ccjsIssues);
      }
    });
  });

  return issues;
}

/**
 * Analyze single NWRequest stage
 */
function analyzeNWRequest(graph, stageKey, stage, options) {
  const issues = [];
  const data = stage.data || {};

  // Skip if no body (GET requests typically)
  if (!data.body) return issues;

  // Analyze body payload
  const bodyAnalysis = analyzeBody(data.body, graph, stageKey);

  if (bodyAnalysis.estimatedSize > 0) {
    const risk = getRiskLevel(bodyAnalysis.estimatedSize);

    if (risk === 'CRITICAL' || risk === 'HIGH') {
      issues.push({
        id: 'LARGE_PAYLOAD',
        type: 'PAYLOAD_SIZE_RISK',
        severity: risk,
        stage: stageKey,
        message: `Large payload detected (${formatBytes(bodyAnalysis.estimatedSize)})`,
        details: {
          estimatedSize: bodyAnalysis.estimatedSize,
          sizeFormatted: formatBytes(bodyAnalysis.estimatedSize),
          method: data.method || 'POST',
          url: data.url || 'unknown',
          bodySource: bodyAnalysis.source,
          isFullReplacement: bodyAnalysis.isFullReplacement,
          arrayCount: bodyAnalysis.arrayCount
        },
        recommendation: risk === 'CRITICAL'
          ? 'CRITICAL: Payload exceeds AWS Lambda 6MB limit. Use incremental JSON Patch operations with delta computation.'
          : 'Use incremental JSON Patch operations to reduce payload size. Compute delta in upstream CCJS stage.',
        example: 'See trigger_formulario_optimized.js:134 (format_update_os) for delta computation pattern',
        reference: 'trigger_formulario_optimized.js:134',
        estimatedImprovement: bodyAnalysis.isFullReplacement ? {
          payloadReduction: {
            before: bodyAnalysis.estimatedSize,
            after: Math.round(bodyAnalysis.estimatedSize * 0.1), // Estimated 90% reduction with delta
            reduction: 0.9
          }
        } : null
      });
    }
  }

  // Check for JSON Patch patterns
  if (Array.isArray(data.body)) {
    const patchIssue = analyzeJSONPatchPayload(data.body, graph, stageKey);
    if (patchIssue) issues.push(patchIssue);
  }

  return issues;
}

/**
 * Analyze request body
 */
function analyzeBody(body, graph, stageKey) {
  const result = {
    estimatedSize: 0,
    source: null,
    isFullReplacement: false,
    arrayCount: 0
  };

  // If body is a string (COTLang expression)
  if (typeof body === 'string') {
    result.source = body;

    // Check if it references an array from upstream stage
    const arrayInfo = detectArrayReference(body, graph);

    if (arrayInfo) {
      result.estimatedSize = arrayInfo.estimatedSize;
      result.arrayCount = arrayInfo.count;
      result.isFullReplacement = arrayInfo.isFullArray;
    } else {
      // Default estimate for unknown references
      result.estimatedSize = 1024; // 1KB default
    }
  }
  // If body is an array (likely JSON Patch)
  else if (Array.isArray(body)) {
    result.estimatedSize = estimateJSONPatchArraySize(body, graph);
    result.source = 'JSON Patch array';

    // Check if any patch contains full array replacement
    body.forEach(patch => {
      if (patch.op === 'add' && typeof patch.value === 'string') {
        const arrayInfo = detectArrayReference(patch.value, graph);
        if (arrayInfo?.isFullArray) {
          result.isFullReplacement = true;
          result.estimatedSize = Math.max(result.estimatedSize, arrayInfo.estimatedSize);
          result.arrayCount = arrayInfo.count;
        }
      }
    });
  }
  // If body is an object
  else if (typeof body === 'object') {
    result.estimatedSize = calculatePayloadSize(body);
    result.source = 'inline object';
  }

  return result;
}

/**
 * Detect array reference in COTLang expression
 */
function detectArrayReference(expression, graph) {
  // Check if expression references OUTPUT from another stage
  const outputMatch = expression.match(/\$OUTPUT#([^#|]+)#data\|?([^|]*)/);

  if (!outputMatch) return null;

  const sourceStage = outputMatch[1];
  const fieldPath = outputMatch[2];

  // Common patterns that indicate arrays
  const patterns = [
    { regex: /ordenes_de_servicio|allOrders|allOS/i, count: 100, type: 'OS_ARRAY' },
    { regex: /subproperty|repuestos/i, count: 150, type: 'SUBPROPERTY_ARRAY' },
    { regex: /lista_precios|resumen/i, count: 200, type: 'PRECIO_ARRAY' },
    { regex: /tasksOSsToUpdate|itemsToUpdate/i, count: 50, type: 'OBJECTID_ARRAY' }, // Delta
    { regex: /clients|clientes/i, count: 20, type: 'OBJECTID_ARRAY' }
  ];

  for (const pattern of patterns) {
    if (pattern.regex.test(expression) || pattern.regex.test(fieldPath)) {
      // Check if this is a delta (filtered) result
      const isDelta = /delta|new|toUpdate|filtered/i.test(fieldPath) ||
                      /delta|new|toUpdate|filtered/i.test(sourceStage);

      const count = isDelta ? Math.round(pattern.count * 0.2) : pattern.count; // Delta is ~20% of full

      return {
        estimatedSize: estimatePatternSize(pattern.type, count),
        count,
        isFullArray: !isDelta,
        isDelta
      };
    }
  }

  // Default for unknown arrays
  return {
    estimatedSize: 50 * getObjectIdSize(), // 50 ObjectIds
    count: 50,
    isFullArray: true,
    isDelta: false
  };
}

/**
 * Estimate size of JSON Patch array
 */
function estimateJSONPatchArraySize(patchArray, graph) {
  let totalSize = 0;

  patchArray.forEach(patch => {
    if (typeof patch === 'object') {
      // Check if value is a COTLang expression
      if (typeof patch.value === 'string') {
        const arrayInfo = detectArrayReference(patch.value, graph);
        if (arrayInfo) {
          totalSize += arrayInfo.estimatedSize;
        } else {
          totalSize += calculatePayloadSize(patch);
        }
      } else {
        totalSize += calculatePayloadSize(patch);
      }
    }
  });

  return totalSize;
}

/**
 * Analyze JSON Patch patterns in body
 */
function analyzeJSONPatchPayload(body, graph, stageKey) {
  // Look for full array replacement pattern
  // Pattern: { op: "add", path: "/field", value: <entire array> }
  // Should be: { op: "add", path: "/field/-", value: <single item> }

  const fullReplacements = body.filter(patch => {
    if (!patch || typeof patch !== 'object') return false;
    if (patch.op !== 'add') return false;

    // Check if path is to a field root (not array append)
    const pathPattern = /^\/[^\/]+$/;  // Matches "/field" but not "/field/-" or "/field/0"
    if (!pathPattern.test(patch.path)) return false;

    // Check if value is an array reference
    if (typeof patch.value === 'string') {
      const arrayInfo = detectArrayReference(patch.value, graph);
      return arrayInfo?.isFullArray;
    }

    // Check if value is inline array
    return Array.isArray(patch.value) && patch.value.length > 10;
  });

  if (fullReplacements.length === 0) return null;

  const patch = fullReplacements[0];
  const arrayInfo = typeof patch.value === 'string'
    ? detectArrayReference(patch.value, graph)
    : { estimatedSize: calculatePayloadSize(patch.value), count: patch.value.length };

  return {
    id: 'FULL_ARRAY_PATCH',
    type: 'INEFFICIENT_PATCH_STRATEGY',
    severity: 'HIGH',
    stage: stageKey,
    message: `Full array replacement detected (should use incremental patches)`,
    details: {
      path: patch.path,
      operation: patch.op,
      estimatedSize: arrayInfo.estimatedSize,
      sizeFormatted: formatBytes(arrayInfo.estimatedSize),
      itemCount: arrayInfo.count
    },
    recommendation: 'Replace full array patch with incremental operations:\n' +
                     '1. Add CCJS stage to compute delta (items not in current array)\n' +
                     '2. Use path "/-" for each new item: { op: "add", path: "/field/-", value: item }\n' +
                     '3. This reduces payload from full array to only new items',
    example: 'delta.forEach(id => jsonPatch.push({ op: "add", path: "' + patch.path + '/-", value: id }))',
    reference: 'trigger_formulario_optimized.js:134',
    fix: {
      currentPattern: JSON.stringify(patch, null, 2),
      optimizedPattern: `// CCJS stage:\nconst current = new Set(asset${patch.path.replace(/\//g, '.')});\nconst delta = incoming.filter(id => !current.has(id));\nconst jsonPatch = delta.map(id => ({\n  op: "add",\n  path: "${patch.path}/-",\n  value: id\n}));`
    },
    estimatedImprovement: {
      payloadReduction: {
        before: arrayInfo.estimatedSize,
        after: Math.round(arrayInfo.estimatedSize * 0.2), // Assume 20% are new items
        reduction: 0.8
      }
    }
  };
}

/**
 * Analyze CCJS stage for large data processing
 */
function analyzeCCJSPayload(graph, stageKey, stage, options) {
  const issues = [];
  const src = stage.data?.src || '';

  // Check for missing delta computation
  const hasDeltaPattern = /new Set.*filter.*!.*has|\.filter\(.*=>.*!.*\.includes\(/i.test(src);
  const hasArrayOperation = /\.map\(|\.filter\(|\.forEach\(/i.test(src);

  if (hasArrayOperation && !hasDeltaPattern) {
    // Check if this CCJS feeds into a NWRequest
    const nextStages = graph.getNextStages(stageKey);
    const hasDownstreamNWRequest = nextStages.some(nextKey => {
      const nextStage = graph.getStage(nextKey);
      return nextStage?.name === 'NWRequest';
    });

    if (hasDownstreamNWRequest) {
      issues.push({
        id: 'MISSING_DELTA_COMPUTATION',
        type: 'MISSING_OPTIMIZATION',
        severity: 'MEDIUM',
        stage: stageKey,
        message: 'CCJS stage missing delta computation before network request',
        details: {
          hasArrayOperation: true,
          hasDeltaComputation: false,
          downstreamRequests: nextStages.filter(k => graph.getStage(k)?.name === 'NWRequest')
        },
        recommendation: 'Add Set-based delta computation to filter out existing items:\n' +
                         'const currentSet = new Set(currentArray);\n' +
                         'const delta = incomingArray.filter(id => !currentSet.has(id));\n' +
                         'This significantly reduces payload size.',
        example: 'See templates/ccjs/deltaComputation.js for complete pattern',
        reference: 'trigger_formulario_optimized.js:134'
      });
    }
  }

  // Check for unsafe array operations (array.includes in loop)
  if (/\.filter\([^)]*\.includes\(/i.test(src)) {
    issues.push({
      id: 'ARRAY_INCLUDES_IN_LOOP',
      type: 'PERFORMANCE_ISSUE',
      severity: 'LOW',
      stage: stageKey,
      message: 'Using array.includes() in filter (O(n²) complexity)',
      details: {
        pattern: 'array.filter(x => otherArray.includes(x))'
      },
      recommendation: 'Convert array to Set for O(1) membership testing:\n' +
                       'const set = new Set(otherArray);\n' +
                       'array.filter(x => set.has(x));',
      reference: 'optimization-patterns.md#performance'
    });
  }

  return issues;
}

/**
 * Get payload analysis summary
 */
export function getPayloadSummary(issues) {
  const summary = {
    total: issues.length,
    bySeverity: {
      CRITICAL: issues.filter(i => i.severity === 'CRITICAL').length,
      HIGH: issues.filter(i => i.severity === 'HIGH').length,
      MEDIUM: issues.filter(i => i.severity === 'MEDIUM').length,
      LOW: issues.filter(i => i.severity === 'LOW').length
    },
    byType: {},
    totalPayloadReduction: 0
  };

  issues.forEach(issue => {
    summary.byType[issue.type] = (summary.byType[issue.type] || 0) + 1;

    if (issue.estimatedImprovement?.payloadReduction) {
      summary.totalPayloadReduction += issue.estimatedImprovement.payloadReduction.reduction;
    }
  });

  return summary;
}

export default {
  analyzePayloads,
  getPayloadSummary
};
