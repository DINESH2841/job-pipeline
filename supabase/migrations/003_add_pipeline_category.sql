begin;

alter table public.jobs
  add column if not exists category text;

alter table public.raw_jobs
  add column if not exists category text;

comment on column public.jobs.category is 'Pipeline category used to classify jobs (software, embedded, hardware).';
comment on column public.raw_jobs.category is 'Pipeline category used to classify raw job rows.';

commit;