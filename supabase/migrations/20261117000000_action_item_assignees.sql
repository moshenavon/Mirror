-- =====================================================================
-- Action items: assignees (tagging)
--  * An action item can be assigned to any number of team members by
--    tagging them with "@" while writing the task. They are stored by
--    e-mail (membership is by e-mail, and a member who has never signed
--    in has no profile yet).
--  * Only addresses that belong to members of the team are kept; anything
--    else is dropped silently, so a tag can never point outside the team.
--  * The Action items screen filters by assignee / "assigned to me" /
--    "unassigned" on the client, so get_action_items just returns them.
-- =====================================================================

alter table public.action_items
  add column assignees text[] not null default '{}'
    check (cardinality(assignees) <= 20);

-- ---------- create (insights viewers) ----------
drop function if exists public.create_action_item(uuid, uuid, text);

create or replace function public.create_action_item(
  p_team_id   uuid,
  p_entry_id  uuid,
  p_title     text,
  p_assignees text[] default '{}'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_entry     public.entries%rowtype;
  v_id        uuid;
  v_assignees text[];
begin
  if not private.can_view_insights(p_team_id) then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  select * into v_entry from public.entries e where e.id = p_entry_id and e.team_id = p_team_id;
  if not found then
    raise exception 'Entry not found' using errcode = 'P0001', hint = 'entry_not_found';
  end if;

  -- keep only real members of this team (case-insensitive, de-duplicated, at most 20)
  v_assignees := array(
    select m.email
    from public.team_members m
    where m.team_id = p_team_id
      and m.email in (select lower(btrim(a)) from unnest(coalesce(p_assignees, '{}')) as a)
    order by m.email
    limit 20
  );

  insert into public.action_items (team_id, entry_id, field_id, source_content, title, created_by, assignees)
  values (p_team_id, v_entry.id, v_entry.field_id, v_entry.content, btrim(coalesce(p_title, '')), auth.uid(), v_assignees)
  returning id into v_id;

  return v_id;
end;
$$;

-- ---------- read (team members) ----------
drop function if exists public.get_action_items(uuid);

create or replace function public.get_action_items(p_team_id uuid)
returns table (
  id               uuid,
  title            text,
  entry_id         uuid,
  field_id         uuid,
  field_label      text,
  field_emoji      text,
  source_content   text,
  created_at       timestamptz,
  created_by_name  text,
  done_at          timestamptz,
  done_by_name     text,
  can_delete       boolean,
  assignees        text[]
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_insights boolean := private.can_view_insights(p_team_id);
  v_admin    boolean := private.is_team_admin(p_team_id);
begin
  if not private.is_team_member(p_team_id) then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  return query
    select a.id, a.title,
           case when v_insights then a.entry_id end,
           case when v_insights then a.field_id end,
           case when v_insights then f.label end,
           case when v_insights then f.emoji end,
           case when v_insights then a.source_content end,
           a.created_at,
           coalesce(c.full_name, c.email),
           a.done_at,
           coalesce(d.full_name, d.email),
           (v_admin or a.created_by = auth.uid()),
           a.assignees
    from public.action_items a
    left join public.team_fields f on f.id = a.field_id
    left join public.profiles c on c.id = a.created_by
    left join public.profiles d on d.id = a.done_by
    where a.team_id = p_team_id
    order by (a.done_at is not null), a.done_at asc nulls first, a.created_at desc, a.id;
end;
$$;

-- ---------- grants ----------
revoke all on function public.create_action_item(uuid, uuid, text, text[]) from public, anon;
revoke all on function public.get_action_items(uuid) from public, anon;

grant execute on function public.create_action_item(uuid, uuid, text, text[]) to authenticated;
grant execute on function public.get_action_items(uuid) to authenticated;
