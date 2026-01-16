/**
 * Documentation Generator
 *
 * Core logic for extracting and structuring routine documentation
 */

import { findLoops, findNetworkRequests, getLoopBody } from '../parsers/routine-parser.js';

/**
 * Generate comprehensive documentation for a routine
 * @param {Object} routine - Parsed routine object
 * @param {Object} options - Documentation options
 * @returns {Object} Structured documentation object
 */
export function generateDocumentation(routine, options = {}) {
  const {
    includeAnalysis = false,
    analysisResults = null,
    sections = ['all']
  } = options;

  const docs = {
    metadata: extractOverview(routine),
    overview: generateOverview(routine),
    stages: documentStages(routine),
    dataFlow: documentDataFlow(routine),
    cotlang: documentCOTLangUsage(routine)
  };

  // Optionally include analysis results
  if (includeAnalysis && analysisResults) {
    docs.analysis = integrateAnalysisResults(analysisResults);
  }

  // Filter sections if specified
  if (!sections.includes('all')) {
    return filterSections(docs, sections);
  }

  return docs;
}

/**
 * Extract high-level metadata
 * @param {Object} routine - Parsed routine
 * @returns {Object} Metadata object
 */
function extractOverview(routine) {
  return {
    name: routine.metadata.name,
    id: routine.metadata.id,
    channel: routine.metadata.channel,
    group: routine.metadata.group,
    isActive: routine.metadata.isActive,
    triggerCount: routine.surveyTriggers.length
  };
}

/**
 * Generate overview statistics
 * @param {Object} routine - Parsed routine
 * @returns {Object} Overview statistics
 */
function generateOverview(routine) {
  let totalStages = 0;
  let stageTypeCounts = {};
  let networkRequestCount = 0;
  let loopCount = 0;
  let conditionalCount = 0;
  let codeExecutionCount = 0;

  routine.surveyTriggers.forEach(trigger => {
    totalStages += trigger.stages.length;

    trigger.stages.forEach(stage => {
      const stageName = stage.name;
      stageTypeCounts[stageName] = (stageTypeCounts[stageName] || 0) + 1;

      // Count specific types
      if (stageName === 'NWRequest') networkRequestCount++;
      if (stageName === 'FCEach') loopCount++;
      if (stageName === 'FCSwitchOne' || stageName === 'FCSwitchAll') conditionalCount++;
      if (stageName === 'CCJS') codeExecutionCount++;
    });
  });

  return {
    totalStages,
    stageTypeCounts,
    networkRequestCount,
    loopCount,
    conditionalCount,
    codeExecutionCount
  };
}

/**
 * Document all stages in detail
 * @param {Object} routine - Parsed routine
 * @returns {Array} Array of stage documentation
 */
function documentStages(routine) {
  const allStages = [];

  routine.surveyTriggers.forEach((trigger, triggerIndex) => {
    trigger.stages.forEach(stage => {
      const nextStages = extractNextStageKeys(stage.next);

      allStages.push({
        triggerIndex,
        key: stage.key,
        name: stage.name,
        type: stage.name,
        purpose: inferStagePurpose(stage),
        nextStages,
        dependencies: stage.dependencies || [],
        expressionCount: stage.expressions ? stage.expressions.length : 0,
        hasErrorHandling: hasErrorHandler(stage.next)
      });
    });
  });

  return allStages;
}

/**
 * Document data flow and dependencies
 * @param {Object} routine - Parsed routine
 * @returns {Object} Data flow documentation
 */
function documentDataFlow(routine) {
  const dependencies = {};
  const graph = {};

  routine.surveyTriggers.forEach((trigger, triggerIndex) => {
    // Build dependency map
    trigger.stages.forEach(stage => {
      if (stage.dependencies && stage.dependencies.length > 0) {
        dependencies[stage.key] = {
          stage: stage.key,
          dependsOn: stage.dependencies,
          type: stage.name
        };
      }
    });

    // Build flow graph
    const startStage = trigger.start;
    graph[`trigger_${triggerIndex}`] = {
      start: startStage,
      adjacencyList: buildAdjacencyList(trigger.stages),
      loops: findLoops(trigger.graph).map(loopKey => ({
        stage: loopKey,
        bodyStages: getLoopBody(trigger.graph, loopKey).map(s => s.key)
      })),
      networkRequests: findNetworkRequests(trigger.graph)
    };
  });

  return {
    dependencies,
    graph
  };
}

/**
 * Document COTLang expression usage
 * @param {Object} routine - Parsed routine
 * @returns {Object} COTLang usage documentation
 */
function documentCOTLangUsage(routine) {
  const expressionsByType = {
    $VALUE: [],
    $OUTPUT: [],
    $JOIN: [],
    $CODE: [],
    $ENV: [],
    other: []
  };

  routine.surveyTriggers.forEach(trigger => {
    trigger.stages.forEach(stage => {
      if (stage.expressions) {
        stage.expressions.forEach(expr => {
          const expression = expr.expression;

          // Categorize by type
          if (expression.includes('$VALUE')) {
            expressionsByType.$VALUE.push({
              stage: stage.key,
              expression,
              path: expr.path
            });
          } else if (expression.includes('$OUTPUT')) {
            expressionsByType.$OUTPUT.push({
              stage: stage.key,
              expression,
              path: expr.path
            });
          } else if (expression.includes('$JOIN')) {
            expressionsByType.$JOIN.push({
              stage: stage.key,
              expression,
              path: expr.path
            });
          } else if (expression.includes('$CODE')) {
            expressionsByType.$CODE.push({
              stage: stage.key,
              expression,
              path: expr.path
            });
          } else if (expression.includes('$ENV')) {
            expressionsByType.$ENV.push({
              stage: stage.key,
              expression,
              path: expr.path
            });
          } else {
            expressionsByType.other.push({
              stage: stage.key,
              expression,
              path: expr.path
            });
          }
        });
      }
    });
  });

  // Calculate totals
  const totalExpressions = Object.values(expressionsByType)
    .reduce((sum, arr) => sum + arr.length, 0);

  return {
    totalExpressions,
    byType: expressionsByType
  };
}

/**
 * Integrate analysis results
 * @param {Object} analysisResults - Results from analyzer
 * @returns {Object} Formatted analysis for documentation
 */
function integrateAnalysisResults(analysisResults) {
  return {
    summary: {
      totalIssues: analysisResults.summary.total,
      bySeverity: analysisResults.summary.bySeverity,
      byType: analysisResults.summary.byType
    },
    issues: analysisResults.issues.map(issue => ({
      id: issue.id,
      type: issue.type,
      severity: issue.severity,
      stage: issue.stage,
      message: issue.message,
      recommendation: issue.recommendation,
      estimatedImprovement: issue.estimatedImprovement
    })),
    estimatedImprovements: analysisResults.estimatedImprovements,
    recommendations: categorizeRecommendations(analysisResults.issues)
  };
}

/**
 * Categorize recommendations by priority
 * @param {Array} issues - Array of issues
 * @returns {Object} Categorized recommendations
 */
function categorizeRecommendations(issues) {
  const categories = {
    critical: [],
    high: [],
    medium: [],
    low: []
  };

  issues.forEach(issue => {
    const priority = (issue.severity || 'LOW').toLowerCase();

    if (categories[priority]) {
      categories[priority].push({
        stage: issue.stage,
        message: issue.message,
        recommendation: issue.recommendation
      });
    }
  });

  return categories;
}

/**
 * Helper: Extract next stage keys from next field
 */
function extractNextStageKeys(next) {
  if (!next || typeof next !== 'object') return [];

  return Object.values(next).filter(val => typeof val === 'string' && val !== '');
}

/**
 * Helper: Infer stage purpose from name and type
 */
function inferStagePurpose(stage) {
  const name = stage.name;
  const key = stage.key;

  // Common patterns
  if (name === 'NWRequest') return 'Make network request';
  if (name === 'FCEach') return 'Iterate over collection';
  if (name === 'CCJS') return 'Execute custom code';
  if (name === 'FCSwitchOne') return 'Conditional branching';
  if (name === 'FCMerge') return 'Merge data';
  if (name === 'FCJoinPath') return 'Join data paths';
  if (name === 'FCAccumulator') return 'Accumulate values';

  // Try to infer from key
  if (key.toLowerCase().includes('get')) return 'Retrieve data';
  if (key.toLowerCase().includes('update')) return 'Update data';
  if (key.toLowerCase().includes('create')) return 'Create data';
  if (key.toLowerCase().includes('delete')) return 'Delete data';
  if (key.toLowerCase().includes('format')) return 'Format data';
  if (key.toLowerCase().includes('validate')) return 'Validate data';

  return 'Process data';
}

/**
 * Helper: Check if stage has error handling
 */
function hasErrorHandler(next) {
  if (!next || typeof next !== 'object') return false;

  return 'ERROR' in next || 'FAIL' in next || 'error' in next || 'fail' in next;
}

/**
 * Helper: Build adjacency list from stages
 */
function buildAdjacencyList(stages) {
  const adjacency = {};

  stages.forEach(stage => {
    const nextStages = extractNextStageKeys(stage.next);
    adjacency[stage.key] = nextStages;
  });

  return adjacency;
}

/**
 * Helper: Filter sections based on requested sections
 */
function filterSections(docs, sections) {
  const filtered = {};

  sections.forEach(section => {
    if (docs[section]) {
      filtered[section] = docs[section];
    }
  });

  return filtered;
}

export default {
  generateDocumentation
};
