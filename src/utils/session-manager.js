/**
 * Session Manager Utility
 *
 * Manages optimization sessions - each optimization creates a new session directory
 * with timestamp. All generated files go there to keep root clean.
 */

import { mkdirSync, existsSync, writeFileSync, symlinkSync, unlinkSync, readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Sessions directory (hidden, at project root)
const SESSIONS_DIR = join(__dirname, '../../.sessions');

/**
 * Create a new optimization session
 * @returns {Object} Session info with directory path
 */
export function createSession() {
  // Create sessions directory if doesn't exist
  if (!existsSync(SESSIONS_DIR)) {
    mkdirSync(SESSIONS_DIR, { recursive: true });
  }

  // Generate timestamp-based session ID
  const timestamp = new Date().toISOString()
    .replace(/:/g, '-')
    .replace(/\..+/, '')
    .replace('T', '_');

  const sessionDir = join(SESSIONS_DIR, timestamp);

  // Create session directory
  mkdirSync(sessionDir, { recursive: true });

  // Update "latest" symlink
  const latestLink = join(SESSIONS_DIR, 'latest');
  if (existsSync(latestLink)) {
    unlinkSync(latestLink);
  }

  try {
    symlinkSync(timestamp, latestLink);
  } catch (error) {
    // Symlinks might fail on Windows, that's ok
    console.warn('Could not create "latest" symlink:', error.message);
  }

  return {
    id: timestamp,
    dir: sessionDir,
    isNew: true
  };
}

/**
 * Get the latest session directory
 * @returns {Object|null} Latest session info or null if none exists
 */
export function getLatestSession() {
  if (!existsSync(SESSIONS_DIR)) {
    return null;
  }

  const latestLink = join(SESSIONS_DIR, 'latest');

  if (existsSync(latestLink)) {
    const targetDir = join(SESSIONS_DIR, readFileSync(latestLink, 'utf-8'));
    if (existsSync(targetDir)) {
      return {
        id: readFileSync(latestLink, 'utf-8'),
        dir: targetDir,
        isNew: false
      };
    }
  }

  // Fallback: get most recent directory
  const sessions = readdirSync(SESSIONS_DIR)
    .filter(name => name !== 'latest' && !name.startsWith('.'))
    .sort()
    .reverse();

  if (sessions.length === 0) {
    return null;
  }

  return {
    id: sessions[0],
    dir: join(SESSIONS_DIR, sessions[0]),
    isNew: false
  };
}

/**
 * Get current session (latest) or create new one
 * @param {boolean} forceNew - Force creation of new session
 * @returns {Object} Session info
 */
export function getCurrentSession(forceNew = false) {
  if (forceNew) {
    return createSession();
  }

  const latest = getLatestSession();
  return latest || createSession();
}

/**
 * Save file to current session
 * @param {string} filename - Filename (relative to session dir)
 * @param {string} content - File content
 * @param {Object} session - Session object (optional, uses latest if not provided)
 */
export function saveToSession(filename, content, session = null) {
  const currentSession = session || getCurrentSession();
  const filePath = join(currentSession.dir, filename);

  // Create subdirectories if needed
  const fileDir = dirname(filePath);
  if (!existsSync(fileDir)) {
    mkdirSync(fileDir, { recursive: true });
  }

  writeFileSync(filePath, content, 'utf-8');

  return filePath;
}

/**
 * Get list of all sessions
 * @returns {Array} Array of session IDs (sorted newest first)
 */
export function listSessions() {
  if (!existsSync(SESSIONS_DIR)) {
    return [];
  }

  return readdirSync(SESSIONS_DIR)
    .filter(name => name !== 'latest' && !name.startsWith('.'))
    .sort()
    .reverse();
}

/**
 * Get session directory path
 * @param {string} sessionId - Session ID (timestamp)
 * @returns {string} Full path to session directory
 */
export function getSessionDir(sessionId) {
  return join(SESSIONS_DIR, sessionId);
}

/**
 * Create session README with metadata
 * @param {Object} session - Session object
 * @param {Object} metadata - Metadata about the optimization
 */
export function createSessionReadme(session, metadata = {}) {
  const content = `# Optimization Session: ${session.id}

## Metadata

- **Created**: ${new Date().toLocaleString()}
- **Original routine**: ${metadata.originalFile || 'routines/input/current.json'}
- **Total stages**: ${metadata.totalStages || 'N/A'}
- **Network requests**: ${metadata.networkRequests || 'N/A'}
- **Loops detected**: ${metadata.loops || 'N/A'}

## Files in this session

- \`input.json\` - Original routine (copy)
- \`optimized.json\` - Optimized routine
- \`analysis.md\` - Anti-pattern analysis
- \`changes.diff\` - Diff between original and optimized
- Additional files as generated during optimization

## How to use the optimized routine

1. Review \`optimized.json\`
2. Check \`analysis.md\` for details on changes
3. Test in a development environment
4. Import to MongoDB when ready

## Session directory

\`\`\`
${session.dir}
\`\`\`
`;

  saveToSession('README.md', content, session);
}

export default {
  createSession,
  getLatestSession,
  getCurrentSession,
  saveToSession,
  listSessions,
  getSessionDir,
  createSessionReadme
};
