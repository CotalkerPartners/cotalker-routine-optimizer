/**
 * Markdown Documentation Generator
 *
 * Generates comprehensive Markdown documentation with Mermaid diagrams
 */

import { formatBytes } from '../../utils/payload-estimator.js';

/**
 * Generate Markdown documentation
 * @param {Object} docs - Structured documentation object
 * @returns {string} Markdown content
 */
export function generateMarkdown(docs) {
  const sections = [];

  // Title and metadata
  sections.push(generateHeader(docs.metadata));
  sections.push('');

  // Metadata section
  sections.push(generateMetadataSection(docs.metadata));
  sections.push('');

  // Overview section
  sections.push(generateOverviewSection(docs.overview));
  sections.push('');

  // Workflow diagram
  sections.push(generateWorkflowSection(docs.dataFlow, docs.stages));
  sections.push('');

  // Stages table
  sections.push(generateStagesSection(docs.stages));
  sections.push('');

  // COTLang usage
  if (docs.cotlang.totalExpressions > 0) {
    sections.push(generateCOTLangSection(docs.cotlang));
    sections.push('');
  }

  // Data dependencies
  if (Object.keys(docs.dataFlow.dependencies).length > 0) {
    sections.push(generateDependenciesSection(docs.dataFlow.dependencies));
    sections.push('');
  }

  // Analysis results (if included)
  if (docs.analysis) {
    sections.push(generateAnalysisSection(docs.analysis));
    sections.push('');
  }

  return sections.join('\n');
}

/**
 * Generate header
 */
function generateHeader(metadata) {
  return `# Routine: ${metadata.name}`;
}

/**
 * Generate metadata section
 */
function generateMetadataSection(metadata) {
  const lines = [
    '## Metadata',
    '',
    `- **ID**: \`${metadata.id || 'N/A'}\``,
    `- **Status**: ${metadata.isActive ? '✅ Active' : '❌ Inactive'}`,
    `- **Channel**: ${metadata.channel || 'N/A'}`,
    `- **Group**: ${metadata.group || 'N/A'}`,
    `- **Triggers**: ${metadata.triggerCount}`
  ];

  return lines.join('\n');
}

/**
 * Generate overview section
 */
function generateOverviewSection(overview) {
  const lines = [
    '## Overview',
    '',
    `- **Total Stages**: ${overview.totalStages}`,
    `- **Network Requests**: ${overview.networkRequestCount}`,
    `- **Loops**: ${overview.loopCount}`,
    `- **Conditionals**: ${overview.conditionalCount}`,
    `- **Code Executions**: ${overview.codeExecutionCount}`,
    ''
  ];

  // Stage type breakdown
  if (Object.keys(overview.stageTypeCounts).length > 0) {
    lines.push('### Stage Types');
    lines.push('');

    const sortedTypes = Object.entries(overview.stageTypeCounts)
      .sort((a, b) => b[1] - a[1]);

    sortedTypes.forEach(([type, count]) => {
      lines.push(`- **${type}**: ${count}`);
    });
  }

  return lines.join('\n');
}

/**
 * Generate workflow section with Mermaid diagram
 */
function generateWorkflowSection(dataFlow, stages) {
  const lines = [
    '## Workflow',
    ''
  ];

  // Generate Mermaid diagram for first trigger
  const graphKeys = Object.keys(dataFlow.graph);
  if (graphKeys.length > 0) {
    const firstGraph = dataFlow.graph[graphKeys[0]];

    lines.push('```mermaid');
    lines.push('graph TD');

    // Build stage nodes
    const stageMap = {};
    stages.forEach(stage => {
      stageMap[stage.key] = stage;
    });

    // Add nodes and edges
    const visited = new Set();
    const queue = [firstGraph.start];

    while (queue.length > 0 && visited.size < 50) { // Limit to 50 nodes for readability
      const current = queue.shift();

      if (!current || visited.has(current)) continue;
      visited.add(current);

      const stage = stageMap[current];
      if (!stage) continue;

      // Format node
      const nodeLabel = formatNodeLabel(stage);
      const nodeShape = getNodeShape(stage.type);

      lines.push(`  ${sanitizeNodeId(current)}${nodeShape[0]}${nodeLabel}${nodeShape[1]}`);

      // Add edges
      const nextStages = firstGraph.adjacencyList[current] || [];
      nextStages.forEach(next => {
        lines.push(`  ${sanitizeNodeId(current)} --> ${sanitizeNodeId(next)}`);
        queue.push(next);
      });
    }

    lines.push('```');
  } else {
    lines.push('*No workflow graph available*');
  }

  // Show loops
  if (graphKeys.length > 0) {
    const firstGraph = dataFlow.graph[graphKeys[0]];
    if (firstGraph.loops && firstGraph.loops.length > 0) {
      lines.push('');
      lines.push('### Loops Detected');
      lines.push('');

      firstGraph.loops.forEach(loop => {
        lines.push(`- **${loop.stage}**: Iterates over ${loop.bodyStages.length} stage(s)`);
        if (loop.bodyStages.length > 0) {
          lines.push(`  - Body: ${loop.bodyStages.join(', ')}`);
        }
      });
    }
  }

  return lines.join('\n');
}

/**
 * Generate stages table section
 */
function generateStagesSection(stages) {
  const lines = [
    '## Stages',
    '',
    '| Stage Key | Type | Purpose | Next Stages | Dependencies |',
    '|-----------|------|---------|-------------|--------------|'
  ];

  stages.forEach(stage => {
    const key = stage.key;
    const type = stage.type;
    const purpose = stage.purpose;
    const nextStages = stage.nextStages.length > 0 ? stage.nextStages.join(', ') : '-';
    const deps = stage.dependencies.length > 0 ? stage.dependencies.join(', ') : '-';

    lines.push(`| \`${key}\` | ${type} | ${purpose} | ${nextStages} | ${deps} |`);
  });

  return lines.join('\n');
}

/**
 * Generate COTLang usage section
 */
function generateCOTLangSection(cotlang) {
  const lines = [
    '## COTLang Expressions',
    '',
    `**Total Expressions**: ${cotlang.totalExpressions}`,
    ''
  ];

  // Show expressions by type
  Object.entries(cotlang.byType).forEach(([type, expressions]) => {
    if (expressions.length > 0) {
      lines.push(`### ${type} (${expressions.length})`);
      lines.push('');

      // Show first 5 examples
      const examples = expressions.slice(0, 5);
      examples.forEach(expr => {
        lines.push(`- **Stage**: \`${expr.stage}\``);
        lines.push(`  - Path: \`${expr.path}\``);
        lines.push(`  - Expression: \`${truncateExpression(expr.expression)}\``);
      });

      if (expressions.length > 5) {
        lines.push(`  - *...and ${expressions.length - 5} more*`);
      }

      lines.push('');
    }
  });

  return lines.join('\n');
}

/**
 * Generate dependencies section
 */
function generateDependenciesSection(dependencies) {
  const lines = [
    '## Data Dependencies',
    '',
    'Stages that depend on output from other stages:',
    ''
  ];

  Object.entries(dependencies).forEach(([stageKey, dep]) => {
    lines.push(`- **${stageKey}** (${dep.type})`);
    lines.push(`  - Depends on: ${dep.dependsOn.join(', ')}`);
  });

  return lines.join('\n');
}

/**
 * Generate analysis section
 */
function generateAnalysisSection(analysis) {
  const lines = [
    '## Analysis Results',
    ''
  ];

  // Summary
  lines.push('### Summary');
  lines.push('');
  lines.push(`- **Total Issues**: ${analysis.summary.totalIssues}`);

  Object.entries(analysis.summary.bySeverity).forEach(([severity, count]) => {
    if (count > 0) {
      const icon = getSeverityIcon(severity);
      lines.push(`- **${severity}**: ${icon} ${count}`);
    }
  });
  lines.push('');

  // Issues by severity
  if (analysis.issues.length > 0) {
    lines.push('### Issues');
    lines.push('');

    const critical = analysis.issues.filter(i => i.severity === 'CRITICAL');
    const high = analysis.issues.filter(i => i.severity === 'HIGH');
    const medium = analysis.issues.filter(i => i.severity === 'MEDIUM');
    const low = analysis.issues.filter(i => i.severity === 'LOW');

    if (critical.length > 0) {
      lines.push('#### 🔴 Critical Issues');
      lines.push('');
      critical.forEach(issue => {
        lines.push(formatIssue(issue));
      });
      lines.push('');
    }

    if (high.length > 0) {
      lines.push('#### 🟠 High Priority Issues');
      lines.push('');
      high.forEach(issue => {
        lines.push(formatIssue(issue));
      });
      lines.push('');
    }

    if (medium.length > 0) {
      lines.push('#### 🟡 Medium Priority Issues');
      lines.push('');
      medium.forEach(issue => {
        lines.push(formatIssue(issue));
      });
      lines.push('');
    }

    if (low.length > 0) {
      lines.push('#### ⚪ Low Priority Issues');
      lines.push('');
      low.forEach(issue => {
        lines.push(formatIssue(issue));
      });
      lines.push('');
    }
  }

  // Estimated improvements
  if (analysis.estimatedImprovements) {
    lines.push('### Estimated Improvements');
    lines.push('');

    const improvements = analysis.estimatedImprovements;

    if (improvements.networkCallReduction && improvements.networkCallReduction.before > 0) {
      const reduction = Math.round(improvements.networkCallReduction.reduction * 100);
      lines.push(`- **Network Calls**: ${improvements.networkCallReduction.before} → ${improvements.networkCallReduction.after} (${reduction}% reduction)`);
    }

    if (improvements.payloadReduction && improvements.payloadReduction.before > 0) {
      const reduction = Math.round(improvements.payloadReduction.reduction * 100);
      const before = formatBytes(improvements.payloadReduction.before);
      const after = formatBytes(improvements.payloadReduction.after);
      lines.push(`- **Payload Size**: ${before} → ${after} (${reduction}% reduction)`);
    }

    if (improvements.executionTime && improvements.executionTime.before > 0) {
      const reduction = Math.round(improvements.executionTime.reduction * 100);
      lines.push(`- **Execution Time**: ~${improvements.executionTime.before}s → ~${improvements.executionTime.after}s (${reduction}% improvement)`);
    }

    lines.push('');
  }

  // Recommendations
  if (analysis.recommendations) {
    lines.push('### Recommendations');
    lines.push('');

    ['critical', 'high', 'medium', 'low'].forEach(priority => {
      const recs = analysis.recommendations[priority];
      if (recs && recs.length > 0) {
        lines.push(`#### ${priority.toUpperCase()}`);
        lines.push('');

        recs.forEach(rec => {
          lines.push(`- **Stage**: \`${rec.stage}\``);
          lines.push(`  - ${rec.message}`);
          if (rec.recommendation) {
            lines.push(`  - **Fix**: ${rec.recommendation}`);
          }
        });

        lines.push('');
      }
    });
  }

  return lines.join('\n');
}

/**
 * Helper: Format node label for Mermaid
 */
function formatNodeLabel(stage) {
  const maxLength = 20;
  let label = stage.key;

  if (label.length > maxLength) {
    label = label.substring(0, maxLength - 3) + '...';
  }

  return label;
}

/**
 * Helper: Get node shape based on stage type
 */
function getNodeShape(type) {
  switch (type) {
    case 'FCEach':
      return ['[[', ']]']; // Subprocess
    case 'FCSwitchOne':
    case 'FCSwitchAll':
      return ['{', '}']; // Decision
    case 'NWRequest':
      return ['>', ']']; // Asymmetric
    default:
      return ['[', ']']; // Rectangle
  }
}

/**
 * Helper: Sanitize node ID for Mermaid
 */
function sanitizeNodeId(id) {
  return id.replace(/[^a-zA-Z0-9_]/g, '_');
}

/**
 * Helper: Get severity icon
 */
function getSeverityIcon(severity) {
  switch (severity) {
    case 'CRITICAL': return '🔴';
    case 'HIGH': return '🟠';
    case 'MEDIUM': return '🟡';
    case 'LOW': return '⚪';
    default: return '⚫';
  }
}

/**
 * Helper: Format issue for Markdown
 */
function formatIssue(issue) {
  const lines = [
    `**${issue.type}** - Stage: \`${issue.stage}\``,
    `- ${issue.message}`
  ];

  if (issue.recommendation) {
    lines.push(`- **Recommendation**: ${issue.recommendation}`);
  }

  if (issue.estimatedImprovement) {
    const imp = issue.estimatedImprovement;
    const improvements = [];

    if (imp.networkCalls) {
      improvements.push(`Network calls: ${imp.networkCalls.before} → ${imp.networkCalls.after}`);
    }

    if (imp.payloadReduction) {
      const before = formatBytes(imp.payloadReduction.before);
      const after = formatBytes(imp.payloadReduction.after);
      improvements.push(`Payload: ${before} → ${after}`);
    }

    if (improvements.length > 0) {
      lines.push(`- **Impact**: ${improvements.join(', ')}`);
    }
  }

  return lines.join('\n');
}

/**
 * Helper: Truncate long expressions
 */
function truncateExpression(expr, maxLength = 80) {
  if (expr.length <= maxLength) return expr;
  return expr.substring(0, maxLength - 3) + '...';
}

export default {
  generateMarkdown
};
