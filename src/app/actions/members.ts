"use server";

import { refresh, updateTag } from "next/cache";
import { cacheTags } from "@/lib/cache-tags";
import { createClient } from "@/lib/supabase/server";
import { dbErrorMessage } from "@/lib/errors";
import { parseEmailList } from "@/lib/emails";
import { teamRoleSchema, uuidSchema } from "@/lib/validation";
import { fail, type ActionResult } from "@/lib/action-result";

export type AddMembersResult = ActionResult<{ added: string[]; skipped: string[]; invalid: string[] }>;

export async function addMembers(teamId: string, input: string, role: string = "member"): Promise<AddMembersResult> {
  if (!uuidSchema.safeParse(teamId).success) return fail("צוות לא תקין");
  const parsedRole = teamRoleSchema.safeParse(role);
  if (!parsedRole.success) return fail("תפקיד לא תקין");

  const { valid, invalid } = parseEmailList(input);
  if (valid.length === 0) {
    return fail(invalid.length ? `כתובות לא תקינות: ${invalid.join(", ")}` : "יש להזין לפחות כתובת מייל אחת");
  }

  const supabase = await createClient();
  const { data: existing, error: readError } = await supabase
    .from("team_members")
    .select("email")
    .eq("team_id", teamId)
    .in("email", valid);
  if (readError) return fail(dbErrorMessage(readError));

  const existingSet = new Set((existing ?? []).map((m) => m.email));
  const toAdd = valid.filter((email) => !existingSet.has(email));
  const skipped = valid.filter((email) => existingSet.has(email));

  if (toAdd.length) {
    const { error } = await supabase
      .from("team_members")
      .insert(toAdd.map((email) => ({ team_id: teamId, email, role: parsedRole.data })));
    if (error) return fail(dbErrorMessage(error, "הוספת החברים נכשלה"));
  }

  for (const email of toAdd) updateTag(cacheTags.teamsOf(email));
  refresh();
  return { ok: true, data: { added: toAdd, skipped, invalid } };
}

export async function updateMemberRole(memberId: string, role: string): Promise<ActionResult> {
  if (!uuidSchema.safeParse(memberId).success) return fail("חבר צוות לא תקין");
  const parsedRole = teamRoleSchema.safeParse(role);
  if (!parsedRole.success) return fail("תפקיד לא תקין");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("team_members")
    .update({ role: parsedRole.data })
    .eq("id", memberId)
    .select("id, team_id, email");
  if (error) return fail(dbErrorMessage(error));
  if (!data?.length) return fail(dbErrorMessage({ code: "42501" }));
  updateTag(cacheTags.teamsOf(data[0].email));
  updateTag(cacheTags.team(data[0].team_id));
  refresh();
  return { ok: true };
}

export async function removeMember(memberId: string): Promise<ActionResult> {
  if (!uuidSchema.safeParse(memberId).success) return fail("חבר צוות לא תקין");
  const supabase = await createClient();
  const { data, error } = await supabase.from("team_members").delete().eq("id", memberId).select("id, team_id, email");
  if (error) return fail(dbErrorMessage(error));
  if (!data?.length) return fail(dbErrorMessage({ code: "42501" }));
  updateTag(cacheTags.teamsOf(data[0].email));
  updateTag(cacheTags.team(data[0].team_id));
  refresh();
  return { ok: true };
}
