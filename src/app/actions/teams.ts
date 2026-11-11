"use server";

import { redirect } from "next/navigation";
import { refresh, updateTag } from "next/cache";
import { cacheTags } from "@/lib/cache-tags";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/data";
import { dbErrorMessage } from "@/lib/errors";
import { firstError, insightsVisibilitySchema, teamSchema, uuidSchema } from "@/lib/validation";
import { fail, ok, type ActionResult } from "@/lib/action-result";

export type FormState = { error?: string; success?: string } | undefined;

export async function createTeam(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  const parsed = teamSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
  });
  if (!parsed.success) return { error: firstError(parsed.error) };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_team", {
    p_name: parsed.data.name,
    p_description: parsed.data.description ?? undefined,
  });
  if (error || !data) return { error: dbErrorMessage(error, "יצירת הצוות נכשלה") };
  updateTag(cacheTags.teamsOf(user.email));

  redirect(`/teams/${data}/settings?created=1`);
}

export async function updateTeamDetails(teamId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  if (!uuidSchema.safeParse(teamId).success) return { error: "צוות לא תקין" };
  const parsed = teamSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
  });
  if (!parsed.success) return { error: firstError(parsed.error) };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("teams")
    .update({ name: parsed.data.name, description: parsed.data.description })
    .eq("id", teamId)
    .select("id");
  if (error) return { error: dbErrorMessage(error) };
  if (!data?.length) return { error: dbErrorMessage({ code: "42501" }) };
  updateTag(cacheTags.team(teamId));
  refresh();
  return { success: "הפרטים נשמרו" };
}

export async function setInsightsVisibility(teamId: string, visibility: string): Promise<ActionResult> {
  const parsedId = uuidSchema.safeParse(teamId);
  const parsed = insightsVisibilitySchema.safeParse(visibility);
  if (!parsedId.success || !parsed.success) return fail("ערך לא תקין");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("teams")
    .update({ insights_visibility: parsed.data })
    .eq("id", teamId)
    .select("id");
  if (error) return fail(dbErrorMessage(error));
  if (!data?.length) return fail(dbErrorMessage({ code: "42501" }));
  updateTag(cacheTags.team(teamId));
  refresh();
  return ok();
}

export async function deleteTeam(teamId: string, confirmName: string): Promise<ActionResult> {
  if (!uuidSchema.safeParse(teamId).success) return fail("צוות לא תקין");
  const supabase = await createClient();
  const { data: team } = await supabase.from("teams").select("name").eq("id", teamId).maybeSingle();
  if (!team) return fail("הצוות לא נמצא");
  if (team.name.trim() !== confirmName.trim()) return fail("שם הצוות שהוקלד אינו תואם");

  const { data, error } = await supabase.from("teams").delete().eq("id", teamId).select("id");
  if (error) return fail(dbErrorMessage(error));
  if (!data?.length) return fail(dbErrorMessage({ code: "42501" }));
  updateTag(cacheTags.team(teamId));
  redirect("/");
}

export async function setPublicSubmissions(teamId: string, enabled: boolean): Promise<ActionResult> {
  if (!uuidSchema.safeParse(teamId).success) return fail("צוות לא תקין");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("teams")
    .update({ public_submissions_enabled: Boolean(enabled) })
    .eq("id", teamId)
    .select("id");
  if (error) return fail(dbErrorMessage(error));
  if (!data?.length) return fail(dbErrorMessage({ code: "42501" }));
  updateTag(cacheTags.team(teamId));
  refresh();
  return ok();
}

export async function setPublicRequiresIdentity(teamId: string, required: boolean): Promise<ActionResult> {
  if (!uuidSchema.safeParse(teamId).success) return fail("צוות לא תקין");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("teams")
    .update({ public_requires_identity: Boolean(required) })
    .eq("id", teamId)
    .select("id");
  if (error) return fail(dbErrorMessage(error));
  if (!data?.length) return fail(dbErrorMessage({ code: "42501" }));
  updateTag(cacheTags.team(teamId));
  refresh();
  return ok();
}

export async function regeneratePublicLink(teamId: string): Promise<ActionResult<{ token: string }>> {
  if (!uuidSchema.safeParse(teamId).success) return fail("צוות לא תקין");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("regenerate_public_token", { p_team_id: teamId });
  if (error || !data) return fail(dbErrorMessage(error, "החלפת הקישור נכשלה"));
  updateTag(cacheTags.team(teamId));
  refresh();
  return { ok: true, data: { token: data } };
}
