"use server";

import { createAnonClient } from "@/lib/supabase/server";
import { dbErrorMessage } from "@/lib/errors";
import { entryContentSchema, firstError, publicTokenSchema, uuidSchema } from "@/lib/validation";
import { fail, ok, type ActionResult } from "@/lib/action-result";

/** Submission through a team's public link. Always anonymous; no sign-in needed. */
export async function submitPublicEntry(token: string, fieldId: string, content: string): Promise<ActionResult> {
  if (!publicTokenSchema.safeParse(token).success) return fail("הקישור אינו תקין");
  if (!uuidSchema.safeParse(fieldId).success) return fail("שדה לא תקין");
  const parsed = entryContentSchema.safeParse(content);
  if (!parsed.success) return fail(firstError(parsed.error));

  const { error } = await createAnonClient().rpc("submit_public_entry", {
    p_token: token,
    p_field_id: fieldId,
    p_content: parsed.data,
  });
  if (error) return fail(dbErrorMessage(error, "שליחת הדיווח נכשלה"));
  return ok();
}
