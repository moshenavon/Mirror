/** Copy for the preview shown when a public link is shared (WhatsApp, Slack…). */
export type SharedLink = {
  team_name: string;
  requires_identity?: boolean;
  allow_join?: boolean;
};

export type ShareCopy = {
  /** Small badge above the team name. */
  kicker: string;
  title: string;
  /** One or two short sentences about what the link is for. */
  description: string;
};

export function shareCopy(link: SharedLink | null): ShareCopy {
  if (!link) {
    return {
      kicker: "Mirror",
      title: "Mirror",
      description: "מחשבות ותובנות של הצוות, מסודרות לפגישת הרטרו.",
    };
  }
  const team = link.team_name.trim();
  if (link.allow_join) {
    return {
      kicker: "הזמנה להצטרף לצוות",
      title: team,
      description: "הצטרפו לצוות ב-Mirror ושתפו מחשבות ותובנות לקראת פגישת הרטרו.",
    };
  }
  return {
    kicker: link.requires_identity ? "קישור לדיווח לצוות" : "קישור לדיווח אנונימי לצוות",
    title: team,
    description: link.requires_identity
      ? "בקישור הזה אפשר לדווח לצוות מחשבות ותובנות לקראת פגישת הרטרו."
      : "בקישור הזה אפשר לדווח לצוות מחשבות ותובנות לקראת פגישת הרטרו – בלי שם ובלי הזדהות.",
  };
}

/** Page title used in the link preview. */
export function shareTitle(link: SharedLink | null): string {
  if (!link) return "Mirror";
  const team = link.team_name.trim();
  // "צוות הפיתוח" → "הצטרפו לצוות הפיתוח", not "לצוות צוות הפיתוח".
  const target = /^צוות\s/.test(team) ? team : `צוות ${team}`;
  return link.allow_join ? `הצטרפו ל${target}` : `דיווח ל${target}`;
}
