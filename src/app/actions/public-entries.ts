"use server";

import { redirect } from "next/navigation";
import { updateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getOptionalUser } from "@/lib/data";
import { cacheTags } from "@/lib/cache-tags";
import { dbErrorMessage } from "@/lib/errors";
import { entryContentSchema, firstError, publicTokenSchema, uuidSchema } from "@/lib/validation";
import { fail, ok, type ActionResult } from "@/lib/action-result";

/**
 * Submission through a team's public link. On an anonymous link no sign-in is
 * needed and nothing links the entry to the sender. On an identified link the
 * database requires a signed-in sender and stores them as the author.
 */
export async function submitPublicEntry(token: string, fieldId: string, content: string): Promise<ActionResult> {
  if (!publicTokenSchema.safeParse(token).success) return fail("הקישור אינו תקין");
  if (!uuidSchema.safeParse(fieldId).success) return fail("שדה לא תקין");
  const parsed = entryContentSchema.safeParse(content);
  if (!parsed.success) return fail(firstError(parsed.error));

  // Acts as the signed-in user when there is a session, otherwise as `anon`.
  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_public_entry", {
    p_token: token,
    p_field_id: fieldId,
    p_content: parsed.data,
  });
  if (error) return fail(dbErrorMessage(error, "שליחת הדיווח נכשלה"));
  return ok();
}

/**
 * The signed-in visitor joins the team behind a public link (when the admin
 * allowed it) and lands on the team's report screen as a regular member.
 */
export async function joinTeamViaLink(token: string): Promise<ActionResult> {
  if (!publicTokenSchema.safeParse(token).success) return fail("הקישור אינו תקין");
  const user = await getOptionalUser();
  if (!user) return fail(dbErrorMessage({ hint: "identity_required" }));

  const supabase = await createClient();
  const { data: teamId, error } = await supabase.rpc("join_team_via_link", { p_token: token });
  if (error || !teamId) return fail(dbErrorMessage(error, "ההצטרפות לצוות נכשלה"));

  updateTag(cacheTags.teamsOf(user.email));
  updateTag(cacheTags.team(teamId));
  redirect(`/teams/${teamId}`);
}
