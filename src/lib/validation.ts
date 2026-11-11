import { z } from "zod";

export const LIMITS = {
  teamName: 80,
  teamDescription: 500,
  fieldLabel: 60,
  fieldEmoji: 16,
  fieldPlaceholder: 200,
  entryContent: 2000,
} as const;

const trimmed = (max: number, requiredMessage: string, maxMessage: string) =>
  z
    .string({ error: requiredMessage })
    .trim()
    .min(1, { error: requiredMessage })
    .max(max, { error: maxMessage });

const optionalTrimmed = (max: number, maxMessage: string) =>
  z
    .string()
    .trim()
    .max(max, { error: maxMessage })
    .optional()
    .nullable()
    .transform((value) => (value ? value : null));

export const uuidSchema = z.uuid({ error: "מזהה לא תקין" });

export const teamSchema = z.object({
  name: trimmed(LIMITS.teamName, "יש להזין שם צוות", `שם הצוות יכול להכיל עד ${LIMITS.teamName} תווים`),
  description: optionalTrimmed(LIMITS.teamDescription, `התיאור יכול להכיל עד ${LIMITS.teamDescription} תווים`),
});

export const insightsVisibilitySchema = z.enum(["admins", "members"], { error: "ערך לא תקין" });
export const teamRoleSchema = z.enum(["admin", "member"], { error: "תפקיד לא תקין" });

export const fieldSchema = z.object({
  label: trimmed(LIMITS.fieldLabel, "יש להזין כותרת לשדה", `הכותרת יכולה להכיל עד ${LIMITS.fieldLabel} תווים`),
  emoji: z
    .string()
    .trim()
    .max(LIMITS.fieldEmoji, { error: "אימוג'י ארוך מדי" })
    .optional()
    .nullable()
    .transform((value) => (value ? value : "💬")),
  placeholder: optionalTrimmed(LIMITS.fieldPlaceholder, `טקסט העזר יכול להכיל עד ${LIMITS.fieldPlaceholder} תווים`),
});

export const entryContentSchema = trimmed(
  LIMITS.entryContent,
  "אי אפשר לשלוח דיווח ריק",
  `הדיווח יכול להכיל עד ${LIMITS.entryContent} תווים`,
);

export type TeamInput = z.infer<typeof teamSchema>;
export type FieldInput = z.infer<typeof fieldSchema>;

/** First validation message of a failed parse, for display. */
export function firstError(error: z.ZodError): string {
  return error.issues[0]?.message ?? "קלט לא תקין";
}

/** Public submission link token (64 hex chars). */
export const publicTokenSchema = z.string().regex(/^[0-9a-f]{32,128}$/, { error: "קישור לא תקין" });
