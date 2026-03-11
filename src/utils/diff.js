// src/utils/diff.js

/**
 * Returns an object describing the differences between two objects.
 * The returned object contains keys that changed, each with a `{ from, to }` pair.
 *
 * @param {object} before - The original object.
 * @param {object} after - The updated object.
 * @param {string[]} [keys] - Optional list of keys to compare. Defaults to all keys present on either object.
 */
export function diffObjects(before = {}, after = {}, keys) {
  const allKeys = keys
    ? keys
    : Array.from(new Set([...Object.keys(before || {}), ...Object.keys(after || {})]));

  const changes = {};

  allKeys.forEach((key) => {
    const prev = before?.[key];
    const next = after?.[key];

    // Treat objects as value-equal if their JSON representations match.
    const same = JSON.stringify(prev) === JSON.stringify(next);
    if (!same) {
      changes[key] = { from: prev, to: next };
    }
  });

  return changes;
}

export function formatChangesDescription(changes = {}) {
  const keys = Object.keys(changes);
  if (!keys.length) return '';

  const formatted = keys.map((key) => {
    const change = changes[key];
    if (change && typeof change === 'object' && 'from' in change && 'to' in change) {
      return `${key.replace(/_/g, ' ')} ${change.from} → ${change.to}`;
    }
    return `${key.replace(/_/g, ' ')} changed`;
  });

  return `Updated ${formatted.join(', ')}`;
}
