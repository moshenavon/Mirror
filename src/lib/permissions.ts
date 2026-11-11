import type { InsightsVisibility, TeamRole } from "@/lib/supabase/database.types";

export type TeamPermissions = {
  isAdmin: boolean;
  canViewInsights: boolean;
  canManageTeam: boolean;
};

/** Mirrors the database rules in private.can_view_insights / is_team_admin. */
export function teamPermissions(role: TeamRole, visibility: InsightsVisibility): TeamPermissions {
  const isAdmin = role === "admin";
  return {
    isAdmin,
    canManageTeam: isAdmin,
    canViewInsights: isAdmin || visibility === "members",
  };
}

export type MemberRow = { id: string; email: string; role: TeamRole };

/** Whether removing/demoting `memberId` would leave the team without admins. */
export function isLastAdmin(members: readonly MemberRow[], memberId: string): boolean {
  const target = members.find((m) => m.id === memberId);
  if (!target || target.role !== "admin") return false;
  return members.filter((m) => m.role === "admin").length === 1;
}
