-- =====================================================================
-- Phase 3 – Action items
--  * Created from an insight (an entry) while presenting the retro, by
--    anyone allowed to view insights.
--  * Every team member sees the team's action items and may mark them
--    done / not done. The source insight (field + content snapshot) is
--    only returned to insights viewers.
--  * The creator or a team admin may delete an action item.
--  * All access goes through security-definer RPCs; the table itself is
--    not readable or writable through the Data API.
-- =====================================================================

create table public.action_items (
  id              uuid primary key default gen_random_uuid(),
  team_id         uuid not null references public.teams (id) on delete cascade,
  -- the insight this task came from; kept as a snapshot when the entry is deleted
  entry_id        uuid references public.entries (id) on delete set null,
  field_id        uuid references public.team_fields (id) on delete set null,
  source_content  text check (source_content is null or char_length(source_content) <= 2000),
  title           text not null check (char_length(btrim(title)) between 1 and 300),
  created_by      uuid references public.profiles (id) on delete set null,
  done_at         timestamptz,
  done_by         uuid references public.profiles (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index action_items_team_idx on public.action_items (team_id, created_at);
create index action_items_entry_idx on public.action_items (entry_id);

create trigger action_items_touch_updated_at
  before update on public.action_items
  for each row execute function private.touch_updated_at();

alter table public.action_items enable row level security;
revoke all on public.action_items from anon, authenticated;
-- no policies: only the functions below (security definer) touch the table

-- ---------- create (insights viewers) ----------
create or replace function public.create_action_item(p_team_id uuid, p_entry_id uuid, p_title text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_entry public.entries%rowtype;
  v_id    uuid;
begin
  if not private.can_view_insights(p_team_id) then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  select * into v_entry from public.entries e where e.id = p_entry_id and e.team_id = p_team_id;
  if not found then
    raise exception 'Entry not found' using errcode = 'P0001', hint = 'entry_not_found';
  end if;

  insert into public.action_items (team_id, entry_id, field_id, source_content, title, created_by)
  values (p_team_id, v_entry.id, v_entry.field_id, v_entry.content, btrim(coalesce(p_title, '')), auth.uid())
  returning id into v_id;

  return v_id;
end;
$$;

-- ---------- mark done / not done (team members) ----------
create or replace function public.set_action_item_done(p_id uuid, p_done boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_team uuid;
begin
  select a.team_id into v_team from public.action_items a where a.id = p_id;
  if v_team is null or not private.is_team_member(v_team) then
    raise exception 'Action item not found' using errcode = 'P0001', hint = 'action_item_not_found';
  end if;

  update public.action_items a
     set done_at = case when p_done then coalesce(a.done_at, now()) end,
         done_by = case when p_done then coalesce(a.done_by, auth.uid()) end
   where a.id = p_id;
end;
$$;

-- ---------- delete (creator or admin) ----------
create or replace function public.delete_action_item(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item public.action_items%rowtype;
begin
  select * into v_item from public.action_items a where a.id = p_id;
  if not found or not private.is_team_member(v_item.team_id) then
    raise exception 'Action item not found' using errcode = 'P0001', hint = 'action_item_not_found';
  end if;
  if v_item.created_by is distinct from auth.uid() and not private.is_team_admin(v_item.team_id) then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  delete from public.action_items a where a.id = p_id;
end;
$$;

-- ---------- read (team members) ----------
-- Open items first (newest first), then done items in the order they were done,
-- so the most recently completed one sits at the very bottom.
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
  can_delete       boolean
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
           (v_admin or a.created_by = auth.uid())
    from public.action_items a
    left join public.team_fields f on f.id = a.field_id
    left join public.profiles c on c.id = a.created_by
    left join public.profiles d on d.id = a.done_by
    where a.team_id = p_team_id
    order by (a.done_at is not null), a.done_at asc nulls first, a.created_at desc, a.id;
end;
$$;

-- ---------- grants ----------
revoke all on function public.create_action_item(uuid, uuid, text) from public, anon;
revoke all on function public.set_action_item_done(uuid, boolean) from public, anon;
revoke all on function public.delete_action_item(uuid) from public, anon;
revoke all on function public.get_action_items(uuid) from public, anon;

grant execute on function public.create_action_item(uuid, uuid, text) to authenticated;
grant execute on function public.set_action_item_done(uuid, boolean) to authenticated;
grant execute on function public.delete_action_item(uuid) to authenticated;
grant execute on function public.get_action_items(uuid) to authenticated;
