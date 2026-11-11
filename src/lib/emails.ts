const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(normalizeEmail(email));
}

export type ParsedEmails = {
  /** Unique, lower-cased, valid addresses in input order. */
  valid: string[];
  /** Tokens that are not valid e-mail addresses (as typed). */
  invalid: string[];
};

/**
 * Parses free text containing one or many e-mail addresses separated by
 * commas, semicolons, whitespace or new lines. Accepts the
 * `Name <email@domain>` form too.
 */
export function parseEmailList(input: string): ParsedEmails {
  const valid: string[] = [];
  const invalid: string[] = [];
  const seen = new Set<string>();

  const tokens = input
    .replace(/[<>]/g, " ")
    .split(/[\s,;]+/)
    .map((token) => token.trim().replace(/^["']|["']$/g, ""))
    .filter(Boolean);

  for (const token of tokens) {
    if (!token.includes("@")) {
      // Parts of a display name ("Moshe Navon <...>") are ignored silently
      // unless the whole input has no address at all.
      continue;
    }
    const email = normalizeEmail(token);
    if (!EMAIL_RE.test(email)) {
      invalid.push(token);
      continue;
    }
    if (!seen.has(email)) {
      seen.add(email);
      valid.push(email);
    }
  }

  return { valid, invalid };
}
