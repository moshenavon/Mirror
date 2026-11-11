-- =====================================================================
-- RLS / authorization tests. Runs inside a transaction and rolls back.
-- Paste into the Supabase SQL Editor (or psql -f). Any failed assertion
-- raises an error naming the check; success prints ALL RLS TESTS PASSED.
-- Users are identified exactly like the app does it: a JWT whose `sub`
-- is the public.profiles id (Supabase Auth is not used).
-- =====================================================================
begin;

-- ---------- fixtures (as postgres) ----------
insert into public.profiles (id, google_sub, email, full_name, avatar_url) values
  ('00000000-0000-0000-0000-00000000000a', 'test-g-a', 'alice@example.com', 'Alice Admin', 'https://x/a.png'),
  ('00000000-0000-0000-0000-00000000000b', 'test-g-b', 'bob@example.com',   'Bob Member',  null),
  ('00000000-0000-0000-0000-00000000000c', 'test-g-c', 'carol@example.com', 'Carol Outsider', null);

create temporary table t_ctx (k text primary key, v text) on commit drop;
grant all on t_ctx to authenticated, anon;

-- ---------- alice creates a team ----------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);
set local role authenticated;

insert into t_ctx values ('team', public.create_team('  Team Rocket  ', 'desc')::text);

do $$
declare v_team uuid := (select v::uuid from t_ctx where k = 'team');
begin
  assert (select name from public.teams where id = v_team) = 'Team Rocket', 'name trimmed';
  assert (select count(*) from public.team_fields where team_id = v_team) = 4, 'default fields';
  assert (select role from public.team_members where team_id = v_team and email = 'alice@example.com') = 'admin', 'creator is admin';
  assert (select count(*) from public.my_teams()) = 1, 'alice sees her team';
  assert (select can_view_insights from public.my_teams() where id = v_team), 'admin can view insights';
  assert (select length(public_token) from public.my_teams() where id = v_team) = 64, 'admin sees the public token';
  assert not (select public_submissions_enabled from public.teams where id = v_team), 'public link off by default';
  insert into public.team_members (team_id, email, role) values (v_team, 'bob@example.com', 'member');
  insert into t_ctx values ('token', (select public_token from public.my_teams() where id = v_team));
  insert into t_ctx values ('field', (select id from public.team_fields where team_id = v_team order by position limit 1)::text);
end $$;

-- last admin protection
do $$
declare v_team uuid := (select v::uuid from t_ctx where k = 'team');
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
  v_team uuid := (select v::uuid from t_ctx where k = 'team');
  v_field uuid := (select id from public.team_fields where team_id = v_team order by position limit 1);
  v_n int;
begin
  assert (select count(*) from public.teams where id = v_team) = 1, 'member reads team';
  assert (select count(*) from public.team_fields where team_id = v_team) = 4, 'member reads fields';
  assert not (select can_view_insights from public.my_teams() where id = v_team), 'member cannot view insights by default';
  assert (select public_token from public.my_teams() where id = v_team) is null, 'member does not see the public token';
  begin
    perform public_token from public.teams where id = v_team;
    raise exception 'member read public_token column';
  exception when insufficient_privilege then null;
  end;
  assert (select count(*) from public.profiles) = 2, 'bob sees alice and himself';

  insert into public.entries (team_id, field_id, content) values (v_team, v_field, 'Bob is happy');
  assert (select count(*) from public.entries where team_id = v_team) = 1, 'bob sees own entry';

  -- anonymous entry: stored without author, not visible to bob afterwards
  perform public.submit_anonymous_entry(v_team, v_field, '  secret thought  ');
  assert (select count(*) from public.entries where team_id = v_team) = 1, 'bob cannot see his anonymous entry';

  -- achievements: every member sees everyone's counts; anonymous entries are not counted
  assert (select count(*) from public.get_achievements(v_team)) = 2, 'achievements list every member';
  assert (select entry_count from public.get_achievements(v_team) where member_email = 'bob@example.com') = 1, 'bob has 1 counted entry';
  assert (select entry_count from public.get_achievements(v_team) where member_email = 'alice@example.com') = 0, 'alice has 0 entries';
  assert (select is_me from public.get_achievements(v_team) where member_email = 'bob@example.com'), 'bob is me';
  assert not (select is_me from public.get_achievements(v_team) where member_email = 'alice@example.com'), 'alice is not me';
  assert (select full_name from public.get_achievements(v_team) where member_email = 'alice@example.com') = 'Alice Admin', 'achievements show names';

  update public.teams set name = 'hacked' where id = v_team;
  get diagnostics v_n = row_count; assert v_n = 0, 'member cannot update team';
  update public.teams set public_submissions_enabled = true where id = v_team;
  get diagnostics v_n = row_count; assert v_n = 0, 'member cannot enable public link';
  update public.team_fields set label = 'hacked' where team_id = v_team;
  get diagnostics v_n = row_count; assert v_n = 0, 'member cannot update fields';

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
    perform public.regenerate_public_token(v_team);
    raise exception 'member regenerated token';
  exception when insufficient_privilege then null;
  end;
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
  v_team uuid := (select v::uuid from t_ctx where k = 'team');
  -- a real, active field id (the outsider cannot read team_fields herself)
  v_field uuid := (select v::uuid from t_ctx where k = 'field');
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
  begin
    perform public.submit_anonymous_entry(v_team, v_field, 'intruder');
    raise exception 'outsider sent anonymous entry';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.get_achievements(v_team);
    raise exception 'outsider read achievements';
  exception when insufficient_privilege then null;
  end;
end $$;

-- ---------- unknown subject (no profile) is nobody ----------
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000ff","role":"authenticated"}', true);
set local role authenticated;
do $$ begin
  assert (select count(*) from public.teams) = 0, 'unknown subject is not a member';
  assert (select count(*) from public.my_teams()) = 0, 'unknown subject has no teams';
end $$;

-- ---------- anon: public link disabled ----------
reset role;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
set local role anon;
do $$
declare
  v_token text := (select v from t_ctx where k = 'token');
  v_field uuid;
begin
  assert public.get_public_form(v_token) is null, 'disabled link returns nothing';
  begin
    perform public.submit_public_entry(v_token, '00000000-0000-0000-0000-000000000000', 'x');
    raise exception 'submitted through disabled link';
  exception when sqlstate 'P0001' then
    if sqlerrm not like '%disabled%' then raise; end if;
  end;
end $$;

-- ---------- action items: alice (admin, can view insights) creates ----------
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);
set local role authenticated;

do $$
declare
  v_team uuid := (select v::uuid from t_ctx where k = 'team');
  v_bob_entry uuid := (select id from public.entries where team_id = v_team and author_id is not null limit 1);
  v_anon_entry uuid := (select id from public.entries where team_id = v_team and author_id is null limit 1);
begin
  insert into t_ctx values ('ai1', public.create_action_item(v_team, v_bob_entry, '  Keep the good vibes  ')::text);
  insert into t_ctx values ('ai2', public.create_action_item(v_team, v_anon_entry, 'Talk about the secret')::text);

  assert (select count(*) from public.get_action_items(v_team)) = 2, 'admin sees action items';
  assert (select title from public.get_action_items(v_team) where id = (select v::uuid from t_ctx where k = 'ai1')) = 'Keep the good vibes', 'title trimmed';
  assert (select source_content from public.get_action_items(v_team) where id = (select v::uuid from t_ctx where k = 'ai1')) = 'Bob is happy', 'source snapshot';
  assert (select field_label from public.get_action_items(v_team) where id = (select v::uuid from t_ctx where k = 'ai1')) is not null, 'insights viewer sees the source field';
  assert (select created_by_name from public.get_action_items(v_team) where id = (select v::uuid from t_ctx where k = 'ai1')) = 'Alice Admin', 'creator name';

  begin
    perform public.create_action_item(v_team, gen_random_uuid(), 'nope');
    raise exception 'action item for unknown entry';
  exception when sqlstate 'P0001' then
    if sqlerrm not like '%Entry not found%' then raise; end if;
  end;
  begin
    perform public.create_action_item(v_team, v_bob_entry, '   ');
    raise exception 'empty action item accepted';
  exception when check_violation then null;
  end;
  begin
    perform 1 from public.action_items;
    raise exception 'direct read of action_items';
  exception when insufficient_privilege then null;
  end;
end $$;

-- ---------- action items: bob (member, no insights) ----------
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}', true);
set local role authenticated;

do $$
declare
  v_team uuid := (select v::uuid from t_ctx where k = 'team');
  v_ai1 uuid := (select v::uuid from t_ctx where k = 'ai1');
  v_ai2 uuid := (select v::uuid from t_ctx where k = 'ai2');
  v_ids uuid[];
begin
  assert (select count(*) from public.get_action_items(v_team)) = 2, 'member sees the team action items';
  assert (select count(*) from public.get_action_items(v_team)
          where source_content is null and field_label is null and entry_id is null) = 2, 'member does not see the source insight';
  begin
    perform public.create_action_item(v_team, gen_random_uuid(), 'nope');
    raise exception 'member created action item';
  exception when insufficient_privilege then null;
  end;

  perform public.set_action_item_done(v_ai1, true);
  assert (select done_at is not null and done_by_name = 'Bob Member' from public.get_action_items(v_team) where id = v_ai1), 'member marks done';
  select array_agg(id) into v_ids from public.get_action_items(v_team);
  assert v_ids = array[v_ai2, v_ai1], 'done items are listed last';

  perform public.set_action_item_done(v_ai1, false);
  assert (select done_at is null and done_by_name is null from public.get_action_items(v_team) where id = v_ai1), 'member re-opens';
  perform public.set_action_item_done(v_ai1, true);

  assert not (select can_delete from public.get_action_items(v_team) where id = v_ai2), 'member cannot delete others items';
  begin
    perform public.delete_action_item(v_ai2);
    raise exception 'member deleted someone elses action item';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.action_items set title = 'hacked';
    raise exception 'direct update of action_items';
  exception when insufficient_privilege then null;
  end;
end $$;

-- ---------- action items: carol (outsider) ----------
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000c","role":"authenticated"}', true);
set local role authenticated;

do $$
declare
  v_team uuid := (select v::uuid from t_ctx where k = 'team');
  v_ai1 uuid := (select v::uuid from t_ctx where k = 'ai1');
begin
  begin
    perform public.get_action_items(v_team);
    raise exception 'outsider read action items';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.set_action_item_done(v_ai1, false);
    raise exception 'outsider changed action item';
  exception when sqlstate 'P0001' then null;
  end;
  begin
    perform public.delete_action_item(v_ai1);
    raise exception 'outsider deleted action item';
  exception when sqlstate 'P0001' then null;
  end;
end $$;

-- ---------- alice: insights, settings, public link ----------
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);
set local role authenticated;

do $$
declare
  v_team uuid := (select v::uuid from t_ctx where k = 'team');
  v_ids uuid[];
  v_first uuid;
  v_n int;
begin
  assert (select count(*) from public.entries where team_id = v_team) = 2, 'admin sees member + anonymous entries';
  assert (select count(*) from public.entries where team_id = v_team and author_id is null) = 1, 'anonymous entry has no author';
  assert (select content from public.entries where team_id = v_team and author_id is null) = 'secret thought', 'anonymous content trimmed';
  assert (select created_at from public.entries where team_id = v_team and author_id is null)
         = (date_trunc('day', now() at time zone 'Asia/Jerusalem')) at time zone 'Asia/Jerusalem', 'anonymous keeps the date only';

  assert (select count(*) from public.get_insights(v_team, now() - interval '14 days', now() + interval '1 day')) = 2, 'insights returns entries';
  assert (select count(*) from public.get_insights(v_team, now() - interval '14 days', now() + interval '1 day')
          where is_anonymous and author_id is null and author_name is null and author_email is null) = 1, 'anonymous entry is anonymous in insights';
  assert (select author_name from public.get_insights(v_team, now() - interval '14 days', now() + interval '1 day') where not is_anonymous) = 'Bob Member', 'insights author name';
  assert (select count(*) from public.get_insights(v_team, now() + interval '1 day', now() + interval '2 days')) = 0, 'insights respects range';

  update public.entries set content = 'changed' where team_id = v_team;
  get diagnostics v_n = row_count; assert v_n = 0, 'admin cannot edit others or anonymous entries';

  select array_agg(id order by position desc) into v_ids from public.team_fields where team_id = v_team;
  perform public.reorder_fields(v_team, v_ids);
  select id into v_first from public.team_fields where team_id = v_team order by position limit 1;
  assert v_first = v_ids[1], 'reorder applied';
  begin
    perform public.reorder_fields(v_team, v_ids[1:2]);
    raise exception 'partial reorder accepted';
  exception when sqlstate '22023' then null;
  end;

  update public.teams set insights_visibility = 'members', public_submissions_enabled = true where id = v_team;
  begin
    delete from public.team_fields where id = (select field_id from public.entries where team_id = v_team and author_id is not null limit 1);
    raise exception 'deleted field with entries';
  exception when foreign_key_violation then null;
  end;
  update public.team_fields set is_active = false
   where id = (select field_id from public.entries where team_id = v_team and author_id is not null limit 1);

  update public.team_members set role = 'admin' where team_id = v_team and email = 'bob@example.com';
  update public.team_members set role = 'member' where team_id = v_team and email = 'alice@example.com';
end $$;

-- ---------- anon: public link enabled ----------
reset role;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
set local role anon;
do $$
declare
  v_token text := (select v from t_ctx where k = 'token');
  v_form jsonb := public.get_public_form((select v from t_ctx where k = 'token'));
  v_field uuid;
begin
  assert v_form ->> 'team_name' = 'Team Rocket', 'public form exposes team name';
  assert jsonb_array_length(v_form -> 'fields') = 3, 'public form lists only active fields';
  v_field := (v_form -> 'fields' -> 0 ->> 'id')::uuid;
  perform public.submit_public_entry(v_token, v_field, 'from the public link');
  begin
    perform 1 from public.entries;
    raise exception 'anon read entries';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.get_insights((select v::uuid from t_ctx where k = 'team'), now() - interval '1 day', now() + interval '1 day');
    raise exception 'anon called get_insights';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.get_achievements((select v::uuid from t_ctx where k = 'team'));
    raise exception 'anon called get_achievements';
  exception when insufficient_privilege then null;
  end;
  assert public.get_public_form('deadbeef') is null, 'short/unknown token returns nothing';
end $$;

-- ---------- public link that requires identification ----------
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);
set local role authenticated;
do $$
declare
  v_team uuid := (select v::uuid from t_ctx where k = 'team');
  v_n int;
begin
  assert not (select public_requires_identity from public.my_teams() where id = v_team), 'public link is anonymous by default';
  update public.teams set public_requires_identity = true where id = v_team;
  get diagnostics v_n = row_count; assert v_n = 0, 'non-admin cannot require identification';
end $$;

reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}', true);
set local role authenticated;
do $$
declare
  v_team uuid := (select v::uuid from t_ctx where k = 'team');
begin
  update public.teams set public_requires_identity = true where id = v_team;
  assert (select public_requires_identity from public.my_teams() where id = v_team), 'admin requires identification';
end $$;

reset role;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
set local role anon;
do $$
declare
  v_token text := (select v from t_ctx where k = 'token');
  v_form jsonb := public.get_public_form((select v from t_ctx where k = 'token'));
begin
  assert (v_form ->> 'requires_identity')::boolean, 'public form tells that identification is required';
  begin
    perform public.submit_public_entry(v_token, (v_form -> 'fields' -> 0 ->> 'id')::uuid, 'who am I');
    raise exception 'anon submitted through identified link';
  exception when sqlstate '28000' then null;
  end;
end $$;

-- unknown subject (no profile) is not identified either
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000ff","role":"authenticated"}', true);
set local role authenticated;
do $$
declare
  v_token text := (select v from t_ctx where k = 'token');
  v_form jsonb := public.get_public_form((select v from t_ctx where k = 'token'));
begin
  begin
    perform public.submit_public_entry(v_token, (v_form -> 'fields' -> 0 ->> 'id')::uuid, 'ghost');
    raise exception 'unknown subject submitted through identified link';
  exception when sqlstate '28000' then null;
  end;
end $$;

-- carol is not a team member, but may report through the identified link under her name
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000c","role":"authenticated"}', true);
set local role authenticated;
do $$
declare
  v_token text := (select v from t_ctx where k = 'token');
  v_form jsonb := public.get_public_form((select v from t_ctx where k = 'token'));
  v_entry uuid;
  v_n int;
begin
  perform public.submit_public_entry(v_token, (v_form -> 'fields' -> 0 ->> 'id')::uuid, '  carol speaks  ');
  assert (select count(*) from public.entries) = 1, 'carol sees her own entry';
  assert (select content from public.entries) = 'carol speaks', 'identified content trimmed';
  assert (select author_id from public.entries) = auth.uid(), 'identified entry is authored by carol';
  assert (select count(*) from public.teams) = 0, 'reporting does not make carol a member';
  select id into v_entry from public.entries;
  update public.entries set content = 'edited' where id = v_entry;
  get diagnostics v_n = row_count; assert v_n = 0, 'non-member cannot edit the entry';
  begin
    perform public.get_insights((select v::uuid from t_ctx where k = 'team'), now() - interval '1 day', now() + interval '1 day');
    raise exception 'carol read insights';
  exception when insufficient_privilege then null;
  end;
end $$;

-- ---------- joining the team through the public link ----------
-- carol (still an outsider) cannot join while joining is off
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000c","role":"authenticated"}', true);
set local role authenticated;
do $$
declare
  v_token text := (select v from t_ctx where k = 'token');
begin
  assert not (public.get_public_form(v_token) ->> 'allow_join')::boolean, 'joining is off by default';
  assert public.get_public_form(v_token) -> 'member_team_id' = 'null'::jsonb, 'outsider is not reported as member';
  begin
    perform public.join_team_via_link(v_token);
    raise exception 'joined while joining is off';
  exception when sqlstate 'P0001' then
    if sqlerrm not like '%Joining%' then raise; end if;
  end;
end $$;

-- alice (member) cannot enable joining; bob (admin) can
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);
set local role authenticated;
do $$
declare
  v_team uuid := (select v::uuid from t_ctx where k = 'team');
  v_n int;
begin
  update public.teams set public_allow_join = true where id = v_team;
  get diagnostics v_n = row_count; assert v_n = 0, 'non-admin cannot allow joining';
end $$;

reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}', true);
set local role authenticated;
do $$
declare
  v_team uuid := (select v::uuid from t_ctx where k = 'team');
begin
  update public.teams set public_allow_join = true where id = v_team;
  assert (select public_allow_join from public.my_teams() where id = v_team), 'admin allows joining';
end $$;

-- anon cannot join (must sign in)
reset role;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
set local role anon;
do $$ begin
  assert (public.get_public_form((select v from t_ctx where k = 'token')) ->> 'allow_join')::boolean, 'form tells joining is allowed';
  begin
    perform public.join_team_via_link((select v from t_ctx where k = 'token'));
    raise exception 'anon joined';
  exception when insufficient_privilege then null;
  end;
end $$;

-- unknown subject (no profile) cannot join
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000ff","role":"authenticated"}', true);
set local role authenticated;
do $$ begin
  begin
    perform public.join_team_via_link((select v from t_ctx where k = 'token'));
    raise exception 'unknown subject joined';
  exception when sqlstate '28000' then null;
  end;
end $$;

-- carol joins and becomes a regular member
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000c","role":"authenticated"}', true);
set local role authenticated;
do $$
declare
  v_team uuid := (select v::uuid from t_ctx where k = 'team');
  v_token text := (select v from t_ctx where k = 'token');
  v_field uuid := (select v::uuid from t_ctx where k = 'field');
  v_n int;
begin
  assert public.join_team_via_link(v_token) = v_team, 'join returns the team';
  assert public.join_team_via_link(v_token) = v_team, 'joining twice is harmless';
  assert (select count(*) from public.team_members where team_id = v_team and email = 'carol@example.com') = 1, 'carol added once';
  assert (select role from public.my_teams() where id = v_team) = 'member', 'carol joined as member';
  assert (select public_token from public.my_teams() where id = v_team) is null, 'joined member does not see the token';
  assert (public.get_public_form(v_token) ->> 'member_team_id')::uuid = v_team, 'form reports carol as member';
  assert (select count(*) from public.team_fields where team_id = v_team) = 4, 'carol reads fields like any member';
  update public.teams set public_allow_join = false where id = v_team;
  get diagnostics v_n = row_count; assert v_n = 0, 'joined member cannot change settings';
end $$;

-- ---------- bob (now admin): insights allowed, regenerate link, cleanup ----------
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}', true);
set local role authenticated;

do $$
declare
  v_team uuid := (select v::uuid from t_ctx where k = 'team');
  v_old text := (select v from t_ctx where k = 'token');
  v_new text;
  v_inactive uuid := (select id from public.team_fields where team_id = v_team and not is_active limit 1);
  v_active uuid := (select id from public.team_fields where team_id = v_team and is_active order by position limit 1);
  v_entry uuid := (select id from public.entries where team_id = v_team and author_id = auth.uid() limit 1);
begin
  assert (select count(*) from public.get_insights(v_team, now() - interval '1 day', now() + interval '1 day')
          where is_anonymous) = 2, 'public + anonymous entries are both anonymous';
  assert (select author_name from public.get_insights(v_team, now() - interval '1 day', now() + interval '1 day')
          where content = 'carol speaks' and not is_anonymous) = 'Carol Outsider', 'identified public entry shows its author';

  v_new := public.regenerate_public_token(v_team);
  assert v_new <> v_old and length(v_new) = 64, 'token regenerated';
  assert public.get_public_form(v_old) is null, 'old link stops working';
  assert public.get_public_form(v_new) is not null, 'new link works';

  update public.entries set content = 'Bob is very happy' where id = v_entry;
  assert (select content from public.entries where id = v_entry) = 'Bob is very happy', 'edit own entry';
  begin
    insert into public.entries (team_id, field_id, content) values (v_team, v_inactive, 'nope');
    raise exception 'inserted on inactive field';
  exception when sqlstate 'P0001' then null;
  end;
  update public.entries set field_id = v_active where id = v_entry;
  assert (select field_id from public.entries where id = v_entry) = v_active, 'move entry to other field';
  begin
    update public.entries set content = '   ' where id = v_entry;
    raise exception 'empty content accepted';
  exception when check_violation then null;
  end;
  delete from public.entries where id = v_entry;
  assert (select count(*) from public.entries where id = v_entry) = 0, 'delete own entry';
  assert (select count(*) from public.get_action_items(v_team)
          where entry_id is null and source_content = 'Bob is happy' and done_at is not null) = 1, 'action item survives its entry';
  assert (select bool_and(can_delete) from public.get_action_items(v_team)), 'admin may delete any action item';
  perform public.delete_action_item((select v::uuid from t_ctx where k = 'ai2'));
  assert (select count(*) from public.get_action_items(v_team)) = 1, 'admin deleted an action item';

  delete from public.teams where id = v_team;
  assert (select count(*) from public.my_teams()) = 0, 'team deleted (cascade)';
end $$;

reset role;
select 'ALL RLS TESTS PASSED' as result;
rollback;
