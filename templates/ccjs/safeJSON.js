/**
 * Safe JSON Parser Template
 *
 * Handles multiple input formats without throwing errors:
 * - null/undefined → returns default
 * - stringified JSON (single or double) → parses
 * - already parsed object/array → returns as-is
 *
 * Usage in CCJS:
 *   const safeJSON = (val, def) => { ... };
 *   const data = safeJSON(input, []);
 */

const safeJSON = (val, def) => {
  if (val == null) return def;

  if (typeof val === "string") {
    const s = val.trim();
    if (s === "" || s === "null" || s === "undefined") return def;

    try {
      return JSON.parse(s);
    } catch {
      return def;
    }
  }

  if (Array.isArray(val) || typeof val === "object") {
    return val;
  }

  return def;
};

// Example usage:
// const lista = safeJSON(data.lista_precios, []);
// const config = safeJSON(data.configuration, {});
