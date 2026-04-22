# Job Pipeline

Job Pipeline tracks software and ECE roles, application history, raw scraped rows, and pipeline logs.

## Supabase migration

### Prerequisites

- Node.js installed in `backend/`
- A Supabase project with the SQL file applied
- Google Sheets access for the source spreadsheet
- These environment variables set:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
  - `GOOGLE_SHEET_ID`
  - `GOOGLE_SERVICE_ACCOUNT_EMAIL`
  - `GOOGLE_PRIVATE_KEY`

The SQL migration includes temporary RLS policies that allow the publishable-key import to select/insert/update the target tables. After the data load, replace them with stricter app policies if needed.

### 1) Apply the SQL schema

Run `supabase/migrations/001_sheets_to_supabase.sql` in the Supabase SQL editor or via your preferred migration flow.

### 2) Run the migration script

From the repository root, or from the `backend/` directory:

- run `npm run migrate:supabase` from the root, or `npm run migrate:supabase` inside `backend/`

The script reads the `Jobs`, `History`, `Logs`, and `RawData` tabs, cleans rows, and upserts them into PostgreSQL.

### 3) Verify the import

Check that:

- row counts roughly match the source tabs
- `jobs.link` is unique
- `applications.job_id` references `jobs.id`
- `pipeline_logs` and `raw_jobs` contain the expected counts

### 4) Re-run behavior

The migration is idempotent for the main tables:

- `jobs` is upserted by canonical link
- `applications`, `pipeline_logs`, and `raw_jobs` are upserted by a source hash

That means rerunning the script should not create duplicate rows.

### 5) Harden RLS after migration (recommended)

After data migration succeeds, apply:

- `supabase/migrations/002_harden_rls_post_migration.sql`

This enforces the final access model:

- frontend: read-only access to `jobs`
- frontend: no access to `applications`, `pipeline_logs`, `raw_jobs`
- backend: full control via Supabase service role key (server-side only)

## Notes

- The frontend should continue to use the publishable Supabase key only.
- Keep the service role key out of the browser bundle.

## Runtime architecture

- Frontend calls backend API only (`VITE_BACKEND_URL`)
- Backend owns all Supabase reads/writes via:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
- Supabase remains the single source of truth for jobs, applications, logs, and raw data

Do not call Supabase directly from the frontend for runtime operations.