/**
 * Loop Analyzer
 *
 * Detects problematic FCEach loops in Cotalker routines:
 * - Loops with enclosed NWRequest stages (N+1 query pattern)
 * - Loops over large datasets
 * - Nested loops (O(n²) complexity)
 */

import { getLoopBody, findUpstreamStages } from '../parsers/routine-parser.js';
import { estimateIterationCount } from '../utils/payload-estimator.js';

/**
 * Analyze all loops in routine
 * @param {Object} routine - Parsed routine
 * @param {Object} options - Analysis options
 * @returns {Array} Array of issues found
 */
export function analyzeLoops(routine, options = {}) {
  const issues = [];

  routine.surveyTriggers.forEach(trigger => {
    const { graph } = trigger;

    // Find all FCEach stages
    const loops = [];
    graph.stageMap.forEach((stage, key) => {
      if (stage.name === 'FCEach') {
        loops.push({ key, stage });
      }
    });

    // Analyze each loop
    loops.forEach(({ key, stage }) => {
      const loopIssues = analyzeLoop(graph, key, stage, options);
      issues.push(...loopIssues);
    });
  });

  return issues;
}

/**
 * Analyze single loop
 * @param {Object} graph - Stage graph
 * @param {string} loopKey - Loop stage key
 * @param {Object} loopStage - Loop stage object
 * @param {Object} options - Analysis options
 * @returns {Array} Issues found
 */
function analyzeLoop(graph, loopKey, loopStage, options) {
  const issues = [];

  // Get loop body (stages inside loop)
  const bodyStages = getLoopBody(graph, loopKey);

  if (bodyStages.length === 0) {
    return issues;  // Empty loop, nothing to analyze
  }

  // Check for network calls inside loop
  const networkCallIssue = checkNetworkCallsInLoop(
    graph, loopKey, loopStage, bodyStages, options
  );
  if (networkCallIssue) issues.push(networkCallIssue);

  // Check for nested loops
  const nestedLoopIssue = checkNestedLoops(
    graph, loopKey, loopStage, bodyStages, options
  );
  if (nestedLoopIssue) issues.push(nestedLoopIssue);

  // Check for large iteration counts
  const largeIterationIssue = checkLargeIterations(
    graph, loopKey, loopStage, options
  );
  if (largeIterationIssue) issues.push(largeIterationIssue);

  // Check for bypass switch
  const bypassIssue = checkBypassSwitch(
    graph, loopKey, loopStage, options
  );
  if (bypassIssue) issues.push(bypassIssue);

  return issues;
}

/**
 * Check for network calls inside loop (N+1 pattern)
 */
function checkNetworkCallsInLoop(graph, loopKey, loopStage, bodyStages, options) {
  const networkCalls = bodyStages.filter(stage => stage.name === 'NWRequest');

  if (networkCalls.length === 0) return null;

  // Estimate iteration count
  const controlExpr = loopStage.data?.control || '';
  const iterationCount = estimateIterationCount(controlExpr, options.context);

  const totalNetworkCalls = iterationCount * networkCalls.length;

  // Determine severity
  let severity = 'MEDIUM';
  if (totalNetworkCalls > 200) severity = 'CRITICAL';
  else if (totalNetworkCalls > 50) severity = 'HIGH';

  return {
    id: 'LOOP_WITH_NETWORK_CALLS',
    type: 'ITERATION_WITH_NETWORK_CALLS',
    severity,
    stage: loopKey,
    message: `FCEach loop contains ${networkCalls.length} network request(s) (N+1 query pattern)`,
    details: {
      loopControl: controlExpr,
      estimatedIterations: iterationCount,
      networkCallsPerIteration: networkCalls.length,
      totalNetworkCalls,
      networkStages: networkCalls.map(s => s.key)
    },
    recommendation: 'Convert to batch operation using /multi endpoint or consolidated CCJS. ' +
                     'Replace FCEach iteration with: (1) CCJS to prepare batch query, ' +
                     '(2) Single NWRequest with all IDs, (3) CCJS to consolidate results.',
    example: 'See trigger_formulario_optimized.js lines 1227-1285 (join_uuids → find_modify_answers → consolidate_modify_logic)',
    reference: 'trigger_formulario_optimized.js:1227',
    estimatedImprovement: {
      networkCalls: {
        before: totalNetworkCalls,
        after: 1,  // Single batch request
        reduction: (totalNetworkCalls - 1) / totalNetworkCalls
      },
      executionTime: {
        before: `~${Math.round(totalNetworkCalls * 0.2)} seconds`,
        after: '~2 seconds',
        reduction: 0.9  // Estimated 90% faster
      }
    }
  };
}

/**
 * Check for nested loops (O(n²))
 */
function checkNestedLoops(graph, loopKey, loopStage, bodyStages, options) {
  const nestedLoops = bodyStages.filter(stage => stage.name === 'FCEach');

  if (nestedLoops.length === 0) return null;

  const controlExpr = loopStage.data?.control || '';
  const outerIterations = estimateIterationCount(controlExpr, options.context);

  // Estimate inner loop iterations
  const innerLoop = nestedLoops[0];
  const innerControl = innerLoop.data?.control || '';
  const innerIterations = estimateIterationCount(innerControl, options.context);

  const totalOperations = outerIterations * innerIterations;

  return {
    id: 'NESTED_FCEACH_LOOPS',
    type: 'NESTED_LOOPS',
    severity: 'CRITICAL',
    stage: loopKey,
    message: `Nested FCEach loops detected (O(n²) complexity)`,
    details: {
      outerLoop: loopKey,
      innerLoops: nestedLoops.map(s => s.key),
      estimatedOuterIterations: outerIterations,
      estimatedInnerIterations: innerIterations,
      totalOperations
    },
    recommendation: 'Flatten loops using CCJS preprocessing. Pre-compute all combinations in single CCJS stage, ' +
                     'then iterate once or use batch operations.',
    example: 'Replace nested loops with: CCJS (flatten data) → Single batch operation',
    reference: 'optimization-patterns.md#nested-loops',
    estimatedImprovement: {
      complexity: {
        before: 'O(n²)',
        after: 'O(n)',
        reduction: 0.9
      }
    }
  };
}

/**
 * Check for large iteration counts
 */
function checkLargeIterations(graph, loopKey, loopStage, options) {
  const controlExpr = loopStage.data?.control || '';
  const iterationCount = estimateIterationCount(controlExpr, options.context);

  // Threshold: >100 iterations is concerning
  if (iterationCount <= 100) return null;

  let severity = 'MEDIUM';
  if (iterationCount > 500) severity = 'HIGH';
  if (iterationCount > 1000) severity = 'CRITICAL';

  return {
    id: 'LARGE_ITERATION_COUNT',
    type: 'SCALABILITY_CONCERN',
    severity,
    stage: loopKey,
    message: `FCEach loop with high iteration count (estimated ${iterationCount} iterations)`,
    details: {
      loopControl: controlExpr,
      estimatedIterations: iterationCount
    },
    recommendation: 'Consider batch processing or pagination if dataset continues to grow. ' +
                     'Current implementation may timeout at scale.',
    reference: 'optimization-patterns.md#scalability'
  };
}

/**
 * Check for bypass switch before loop
 */
function checkBypassSwitch(graph, loopKey, loopStage, options) {
  const controlExpr = loopStage.data?.control || '';

  // Check if control comes from $OUTPUT (CCJS stage)
  const outputMatch = controlExpr.match(/\$OUTPUT#([^#|]+)/);

  if (!outputMatch) return null;  // Control from $VALUE, bypass not needed

  const sourceStage = outputMatch[1];

  // Check if there's a FCSwitchOne checking for empty data before loop
  const prevStages = graph.getPrevStages(loopKey);

  const hasBypassCheck = prevStages.some(prevKey => {
    const prevStage = graph.getStage(prevKey);
    if (!prevStage || prevStage.name !== 'FCSwitchOne') return false;

    // Check if switch checks for hasItems/hasData flag
    const lexpression = prevStage.data?.lexpression || '';
    return lexpression.includes('has') && lexpression.includes(sourceStage);
  });

  if (hasBypassCheck) return null;  // Bypass exists, all good

  return {
    id: 'NO_BYPASS_SWITCH',
    type: 'MISSING_BYPASS',
    severity: 'MEDIUM',
    stage: loopKey,
    message: 'Loop without bypass switch (runs even if no data to process)',
    details: {
      loopControl: controlExpr,
      sourceStage
    },
    recommendation: `Add FCSwitchOne stage before loop to check if data exists. ` +
                     `CCJS stage "${sourceStage}" should return "hasItems" boolean field. ` +
                     `Switch routes to loop only if hasItems=true, otherwise skips.`,
    example: 'FCSwitchOne checks $OUTPUT#format_update_os#data|hasClients before iterar_clients_add',
    reference: 'trigger_formulario_optimized.js:1372',
    fix: {
      addStage: {
        key: `check_${loopKey}`,
        name: 'FCSwitchOne',
        data: {
          lexpression: `$OUTPUT#${sourceStage}#data|hasItems`,
          rcaseA: true
        },
        next: {
          CASE_A: loopKey,
          DEFAULT: loopStage.next?.DONE || ''
        }
      },
      updateCCJS: `CCJS stage "${sourceStage}" should return: { ...data, hasItems: items.length > 0 }`
    }
  };
}

/**
 * Get loop analysis summary
 */
export function getLoopSummary(issues) {
  const summary = {
    total: issues.length,
    bySeverity: {
      CRITICAL: issues.filter(i => i.severity === 'CRITICAL').length,
      HIGH: issues.filter(i => i.severity === 'HIGH').length,
      MEDIUM: issues.filter(i => i.severity === 'MEDIUM').length,
      LOW: issues.filter(i => i.severity === 'LOW').length
    },
    byType: {}
  };

  issues.forEach(issue => {
    summary.byType[issue.type] = (summary.byType[issue.type] || 0) + 1;
  });

  return summary;
}

export default {
  analyzeLoops,
  getLoopSummary
};
