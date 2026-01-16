/**
 * JSON Documentation Generator
 *
 * Generates structured JSON documentation for programmatic consumption
 */

/**
 * Generate JSON documentation
 * @param {Object} docs - Structured documentation object
 * @returns {string} JSON string
 */
export function generateJSON(docs) {
  // Create a clean structure optimized for API/programmatic use
  const jsonDoc = {
    metadata: docs.metadata,
    overview: {
      statistics: {
        totalStages: docs.overview.totalStages,
        networkRequests: docs.overview.networkRequestCount,
        loops: docs.overview.loopCount,
        conditionals: docs.overview.conditionalCount,
        codeExecutions: docs.overview.codeExecutionCount
      },
      stageTypes: docs.overview.stageTypeCounts
    },
    stages: docs.stages.map(stage => ({
      key: stage.key,
      type: stage.type,
      purpose: stage.purpose,
      nextStages: stage.nextStages,
      dependencies: stage.dependencies,
      expressionCount: stage.expressionCount,
      hasErrorHandling: stage.hasErrorHandling
    })),
    dataFlow: {
      dependencies: Object.entries(docs.dataFlow.dependencies).map(([key, dep]) => ({
        stage: key,
        type: dep.type,
        dependsOn: dep.dependsOn
      })),
      graphs: Object.entries(docs.dataFlow.graph).map(([key, graph]) => ({
        trigger: key,
        startStage: graph.start,
        adjacencyList: graph.adjacencyList instanceof Map
          ? Object.fromEntries(graph.adjacencyList)
          : graph.adjacencyList,
        loops: graph.loops || [],
        networkRequests: graph.networkRequests || []
      }))
    },
    cotlang: {
      totalExpressions: docs.cotlang.totalExpressions,
      expressionsByType: Object.entries(docs.cotlang.byType).reduce((acc, [type, expressions]) => {
        acc[type] = {
          count: expressions.length,
          examples: expressions.slice(0, 10).map(expr => ({
            stage: expr.stage,
            path: expr.path,
            expression: expr.expression
          }))
        };
        return acc;
      }, {})
    }
  };

  // Add analysis if present
  if (docs.analysis) {
    jsonDoc.analysis = {
      summary: docs.analysis.summary,
      issues: docs.analysis.issues,
      estimatedImprovements: docs.analysis.estimatedImprovements,
      recommendations: docs.analysis.recommendations
    };
  }

  return JSON.stringify(jsonDoc, null, 2);
}

export default {
  generateJSON
};
