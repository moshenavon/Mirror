/**
 * Achievements map: every member climbs the levels by sending entries.
 * Levels are ordered from the starting point (bottom of the map) upwards.
 * To add a level, append it here – everything else adapts.
 */
export type Level = {
  index: number;
  /** Entries needed to reach this level. */
  threshold: number;
  emoji: string;
  title: string;
  tagline: string;
  /** Shown when nobody reached the level yet. */
  emptyText: string;
};

export const LEVELS: readonly Level[] = [
  {
    index: 0,
    threshold: 0,
    emoji: "🥚",
    title: "ביצת הזינוק",
    tagline: "כולם מתחילים כאן. גם המלכים הכי גדולים היו פעם ביצה.",
    emptyText: "כולם כבר יצאו לדרך. הביצה ריקה!",
  },
  {
    index: 1,
    threshold: 10,
    emoji: "🐣",
    title: "גוזל המשוב",
    tagline: "בקעת! 10 דיווחים, והצוות כבר שומע ציוצים של תובנות.",
    emptyText: "עוד אף אחד לא בקע. מי יהיה הראשון?",
  },
  {
    index: 2,
    threshold: 25,
    emoji: "🕵️",
    title: "בלש התובנות",
    tagline: "שום דבר לא חומק מהעין שלך. אפילו לא הקפה שנגמר במטבחון.",
    emptyText: "התיק עדיין פתוח. דרוש בלש.",
  },
  {
    index: 3,
    threshold: 50,
    emoji: "🚀",
    title: "טייס הרטרו",
    tagline: "המראת לחלל התובנות. יוסטון, יש לנו רטרו!",
    emptyText: "החללית מתודלקת ומחכה לטייס.",
  },
  {
    index: 4,
    threshold: 100,
    emoji: "👑",
    title: "מלך הדיווחים",
    tagline: "מוביל את הצוות למקומות הכי טובים. כתר, גלימה, ותור משלך למיקרוגל.",
    emptyText: "הכתר מחכה לבעליו…",
  },
  {
    index: 5,
    threshold: 200,
    emoji: "🌟",
    title: "אגדת הרטרו",
    tagline: "200 דיווחים! מספרים עליך סיפורים במטבחון, והרטרו כבר לא נראה אותו דבר בלעדיך.",
    emptyText: "האגדה עוד לא נכתבה. מי יכתוב אותה?",
  },
];

/** The highest level reached with `count` entries. */
export function levelFor(count: number, levels: readonly Level[] = LEVELS): Level {
  let reached = levels[0];
  for (const level of levels) if (count >= level.threshold) reached = level;
  return reached;
}

export type Progress = {
  level: Level;
  /** null at the top level. */
  next: Level | null;
  /** Entries still missing for the next level (0 at the top). */
  remaining: number;
  /** 0..1 progress from the current level to the next one (1 at the top). */
  ratio: number;
};

export function progressFor(count: number, levels: readonly Level[] = LEVELS): Progress {
  const safe = Math.max(0, Math.floor(count));
  const level = levelFor(safe, levels);
  const next = levels[level.index + 1] ?? null;
  if (!next) return { level, next: null, remaining: 0, ratio: 1 };
  const span = next.threshold - level.threshold;
  return {
    level,
    next,
    remaining: next.threshold - safe,
    ratio: span > 0 ? (safe - level.threshold) / span : 1,
  };
}

export type Player = {
  email: string;
  name: string;
  avatarUrl: string | null;
  count: number;
  isMe: boolean;
};

export type AchievementInput = {
  member_email: string;
  full_name: string | null;
  avatar_url: string | null;
  entry_count: number;
  is_me: boolean;
};

export function toPlayer(row: AchievementInput): Player {
  return {
    email: row.member_email,
    name: row.full_name?.trim() || row.member_email.split("@")[0],
    avatarUrl: row.avatar_url,
    count: Math.max(0, row.entry_count),
    isMe: row.is_me,
  };
}

export type Station = { level: Level; players: Player[] };

const byRank = (a: Player, b: Player) => b.count - a.count || a.name.localeCompare(b.name, "he");

/** One station per level, from the start (index 0) upwards; players ranked by entry count. */
export function buildStations(players: readonly Player[], levels: readonly Level[] = LEVELS): Station[] {
  const stations: Station[] = levels.map((level) => ({ level, players: [] }));
  for (const player of players) stations[levelFor(player.count, levels).index].players.push(player);
  for (const station of stations) station.players.sort(byRank);
  return stations;
}

/** Motivating one-liner about the next goal. */
export function nextGoalText(progress: Progress, count: number): string {
  if (!progress.next) return "הגעת לפסגה! מעכשיו זה רשמי – אגדה 🌟";
  const missing = progress.remaining === 1 ? "עוד דיווח אחד" : `עוד ${progress.remaining} דיווחים`;
  if (count === 0) return `הדיווח הראשון הוא הכי קשה, אחר כך זה ממכר. ${missing} ל${progress.next.title} ${progress.next.emoji}`;
  return `${missing} ל${progress.next.title} ${progress.next.emoji}`;
}

export function thresholdLabel(level: Level): string {
  return level.threshold === 0 ? "נקודת ההתחלה" : `${level.threshold} דיווחים`;
}

export type Point = { x: number; y: number };

const round = (n: number) => Math.round(n * 10) / 10;

/**
 * SVG path of the winding trail that connects the level nodes, from the
 * starting point upwards. Between node i and node i+1 the trail runs
 * vertically, turns with rounded corners and crosses sideways at `gaps[i]`
 * (the y between the two rows), so it never runs across the station cards.
 */
export function trailPath(nodes: readonly Point[], gaps: readonly number[], radius = 22): string {
  if (nodes.length < 2) return "";
  const parts = [`M ${round(nodes[0].x)} ${round(nodes[0].y)}`];
  for (let i = 1; i < nodes.length; i++) {
    const from = nodes[i - 1];
    const to = nodes[i];
    const dx = to.x - from.x;
    const gap = gaps[i - 1] ?? (from.y + to.y) / 2;
    const r = Math.min(radius, Math.abs(dx) / 2, Math.abs(from.y - gap), Math.abs(gap - to.y));
    if (Math.abs(dx) < 1 || r <= 0) {
      parts.push(`L ${round(to.x)} ${round(to.y)}`);
      continue;
    }
    const sx = Math.sign(dx);
    const sy = Math.sign(to.y - from.y) || -1;
    parts.push(
      `L ${round(from.x)} ${round(gap - sy * r)}`,
      `Q ${round(from.x)} ${round(gap)} ${round(from.x + sx * r)} ${round(gap)}`,
      `L ${round(to.x - sx * r)} ${round(gap)}`,
      `Q ${round(to.x)} ${round(gap)} ${round(to.x)} ${round(gap + sy * r)}`,
      `L ${round(to.x)} ${round(to.y)}`,
    );
  }
  return parts.join(" ");
}
