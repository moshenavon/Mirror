"use server";

import { refresh } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/data";
import { dbErrorMessage } from "@/lib/errors";
import { actionItemTitleSchema, firstError, uuidSchema } from "@/lib/validation";
import { fail, ok, type ActionResult } from "@/lib/action-result";

/** Creates a follow-up task for the team from an insight (entry). */
export async function createActionItem(teamId: string, entryId: string, title: string): Promise<ActionResult> {
  await getCurrentUser();
  if (!uuidSchema.safeParse(teamId).success || !uuidSchema.safeParse(entryId).success) return fail("דיווח לא תקין");
  const parsed = actionItemTitleSchema.safeParse(title);
  if (!parsed.success) return fail(firstError(parsed.error));

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_action_item", {
    p_team_id: teamId,
    p_entry_id: entryId,
    p_title: parsed.data,
  });
  if (error) return fail(dbErrorMessage(error, "יצירת המשימה נכשלה"));
  refresh();
  return ok();
}

export async function setActionItemDone(itemId: string, done: boolean): Promise<ActionResult> {
  await getCurrentUser();
  if (!uuidSchema.safeParse(itemId).success) return fail("משימה לא תקינה");

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_action_item_done", { p_id: itemId, p_done: done === true });
  if (error) return fail(dbErrorMessage(error, "עדכון המשימה נכשל"));
  refresh();
  return ok();
}

export async function deleteActionItem(itemId: string): Promise<ActionResult> {
  await getCurrentUser();
  if (!uuidSchema.safeParse(itemId).success) return fail("משימה לא תקינה");

  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_action_item", { p_id: itemId });
  if (error) return fail(dbErrorMessage(error, "מחיקת המשימה נכשלה"));
  refresh();
  return ok();
}
