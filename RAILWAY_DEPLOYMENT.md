# Railway Deployment Checklist

## Pre-Deployment

- [ ] Backend environment variables are set in Railway dashboard
- [ ] Frontend VITE_BACKEND_URL is configured
- [ ] All secrets (API keys) are added to Railway
- [ ] Repository is pushed to GitHub

## Deployment Steps

### 1. Deploy Backend to Railway

```bash
# Make sure all code is committed
git add .
git commit -m "Prepare for Railway deployment"
git push

# Go to https://railway.app/dashboard
# Create new project → Deploy from GitHub repo
# Select job-pipeline repository
```

**In Railway Dashboard:**

1. Create new project
2. Select "Deploy from GitHub"
3. Choose your repository
4. Railway auto-detects Node.js
5. Set Root Directory to: `backend`
6. Set Start Command to: `npm start`
7. Add environment variables from `backend/.env.example`
8. Deploy!

**Get Your Backend URL:**
After deployment succeeds, Railway will show you a URL like:
```
https://job-pipeline-prod-backend.railway.app
```

### 2. Deploy Frontend to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy frontend
cd frontend
vercel

# During setup:
# - Select your GitHub account
# - Create new project
# - Import from existing project
```

**In Vercel Dashboard:**

1. Go to Project Settings → Environment Variables
2. Add: `VITE_BACKEND_URL=https://job-pipeline-prod-backend.railway.app`
3. Redeploy

## Verification

### Test Backend
```bash
curl https://your-railway-url/health
# Should return: {"ok":true,"service":"job-pipeline-api"}

curl https://your-railway-url/api/jobs
# Should return job data from Supabase
```

### Test Frontend
1. Open your Vercel frontend URL
2. Open DevTools → Network tab
3. Check that requests go to Railway backend
4. Verify no CORS errors

## Environment Variables for Railway

Copy-paste these into Railway dashboard, replacing values:

```
PORT=4000
NODE_ENV=production
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key
GOOGLE_PRIVATE_KEY=your_google_private_key
GOOGLE_CLIENT_EMAIL=your_google_client_email
GOOGLE_PROJECT_ID=your_google_project_id
SHEET_ID=your_sheet_id
OPENAI_API_KEY=your_openai_key
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
ADMIN_EMAIL=your_email@gmail.com
CORS_ORIGIN=https://your-vercel-url.vercel.app
```

## Auto-Redeployment

Both Railway and Vercel automatically redeploy when you:
1. Push to main branch
2. Close a PR

No manual deployment needed!

## Troubleshooting

**Frontend shows "Failed to fetch jobs"**
- Check DevTools Network tab for CORS errors
- Verify backend URL in Vercel environment variables
- Check backend `/health` endpoint

**Backend returns 500 error**
- Check Railway logs
- Verify all environment variables are set
- Check Supabase credentials

**Changes not deployed**
- Push changes to GitHub
- Check deployment logs in Railway/Vercel

---

Need help? Check `DEPLOYMENT.md` for more details.
