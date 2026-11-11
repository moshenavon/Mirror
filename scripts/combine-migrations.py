#!/usr/bin/env python3
"""Builds supabase/mirror_all_migrations.sql: every migration in one idempotent, transactional file.

Usage: python3 scripts/combine-migrations.py supabase/mirror_all_migrations.sql
"""
import re, sys, pathlib
root = pathlib.Path(str(pathlib.Path(__file__).resolve().parent.parent / "supabase" / "migrations"))
files = sorted(root.glob("*.sql"))
out = []
out.append("""-- =====================================================================
-- Mirror – ALL migrations in one file (generated from supabase/migrations/)
--
-- Safe to run on:
--   * an empty database (creates everything), or
--   * a database where some or all of the migrations were already applied
--     (existing objects are kept / brought up to date, nothing is lost).
-- Runs as one transaction: if anything fails, nothing is changed.
--
-- Included, in order:
""" + "".join(f"--   {f.name}\n" for f in files) + """-- =====================================================================

begin;
""")

def constraint_guard(m):
    table, name, rest = m.group(1), m.group(2), m.group(3)
    return (f"do $$ begin\n  if not exists (select 1 from pg_constraint where conname = '{name}' "
            f"and conrelid = '{table}'::regclass) then\n"
            f"    alter table {table} add constraint {name} {rest};\n  end if;\nend $$;")

for f in files:
    sql = f.read_text()
    if f.name.endswith("_init.sql"):
        # Supabase Auth sync (function + trigger on auth.users) is dropped again by the next
        # migration (own Google auth), so it is not recreated here.
        sql = re.sub(r"create or replace function private\.sync_profile_from_auth\(\).*?\n\$\$;\n", "", sql, flags=re.S)
        sql = re.sub(r"create trigger on_auth_user_changed.*?;\n", "", sql, flags=re.S)
        # earlier versions of RPCs whose result type changes later
        sql = sql.replace("create or replace function public.my_teams()",
                          "drop function if exists public.my_teams();\ncreate function public.my_teams()")
        sql = sql.replace("create or replace function public.get_insights(",
                          "drop function if exists public.get_insights(uuid, timestamptz, timestamptz);\ncreate function public.get_insights(")
    # enum types
    sql = re.sub(r"create type (public\.\w+) as enum \(([^)]*)\);",
                 lambda m: f"do $$ begin\n  create type {m.group(1)} as enum ({m.group(2)});\nexception when duplicate_object then null;\nend $$;", sql)
    sql = re.sub(r"create table (public\.\w+)", r"create table if not exists \1", sql)
    sql = re.sub(r"create index (\w+) on", r"create index if not exists \1 on", sql)
    sql = re.sub(r"create trigger ", "create or replace trigger ", sql)
    sql = re.sub(r'create policy ("[^"]+")\n(\s+on (public\.\w+))', r'drop policy if exists \1 on \3;\ncreate policy \1\n\2', sql)
    sql = re.sub(r"add column (?!if not exists)", "add column if not exists ", sql)
    sql = re.sub(r"alter table (public\.\w+) add constraint (\w+) ([^;]+);", constraint_guard, sql)
    out.append(f"\n-- #####################################################################\n-- {f.name}\n-- #####################################################################\n")
    out.append(sql)

out.append("\ncommit;\n")
text = "".join(out)
for line in text.splitlines():
    for bad in ("create table public.", "create trigger ", "create type public.", "create index ") if not line.startswith("create index if not exists") else ():
        assert not line.startswith(bad), line
pathlib.Path(sys.argv[1]).write_text(text)
print("ok", len(text.splitlines()), "lines")
