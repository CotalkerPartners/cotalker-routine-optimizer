/**
 * JSON Patch Analyzer
 *
 * Analyzes JSON Patch operations to detect:
 * - Full array replacements that should be incremental
 * - Missing index-based removal operations
 * - Inefficient patch strategies
 * - Opportunities for delta-based updates
 */

import { findUpstreamStages } from '../parsers/routine-parser.js';
import { calculatePayloadSize, formatBytes } from '../utils/payload-estimator.js';

/**
 * Analyze JSON Patch operations in routine
 * @param {Object} routine - Parsed routine
 * @param {Object} options - Analysis options
 * @returns {Array} Array of issues found
 */
export function analyzeJSONPatches(routine, options = {}) {
  const issues = [];

  routine.surveyTriggers.forEach(trigger => {
    const { graph } = trigger;

    // Find all NWRequest stages with JSON Patch bodies
    graph.stageMap.forEach((stage, key) => {
      if (stage.name === 'NWRequest') {
        const patchIssues = analyzeNWRequestPatches(graph, key, stage, options);
        issues.push(...patchIssues);
      }
    });
  });

  return issues;
}

/**
 * Analyze NWRequest stage for JSON Patch issues
 */
function analyzeNWRequestPatches(graph, stageKey, stage, options) {
  const issues = [];
  const data = stage.data || {};

  // Check if this is a JSON Patch request
  if (!isJSONPatchRequest(data)) return issues;

  const body = data.body;

  // Analyze if body is an array of patch operations
  if (Array.isArray(body)) {
    issues.push(...analyzeInlinePatchArray(body, graph, stageKey));
  }
  // Analyze if body comes from upstream stage
  else if (typeof body === 'string') {
    issues.push(...analyzeReferencedPatches(body, graph, stageKey));
  }

  return issues;
}

/**
 * Check if request is a JSON Patch operation
 */
function isJSONPatchRequest(data) {
  const url = data.url || '';
  const body = data.body;

  // Check URL pattern
  if (url.includes('jsonpatch') || url.includes('/patch')) return true;

  // Check if body looks like JSON Patch
  if (Array.isArray(body) && body.length > 0) {
    return body.some(item =>
      item && typeof item === 'object' && item.op && item.path
    );
  }

  return false;
}

/**
 * Analyze inline patch array
 */
function analyzeInlinePatchArray(patchArray, graph, stageKey) {
  const issues = [];

  patchArray.forEach((patch, index) => {
    if (!patch || typeof patch !== 'object') return;

    // Check for full array replacement
    if (isFullArrayReplacement(patch)) {
      issues.push(createFullArrayReplacementIssue(patch, stageKey, index));
    }

    // Check for missing delta computation on add operations
    if (patch.op === 'add' && patch.path && !patch.path.endsWith('/-')) {
      const pathMatch = patch.path.match(/^\/([^\/]+)$/);
      if (pathMatch) {
        const field = pathMatch[1];

        // Check if value is array-like
        if (typeof patch.value === 'string' && patch.value.includes('OUTPUT')) {
          issues.push({
            id: 'NON_INCREMENTAL_ADD',
            type: 'PATCH_STRATEGY',
            severity: 'MEDIUM',
            stage: stageKey,
            message: `Add operation without incremental path (should use "/-" for array append)`,
            details: {
              operation: patch.op,
              path: patch.path,
              suggestedPath: `${patch.path}/-`,
              patchIndex: index
            },
            recommendation: `Use incremental path "${patch.path}/-" to append items instead of replacing entire field. ` +
                             'This requires upstream CCJS to compute delta (only new items).',
            reference: 'trigger_formulario_optimized.js:134'
          });
        }
      }
    }

    // Check for remove operations without proper ordering
    if (patch.op === 'remove') {
      const indexMatch = patch.path.match(/\/(\d+)$/);
      if (indexMatch) {
        // This is good - index-based removal
        // But warn if there are multiple removals not in reverse order
        const otherRemovals = patchArray
          .slice(index + 1)
          .filter(p => p.op === 'remove' && p.path.startsWith(patch.path.split('/').slice(0, -1).join('/')))
          .map(p => {
            const m = p.path.match(/\/(\d+)$/);
            return m ? parseInt(m[1]) : -1;
          })
          .filter(idx => idx >= 0);

        const currentIndex = parseInt(indexMatch[1]);

        if (otherRemovals.some(idx => idx > currentIndex)) {
          issues.push({
            id: 'UNORDERED_REMOVALS',
            type: 'PATCH_ORDER',
            severity: 'LOW',
            stage: stageKey,
            message: 'Remove operations not in reverse order (may cause index shifting)',
            details: {
              path: patch.path,
              index: currentIndex,
              laterIndices: otherRemovals.filter(idx => idx > currentIndex)
            },
            recommendation: 'Process removal indices in reverse order (highest first) to prevent index shifting. ' +
                             'Use unshift() instead of push() when collecting indices.',
            example: 'indices.forEach(idx => jsonPatch.unshift({ op: "remove", path: `/field/${idx}` }))',
            reference: 'trigger_formulario_optimized.js:1621'
          });
        }
      }
    }
  });

  return issues;
}

/**
 * Analyze patches referenced from upstream stage
 */
function analyzeReferencedPatches(bodyExpression, graph, stageKey) {
  const issues = [];

  // Extract source stage
  const outputMatch = bodyExpression.match(/\$OUTPUT#([^#|]+)#data\|?([^|]*)/);
  if (!outputMatch) return issues;

  const sourceStageKey = outputMatch[1];
  const sourceStage = graph.getStage(sourceStageKey);

  if (!sourceStage || sourceStage.name !== 'CCJS') return issues;

  // Analyze CCJS source code
  const src = sourceStage.data?.src || '';

  // Check if CCJS generates incremental patches
  const hasIncrementalPattern = /path:.*\/-|path:.*\$\{.*\}/.test(src);
  const hasDeltaComputation = /new Set.*filter.*!.*has/i.test(src);

  if (!hasIncrementalPattern && !hasDeltaComputation) {
    issues.push({
      id: 'CCJS_WITHOUT_DELTA',
      type: 'MISSING_DELTA_COMPUTATION',
      severity: 'HIGH',
      stage: stageKey,
      message: `CCJS stage "${sourceStageKey}" generates patches without delta computation`,
      details: {
        sourceStage: sourceStageKey,
        hasIncrementalPattern,
        hasDeltaComputation
      },
      recommendation: 'Update CCJS stage to:\n' +
                       '1. Compute delta using Set-based filtering\n' +
                       '2. Generate incremental patches with "/-" path\n' +
                       '3. Return only new items to downstream stages',
      example: 'See templates/ccjs/deltaComputation.js and templates/ccjs/jsonPatch.js',
      reference: 'trigger_formulario_optimized.js:134'
    });
  }

  // Check for missing safeJSON pattern
  const parsesCurrent = /current.*JSON\.parse|asset.*JSON\.parse/i.test(src);
  const hasSafeJSON = /safeJSON|try.*catch.*JSON\.parse/i.test(src);

  if (parsesCurrent && !hasSafeJSON) {
    issues.push({
      id: 'UNSAFE_JSON_PARSING',
      type: 'ROBUSTNESS',
      severity: 'MEDIUM',
      stage: sourceStageKey,
      message: 'CCJS stage parses JSON without error handling',
      details: {
        stage: sourceStageKey
      },
      recommendation: 'Use safeJSON helper to handle malformed or null data:\n' +
                       'const safeJSON = (val, def) => { ... };\n' +
                       'const data = safeJSON(input, []);',
      example: 'See templates/ccjs/safeJSON.js',
      reference: 'trigger_formulario_optimized.js:549'
    });
  }

  return issues;
}

/**
 * Check if patch is a full array replacement
 */
function isFullArrayReplacement(patch) {
  if (patch.op !== 'add' && patch.op !== 'replace') return false;

  // Path pattern: /field (not /field/- or /field/0)
  const pathPattern = /^\/[^\/]+$/;
  if (!pathPattern.test(patch.path)) return false;

  // Check if value looks like a full array
  if (Array.isArray(patch.value)) {
    return patch.value.length > 5; // Arbitrary threshold
  }

  // Check if value is a reference to an array
  if (typeof patch.value === 'string') {
    return /allOrders|ordenes_de_servicio|subproperty|lista_precios/i.test(patch.value) &&
           !/delta|new|filtered|toUpdate/i.test(patch.value);
  }

  return false;
}

/**
 * Create issue for full array replacement
 */
function createFullArrayReplacementIssue(patch, stageKey, index) {
  const estimatedSize = Array.isArray(patch.value)
    ? calculatePayloadSize(patch.value)
    : 500000; // 500KB estimate for referenced arrays

  return {
    id: 'FULL_ARRAY_PATCH',
    type: 'FULL_ARRAY_REPLACEMENT',
    severity: estimatedSize > 1000000 ? 'CRITICAL' : 'HIGH',
    stage: stageKey,
    message: `Full array replacement detected at patch index ${index}`,
    details: {
      operation: patch.op,
      path: patch.path,
      estimatedSize,
      sizeFormatted: formatBytes(estimatedSize),
      patchIndex: index,
      valueType: Array.isArray(patch.value) ? 'inline array' : 'reference'
    },
    recommendation: 'Replace full array operation with incremental patches:\n' +
                     '1. Add CCJS stage to compute delta (new items only)\n' +
                     '2. Generate individual add operations with path "/-"\n' +
                     '3. This reduces payload by ~80-95%',
    example: `// Instead of:\n` +
             `{ op: "add", path: "${patch.path}", value: fullArray }\n\n` +
             `// Use:\n` +
             `delta.forEach(item => jsonPatch.push({\n` +
             `  op: "add",\n` +
             `  path: "${patch.path}/-",\n` +
             `  value: item\n` +
             `}))`,
    reference: 'trigger_formulario_optimized.js:134',
    fix: {
      addCCJSStage: true,
      pattern: 'deltaComputation'
    },
    estimatedImprovement: {
      payloadReduction: {
        before: estimatedSize,
        after: Math.round(estimatedSize * 0.15), // Assume 85% reduction
        reduction: 0.85
      }
    }
  };
}

/**
 * Get JSON Patch analysis summary
 */
export function getJSONPatchSummary(issues) {
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
      summary.totalPayloadReduction +=
        issue.estimatedImprovement.payloadReduction.before -
        issue.estimatedImprovement.payloadReduction.after;
    }
  });

  return summary;
}

export default {
  analyzeJSONPatches,
  getJSONPatchSummary
};
