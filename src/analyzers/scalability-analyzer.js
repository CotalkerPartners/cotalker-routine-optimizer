/**
 * Scalability Analyzer
 *
 * Projects routine behavior at different data scales:
 * - Estimates execution time at 2x, 5x, 10x growth
 * - Detects operations that won't scale
 * - Identifies timeout risks
 * - Calculates complexity (O(n), O(n²), etc.)
 */

import { getLoopBody } from '../parsers/routine-parser.js';
import { estimateIterationCount } from '../utils/payload-estimator.js';

/**
 * Analyze scalability of routine
 * @param {Object} routine - Parsed routine
 * @param {Object} options - Analysis options
 * @returns {Array} Array of issues found
 */
export function analyzeScalability(routine, options = {}) {
  const issues = [];

  // Default data size assumptions
  const currentDataSize = options.currentDataSize || {
    ordenes_de_servicio: 100,
    repuestos: 50,
    clientes: 20,
    uuids: 50
  };

  routine.surveyTriggers.forEach(trigger => {
    const { graph } = trigger;

    // Analyze loops for scalability
    graph.stageMap.forEach((stage, key) => {
      if (stage.name === 'FCEach') {
        const scalabilityIssue = analyzeLoopScalability(
          graph, key, stage, currentDataSize, options
        );
        if (scalabilityIssue) issues.push(scalabilityIssue);
      }
    });

    // Analyze overall routine complexity
    const complexityIssue = analyzeRoutineComplexity(graph, currentDataSize);
    if (complexityIssue) issues.push(complexityIssue);
  });

  return issues;
}

/**
 * Analyze single loop for scalability
 */
function analyzeLoopScalability(graph, loopKey, loopStage, currentDataSize, options) {
  const controlExpr = loopStage.data?.control || '';
  const bodyStages = getLoopBody(graph, loopKey);

  // Estimate current iterations
  const currentIterations = estimateIterationCount(controlExpr, { knownSizes: currentDataSize });

  // Calculate operations per iteration
  const networkCallsPerIter = bodyStages.filter(s => s.name === 'NWRequest').length;
  const ccjsCallsPerIter = bodyStages.filter(s => s.name === 'CCJS').length;
  const totalOpsPerIter = networkCallsPerIter + (ccjsCallsPerIter * 0.1); // CCJS is much cheaper

  // Current state
  const currentOps = currentIterations * totalOpsPerIter;
  const currentTime = estimateExecutionTime(currentOps, networkCallsPerIter > 0);

  // Projections
  const projections = {
    '2x': {
      iterations: currentIterations * 2,
      operations: currentIterations * 2 * totalOpsPerIter,
      time: estimateExecutionTime(currentIterations * 2 * totalOpsPerIter, networkCallsPerIter > 0)
    },
    '5x': {
      iterations: currentIterations * 5,
      operations: currentIterations * 5 * totalOpsPerIter,
      time: estimateExecutionTime(currentIterations * 5 * totalOpsPerIter, networkCallsPerIter > 0)
    },
    '10x': {
      iterations: currentIterations * 10,
      operations: currentIterations * 10 * totalOpsPerIter,
      time: estimateExecutionTime(currentIterations * 10 * totalOpsPerIter, networkCallsPerIter > 0)
    }
  };

  // Determine risk level
  const maxTime = projections['10x'].time;
  let severity = 'LOW';
  let riskMessage = '';

  if (maxTime > 600) { // 10 minutes
    severity = 'CRITICAL';
    riskMessage = 'Will timeout at 10x growth (Lambda 15min limit)';
  } else if (maxTime > 300) { // 5 minutes
    severity = 'HIGH';
    riskMessage = 'High risk of timeout at 10x growth';
  } else if (maxTime > 120) { // 2 minutes
    severity = 'MEDIUM';
    riskMessage = 'May experience performance issues at 10x growth';
  } else if (currentOps > 100) {
    severity = 'LOW';
    riskMessage = 'Scalable but could be optimized';
  } else {
    return null; // No issue
  }

  return {
    id: 'SCALABILITY_CONCERN',
    type: 'GROWTH_PROJECTION',
    severity,
    stage: loopKey,
    message: `${riskMessage} (loop: ${loopKey})`,
    details: {
      loopControl: controlExpr,
      current: {
        iterations: currentIterations,
        operations: currentOps,
        timeSeconds: currentTime,
        timeFormatted: formatTime(currentTime)
      },
      projections: {
        '2x': {
          ...projections['2x'],
          timeFormatted: formatTime(projections['2x'].time)
        },
        '5x': {
          ...projections['5x'],
          timeFormatted: formatTime(projections['5x'].time)
        },
        '10x': {
          ...projections['10x'],
          timeFormatted: formatTime(projections['10x'].time)
        }
      },
      networkCallsPerIteration: networkCallsPerIter,
      complexity: 'O(n)'
    },
    recommendation: networkCallsPerIter > 0
      ? 'Convert to batch operation to achieve O(1) network calls:\n' +
        '- Current: O(n) network calls\n' +
        '- Optimized: O(1) batch request + O(n) CCJS processing\n' +
        `- Expected 10x time: ~${Math.round(currentTime * 0.2)} seconds (${Math.round(((maxTime - currentTime * 0.2) / maxTime) * 100)}% faster)`
      : 'Consider pagination or chunking for large datasets',
    reference: 'trigger_formulario_optimized.js:1227'
  };
}

/**
 * Analyze overall routine complexity
 */
function analyzeRoutineComplexity(graph, currentDataSize) {
  let totalNetworkCalls = 0;
  let totalLoops = 0;
  let hasNestedLoops = false;

  // Count network calls and loops
  graph.stageMap.forEach((stage, key) => {
    if (stage.name === 'NWRequest') {
      totalNetworkCalls++;
    }

    if (stage.name === 'FCEach') {
      totalLoops++;

      // Check for nested loops
      const bodyStages = getLoopBody(graph, key);
      if (bodyStages.some(s => s.name === 'FCEach')) {
        hasNestedLoops = true;
      }
    }
  });

  // Estimate total execution time
  const estimatedTime = totalNetworkCalls * 0.3 + totalLoops * 2; // Rough estimate

  if (hasNestedLoops) {
    return {
      id: 'COMPLEX_ROUTINE',
      type: 'ROUTINE_COMPLEXITY',
      severity: 'CRITICAL',
      stage: 'routine',
      message: 'Routine has nested loops (O(n²) complexity)',
      details: {
        totalNetworkCalls,
        totalLoops,
        hasNestedLoops,
        estimatedTime
      },
      recommendation: 'Flatten nested loops using CCJS preprocessing. ' +
                       'Pre-compute all combinations in single stage instead of nested iteration.',
      reference: 'optimization-patterns.md#nested-loops'
    };
  }

  if (totalNetworkCalls > 50) {
    return {
      id: 'HIGH_NETWORK_USAGE',
      type: 'ROUTINE_COMPLEXITY',
      severity: 'HIGH',
      stage: 'routine',
      message: `Routine makes ${totalNetworkCalls} network calls (high latency risk)`,
      details: {
        totalNetworkCalls,
        totalLoops,
        estimatedTime: estimatedTime + ' seconds'
      },
      recommendation: 'Consolidate network calls using batch operations. ' +
                       'Current architecture may timeout with larger datasets.',
      reference: 'optimization-patterns.md#batch-operations'
    };
  }

  return null;
}

/**
 * Estimate execution time based on operation count
 * @param {number} operations - Total operations
 * @param {boolean} hasNetworkCalls - Whether ops include network calls
 * @returns {number} Estimated seconds
 */
function estimateExecutionTime(operations, hasNetworkCalls) {
  if (hasNetworkCalls) {
    // Network calls dominate: ~200-300ms per call
    return Math.round(operations * 0.25);
  } else {
    // CCJS operations: ~10-50ms per operation
    return Math.round(operations * 0.03);
  }
}

/**
 * Format time in human-readable format
 */
function formatTime(seconds) {
  if (seconds < 60) {
    return `${seconds} seconds`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes} min ${secs} sec`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours} hr ${minutes} min`;
  }
}

/**
 * Get scalability summary
 */
export function getScalabilitySummary(issues) {
  const summary = {
    total: issues.length,
    bySeverity: {
      CRITICAL: issues.filter(i => i.severity === 'CRITICAL').length,
      HIGH: issues.filter(i => i.severity === 'HIGH').length,
      MEDIUM: issues.filter(i => i.severity === 'MEDIUM').length,
      LOW: issues.filter(i => i.severity === 'LOW').length
    },
    byType: {},
    worstCaseProjection: null
  };

  issues.forEach(issue => {
    summary.byType[issue.type] = (summary.byType[issue.type] || 0) + 1;

    // Find worst-case projection
    if (issue.details?.projections?.['10x']) {
      const projection = issue.details.projections['10x'];
      if (!summary.worstCaseProjection || projection.timeSeconds > summary.worstCaseProjection.timeSeconds) {
        summary.worstCaseProjection = {
          stage: issue.stage,
          timeSeconds: projection.time,
          timeFormatted: projection.timeFormatted,
          operations: projection.operations
        };
      }
    }
  });

  return summary;
}

/**
 * Generate scalability report
 */
export function generateScalabilityReport(issues) {
  const report = {
    summary: getScalabilitySummary(issues),
    issues,
    recommendations: []
  };

  // Add high-level recommendations
  if (report.summary.bySeverity.CRITICAL > 0) {
    report.recommendations.push({
      priority: 'CRITICAL',
      message: 'Immediate action required: Routine will timeout at scale',
      actions: [
        'Convert loops with network calls to batch operations',
        'Flatten nested loops using CCJS preprocessing',
        'Implement pagination for large datasets'
      ]
    });
  }

  if (report.summary.bySeverity.HIGH > 0) {
    report.recommendations.push({
      priority: 'HIGH',
      message: 'Performance optimization recommended before production use',
      actions: [
        'Consolidate network requests',
        'Add bypass switches for empty data',
        'Use incremental JSON Patch operations'
      ]
    });
  }

  return report;
}

export default {
  analyzeScalability,
  getScalabilitySummary,
  generateScalabilityReport
};
