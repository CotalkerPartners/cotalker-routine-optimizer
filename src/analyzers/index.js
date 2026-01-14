/**
 * Analyzer Orchestrator
 *
 * Coordinates all analyzers and aggregates results
 */

import { analyzeLoops, getLoopSummary } from './loop-analyzer.js';
import { analyzePayloads, getPayloadSummary } from './payload-analyzer.js';
import { analyzeJSONPatches, getJSONPatchSummary } from './jsonpatch-analyzer.js';
import { analyzeScalability, getScalabilitySummary } from './scalability-analyzer.js';

/**
 * Run all analyzers on routine
 * @param {Object} routine - Parsed routine
 * @param {Object} options - Analysis options
 * @returns {Object} Analysis results
 */
export function analyzeRoutine(routine, options = {}) {
  const {
    checks = ['loop', 'payload', 'patch', 'scalability'],
    severityFilter = 'all',
    context = {}
  } = options;

  const results = {
    routine: routine.metadata,
    issues: [],
    summary: {
      total: 0,
      bySeverity: {
        CRITICAL: 0,
        HIGH: 0,
        MEDIUM: 0,
        LOW: 0
      },
      byType: {},
      byAnalyzer: {}
    },
    estimatedImprovements: {
      networkCallReduction: { before: 0, after: 0, reduction: 0 },
      payloadReduction: { before: 0, after: 0, reduction: 0 },
      executionTime: { before: 0, after: 0, reduction: 0 }
    }
  };

  // Run selected analyzers
  if (checks.includes('loop')) {
    const loopIssues = analyzeLoops(routine, { context });
    results.issues.push(...loopIssues);
    results.summary.byAnalyzer.loop = getLoopSummary(loopIssues);
  }

  if (checks.includes('payload')) {
    const payloadIssues = analyzePayloads(routine, { context });
    results.issues.push(...payloadIssues);
    results.summary.byAnalyzer.payload = getPayloadSummary(payloadIssues);
  }

  if (checks.includes('patch')) {
    const patchIssues = analyzeJSONPatches(routine, { context });
    results.issues.push(...patchIssues);
    results.summary.byAnalyzer.patch = getJSONPatchSummary(patchIssues);
  }

  if (checks.includes('scalability')) {
    const scalabilityIssues = analyzeScalability(routine, { context });
    results.issues.push(...scalabilityIssues);
    results.summary.byAnalyzer.scalability = getScalabilitySummary(scalabilityIssues);
  }

  // Filter by severity
  if (severityFilter !== 'all') {
    results.issues = filterBySeverity(results.issues, severityFilter);
  }

  // Calculate summary
  results.summary.total = results.issues.length;

  results.issues.forEach(issue => {
    // Count by severity
    if (issue.severity) {
      results.summary.bySeverity[issue.severity]++;
    }

    // Count by type
    if (issue.type) {
      results.summary.byType[issue.type] = (results.summary.byType[issue.type] || 0) + 1;
    }

    // Aggregate improvements
    if (issue.estimatedImprovement) {
      const imp = issue.estimatedImprovement;

      if (imp.networkCalls) {
        results.estimatedImprovements.networkCallReduction.before += imp.networkCalls.before || 0;
        results.estimatedImprovements.networkCallReduction.after += imp.networkCalls.after || 0;
      }

      if (imp.payloadReduction) {
        results.estimatedImprovements.payloadReduction.before += imp.payloadReduction.before || 0;
        results.estimatedImprovements.payloadReduction.after += imp.payloadReduction.after || 0;
      }
    }
  });

  // Calculate reduction percentages
  const netBefore = results.estimatedImprovements.networkCallReduction.before;
  const netAfter = results.estimatedImprovements.networkCallReduction.after;
  results.estimatedImprovements.networkCallReduction.reduction =
    netBefore > 0 ? (netBefore - netAfter) / netBefore : 0;

  const payBefore = results.estimatedImprovements.payloadReduction.before;
  const payAfter = results.estimatedImprovements.payloadReduction.after;
  results.estimatedImprovements.payloadReduction.reduction =
    payBefore > 0 ? (payBefore - payAfter) / payBefore : 0;

  // Estimate execution time improvement
  if (netBefore > 0) {
    results.estimatedImprovements.executionTime.before = Math.round(netBefore * 0.25); // ~250ms per call
    results.estimatedImprovements.executionTime.after = Math.round(netAfter * 0.25 + 5); // +5s for CCJS
    results.estimatedImprovements.executionTime.reduction =
      results.estimatedImprovements.executionTime.before > 0
        ? (results.estimatedImprovements.executionTime.before - results.estimatedImprovements.executionTime.after) /
          results.estimatedImprovements.executionTime.before
        : 0;
  }

  return results;
}

/**
 * Filter issues by severity level
 */
function filterBySeverity(issues, severityLevel) {
  const levelMap = {
    critical: ['CRITICAL'],
    high: ['CRITICAL', 'HIGH'],
    medium: ['CRITICAL', 'HIGH', 'MEDIUM'],
    low: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']
  };

  const levels = levelMap[severityLevel.toLowerCase()] || [];
  return issues.filter(issue => levels.includes(issue.severity));
}

/**
 * Get issues by category
 */
export function getIssuesByCategory(results) {
  const categories = {
    memory: [],
    timeout: [],
    network: [],
    robustness: []
  };

  results.issues.forEach(issue => {
    // Memory issues (payload-related)
    if (issue.type.includes('PAYLOAD') || issue.type.includes('ARRAY_REPLACEMENT')) {
      categories.memory.push(issue);
    }

    // Timeout issues (scalability, loops)
    if (issue.type.includes('SCALABILITY') || issue.type.includes('GROWTH') || issue.type.includes('ITERATION')) {
      categories.timeout.push(issue);
    }

    // Network efficiency
    if (issue.type.includes('NETWORK') || issue.id === 'LOOP_WITH_NETWORK_CALLS') {
      categories.network.push(issue);
    }

    // Robustness
    if (issue.type.includes('ROBUSTNESS') || issue.id === 'UNSAFE_JSON_PARSING') {
      categories.robustness.push(issue);
    }
  });

  return categories;
}

/**
 * Get critical issues only
 */
export function getCriticalIssues(results) {
  return results.issues.filter(issue => issue.severity === 'CRITICAL');
}

/**
 * Generate prioritized recommendations
 */
export function getPrioritizedRecommendations(results) {
  const critical = results.issues.filter(i => i.severity === 'CRITICAL');
  const high = results.issues.filter(i => i.severity === 'HIGH');

  const recommendations = [];

  // Critical issues first
  if (critical.length > 0) {
    recommendations.push({
      priority: 'CRITICAL',
      count: critical.length,
      title: 'Immediate Action Required',
      issues: critical.map(i => ({
        stage: i.stage,
        message: i.message,
        recommendation: i.recommendation
      }))
    });
  }

  // High priority issues
  if (high.length > 0) {
    recommendations.push({
      priority: 'HIGH',
      count: high.length,
      title: 'High Priority Optimizations',
      issues: high.map(i => ({
        stage: i.stage,
        message: i.message,
        recommendation: i.recommendation
      }))
    });
  }

  return recommendations;
}

export default {
  analyzeRoutine,
  getIssuesByCategory,
  getCriticalIssues,
  getPrioritizedRecommendations
};
