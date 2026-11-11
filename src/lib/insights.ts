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
  /** No author is stored for anonymous entries. */
  is_anonymous: boolean;
  author_id: string | null;
  author_name: string | null;
  author_email: string | null;
  author_avatar_url: string | null;
};

export const ANONYMOUS_NAME = "אנונימי";

/** How the retro walks through the entries. */
export type PresentationOrder = "fields" | "reporters";

/** Who wrote a group of entries. All anonymous entries form a single group. */
export type Reporter = {
  key: string;
  name: string;
  avatarUrl: string | null;
  anonymous: boolean;
};

export type SectionItem = { field: InsightField; entry: InsightEntry };

/**
 * A group of slides: either all entries of one field (ordered by time),
 * or all entries of one reporter (ordered by field position, then time).
 */
export type InsightSection =
  | { kind: "field"; key: string; field: InsightField; items: SectionItem[] }
  | { kind: "reporter"; key: string; reporter: Reporter; items: SectionItem[] };

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

export const ANONYMOUS_KEY = "anonymous";

export function reporterOf(entry: InsightEntry): Reporter {
  if (entry.is_anonymous || !entry.author_email) {
    return { key: ANONYMOUS_KEY, name: ANONYMOUS_NAME, avatarUrl: null, anonymous: true };
  }
  return {
    key: entry.author_id ?? entry.author_email,
    name: displayName(entry),
    avatarUrl: entry.author_avatar_url,
    anonymous: false,
  };
}

/**
 * Groups entries for the retro.
 * - "fields" (default): one section per field in the admin-defined order; entries by creation time.
 * - "reporters": one section per reporter (alphabetical, anonymous last); inside, entries follow
 *   the field order and then creation time.
 * Empty groups are skipped and entries of unknown fields are ignored.
 */
export function buildSections(
  fields: InsightField[],
  entries: InsightEntry[],
  order: PresentationOrder = "fields",
): InsightSection[] {
  const sortedFields = [...fields].sort(byPosition);
  const rank = new Map(sortedFields.map((f, i) => [f.id, i]));
  const items: SectionItem[] = entries
    .filter((entry) => rank.has(entry.field_id))
    .map((entry) => ({ entry, field: sortedFields[rank.get(entry.field_id)!] }));

  if (order === "fields") {
    return sortedFields
      .map((field) => ({
        kind: "field" as const,
        key: field.id,
        field,
        items: items.filter((i) => i.field.id === field.id).sort((a, b) => byCreated(a.entry, b.entry)),
      }))
      .filter((section) => section.items.length > 0);
  }

  const groups = new Map<string, { reporter: Reporter; items: SectionItem[] }>();
  for (const item of items) {
    const reporter = reporterOf(item.entry);
    const group = groups.get(reporter.key);
    if (group) group.items.push(item);
    else groups.set(reporter.key, { reporter, items: [item] });
  }
  return [...groups.values()]
    .sort(
      (a, b) =>
        Number(a.reporter.anonymous) - Number(b.reporter.anonymous) ||
        a.reporter.name.localeCompare(b.reporter.name, "he") ||
        a.reporter.key.localeCompare(b.reporter.key),
    )
    .map(({ reporter, items: list }) => ({
      kind: "reporter" as const,
      key: reporter.key,
      reporter,
      items: [...list].sort(
        (a, b) => rank.get(a.field.id)! - rank.get(b.field.id)! || byCreated(a.entry, b.entry),
      ),
    }));
}

/** Emoji/avatar-less label of a section, e.g. for the jump menu. */
export function sectionLabel(section: InsightSection): string {
  return section.kind === "field" ? `${section.field.emoji} ${section.field.label}` : section.reporter.name;
}

export function flattenSlides(sections: InsightSection[]): Slide[] {
  const slides: Slide[] = [];
  sections.forEach((section, sectionIndex) => {
    section.items.forEach(({ entry, field }, indexInSection) => {
      slides.push({
        index: slides.length,
        sectionIndex,
        indexInSection,
        sectionSize: section.items.length,
        field,
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
    acc += section.items.length;
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

export function displayName(
  entry: Pick<InsightEntry, "author_name" | "author_email"> & { is_anonymous?: boolean },
): string {
  if (entry.is_anonymous || !entry.author_email) return entry.author_name?.trim() || ANONYMOUS_NAME;
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
