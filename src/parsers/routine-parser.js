/**
 * Routine Parser
 *
 * Parses Cotalker bot routine files (trigger_*.js) and extracts:
 * - Survey triggers configuration
 * - Stage definitions
 * - Stage routing (next field)
 * - Data dependencies between stages
 */

import { readFileSync } from 'fs';
import { parse } from 'acorn';

/**
 * Parse a Cotalker routine file
 * @param {string} filePath - Path to routine file
 * @returns {Object} Parsed routine object
 */
export function parseRoutineFile(filePath) {
  try {
    const content = readFileSync(filePath, 'utf-8');
    return parseRoutineContent(content);
  } catch (error) {
    throw new Error(`Failed to read routine file: ${error.message}`);
  }
}

/**
 * Parse routine content (file contents as string)
 * @param {string} content - File content
 * @returns {Object} Parsed routine object
 */
export function parseRoutineContent(content) {
  try {
    let routineObj;

    // Try to extract module.exports first
    const exportsMatch = content.match(/module\.exports\s*=\s*(\{[\s\S]*\});?\s*$/m);

    if (exportsMatch) {
      // Module exports format
      routineObj = evalJavaScriptObject(exportsMatch[1]);
    } else {
      // Try direct JSON parse (MongoDB dump format)
      routineObj = parseMongoDBJSON(content);
    }

    return {
      raw: routineObj,
      surveyTriggers: extractSurveyTriggers(routineObj),
      metadata: extractMetadata(routineObj)
    };
  } catch (error) {
    throw new Error(`Failed to parse routine content: ${error.message}`);
  }
}

/**
 * Extract survey triggers from routine object
 * @param {Object} routineObj - Raw routine object
 * @returns {Array} Array of survey trigger configurations
 */
function extractSurveyTriggers(routineObj) {
  const surveyTriggers = routineObj.surveyTriggers || [];

  return surveyTriggers.map(st => {
    const triggers = st.triggers || [];

    return triggers.map(trigger => {
      const stages = trigger.stages || [];

      return {
        version: trigger.version,
        start: trigger.start,
        stages: stages.map(parseStage),
        stageMap: buildStageMap(stages),
        graph: buildStageGraph(stages, trigger.start)
      };
    });
  }).flat();
}

/**
 * Parse individual stage
 * @param {Object} stage - Raw stage object
 * @returns {Object} Parsed stage
 */
function parseStage(stage) {
  return {
    key: stage.key,
    name: stage.name,
    data: stage.data || {},
    next: stage.next || {},
    // Extract COTLang expressions from data
    expressions: extractCOTLangExpressions(stage.data),
    // Determine stage dependencies
    dependencies: extractDependencies(stage.data)
  };
}

/**
 * Build a map of stage key -> stage object
 * @param {Array} stages - Array of stages
 * @returns {Map} Stage map
 */
function buildStageMap(stages) {
  const map = new Map();

  stages.forEach(stage => {
    map.set(stage.key, stage);
  });

  return map;
}

/**
 * Build dependency graph of stages
 * @param {Array} stages - Array of stages
 * @param {string} startKey - Starting stage key
 * @returns {Object} Graph with adjacency list and reverse dependencies
 */
function buildStageGraph(stages, startKey) {
  const adjacencyList = new Map();  // stage -> [next stages]
  const reverseDeps = new Map();    // stage -> [prev stages]
  const stageMap = new Map();

  // Initialize maps
  stages.forEach(stage => {
    adjacencyList.set(stage.key, []);
    reverseDeps.set(stage.key, []);
    stageMap.set(stage.key, stage);
  });

  // Build edges
  stages.forEach(stage => {
    const nextStages = extractNextStages(stage.next);

    nextStages.forEach(nextKey => {
      if (stageMap.has(nextKey)) {
        adjacencyList.get(stage.key).push(nextKey);
        reverseDeps.get(nextKey).push(stage.key);
      }
    });
  });

  return {
    start: startKey,
    adjacencyList,
    reverseDeps,
    stageMap,
    getStage: (key) => stageMap.get(key),
    getNextStages: (key) => adjacencyList.get(key) || [],
    getPrevStages: (key) => reverseDeps.get(key) || [],
    hasStage: (key) => stageMap.has(key)
  };
}

/**
 * Extract next stage keys from next field
 * @param {Object} next - Next field object
 * @returns {Array} Array of next stage keys
 */
function extractNextStages(next) {
  if (!next || typeof next !== 'object') return [];

  const nextStages = [];

  Object.values(next).forEach(val => {
    if (typeof val === 'string' && val !== '') {
      nextStages.push(val);
    }
  });

  return nextStages;
}

/**
 * Extract COTLang expressions from stage data
 * @param {Object} data - Stage data object
 * @returns {Array} Array of found COTLang expressions
 */
function extractCOTLangExpressions(data) {
  const expressions = [];

  function traverse(obj, path = []) {
    if (typeof obj === 'string') {
      // Check if string contains COTLang commands
      if (obj.includes('$VALUE') || obj.includes('$OUTPUT') ||
          obj.includes('$JOIN') || obj.includes('$CODE') ||
          obj.includes('$ENV') || obj.includes('$$TIME')) {
        expressions.push({
          expression: obj,
          path: path.join('.')
        });
      }
    } else if (typeof obj === 'object' && obj !== null) {
      Object.entries(obj).forEach(([key, value]) => {
        traverse(value, [...path, key]);
      });
    }
  }

  traverse(data);
  return expressions;
}

/**
 * Extract stage dependencies (upstream stages referenced via $OUTPUT)
 * @param {Object} data - Stage data object
 * @returns {Array} Array of stage keys this stage depends on
 */
function extractDependencies(data) {
  const deps = new Set();

  function traverse(obj) {
    if (typeof obj === 'string') {
      // Match $OUTPUT#stage_key#...
      const matches = obj.matchAll(/\$OUTPUT#([^#|]+)/g);
      for (const match of matches) {
        deps.add(match[1]);
      }
    } else if (typeof obj === 'object' && obj !== null) {
      Object.values(obj).forEach(traverse);
    }
  }

  traverse(data);
  return Array.from(deps);
}

/**
 * Extract metadata from routine
 * @param {Object} routineObj - Raw routine object
 * @returns {Object} Metadata
 */
function extractMetadata(routineObj) {
  return {
    name: routineObj.name || 'Unknown',
    id: routineObj._id || null,
    channel: routineObj.channel || null,
    group: routineObj.group || null,
    isActive: routineObj.isActive !== false
  };
}

/**
 * Safely evaluate JavaScript object literal
 * (Fallback for when JSON.parse fails)
 * @param {string} code - JavaScript object code
 * @returns {Object} Parsed object
 */
function evalJavaScriptObject(code) {
  try {
    // Try JSON.parse first
    return JSON.parse(code);
  } catch {
    // Fallback: eval (CAREFUL - only use with trusted code)
    // eslint-disable-next-line no-eval
    return eval('(' + code + ')');
  }
}

/**
 * Parse MongoDB JSON format (with ObjectId, NumberInt, etc.)
 * @param {string} content - MongoDB JSON content
 * @returns {Object} Parsed object
 */
function parseMongoDBJSON(content) {
  // Replace MongoDB extended JSON types with regular values
  let cleaned = content;

  // ObjectId("...") → "..."
  cleaned = cleaned.replace(/ObjectId\("([^"]+)"\)/g, '"$1"');

  // NumberInt(...) → ...
  cleaned = cleaned.replace(/NumberInt\((\d+)\)/g, '$1');

  // NumberLong(...) → ...
  cleaned = cleaned.replace(/NumberLong\((\d+)\)/g, '$1');

  // ISODate("...") → "..."
  cleaned = cleaned.replace(/ISODate\("([^"]+)"\)/g, '"$1"');

  try {
    return JSON.parse(cleaned);
  } catch (error) {
    throw new Error(`Failed to parse MongoDB JSON: ${error.message}`);
  }
}

/**
 * Get all stages in loop body (for FCEach analysis)
 * @param {Object} graph - Stage graph
 * @param {string} loopStageKey - FCEach stage key
 * @returns {Array} Stages inside loop
 */
export function getLoopBody(graph, loopStageKey) {
  const loopStage = graph.getStage(loopStageKey);
  if (!loopStage || loopStage.name !== 'FCEach') {
    return [];
  }

  const stepStage = loopStage.next?.STEP;
  const doneStage = loopStage.next?.DONE;

  if (!stepStage) return [];

  const bodyStages = [];
  const visited = new Set();
  const queue = [stepStage];

  // BFS to find all stages between STEP and DONE
  while (queue.length > 0) {
    const current = queue.shift();

    // Stop if we've reached DONE or already visited
    if (current === doneStage || visited.has(current)) continue;

    visited.add(current);
    const stage = graph.getStage(current);

    if (stage) {
      bodyStages.push(stage);

      // Add next stages to queue
      const nextStages = graph.getNextStages(current);
      queue.push(...nextStages);
    }
  }

  return bodyStages;
}

/**
 * Find all loops in routine
 * @param {Object} graph - Stage graph
 * @returns {Array} Array of loop stage keys
 */
export function findLoops(graph) {
  const loops = [];

  graph.stageMap.forEach((stage, key) => {
    if (stage.name === 'FCEach') {
      loops.push(key);
    }
  });

  return loops;
}

/**
 * Find all NWRequest stages
 * @param {Object} graph - Stage graph
 * @returns {Array} Array of NWRequest stage keys
 */
export function findNetworkRequests(graph) {
  const requests = [];

  graph.stageMap.forEach((stage, key) => {
    if (stage.name === 'NWRequest') {
      requests.push(key);
    }
  });

  return requests;
}

/**
 * Find upstream stages (all stages that come before target)
 * @param {Object} graph - Stage graph
 * @param {string} targetKey - Target stage key
 * @returns {Array} Array of upstream stage keys
 */
export function findUpstreamStages(graph, targetKey) {
  const upstream = new Set();
  const queue = [...graph.getPrevStages(targetKey)];

  while (queue.length > 0) {
    const current = queue.shift();

    if (!upstream.has(current)) {
      upstream.add(current);
      queue.push(...graph.getPrevStages(current));
    }
  }

  return Array.from(upstream);
}
