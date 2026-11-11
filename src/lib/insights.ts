export type InsightField = {
  id: string;
  label: string;
  emoji: string;
  position: number;
};

export type InsightEntry = {
  entry_id: string;
  field_id: string;
  content: string;
  created_at: string;
  author_id: string;
  author_name: string | null;
  author_email: string;
  author_avatar_url: string | null;
};

export type InsightSection = {
  field: InsightField;
  entries: InsightEntry[];
};

export type Slide = {
  /** Global index across all sections. */
  index: number;
  sectionIndex: number;
  /** 0-based index within the section. */
  indexInSection: number;
  sectionSize: number;
  field: InsightField;
  entry: InsightEntry;
};

const byPosition = (a: InsightField, b: InsightField) => a.position - b.position || a.label.localeCompare(b.label);
const byCreated = (a: InsightEntry, b: InsightEntry) =>
  a.created_at.localeCompare(b.created_at) || a.entry_id.localeCompare(b.entry_id);

/**
 * Groups entries by field following the admin-defined field order.
 * Fields without entries are skipped; entries are ordered by creation time.
 * Entries of unknown fields are ignored.
 */
export function buildSections(fields: InsightField[], entries: InsightEntry[]): InsightSection[] {
  const grouped = new Map<string, InsightEntry[]>();
  for (const entry of entries) {
    const list = grouped.get(entry.field_id);
    if (list) list.push(entry);
    else grouped.set(entry.field_id, [entry]);
  }
  return [...fields]
    .sort(byPosition)
    .map((field) => ({ field, entries: [...(grouped.get(field.id) ?? [])].sort(byCreated) }))
    .filter((section) => section.entries.length > 0);
}

export function flattenSlides(sections: InsightSection[]): Slide[] {
  const slides: Slide[] = [];
  sections.forEach((section, sectionIndex) => {
    section.entries.forEach((entry, indexInSection) => {
      slides.push({
        index: slides.length,
        sectionIndex,
        indexInSection,
        sectionSize: section.entries.length,
        field: section.field,
        entry,
      });
    });
  });
  return slides;
}

/** Index of the first slide of each section. */
export function sectionStarts(sections: InsightSection[]): number[] {
  const starts: number[] = [];
  let acc = 0;
  for (const section of sections) {
    starts.push(acc);
    acc += section.entries.length;
  }
  return starts;
}

/** Number of entries per field id (all fields present, zero when empty). */
export function countByField(fields: InsightField[], entries: InsightEntry[]): Record<string, number> {
  const counts: Record<string, number> = Object.fromEntries(fields.map((f) => [f.id, 0]));
  for (const entry of entries) {
    if (entry.field_id in counts) counts[entry.field_id] += 1;
  }
  return counts;
}

export function displayName(entry: Pick<InsightEntry, "author_name" | "author_email">): string {
  return entry.author_name?.trim() || entry.author_email.split("@")[0];
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = Array.from(parts[0])[0] ?? "";
  const second = parts.length > 1 ? (Array.from(parts[parts.length - 1])[0] ?? "") : "";
  return (first + second).toUpperCase();
}

/**
 * Presenter state machine.
 * - "intro": before the first slide
 * - "slide": showing slides[index]
 * - "transition": between section `index`'s last slide and the next section
 * - "done": after the last slide
 */
export type PresenterState =
  | { kind: "intro" }
  | { kind: "slide"; index: number }
  | { kind: "transition"; fromSection: number }
  | { kind: "done" };

export function nextState(state: PresenterState, slides: Slide[]): PresenterState {
  if (slides.length === 0) return { kind: "done" };
  switch (state.kind) {
    case "intro":
      return { kind: "slide", index: 0 };
    case "slide": {
      const current = slides[state.index];
      const next = slides[state.index + 1];
      if (!next) return { kind: "done" };
      if (next.sectionIndex !== current.sectionIndex) return { kind: "transition", fromSection: current.sectionIndex };
      return { kind: "slide", index: state.index + 1 };
    }
    case "transition": {
      const first = slides.find((s) => s.sectionIndex === state.fromSection + 1);
      return first ? { kind: "slide", index: first.index } : { kind: "done" };
    }
    case "done":
      return state;
  }
}

export function prevState(state: PresenterState, slides: Slide[]): PresenterState {
  if (slides.length === 0) return { kind: "intro" };
  switch (state.kind) {
    case "intro":
      return state;
    case "slide": {
      if (state.index === 0) return { kind: "intro" };
      const current = slides[state.index];
      const prev = slides[state.index - 1];
      if (prev.sectionIndex !== current.sectionIndex) return { kind: "transition", fromSection: prev.sectionIndex };
      return { kind: "slide", index: state.index - 1 };
    }
    case "transition": {
      const lastOfSection = [...slides].reverse().find((s) => s.sectionIndex === state.fromSection);
      return lastOfSection ? { kind: "slide", index: lastOfSection.index } : { kind: "intro" };
    }
    case "done":
      return { kind: "slide", index: slides.length - 1 };
  }
}

/** "דיווח אחד" / "3 דיווחים" */
export function entriesLabel(count: number): string {
  return count === 1 ? "דיווח אחד" : `${count} דיווחים`;
}
