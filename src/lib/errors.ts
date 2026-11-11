type DbError = { code?: string | null; message?: string | null; hint?: string | null } | null | undefined;

/** Converts a Supabase/Postgres error into a user-facing Hebrew message. */
export function dbErrorMessage(error: DbError, fallback = "אירעה שגיאה, נסו שוב"): string {
  if (!error) return fallback;
  const { code, message = "", hint } = error;
  if (hint === "last_admin" || message?.includes("at least one admin")) return "בצוות חייב להישאר לפחות מנהל אחד";
  if (hint === "field_inactive" || message?.includes("Field is not active")) return "השדה הזה כבר לא פעיל";
  switch (code) {
    case "23505":
      return "הרשומה כבר קיימת";
    case "23503":
      return "לא ניתן למחוק – קיימים דיווחים שמשויכים לפריט הזה";
    case "23514":
      return "הערך שהוזן לא עומד בדרישות";
    case "42501":
      return "אין לך הרשאה לבצע את הפעולה";
    case "PGRST116":
      return "הפריט לא נמצא";
    case "28000":
      return "יש להתחבר מחדש";
    default:
      return fallback;
  }
}
