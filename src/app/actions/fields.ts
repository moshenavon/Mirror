"use server";

import { refresh, updateTag } from "next/cache";
import { cacheTags } from "@/lib/cache-tags";
import { createClient } from "@/lib/supabase/server";
import { dbErrorMessage } from "@/lib/errors";
import { fieldSchema, firstError, uuidSchema } from "@/lib/validation";
import { nextPosition } from "@/lib/fields";
import { fail, ok, type ActionResult } from "@/lib/action-result";

export type FieldPayload = { label: string; emoji?: string | null; placeholder?: string | null };

export async function createField(teamId: string, payload: FieldPayload): Promise<ActionResult> {
  if (!uuidSchema.safeParse(teamId).success) return fail("צוות לא תקין");
  const parsed = fieldSchema.safeParse(payload);
  if (!parsed.success) return fail(firstError(parsed.error));

  const supabase = await createClient();
  const { data: existing, error: readError } = await supabase
    .from("team_fields")
    .select("position")
    .eq("team_id", teamId);
  if (readError) return fail(dbErrorMessage(readError));

  const { error } = await supabase
    .from("team_fields")
    .insert({ team_id: teamId, ...parsed.data, position: nextPosition(existing ?? []) });
  if (error) return fail(dbErrorMessage(error, "הוספת השדה נכשלה"));
  updateTag(cacheTags.fields(teamId));
  refresh();
  return ok();
}

export async function updateField(fieldId: string, payload: FieldPayload): Promise<ActionResult> {
  if (!uuidSchema.safeParse(fieldId).success) return fail("שדה לא תקין");
  const parsed = fieldSchema.safeParse(payload);
  if (!parsed.success) return fail(firstError(parsed.error));

  const supabase = await createClient();
  const { data, error } = await supabase.from("team_fields").update(parsed.data).eq("id", fieldId).select("id, team_id");
  if (error) return fail(dbErrorMessage(error, "שמירת השדה נכשלה"));
  if (!data?.length) return fail(dbErrorMessage({ code: "42501" }));
  updateTag(cacheTags.fields(data[0].team_id));
  refresh();
  return ok();
}

export async function setFieldActive(fieldId: string, isActive: boolean): Promise<ActionResult> {
  if (!uuidSchema.safeParse(fieldId).success) return fail("שדה לא תקין");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("team_fields")
    .update({ is_active: Boolean(isActive) })
    .eq("id", fieldId)
    .select("id, team_id");
  if (error) return fail(dbErrorMessage(error));
  if (!data?.length) return fail(dbErrorMessage({ code: "42501" }));
  updateTag(cacheTags.fields(data[0].team_id));
  refresh();
  return ok();
}

export async function deleteField(fieldId: string): Promise<ActionResult> {
  if (!uuidSchema.safeParse(fieldId).success) return fail("שדה לא תקין");
  const supabase = await createClient();
  const { data, error } = await supabase.from("team_fields").delete().eq("id", fieldId).select("id, team_id");
  if (error) {
    if (error.code === "23503") return fail("לשדה יש דיווחים ולכן אי אפשר למחוק אותו – אפשר להשבית אותו במקום");
    return fail(dbErrorMessage(error));
  }
  if (!data?.length) return fail(dbErrorMessage({ code: "42501" }));
  updateTag(cacheTags.fields(data[0].team_id));
  refresh();
  return ok();
}

export async function reorderFields(teamId: string, fieldIds: string[]): Promise<ActionResult> {
  if (!uuidSchema.safeParse(teamId).success || !fieldIds.every((id) => uuidSchema.safeParse(id).success)) {
    return fail("רשימת שדות לא תקינה");
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("reorder_fields", { p_team_id: teamId, p_field_ids: fieldIds });
  if (error) return fail(dbErrorMessage(error, "שמירת הסדר נכשלה"));
  updateTag(cacheTags.fields(teamId));
  refresh();
  return ok();
}
