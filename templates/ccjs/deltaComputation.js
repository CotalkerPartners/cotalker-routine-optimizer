/**
 * Delta Computation Template
 *
 * Computes the difference between incoming and current data using Set-based deduplication.
 * Only new items that don't exist in current set are returned.
 *
 * Benefits:
 * - O(1) membership testing (Set.has vs Array.includes O(n))
 * - Reduces payload size significantly
 * - Prevents duplicate additions
 *
 * Usage in CCJS:
 *   const delta = computeDelta(currentItems, incomingItems);
 */

const computeDelta = (current, incoming) => {
  // Normalize inputs to arrays
  const currentArray = Array.isArray(current) ? current : [];
  const incomingArray = Array.isArray(incoming) ? incoming : [];

  // Create Set for O(1) lookups
  const currentSet = new Set(currentArray);

  // Filter out items that already exist
  const delta = incomingArray.filter(id => {
    // Additional validation (optional)
    if (!id || typeof id !== 'string') return false;

    // Check if item is new
    return !currentSet.has(id);
  });

  return delta;
};

// Example usage in CCJS stage:
/*
const currentOSs = asset.schemaInstance.ordenes_de_servicio || [];
const incomingOSs = data.answerOS || [];

const delta = computeDelta(currentOSs, incomingOSs);

// Generate patches only for new items
const jsonPatch = delta.map(id => ({
  op: "add",
  path: "/schemaInstance/ordenes_de_servicio/-",
  value: id
}));

return {
  jsonPatch,
  itemsToUpdate: delta  // Only new items
};
*/

// Advanced: Compute delta with removal detection
const computeDeltaWithRemoval = (current, incoming) => {
  const currentArray = Array.isArray(current) ? current : [];
  const incomingArray = Array.isArray(incoming) ? incoming : [];

  const currentSet = new Set(currentArray);
  const incomingSet = new Set(incomingArray);

  // Items to add (in incoming but not in current)
  const toAdd = incomingArray.filter(id => !currentSet.has(id));

  // Items to remove (in current but not in incoming)
  const toRemove = currentArray.reduce((acc, id, index) => {
    if (!incomingSet.has(id)) {
      acc.unshift(index);  // Add to front (reverse order for removal)
    }
    return acc;
  }, []);

  return { toAdd, toRemove };
};

// Example with removal:
/*
const { toAdd, toRemove } = computeDeltaWithRemoval(currentOSs, incomingOSs);

const jsonPatch = [];

// Add new items
toAdd.forEach(id => {
  jsonPatch.push({ op: "add", path: "/path/-", value: id });
});

// Remove items (indices in reverse order)
toRemove.forEach(idx => {
  jsonPatch.push({ op: "remove", path: `/path/${idx}` });
});
*/
