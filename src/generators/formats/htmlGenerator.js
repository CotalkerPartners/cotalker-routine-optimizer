/**
 * HTML Documentation Generator
 *
 * Generates interactive HTML documentation with embedded CSS and Mermaid.js support
 */

import { formatBytes } from '../../utils/payload-estimator.js';

/**
 * Generate HTML documentation
 * @param {Object} docs - Structured documentation object
 * @returns {string} HTML content
 */
export function generateHTML(docs) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Routine Documentation: ${escapeHtml(docs.metadata.name)}</title>
  ${generateCSS()}
  <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
  <script>
    mermaid.initialize({ startOnLoad: true, theme: 'default' });
  </script>
</head>
<body>
  <div class="container">
    ${generateHeaderHTML(docs.metadata)}
    ${generateMetadataHTML(docs.metadata)}
    ${generateOverviewHTML(docs.overview)}
    ${generateWorkflowHTML(docs.dataFlow, docs.stages)}
    ${generateStagesHTML(docs.stages)}
    ${generateCOTLangHTML(docs.cotlang)}
    ${generateDependenciesHTML(docs.dataFlow.dependencies)}
    ${docs.analysis ? generateAnalysisHTML(docs.analysis) : ''}
    ${generateFooter()}
  </div>
</body>
</html>`;
}

/**
 * Generate embedded CSS
 */
function generateCSS() {
  return `<style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #f5f5f5;
      padding: 20px;
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      padding: 40px;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }

    h1 {
      color: #2c3e50;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 3px solid #3498db;
    }

    h2 {
      color: #34495e;
      margin-top: 40px;
      margin-bottom: 20px;
      padding-left: 10px;
      border-left: 4px solid #3498db;
    }

    h3 {
      color: #7f8c8d;
      margin-top: 25px;
      margin-bottom: 15px;
    }

    .metadata {
      background: #ecf0f1;
      padding: 20px;
      border-radius: 6px;
      margin-bottom: 30px;
    }

    .metadata-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
    }

    .metadata-item {
      display: flex;
      flex-direction: column;
    }

    .metadata-label {
      font-weight: 600;
      color: #7f8c8d;
      font-size: 0.85em;
      text-transform: uppercase;
      margin-bottom: 5px;
    }

    .metadata-value {
      color: #2c3e50;
      font-size: 1.1em;
    }

    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 0.85em;
      font-weight: 600;
    }

    .badge-active {
      background: #2ecc71;
      color: white;
    }

    .badge-inactive {
      background: #e74c3c;
      color: white;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 15px;
      margin: 20px 0;
    }

    .stat-card {
      background: #f8f9fa;
      padding: 15px;
      border-radius: 6px;
      text-align: center;
      border: 1px solid #e9ecef;
    }

    .stat-number {
      font-size: 2em;
      font-weight: bold;
      color: #3498db;
    }

    .stat-label {
      color: #7f8c8d;
      font-size: 0.9em;
      margin-top: 5px;
    }

    .mermaid {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 6px;
      margin: 20px 0;
      overflow-x: auto;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
      background: white;
    }

    th {
      background: #34495e;
      color: white;
      padding: 12px;
      text-align: left;
      font-weight: 600;
    }

    td {
      padding: 10px 12px;
      border-bottom: 1px solid #ecf0f1;
    }

    tr:hover {
      background: #f8f9fa;
    }

    code {
      background: #f4f4f4;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'Monaco', 'Courier New', monospace;
      font-size: 0.9em;
      color: #e74c3c;
    }

    .issue {
      margin: 15px 0;
      padding: 15px;
      border-radius: 6px;
      border-left: 4px solid;
    }

    .issue-critical {
      background: #fee;
      border-color: #e74c3c;
    }

    .issue-high {
      background: #fff3e0;
      border-color: #f39c12;
    }

    .issue-medium {
      background: #fff9e6;
      border-color: #f1c40f;
    }

    .issue-low {
      background: #f0f0f0;
      border-color: #95a5a6;
    }

    .issue-title {
      font-weight: 600;
      margin-bottom: 8px;
    }

    .issue-stage {
      color: #7f8c8d;
      font-size: 0.9em;
      margin-bottom: 8px;
    }

    .issue-message {
      margin-bottom: 8px;
    }

    .issue-recommendation {
      background: rgba(255,255,255,0.7);
      padding: 10px;
      border-radius: 4px;
      margin-top: 10px;
      font-style: italic;
    }

    .severity-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 3px;
      font-size: 0.75em;
      font-weight: bold;
      margin-right: 8px;
    }

    .severity-critical {
      background: #e74c3c;
      color: white;
    }

    .severity-high {
      background: #f39c12;
      color: white;
    }

    .severity-medium {
      background: #f1c40f;
      color: #333;
    }

    .severity-low {
      background: #95a5a6;
      color: white;
    }

    .improvement-box {
      background: #e8f5e9;
      border: 1px solid #4caf50;
      border-radius: 6px;
      padding: 15px;
      margin: 20px 0;
    }

    .improvement-item {
      margin: 10px 0;
      font-size: 1.05em;
    }

    .improvement-label {
      font-weight: 600;
      color: #2e7d32;
    }

    .expression-list {
      max-height: 400px;
      overflow-y: auto;
      background: #f8f9fa;
      padding: 15px;
      border-radius: 6px;
      margin: 10px 0;
    }

    .expression-item {
      margin: 10px 0;
      padding: 10px;
      background: white;
      border-radius: 4px;
      border-left: 3px solid #3498db;
    }

    .dependency-item {
      background: #f8f9fa;
      padding: 12px;
      margin: 8px 0;
      border-radius: 4px;
      border-left: 3px solid #9b59b6;
    }

    .footer {
      margin-top: 60px;
      padding-top: 20px;
      border-top: 1px solid #ecf0f1;
      text-align: center;
      color: #95a5a6;
      font-size: 0.9em;
    }

    .type-badge {
      display: inline-block;
      padding: 3px 8px;
      background: #3498db;
      color: white;
      border-radius: 3px;
      font-size: 0.85em;
      font-weight: 500;
    }
  </style>`;
}

/**
 * Generate header HTML
 */
function generateHeaderHTML(metadata) {
  return `
    <h1>📋 Routine: ${escapeHtml(metadata.name)}</h1>
  `;
}

/**
 * Generate metadata HTML
 */
function generateMetadataHTML(metadata) {
  const statusBadge = metadata.isActive
    ? '<span class="badge badge-active">✅ Active</span>'
    : '<span class="badge badge-inactive">❌ Inactive</span>';

  return `
    <div class="metadata">
      <h2>Metadata</h2>
      <div class="metadata-grid">
        <div class="metadata-item">
          <div class="metadata-label">ID</div>
          <div class="metadata-value"><code>${escapeHtml(metadata.id || 'N/A')}</code></div>
        </div>
        <div class="metadata-item">
          <div class="metadata-label">Status</div>
          <div class="metadata-value">${statusBadge}</div>
        </div>
        <div class="metadata-item">
          <div class="metadata-label">Channel</div>
          <div class="metadata-value">${escapeHtml(metadata.channel || 'N/A')}</div>
        </div>
        <div class="metadata-item">
          <div class="metadata-label">Group</div>
          <div class="metadata-value">${escapeHtml(metadata.group || 'N/A')}</div>
        </div>
        <div class="metadata-item">
          <div class="metadata-label">Triggers</div>
          <div class="metadata-value">${metadata.triggerCount}</div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Generate overview HTML
 */
function generateOverviewHTML(overview) {
  return `
    <h2>Overview</h2>
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-number">${overview.totalStages}</div>
        <div class="stat-label">Total Stages</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">${overview.networkRequestCount}</div>
        <div class="stat-label">Network Requests</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">${overview.loopCount}</div>
        <div class="stat-label">Loops</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">${overview.conditionalCount}</div>
        <div class="stat-label">Conditionals</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">${overview.codeExecutionCount}</div>
        <div class="stat-label">Code Executions</div>
      </div>
    </div>

    <h3>Stage Types</h3>
    <table>
      <thead>
        <tr>
          <th>Type</th>
          <th>Count</th>
        </tr>
      </thead>
      <tbody>
        ${Object.entries(overview.stageTypeCounts)
          .sort((a, b) => b[1] - a[1])
          .map(([type, count]) => `
            <tr>
              <td><span class="type-badge">${escapeHtml(type)}</span></td>
              <td>${count}</td>
            </tr>
          `).join('')}
      </tbody>
    </table>
  `;
}

/**
 * Generate workflow HTML with Mermaid
 */
function generateWorkflowHTML(dataFlow, stages) {
  const graphKeys = Object.keys(dataFlow.graph);
  if (graphKeys.length === 0) {
    return '<h2>Workflow</h2><p>No workflow graph available</p>';
  }

  const firstGraph = dataFlow.graph[graphKeys[0]];
  const stageMap = {};
  stages.forEach(stage => {
    stageMap[stage.key] = stage;
  });

  // Build Mermaid diagram
  const mermaidLines = ['graph TD'];
  const visited = new Set();
  const queue = [firstGraph.start];

  while (queue.length > 0 && visited.size < 50) {
    const current = queue.shift();
    if (!current || visited.has(current)) continue;

    visited.add(current);
    const stage = stageMap[current];
    if (!stage) continue;

    const nodeId = sanitizeNodeId(current);
    const nodeLabel = formatNodeLabel(stage);
    const nodeShape = getNodeShape(stage.type);

    mermaidLines.push(`  ${nodeId}${nodeShape[0]}${nodeLabel}${nodeShape[1]}`);

    const nextStages = firstGraph.adjacencyList[current] || [];
    nextStages.forEach(next => {
      mermaidLines.push(`  ${nodeId} --> ${sanitizeNodeId(next)}`);
      queue.push(next);
    });
  }

  const mermaidDiagram = mermaidLines.join('\n');

  let loopsHTML = '';
  if (firstGraph.loops && firstGraph.loops.length > 0) {
    loopsHTML = `
      <h3>Loops Detected</h3>
      <ul>
        ${firstGraph.loops.map(loop => `
          <li>
            <strong><code>${escapeHtml(loop.stage)}</code></strong>:
            Iterates over ${loop.bodyStages.length} stage(s)
            ${loop.bodyStages.length > 0 ? `<br>Body: ${loop.bodyStages.map(s => `<code>${escapeHtml(s)}</code>`).join(', ')}` : ''}
          </li>
        `).join('')}
      </ul>
    `;
  }

  return `
    <h2>Workflow</h2>
    <div class="mermaid">
${mermaidDiagram}
    </div>
    ${loopsHTML}
  `;
}

/**
 * Generate stages table HTML
 */
function generateStagesHTML(stages) {
  return `
    <h2>Stages</h2>
    <table>
      <thead>
        <tr>
          <th>Stage Key</th>
          <th>Type</th>
          <th>Purpose</th>
          <th>Next Stages</th>
          <th>Dependencies</th>
        </tr>
      </thead>
      <tbody>
        ${stages.map(stage => `
          <tr>
            <td><code>${escapeHtml(stage.key)}</code></td>
            <td><span class="type-badge">${escapeHtml(stage.type)}</span></td>
            <td>${escapeHtml(stage.purpose)}</td>
            <td>${stage.nextStages.length > 0 ? stage.nextStages.map(s => `<code>${escapeHtml(s)}</code>`).join(', ') : '-'}</td>
            <td>${stage.dependencies.length > 0 ? stage.dependencies.map(d => `<code>${escapeHtml(d)}</code>`).join(', ') : '-'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

/**
 * Generate COTLang HTML
 */
function generateCOTLangHTML(cotlang) {
  if (cotlang.totalExpressions === 0) {
    return '';
  }

  const expressionSections = Object.entries(cotlang.byType)
    .filter(([, expressions]) => expressions.length > 0)
    .map(([type, expressions]) => `
      <h3>${escapeHtml(type)} (${expressions.length})</h3>
      <div class="expression-list">
        ${expressions.slice(0, 10).map(expr => `
          <div class="expression-item">
            <div><strong>Stage:</strong> <code>${escapeHtml(expr.stage)}</code></div>
            <div><strong>Path:</strong> <code>${escapeHtml(expr.path)}</code></div>
            <div><strong>Expression:</strong> <code>${escapeHtml(truncateExpression(expr.expression))}</code></div>
          </div>
        `).join('')}
        ${expressions.length > 10 ? `<p><em>...and ${expressions.length - 10} more</em></p>` : ''}
      </div>
    `).join('');

  return `
    <h2>COTLang Expressions</h2>
    <p><strong>Total Expressions:</strong> ${cotlang.totalExpressions}</p>
    ${expressionSections}
  `;
}

/**
 * Generate dependencies HTML
 */
function generateDependenciesHTML(dependencies) {
  if (Object.keys(dependencies).length === 0) {
    return '';
  }

  return `
    <h2>Data Dependencies</h2>
    <p>Stages that depend on output from other stages:</p>
    ${Object.entries(dependencies).map(([stageKey, dep]) => `
      <div class="dependency-item">
        <strong><code>${escapeHtml(stageKey)}</code></strong> (${escapeHtml(dep.type)})<br>
        Depends on: ${dep.dependsOn.map(d => `<code>${escapeHtml(d)}</code>`).join(', ')}
      </div>
    `).join('')}
  `;
}

/**
 * Generate analysis HTML
 */
function generateAnalysisHTML(analysis) {
  let html = '<h2>Analysis Results</h2>';

  // Summary
  html += '<h3>Summary</h3>';
  html += `<p><strong>Total Issues:</strong> ${analysis.summary.totalIssues}</p>`;
  html += '<ul>';
  Object.entries(analysis.summary.bySeverity).forEach(([severity, count]) => {
    if (count > 0) {
      const badge = `<span class="severity-badge severity-${severity.toLowerCase()}">${severity}</span>`;
      html += `<li>${badge} ${count}</li>`;
    }
  });
  html += '</ul>';

  // Issues
  if (analysis.issues.length > 0) {
    const critical = analysis.issues.filter(i => i.severity === 'CRITICAL');
    const high = analysis.issues.filter(i => i.severity === 'HIGH');
    const medium = analysis.issues.filter(i => i.severity === 'MEDIUM');
    const low = analysis.issues.filter(i => i.severity === 'LOW');

    if (critical.length > 0) {
      html += '<h3>🔴 Critical Issues</h3>';
      html += critical.map(issue => formatIssueHTML(issue, 'critical')).join('');
    }

    if (high.length > 0) {
      html += '<h3>🟠 High Priority Issues</h3>';
      html += high.map(issue => formatIssueHTML(issue, 'high')).join('');
    }

    if (medium.length > 0) {
      html += '<h3>🟡 Medium Priority Issues</h3>';
      html += medium.map(issue => formatIssueHTML(issue, 'medium')).join('');
    }

    if (low.length > 0) {
      html += '<h3>⚪ Low Priority Issues</h3>';
      html += low.map(issue => formatIssueHTML(issue, 'low')).join('');
    }
  }

  // Estimated improvements
  if (analysis.estimatedImprovements) {
    html += '<h3>Estimated Improvements</h3>';
    html += '<div class="improvement-box">';

    const imp = analysis.estimatedImprovements;

    if (imp.networkCallReduction && imp.networkCallReduction.before > 0) {
      const reduction = Math.round(imp.networkCallReduction.reduction * 100);
      html += `<div class="improvement-item">
        <span class="improvement-label">Network Calls:</span>
        ${imp.networkCallReduction.before} → ${imp.networkCallReduction.after} (${reduction}% reduction)
      </div>`;
    }

    if (imp.payloadReduction && imp.payloadReduction.before > 0) {
      const reduction = Math.round(imp.payloadReduction.reduction * 100);
      const before = formatBytes(imp.payloadReduction.before);
      const after = formatBytes(imp.payloadReduction.after);
      html += `<div class="improvement-item">
        <span class="improvement-label">Payload Size:</span>
        ${before} → ${after} (${reduction}% reduction)
      </div>`;
    }

    if (imp.executionTime && imp.executionTime.before > 0) {
      const reduction = Math.round(imp.executionTime.reduction * 100);
      html += `<div class="improvement-item">
        <span class="improvement-label">Execution Time:</span>
        ~${imp.executionTime.before}s → ~${imp.executionTime.after}s (${reduction}% improvement)
      </div>`;
    }

    html += '</div>';
  }

  return html;
}

/**
 * Generate footer HTML
 */
function generateFooter() {
  return `
    <div class="footer">
      Generated by Cotalker Routine Optimizer
    </div>
  `;
}

/**
 * Helper: Format issue HTML
 */
function formatIssueHTML(issue, severityClass) {
  let html = `<div class="issue issue-${severityClass}">`;
  html += `<div class="issue-title">${escapeHtml(issue.type)}</div>`;
  html += `<div class="issue-stage">Stage: <code>${escapeHtml(issue.stage)}</code></div>`;
  html += `<div class="issue-message">${escapeHtml(issue.message)}</div>`;

  if (issue.recommendation) {
    html += `<div class="issue-recommendation">
      <strong>Recommendation:</strong> ${escapeHtml(issue.recommendation)}
    </div>`;
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
      html += `<div style="margin-top: 10px; font-size: 0.9em; color: #2e7d32;">
        <strong>Impact:</strong> ${improvements.join(', ')}
      </div>`;
    }
  }

  html += '</div>';
  return html;
}

/**
 * Helper functions
 */
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return String(text).replace(/[&<>"']/g, m => map[m]);
}

function formatNodeLabel(stage) {
  const maxLength = 20;
  let label = stage.key;
  if (label.length > maxLength) {
    label = label.substring(0, maxLength - 3) + '...';
  }
  return label;
}

function getNodeShape(type) {
  switch (type) {
    case 'FCEach':
      return ['[[', ']]'];
    case 'FCSwitchOne':
    case 'FCSwitchAll':
      return ['{', '}'];
    case 'NWRequest':
      return ['>', ']'];
    default:
      return ['[', ']'];
  }
}

function sanitizeNodeId(id) {
  return id.replace(/[^a-zA-Z0-9_]/g, '_');
}

function truncateExpression(expr, maxLength = 80) {
  if (expr.length <= maxLength) return expr;
  return expr.substring(0, maxLength - 3) + '...';
}

export default {
  generateHTML
};
