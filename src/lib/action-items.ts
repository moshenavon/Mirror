/** An action item as shown in the UI (insight fields are null when the viewer may not see insights). */
export type ActionItem = {
  id: string;
  title: string;
  entryId: string | null;
  fieldLabel: string | null;
  fieldEmoji: string | null;
  sourceContent: string | null;
  createdAt: string;
  createdByName: string | null;
  doneAt: string | null;
  doneByName: string | null;
  canDelete: boolean;
};

export const isDone = (item: Pick<ActionItem, "doneAt">): boolean => item.doneAt !== null;

/**
 * Open items first (newest first), then done items in completion order –
 * the most recently completed item is always last. Mirrors get_action_items().
 */
export function sortActionItems<T extends Pick<ActionItem, "id" | "createdAt" | "doneAt">>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => {
    if (a.doneAt === null && b.doneAt === null) return b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id);
    if (a.doneAt === null) return -1;
    if (b.doneAt === null) return 1;
    return a.doneAt.localeCompare(b.doneAt) || a.id.localeCompare(b.id);
  });
}

/** Marks an item done / not done locally (optimistic update) and re-sorts the list. */
export function applyDone<T extends ActionItem>(
  items: readonly T[],
  id: string,
  done: boolean,
  now = new Date().toISOString(),
  doneByName: string | null = null,
): T[] {
  return sortActionItems(
    items.map((item) =>
      item.id !== id || isDone(item) === done
        ? item
        : { ...item, doneAt: done ? now : null, doneByName: done ? doneByName : null },
    ),
  );
}

/** Action items grouped by the insight (entry) they were created from. */
export function groupByEntry<T extends Pick<ActionItem, "entryId">>(items: readonly T[]): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    if (!item.entryId) continue;
    const list = map.get(item.entryId);
    if (list) list.push(item);
    else map.set(item.entryId, [item]);
  }
  return map;
}

export function actionItemsLabel(count: number): string {
  return count === 1 ? "משימה אחת" : `${count} משימות`;
}
