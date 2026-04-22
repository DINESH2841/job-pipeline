begin;

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  company text not null,
  location text not null default '',
  link text not null unique,
  score integer not null default 0,
  job_type text,
  experience text,
  skills text,
  job_group text,
  posted_time text,
  source text,
  sheet_timestamp text,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists jobs_company_idx on public.jobs (company);
create index if not exists jobs_score_idx on public.jobs (score desc);
create index if not exists jobs_posted_time_idx on public.jobs (posted_time);

drop trigger if exists jobs_set_updated_at on public.jobs;
create trigger jobs_set_updated_at
before update on public.jobs
for each row execute function public.set_updated_at();

alter table public.jobs enable row level security;
drop policy if exists jobs_migration_select on public.jobs;
drop policy if exists jobs_migration_insert on public.jobs;
drop policy if exists jobs_migration_update on public.jobs;
create policy jobs_migration_select
on public.jobs
for select
to anon, authenticated
using (true);
create policy jobs_migration_insert
on public.jobs
for insert
to anon, authenticated
with check (true);
create policy jobs_migration_update
on public.jobs
for update
to anon, authenticated
using (true)
with check (true);

create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references public.jobs(id) on delete set null,
  title text not null,
  company text not null,
  apply_link text,
  status text not null default 'New',
  applied_date text,
  notes text,
  source text,
  last_updated text,
  source_hash text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint applications_status_check check (status in ('New', 'Applied', 'Assessment', 'Interview', 'In Progress', 'Rejected', 'Offer'))
);

create index if not exists applications_job_id_idx on public.applications (job_id);
create index if not exists applications_status_idx on public.applications (status);
create index if not exists applications_company_idx on public.applications (company);

drop trigger if exists applications_set_updated_at on public.applications;
create trigger applications_set_updated_at
before update on public.applications
for each row execute function public.set_updated_at();

alter table public.applications enable row level security;
drop policy if exists applications_migration_select on public.applications;
drop policy if exists applications_migration_insert on public.applications;
drop policy if exists applications_migration_update on public.applications;
create policy applications_migration_select
on public.applications
for select
to anon, authenticated
using (true);
create policy applications_migration_insert
on public.applications
for insert
to anon, authenticated
with check (true);
create policy applications_migration_update
on public.applications
for update
to anon, authenticated
using (true)
with check (true);

create table if not exists public.pipeline_logs (
  id uuid primary key default gen_random_uuid(),
  run_id text not null,
  run_time timestamptz,
  level text not null default 'info',
  step text not null,
  message text not null default '',
  jobs_fetched integer,
  jobs_saved integer,
  data jsonb not null default '{}'::jsonb,
  errors jsonb not null default '[]'::jsonb,
  source_hash text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists pipeline_logs_run_id_idx on public.pipeline_logs (run_id);
create index if not exists pipeline_logs_run_time_idx on public.pipeline_logs (run_time desc);
create index if not exists pipeline_logs_level_idx on public.pipeline_logs (level);

drop trigger if exists pipeline_logs_set_updated_at on public.pipeline_logs;
create trigger pipeline_logs_set_updated_at
before update on public.pipeline_logs
for each row execute function public.set_updated_at();

alter table public.pipeline_logs enable row level security;
drop policy if exists pipeline_logs_migration_select on public.pipeline_logs;
drop policy if exists pipeline_logs_migration_insert on public.pipeline_logs;
drop policy if exists pipeline_logs_migration_update on public.pipeline_logs;
create policy pipeline_logs_migration_select
on public.pipeline_logs
for select
to anon, authenticated
using (true);
create policy pipeline_logs_migration_insert
on public.pipeline_logs
for insert
to anon, authenticated
with check (true);
create policy pipeline_logs_migration_update
on public.pipeline_logs
for update
to anon, authenticated
using (true)
with check (true);

create table if not exists public.raw_jobs (
  id uuid primary key default gen_random_uuid(),
  sheet_name text not null default 'RawData',
  source_row integer,
  sheet_timestamp text,
  title text,
  company text,
  location text,
  job_type text,
  experience text,
  skills text,
  score integer,
  job_group text,
  apply_link text,
  posted_time text,
  source text,
  raw_payload jsonb not null default '{}'::jsonb,
  source_hash text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists raw_jobs_sheet_name_idx on public.raw_jobs (sheet_name);
create index if not exists raw_jobs_title_company_idx on public.raw_jobs (title, company);
create index if not exists raw_jobs_source_row_idx on public.raw_jobs (sheet_name, source_row);

drop trigger if exists raw_jobs_set_updated_at on public.raw_jobs;
create trigger raw_jobs_set_updated_at
before update on public.raw_jobs
for each row execute function public.set_updated_at();

alter table public.raw_jobs enable row level security;
drop policy if exists raw_jobs_migration_select on public.raw_jobs;
drop policy if exists raw_jobs_migration_insert on public.raw_jobs;
drop policy if exists raw_jobs_migration_update on public.raw_jobs;
create policy raw_jobs_migration_select
on public.raw_jobs
for select
to anon, authenticated
using (true);
create policy raw_jobs_migration_insert
on public.raw_jobs
for insert
to anon, authenticated
with check (true);
create policy raw_jobs_migration_update
on public.raw_jobs
for update
to anon, authenticated
using (true)
with check (true);

comment on table public.jobs is 'Migrated from the Google Sheets Jobs tab.';
comment on table public.applications is 'Migrated from Google Sheets History rows.';
comment on table public.pipeline_logs is 'Migrated from Google Sheets Logs tab.';
comment on table public.raw_jobs is 'Migrated from Google Sheets RawData tab.';

-- Migration-time note for publishable-key writes:
-- These policies intentionally allow the publishable-key migration to read and
-- write the tables during the import. After the migration, replace them with
-- tighter app-specific policies if you need stricter runtime access control.

commit;