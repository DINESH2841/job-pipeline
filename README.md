# Automated Job Pipeline

A production-ready full-stack project that fetches jobs, filters and scores them with OpenAI, removes duplicates/old jobs, stores matches in Google Sheets, sends Gmail alerts, and displays jobs in a React dashboard.

---

## 1) Folder Structure

```text
job-pipeline/
│
├── backend/
│   ├── index.js
│   ├── services/
│   │   ├── fetchJobs.js
│   │   ├── filterJobs.js
│   │   ├── dedupeJobs.js
│   │   ├── sheets.js
│   │   ├── mailer.js
│   │   └── scorer.js
│   ├── utils/
│   │   └── helpers.js
│   ├── config/
│   │   └── env.js
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── api.js
│   │   ├── main.jsx
│   │   ├── index.css
│   │   └── components/
│   │       ├── JobCard.jsx
│   │       ├── Stats.jsx
│   │       └── Filters.jsx
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── postcss.config.js
│
├── .github/workflows/jobs.yml
├── .env.example
└── README.md
```

---

## 2) What the Backend Does

Pipeline in `backend/index.js`:

1. Fetch jobs from Apify LinkedIn + SerpAPI Indeed (`fetchJobs.js`)
2. Remove old jobs (`helpers.js`)
3. Dedupe by apply link and company+title (`dedupeJobs.js`)
4. Filter + score jobs with OpenAI (`filterJobs.js`)
5. Normalize scoring groups (`scorer.js`)
6. Append matched jobs to Google Sheets (`sheets.js`)
7. Send Gmail alert only if jobs exist (`mailer.js`)

---

## 3) Setup

### Prerequisites

- Node.js 18+
- Google Sheet (shared with service account email)
- OpenAI API key OR OpenRouter API key
- SerpAPI key
- Apify token
- Gmail app password

### Environment

1. Copy `.env.example` to `.env` in project root.
2. Fill all required keys.

For `GOOGLE_PRIVATE_KEY`, use the service account private key and preserve line breaks using `\\n` when needed.

### Install dependencies

Run these in separate terminals:

- `cd backend && npm install`
- `cd frontend && npm install`

### Run backend once

- `cd backend && npm start`

### Run backend cron locally (for testing)

Set in `.env`:

- `RUN_CRON_LOCALLY=true`

Then run:

- `cd backend && npm start`

### Run frontend

- `cd frontend && npm run dev`

---

## 4) Google Sheets Format

Sheet tab: `Jobs` (or set `GOOGLE_SHEET_TAB`)

Columns written by backend:

1. timestamp
2. title
3. company
4. location
5. score
6. link
7. group

Use first row as headers.

---

## 5) GitHub Actions Deployment (Backend Automation)

Workflow: `.github/workflows/jobs.yml`

Runs twice daily:

- 9:00 AM IST (03:30 UTC)
- 6:00 PM IST (12:30 UTC)

### Add repository secrets in GitHub

- `OPENAI_API_KEY` (or `OPENROUTER_API_KEY`)
- `OPENAI_MODEL` (optional)
- `OPENROUTER_API_KEY` (optional)
- `OPENROUTER_MODEL` (optional, e.g. `openrouter/auto`)
- `OPENROUTER_HTTP_REFERER` (optional)
- `OPENROUTER_APP_TITLE` (optional)
- `SERPAPI_KEY`
- `APIFY_TOKEN`
- `APIFY_LINKEDIN_ACTOR` (optional)
- `GOOGLE_SHEET_ID`
- `GOOGLE_API_KEY`
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_PRIVATE_KEY`
- `GOOGLE_SHEET_TAB`
- `GMAIL_USER`
- `GMAIL_PASS`
- `ALERT_RECIPIENTS`
- `JOB_KEYWORDS`
- `JOB_LOCATION`
- `DAYS_TO_KEEP`

After pushing the repository, the workflow runs on schedule and can be manually triggered via **Actions → Automated Job Pipeline → Run workflow**.

---

## 6) Frontend Deployment (Vercel)

1. Import the `job-pipeline` repository in Vercel.
2. Set **Root Directory** to `frontend`.
3. Add environment variables in Vercel:
   - `VITE_GOOGLE_SHEET_ID`
   - `VITE_GOOGLE_API_KEY`
   - `VITE_GOOGLE_SHEET_RANGE` (optional, e.g. `Jobs!A:G`)
4. Deploy.

The dashboard will render job cards and allow filtering by `High`, `Good`, and `Low`.

---

## 7) Production Notes

- Keep Google Sheet access scoped to only required accounts.
- Prefer Gmail App Password (not account password).
- If OpenAI returns non-JSON, backend throws with explicit error to fail fast.
- For larger volumes, consider batching OpenAI calls and adding retry/backoff on external APIs.
