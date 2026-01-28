/**
 * File Finder Utility
 * 
 * Finds routine files in the input directory.
 * Supports both .json and .js formats.
 */

import { existsSync } from 'fs';
import { join } from 'path';

/**
 * Find routine file in input directory
 * Checks for current.json first, then current.js
 * 
 * @param {string} baseDir - Base directory (default: routines/input)
 * @returns {string|null} - Path to found file, or null if none found
 */
export function findRoutineFile(baseDir = 'routines/input') {
  const candidates = [
    join(baseDir, 'current.json'),
    join(baseDir, 'current.js')
  ];

  for (const path of candidates) {
    if (existsSync(path)) {
      return path;
    }
  }

  return null;
}

/**
 * Get routine file or throw error with helpful message
 * 
 * @param {string} baseDir - Base directory (default: routines/input)
 * @returns {string} - Path to routine file
 * @throws {Error} - If no routine file found
 */
export function getRoutineFileOrThrow(baseDir = 'routines/input') {
  const file = findRoutineFile(baseDir);
  
  if (!file) {
    throw new Error(
      `No se encontró archivo de rutina en ${baseDir}/\n` +
      `Crea uno de estos archivos:\n` +
      `  - ${baseDir}/current.json (recomendado - export de MongoDB)\n` +
      `  - ${baseDir}/current.js (alternativo - formato JavaScript)\n\n` +
      `Ver ${baseDir}/README.md para instrucciones.`
    );
  }

  return file;
}
