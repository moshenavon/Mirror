"use server";

import { refresh } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/data";
import { dbErrorMessage } from "@/lib/errors";
import { entryContentSchema, firstError, uuidSchema } from "@/lib/validation";
import { fail, ok, type ActionResult } from "@/lib/action-result";

export async function createEntry(
  teamId: string,
  fieldId: string,
  content: string,
  anonymous = false,
): Promise<ActionResult> {
  await getCurrentUser();
  if (!uuidSchema.safeParse(teamId).success || !uuidSchema.safeParse(fieldId).success) return fail("שדה לא תקין");
  const parsed = entryContentSchema.safeParse(content);
  if (!parsed.success) return fail(firstError(parsed.error));

  const supabase = await createClient();
  // Anonymous entries are written by a database function that stores no author at all.
  const { error } = anonymous
    ? await supabase.rpc("submit_anonymous_entry", { p_team_id: teamId, p_field_id: fieldId, p_content: parsed.data })
    : await supabase.from("entries").insert({ team_id: teamId, field_id: fieldId, content: parsed.data });
  if (error) return fail(dbErrorMessage(error, "שליחת הדיווח נכשלה"));
  refresh();
  return ok();
}

export async function updateEntry(entryId: string, fieldId: string, content: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!uuidSchema.safeParse(entryId).success || !uuidSchema.safeParse(fieldId).success) return fail("דיווח לא תקין");
  const parsed = entryContentSchema.safeParse(content);
  if (!parsed.success) return fail(firstError(parsed.error));

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("entries")
    .update({ content: parsed.data, field_id: fieldId })
    .eq("id", entryId)
    .eq("author_id", user.id)
    .select("id");
  if (error) return fail(dbErrorMessage(error, "שמירת הדיווח נכשלה"));
  if (!data?.length) return fail("הדיווח לא נמצא");
  refresh();
  return ok();
}

export async function deleteEntry(entryId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!uuidSchema.safeParse(entryId).success) return fail("דיווח לא תקין");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("entries")
    .delete()
    .eq("id", entryId)
    .eq("author_id", user.id)
    .select("id");
  if (error) return fail(dbErrorMessage(error, "מחיקת הדיווח נכשלה"));
  if (!data?.length) return fail("הדיווח לא נמצא");
  refresh();
  return ok();
}
