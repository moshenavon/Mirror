/**
 * Tags of the server-side data cache (see src/lib/data.ts). Every Server Action
 * that changes the underlying rows calls `updateTag` with the matching tag, so
 * the next read is fresh; otherwise entries are refreshed in the background.
 */
export const cacheTags = {
  /** The team list of one user (my_teams), by e-mail – membership is by e-mail. */
  teamsOf: (email: string) => `teams:${email.toLowerCase()}`,
  /** Everything that embeds a team's own row: name, settings, members' roles. */
  team: (teamId: string) => `team:${teamId}`,
  /** A team's report fields. */
  fields: (teamId: string) => `fields:${teamId}`,
};
