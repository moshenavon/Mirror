/** Returns a copy of `items` with the item at `index` moved one step up (-1) or down (+1). */
export function moveItem<T>(items: readonly T[], index: number, direction: -1 | 1): T[] {
  const target = index + direction;
  if (index < 0 || index >= items.length || target < 0 || target >= items.length) return [...items];
  const copy = [...items];
  [copy[index], copy[target]] = [copy[target], copy[index]];
  return copy;
}

/** Next position value for a new field appended to the end. */
export function nextPosition(fields: readonly { position: number }[]): number {
  return fields.reduce((max, f) => Math.max(max, f.position), 0) + 1;
}

export function sortByPosition<T extends { position: number }>(fields: readonly T[]): T[] {
  return [...fields].sort((a, b) => a.position - b.position);
}
