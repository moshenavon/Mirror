import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { SESSION_COOKIE, verifySessionToken, type SessionUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { RpcReturn, Tables } from "@/lib/supabase/database.types";
import { teamPermissions, type TeamPermissions } from "@/lib/permissions";
import { sortByPosition } from "@/lib/fields";

export type CurrentUser = SessionUser;

/** The signed-in user (verified session cookie), or null. Deduped per request. */
export const getOptionalUser = cache(async (): Promise<CurrentUser | null> => {
  return verifySessionToken((await cookies()).get(SESSION_COOKIE)?.value);
});

/** The signed-in user; redirects to /login when missing. */
export async function getCurrentUser(): Promise<CurrentUser> {
  const user = await getOptionalUser();
  if (!user) redirect("/login");
  return user;
}

export type MyTeam = RpcReturn<"my_teams">[number];

export const getMyTeams = cache(async (): Promise<MyTeam[]> => {
  await getCurrentUser();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("my_teams");
  if (error) throw new Error(error.message);
  return data ?? [];
});

export type TeamContext = {
  team: MyTeam;
  permissions: TeamPermissions;
  user: CurrentUser;
};

/** Team + the caller's permissions. 404 when the caller is not a member. */
export const getTeamContext = cache(async (teamId: string): Promise<TeamContext> => {
  const user = await getCurrentUser();
  const teams = await getMyTeams();
  const team = teams.find((t) => t.id === teamId);
  if (!team) notFound();
  return { team, user, permissions: teamPermissions(team.role, team.insights_visibility) };
});

export type Field = Tables<"team_fields">;

export const getFields = cache(async (teamId: string, activeOnly = false): Promise<Field[]> => {
  const supabase = await createClient();
  let query = supabase.from("team_fields").select("*").eq("team_id", teamId);
  if (activeOnly) query = query.eq("is_active", true);
  const { data, error } = await query.order("position").order("created_at");
  if (error) throw new Error(error.message);
  return sortByPosition(data ?? []);
});

export type Entry = Tables<"entries">;

export async function getMyEntries(teamId: string): Promise<Entry[]> {
  const user = await getCurrentUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("entries")
    .select("*")
    .eq("team_id", teamId)
    .eq("author_id", user.id)
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export type Member = Tables<"team_members"> & {
  profile: Pick<Tables<"profiles">, "full_name" | "avatar_url"> | null;
};

export async function getMembers(teamId: string): Promise<Member[]> {
  const supabase = await createClient();
  const { data: members, error } = await supabase
    .from("team_members")
    .select("*")
    .eq("team_id", teamId)
    .order("role")
    .order("email");
  if (error) throw new Error(error.message);
  const emails = (members ?? []).map((m) => m.email);
  const profiles = new Map<string, Pick<Tables<"profiles">, "full_name" | "avatar_url">>();
  if (emails.length) {
    const { data } = await supabase.from("profiles").select("email, full_name, avatar_url").in("email", emails);
    for (const p of data ?? []) profiles.set(p.email, { full_name: p.full_name, avatar_url: p.avatar_url });
  }
  return (members ?? []).map((m) => ({ ...m, profile: profiles.get(m.email) ?? null }));
}

export type InsightRow = RpcReturn<"get_insights">[number];

export async function getInsights(teamId: string, fromIso: string, toIso: string): Promise<InsightRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_insights", { p_team_id: teamId, p_from: fromIso, p_to: toIso });
  if (error) {
    if (error.code === "42501") notFound();
    throw new Error(error.message);
  }
  return data ?? [];
}

export type AchievementRow = RpcReturn<"get_achievements">[number];

/** Entry count of every team member (anonymous entries are never counted). */
export async function getAchievements(teamId: string): Promise<AchievementRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_achievements", { p_team_id: teamId });
  if (error) {
    if (error.code === "42501") notFound();
    throw new Error(error.message);
  }
  return data ?? [];
}
