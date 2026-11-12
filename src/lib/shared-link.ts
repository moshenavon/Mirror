import "server-only";

import { cacheLife } from "next/cache";
import { createAnonClient } from "@/lib/supabase/server";
import { publicTokenSchema } from "@/lib/validation";
import type { SharedLink } from "@/lib/share-preview";

/**
 * What a public link looks like to someone who has not opened it yet (as
 * `anon`): the team name and the link mode, or null when it is not active.
 * Used for the link preview (page metadata + Open Graph image).
 */
export async function getSharedLink(token: string): Promise<SharedLink | null> {
  "use cache";
  cacheLife({ stale: 60, revalidate: 300, expire: 60 * 60 });
  if (!publicTokenSchema.safeParse(token).success) return null;
  const { data, error } = await createAnonClient().rpc("get_public_form", { p_token: token });
  if (error || !data) return null;
  const form = data as unknown as SharedLink;
  return {
    team_name: form.team_name,
    requires_identity: Boolean(form.requires_identity),
    allow_join: Boolean(form.allow_join),
  };
}
