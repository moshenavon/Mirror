-- =====================================================================
-- Achievements map
-- Every team member sees how many entries each teammate has sent, so the
-- achievements screen can place everyone on the levels map.
--  * Only counts are exposed – never content – so this works even when
--    the insights screen is limited to admins.
--  * Anonymous entries have no author and are therefore never counted.
--  * Members that never signed in are listed with a count of 0.
-- =====================================================================

create or replace function public.get_achievements(p_team_id uuid)
returns table (
  member_email  text,
  full_name     text,
  avatar_url    text,
  entry_count   integer,
  is_me         boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_me text := private.current_email();
begin
  if not private.is_team_member(p_team_id) then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  return query
    select m.email,
           p.full_name,
           p.avatar_url,
           coalesce((
             select count(*)::integer
             from public.entries e
             where e.team_id = p_team_id and e.author_id = p.id
           ), 0),
           m.email = v_me
    from public.team_members m
    left join lateral (
      select pr.id, pr.full_name, pr.avatar_url
      from public.profiles pr
      where pr.email = m.email
      order by pr.updated_at desc
      limit 1
    ) p on true
    where m.team_id = p_team_id
    order by 4 desc, m.email;
end;
$$;

revoke all on function public.get_achievements(uuid) from public, anon;
grant execute on function public.get_achievements(uuid) to authenticated;
