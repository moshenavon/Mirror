-- =====================================================================
-- RLS / authorization tests. Runs inside a transaction and rolls back.
-- Run with: psql "$DATABASE_URL" -f supabase/tests/rls_test.sql
-- (or paste into the Supabase SQL editor). Any failed assertion raises.
-- =====================================================================
begin;

-- ---------- fixtures (as postgres) ----------
insert into auth.users (id, instance_id, aud, role, email, email_confirmed_at, raw_user_meta_data)
values
  ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'Alice@Example.com', now(), '{"full_name":"Alice Admin","avatar_url":"https://x/a.png"}'),
  ('00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'bob@example.com',   now(), '{"name":"Bob Member"}'),
  ('00000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'carol@example.com', now(), '{"name":"Carol Outsider"}'),
  ('00000000-0000-0000-0000-00000000000d', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'dave@example.com',  null,  '{"name":"Dave Unconfirmed"}');

do $$ begin
  assert (select count(*) from public.profiles where id::text like '00000000-0000-0000-0000-00000000000%') = 4, 'profiles created by trigger';
  assert (select email from public.profiles where id = '00000000-0000-0000-0000-00000000000a') = 'alice@example.com', 'profile email lower-cased';
  assert (select full_name from public.profiles where id = '00000000-0000-0000-0000-00000000000b') = 'Bob Member', 'name fallback';
end $$;

create temporary table t_ctx (k text primary key, v uuid) on commit drop;
grant all on t_ctx to authenticated;

-- ---------- alice creates a team ----------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);
set local role authenticated;

insert into t_ctx values ('team', public.create_team('  Team Rocket  ', 'desc'));

do $$
declare v_team uuid := (select v from t_ctx where k = 'team');
begin
  assert (select name from public.teams where id = v_team) = 'Team Rocket', 'name trimmed';
  assert (select count(*) from public.team_fields where team_id = v_team) = 4, 'default fields';
  assert (select role from public.team_members where team_id = v_team and email = 'alice@example.com') = 'admin', 'creator is admin';
  assert (select count(*) from public.my_teams()) = 1, 'alice sees her team';
  assert (select can_view_insights from public.my_teams() where id = v_team), 'admin can view insights';

  insert into public.team_members (team_id, email, role) values (v_team, 'bob@example.com', 'member');
  insert into public.team_members (team_id, email, role) values (v_team, 'dave@example.com', 'member');
end $$;

-- ---------- last admin protection ----------
do $$
declare v_team uuid := (select v from t_ctx where k = 'team');
begin
  begin
    update public.team_members set role = 'member' where team_id = v_team and email = 'alice@example.com';
    raise exception 'expected last_admin error';
  exception when sqlstate 'P0001' then
    if sqlerrm not like '%at least one admin%' then raise; end if;
  end;
  begin
    delete from public.team_members where team_id = v_team and email = 'alice@example.com';
    raise exception 'expected last_admin error on delete';
  exception when sqlstate 'P0001' then
    if sqlerrm not like '%at least one admin%' then raise; end if;
  end;
end $$;

-- ---------- bob (member) ----------
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}', true);
set local role authenticated;

do $$
declare
  v_team uuid := (select v from t_ctx where k = 'team');
  v_field uuid := (select id from public.team_fields where team_id = v_team order by position limit 1);
  v_n int;
begin
  assert (select count(*) from public.teams where id = v_team) = 1, 'member reads team';
  assert (select count(*) from public.team_fields where team_id = v_team) = 4, 'member reads fields';
  assert not (select can_view_insights from public.my_teams() where id = v_team), 'member cannot view insights by default';
  assert (select count(*) from public.profiles) = 3, 'bob sees alice, dave and himself';

  insert into public.entries (team_id, field_id, content) values (v_team, v_field, 'Bob is happy');
  assert (select count(*) from public.entries where team_id = v_team) = 1, 'bob sees own entry';

  -- cannot modify team / fields / members
  update public.teams set name = 'hacked' where id = v_team;
  get diagnostics v_n = row_count; assert v_n = 0, 'member cannot update team';
  update public.team_fields set label = 'hacked' where team_id = v_team;
  get diagnostics v_n = row_count; assert v_n = 0, 'member cannot update fields';
  delete from public.team_members where team_id = v_team and email = 'dave@example.com';
  get diagnostics v_n = row_count; assert v_n = 0, 'member cannot remove members';

  begin
    insert into public.team_members (team_id, email) values (v_team, 'evil@example.com');
    raise exception 'member inserted a member';
  exception when insufficient_privilege then null;
  end;

  begin
    perform public.get_insights(v_team, now() - interval '14 days', now() + interval '1 day');
    raise exception 'member read insights';
  exception when insufficient_privilege then null;
  end;

  begin
    perform public.reorder_fields(v_team, array(select id from public.team_fields where team_id = v_team));
    raise exception 'member reordered fields';
  exception when insufficient_privilege then null;
  end;
end $$;

-- author_id cannot be spoofed (column not insertable)
do $$
declare
  v_team uuid := (select v from t_ctx where k = 'team');
  v_field uuid := (select id from public.team_fields where team_id = v_team order by position limit 1);
begin
  begin
    insert into public.entries (team_id, field_id, content, author_id)
    values (v_team, v_field, 'spoof', '00000000-0000-0000-0000-00000000000a');
    raise exception 'author spoofed';
  exception when insufficient_privilege then null;
  end;
end $$;

-- ---------- carol (outsider) ----------
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000c","role":"authenticated"}', true);
set local role authenticated;

do $$
declare
  v_team uuid := (select v from t_ctx where k = 'team');
  v_field uuid := (select id from public.team_fields where team_id = v_team order by position limit 1);
begin
  assert (select count(*) from public.teams) = 0, 'outsider sees no teams';
  assert (select count(*) from public.team_fields) = 0, 'outsider sees no fields';
  assert (select count(*) from public.team_members) = 0, 'outsider sees no members';
  assert (select count(*) from public.entries) = 0, 'outsider sees no entries';
  assert (select count(*) from public.profiles) = 1, 'outsider sees only self';
  begin
    insert into public.entries (team_id, field_id, content) values (v_team, v_field, 'intruder');
    raise exception 'outsider inserted entry';
  exception when insufficient_privilege then null;
  end;
end $$;

-- ---------- dave (unconfirmed e-mail) is not treated as member ----------
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000d","role":"authenticated"}', true);
set local role authenticated;
do $$ begin
  assert (select count(*) from public.teams) = 0, 'unconfirmed user is not a member';
end $$;

-- ---------- alice: insights + settings ----------
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);
set local role authenticated;

do $$
declare
  v_team uuid := (select v from t_ctx where k = 'team');
  v_ids uuid[];
  v_first uuid;
  v_n int;
begin
  assert (select count(*) from public.entries where team_id = v_team) = 1, 'admin sees member entries';
  assert (select count(*) from public.get_insights(v_team, now() - interval '14 days', now() + interval '1 day')) = 1, 'insights returns entry';
  assert (select author_name from public.get_insights(v_team, now() - interval '14 days', now() + interval '1 day')) = 'Bob Member', 'insights author name';
  assert (select count(*) from public.get_insights(v_team, now() + interval '1 day', now() + interval '2 days')) = 0, 'insights respects range';

  -- admin cannot edit bob's entry
  update public.entries set content = 'changed' where team_id = v_team;
  get diagnostics v_n = row_count; assert v_n = 0, 'admin cannot edit others entries';

  -- reorder: reverse
  select array_agg(id order by position desc) into v_ids from public.team_fields where team_id = v_team;
  perform public.reorder_fields(v_team, v_ids);
  select id into v_first from public.team_fields where team_id = v_team order by position limit 1;
  assert v_first = v_ids[1], 'reorder applied';

  begin
    perform public.reorder_fields(v_team, v_ids[1:2]);
    raise exception 'partial reorder accepted';
  exception when sqlstate '22023' then null;
  end;

  -- open insights to members
  update public.teams set insights_visibility = 'members' where id = v_team;

  -- field with entries cannot be deleted
  begin
    delete from public.team_fields where id = (select field_id from public.entries where team_id = v_team limit 1);
    raise exception 'deleted field with entries';
  exception when foreign_key_violation then null;
  end;

  -- deactivate the field that has entries
  update public.team_fields set is_active = false
   where id = (select field_id from public.entries where team_id = v_team limit 1);

  -- promote bob
  update public.team_members set role = 'admin' where team_id = v_team and email = 'bob@example.com';
  -- now alice may step down
  update public.team_members set role = 'member' where team_id = v_team and email = 'alice@example.com';
end $$;

-- ---------- bob: insights now allowed; inactive field rules ----------
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}', true);
set local role authenticated;

do $$
declare
  v_team uuid := (select v from t_ctx where k = 'team');
  v_inactive uuid := (select id from public.team_fields where team_id = v_team and not is_active limit 1);
  v_active uuid := (select id from public.team_fields where team_id = v_team and is_active order by position limit 1);
  v_entry uuid := (select id from public.entries where team_id = v_team limit 1);
begin
  assert (select count(*) from public.get_insights(v_team, now() - interval '1 day', now() + interval '1 day')) = 1, 'member insights when allowed';

  -- editing content of an entry on an inactive field is fine
  update public.entries set content = 'Bob is very happy' where id = v_entry;
  assert (select content from public.entries where id = v_entry) = 'Bob is very happy', 'edit own entry';

  -- new entry on inactive field is rejected
  begin
    insert into public.entries (team_id, field_id, content) values (v_team, v_inactive, 'nope');
    raise exception 'inserted on inactive field';
  exception when sqlstate 'P0001' then null;
  end;

  -- moving entry to an active field works
  update public.entries set field_id = v_active where id = v_entry;
  assert (select field_id from public.entries where id = v_entry) = v_active, 'move entry to other field';

  -- empty content rejected
  begin
    update public.entries set content = '   ' where id = v_entry;
    raise exception 'empty content accepted';
  exception when check_violation then null;
  end;

  delete from public.entries where id = v_entry;
  assert (select count(*) from public.entries where team_id = v_team) = 0, 'delete own entry';

  -- team deletion cascades (bob is admin now)
  delete from public.teams where id = v_team;
  assert (select count(*) from public.my_teams()) = 0, 'team deleted';
end $$;

reset role;
select 'ALL RLS TESTS PASSED' as result;
rollback;
