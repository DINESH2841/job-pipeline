begin;

-- Post-migration RLS hardening.
-- Apply this AFTER the data import has succeeded.

alter table public.jobs enable row level security;
alter table public.applications enable row level security;
alter table public.pipeline_logs enable row level security;
alter table public.raw_jobs enable row level security;

-- Remove migration-time permissive policies if present.
drop policy if exists jobs_migration_select on public.jobs;
drop policy if exists jobs_migration_insert on public.jobs;
drop policy if exists jobs_migration_update on public.jobs;

drop policy if exists applications_migration_select on public.applications;
drop policy if exists applications_migration_insert on public.applications;
drop policy if exists applications_migration_update on public.applications;

drop policy if exists pipeline_logs_migration_select on public.pipeline_logs;
drop policy if exists pipeline_logs_migration_insert on public.pipeline_logs;
drop policy if exists pipeline_logs_migration_update on public.pipeline_logs;

drop policy if exists raw_jobs_migration_select on public.raw_jobs;
drop policy if exists raw_jobs_migration_insert on public.raw_jobs;
drop policy if exists raw_jobs_migration_update on public.raw_jobs;

-- Replace with locked-down runtime policies.

-- jobs: read-only for frontend (anon/authenticated), no public writes.
drop policy if exists jobs_read_public on public.jobs;
create policy jobs_read_public
on public.jobs
for select
to anon, authenticated
using (true);

-- applications: no public access (backend should use service role).
drop policy if exists applications_no_public_access on public.applications;
create policy applications_no_public_access
on public.applications
for all
to anon, authenticated
using (false)
with check (false);

-- pipeline_logs: never public.
drop policy if exists pipeline_logs_no_public_access on public.pipeline_logs;
create policy pipeline_logs_no_public_access
on public.pipeline_logs
for all
to anon, authenticated
using (false)
with check (false);

-- raw_jobs: never public.
drop policy if exists raw_jobs_no_public_access on public.raw_jobs;
create policy raw_jobs_no_public_access
on public.raw_jobs
for all
to anon, authenticated
using (false)
with check (false);

comment on policy jobs_read_public on public.jobs is 'Frontend read-only access for jobs.';
comment on policy applications_no_public_access on public.applications is 'Block anon/authenticated; backend uses service role.';
comment on policy pipeline_logs_no_public_access on public.pipeline_logs is 'Internal table; block anon/authenticated.';
comment on policy raw_jobs_no_public_access on public.raw_jobs is 'Internal table; block anon/authenticated.';

commit;
