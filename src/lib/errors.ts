type DbError = { code?: string | null; message?: string | null; hint?: string | null } | null | undefined;

/** Converts a Supabase/Postgres error into a user-facing Hebrew message. */
export function dbErrorMessage(error: DbError, fallback = "אירעה שגיאה, נסו שוב"): string {
  if (!error) return fallback;
  const { code, message = "", hint } = error;
  if (hint === "last_admin" || message?.includes("at least one admin")) return "בצוות חייב להישאר לפחות מנהל אחד";
  if (hint === "field_inactive" || message?.includes("Field is not active")) return "השדה הזה כבר לא פעיל";
  if (hint === "link_disabled" || message?.includes("Public link is disabled")) return "הקישור הזה כבר לא פעיל";
  if (hint === "join_disabled" || message?.includes("Joining through this link is disabled")) return "ההצטרפות לצוות דרך הקישור הזה לא פעילה";
  if (hint === "identity_required" || message?.includes("Sign-in required")) return "כדי לדווח בקישור הזה צריך להתחבר עם Google";
  if (hint === "entry_not_found" || message?.includes("Entry not found")) return "הדיווח לא נמצא";
  if (hint === "action_item_not_found" || message?.includes("Action item not found")) return "המשימה לא נמצאה";
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
