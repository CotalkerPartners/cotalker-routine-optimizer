# Document Routine

Genera documentación completa de una rutina: overview, flow diagram, stages, data flow, COTLang usage.

## Usage

```
/document-routine [--format md|html|json] [--include-analysis]
```

**Options**:
- `--format md` (default): Markdown con Mermaid diagrams
- `--format html`: HTML interactivo con embedded CSS
- `--format json`: Structured JSON
- `--include-analysis`: Incluye detección de anti-patterns

## What this skill does

1. **Lee la rutina** desde `routines/input/current.json`
2. **Parsea estructura** (si es compleja) o analiza directamente
3. **Genera documentación** completa con:
   - Overview (stats, trigger type)
   - Flow diagram (Mermaid)
   - Stage details (table con propósito de cada stage)
   - Data flow (cómo fluyen los datos)
   - COTLang usage (expressions categorizadas)
   - Anti-patterns (si `--include-analysis`)
4. **Guarda en sesión** en formato(s) solicitado(s)

## Steps to follow

### 1. Read and parse routine

```javascript
import { readFileSync } from 'fs';
import { parseRoutineFile, findLoops } from './src/parsers/routine-parser.js';

// Read routine
const routineContent = readFileSync('routines/input/current.json', 'utf-8');
const routine = JSON.parse(routineContent);

// Parse if complex (>50 stages), otherwise analyze directly
const isComplex = routine.surveyTriggers?.[0]?.triggers?.[0]?.stages?.length > 50;

let parsed;
if (isComplex) {
  parsed = parseRoutineFile('routines/input/current.json');
} else {
  // Analyze directly
  const stages = routine.surveyTriggers?.[0]?.triggers?.[0]?.stages || [];
  parsed = { stages, /* ... */ };
}
```

### 2. Extract overview information

```javascript
const metadata = {
  name: routine.name || 'Unnamed Routine',
  id: routine._id?.$oid || routine._id || 'N/A',
  isActive: routine.isActive !== false,
  totalStages: parsed.stages.length,
  networkRequests: parsed.stages.filter(s => s.name === 'NWRequest').length,
  loops: isComplex ? findLoops(parsed.graph).length : countLoops(parsed.stages),
  triggerType: detectTriggerType(routine),
  hasErrorHandling: checkErrorHandling(parsed.stages)
};
```

### 3. Generate Mermaid flow diagram

```javascript
function generateMermaidDiagram(stages, startStage) {
  let mermaid = 'graph TD\n';

  // Add all stages as nodes
  stages.forEach(stage => {
    const label = `${stage.key}[${stage.name}]`;
    mermaid += `    ${stage.key}[${stage.name}]\n`;
  });

  // Add connections
  stages.forEach(stage => {
    const next = stage.next || {};

    if (next.OK) {
      mermaid += `    ${stage.key} -->|OK| ${next.OK}\n`;
    }
    if (next.ERROR) {
      mermaid += `    ${stage.key} -->|ERROR| ${next.ERROR}\n`;
    }
    if (next.STEP) {
      mermaid += `    ${stage.key} --> ${next.STEP}\n`;
    }
    if (next.END) {
      mermaid += `    ${stage.key} -->|END| END[End]\n`;
    }
  });

  return mermaid;
}
```

### 4. Analyze data flow

```javascript
function analyzeDataFlow(stages) {
  const dataFlow = {
    triggerInput: [],    // What data enters from trigger
    stageOutputs: [],    // What each stage produces
    finalOutput: []      // What data is produced/updated
  };

  // Analyze $VALUE usage (trigger input)
  stages.forEach(stage => {
    const stageData = JSON.stringify(stage.data);
    const valueMatches = stageData.matchAll(/\$VALUE#([^#\s\|\)]+)/g);
    for (const match of valueMatches) {
      if (!dataFlow.triggerInput.includes(match[1])) {
        dataFlow.triggerInput.push(match[1]);
      }
    }
  });

  // Analyze $OUTPUT dependencies
  stages.forEach(stage => {
    const stageData = JSON.stringify(stage.data);
    const outputMatches = stageData.matchAll(/\$OUTPUT#([^#]+)#([^#\s\|\)]+)/g);
    for (const match of outputMatches) {
      dataFlow.stageOutputs.push({
        consumer: stage.key,
        producer: match[1],
        field: match[2]
      });
    }
  });

  // Identify final outputs (NWRequest PATCH/POST, PBUpdateTask, etc.)
  stages.forEach(stage => {
    if (stage.name === 'NWRequest' && ['PATCH', 'POST', 'PUT'].includes(stage.data?.method)) {
      dataFlow.finalOutput.push({
        stage: stage.key,
        action: stage.data.method,
        target: stage.data.url
      });
    }
    if (stage.name === 'PBUpdateTask' || stage.name === 'PBChangeState') {
      dataFlow.finalOutput.push({
        stage: stage.key,
        action: stage.name,
        target: 'task'
      });
    }
  });

  return dataFlow;
}
```

### 5. Categorize COTLang usage

```javascript
function categorizeCOTLang(stages) {
  const usage = {
    $VALUE: [],
    $OUTPUT: [],
    $JOIN: [],
    $CODE: [],
    $ENV: [],
    $VAR: [],
    functions: []
  };

  stages.forEach(stage => {
    const stageData = JSON.stringify(stage.data);

    // Count each type
    const valueCount = (stageData.match(/\$VALUE/g) || []).length;
    const outputCount = (stageData.match(/\$OUTPUT/g) || []).length;
    const joinCount = (stageData.match(/\$JOIN/g) || []).length;
    const codeCount = (stageData.match(/\$CODE/g) || []).length;
    const envCount = (stageData.match(/\$ENV/g) || []).length;
    const varCount = (stageData.match(/\$VAR/g) || []).length;

    if (valueCount > 0) usage.$VALUE.push({ stage: stage.key, count: valueCount });
    if (outputCount > 0) usage.$OUTPUT.push({ stage: stage.key, count: outputCount });
    if (joinCount > 0) usage.$JOIN.push({ stage: stage.key, count: joinCount });
    if (codeCount > 0) usage.$CODE.push({ stage: stage.key, count: codeCount });
    if (envCount > 0) usage.$ENV.push({ stage: stage.key, count: envCount });
    if (varCount > 0) usage.$VAR.push({ stage: stage.key, count: varCount });

    // Find functions [find=>], [filter=>], etc.
    const funcMatches = stageData.matchAll(/\[([a-z]+)=>/g);
    for (const match of funcMatches) {
      const existing = usage.functions.find(f => f.name === match[1]);
      if (existing) {
        existing.count++;
      } else {
        usage.functions.push({ name: match[1], count: 1 });
      }
    }
  });

  return usage;
}
```

### 6. Generate Markdown documentation

```markdown
# Routine Documentation: ${metadata.name}

**ID**: ${metadata.id}
**Status**: ${metadata.isActive ? 'Active' : 'Inactive'}
**Generated**: ${new Date().toISOString()}

## Overview

- **Total Stages**: ${metadata.totalStages}
- **Network Requests**: ${metadata.networkRequests}
- **Loops**: ${metadata.loops}
- **Trigger Type**: ${metadata.triggerType}
- **Error Handling**: ${metadata.hasErrorHandling ? 'Yes' : 'No'}

## Flow Diagram

\`\`\`mermaid
${mermaidDiagram}
\`\`\`

## Stage Details

| Key | Type | Purpose | Dependencies |
|-----|------|---------|--------------|
${stages.map(s => `| ${s.key} | ${s.name} | ${inferPurpose(s)} | ${s.dependencies?.join(', ') || 'None'} |`).join('\n')}

## Data Flow

### Input (Trigger Context)

Datos que entran desde el trigger:
${dataFlow.triggerInput.map(field => `- \`$VALUE#${field}\``).join('\n')}

### Stage Dependencies

Cómo fluyen los datos entre stages:
${dataFlow.stageOutputs.map(d => `- \`${d.consumer}\` ← \`${d.producer}\` (field: \`${d.field}\`)`).join('\n')}

### Output Actions

Qué se actualiza/crea al final:
${dataFlow.finalOutput.map(o => `- \`${o.stage}\`: ${o.action} to ${o.target}`).join('\n')}

## COTLang Usage

### Commands

${Object.entries(cotlangUsage).filter(([k, v]) => k.startsWith('$')).map(([cmd, uses]) =>
  `- **${cmd}**: ${uses.reduce((sum, u) => sum + u.count, 0)} uses across ${uses.length} stages`
).join('\n')}

### Functions

${cotlangUsage.functions.map(f => `- **[${f.name}=>]**: ${f.count} uses`).join('\n')}

${includeAnalysis ? `
## Anti-patterns Detected

${generateAntiPatternSection(issues)}
` : ''}

## Stage Purposes (Inferred)

${stages.map(s => `
### ${s.key} (${s.name})

${inferDetailedPurpose(s)}
`).join('\n')}
```

### 7. Generate HTML (if requested)

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Routine Documentation: ${metadata.name}</title>
    <script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background: #f5f5f5;
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        h1 { color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 10px; }
        h2 { color: #34495e; margin-top: 30px; }
        .overview { background: #ecf0f1; padding: 15px; border-radius: 4px; }
        .overview-item { display: inline-block; margin-right: 20px; }
        table { border-collapse: collapse; width: 100%; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
        th { background: #3498db; color: white; }
        tr:nth-child(even) { background: #f9f9f9; }
        .stage-card { background: #fff; border-left: 4px solid #3498db; padding: 15px; margin: 10px 0; }
        .mermaid { background: white; padding: 20px; text-align: center; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Routine Documentation: ${metadata.name}</h1>

        <div class="overview">
            <div class="overview-item"><strong>Total Stages:</strong> ${metadata.totalStages}</div>
            <div class="overview-item"><strong>Network Requests:</strong> ${metadata.networkRequests}</div>
            <div class="overview-item"><strong>Loops:</strong> ${metadata.loops}</div>
        </div>

        <h2>Flow Diagram</h2>
        <div class="mermaid">
            ${mermaidDiagram}
        </div>

        <!-- More sections... -->
    </div>

    <script>
        mermaid.initialize({ startOnLoad: true });
    </script>
</body>
</html>
```

### 8. Generate JSON (if requested)

```json
{
  "routine": {
    "metadata": {
      "name": "...",
      "id": "...",
      "totalStages": 61,
      ...
    },
    "overview": { ... },
    "stages": [ ... ],
    "dataFlow": { ... },
    "cotlangUsage": { ... },
    "antiPatterns": [ ... ]
  }
}
```

### 9. Save to session

```javascript
import { createSession, saveToSession } from './src/utils/session-manager.js';

const session = createSession();

// Save input
saveToSession('input.json', routineContent, session);

// Save documentation in requested formats
if (format === 'md' || !format) {
  saveToSession('documentation.md', markdownDoc, session);
}
if (format === 'html') {
  saveToSession('documentation.html', htmlDoc, session);
}
if (format === 'json') {
  saveToSession('documentation.json', jsonDoc, session);
}

// If analysis included, save that too
if (includeAnalysis) {
  saveToSession('analysis.md', analysisDoc, session);
}
```

### 10. Display summary

```
✅ Documentación generada

Formato: Markdown ${htmlRequested ? '+ HTML' : ''} ${jsonRequested ? '+ JSON' : ''}

Contenido:
- Overview (stats, trigger type)
- Flow diagram (Mermaid)
- 61 stages documentados
- Data flow analysis
- COTLang usage (15 $VALUE, 32 $OUTPUT, 8 $JOIN)
${includeAnalysis ? '- Anti-patterns detectados (12 issues)' : ''}

Archivos guardados:
.sessions/latest/
- documentation.md${htmlRequested ? '\n- documentation.html' : ''}${jsonRequested ? '\n- documentation.json' : ''}

Ver documentación:
open .sessions/latest/documentation.${format || 'md'}
```

## Helper functions

### inferPurpose
Infer stage purpose from type and data:
```javascript
function inferPurpose(stage) {
  switch (stage.name) {
    case 'NWRequest':
      const method = stage.data?.method || 'GET';
      const url = stage.data?.url || '';
      if (method === 'GET') return `Fetch data from ${url}`;
      if (method === 'PATCH') return `Update data at ${url}`;
      if (method === 'POST') return `Create data at ${url}`;
      return `HTTP ${method} to ${url}`;

    case 'CCJS':
      return 'Execute custom JavaScript logic';

    case 'FCEach':
      const control = stage.data?.control || '';
      return `Iterate over ${control}`;

    case 'PBUpdateTask':
      return 'Update task data';

    case 'PBMessage':
      return 'Send message to channel';

    default:
      return stage.name;
  }
}
```

## Output structure

```
.sessions/TIMESTAMP/
├── documentation.md      # Markdown documentation
├── documentation.html    # HTML (if requested)
├── documentation.json    # JSON (if requested)
└── analysis.md           # Anti-pattern analysis (if --include-analysis)
```

## Important notes

- **Always include Mermaid diagrams** - they're super helpful
- **Infer purposes** from stage types and data
- **Categorize COTLang** - helps understand data usage
- **Explain data flow** - where data comes from and goes
- **Use templates** for consistent formatting
- **Include analysis** only if requested (keeps doc clean otherwise)
