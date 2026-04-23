# Render Deployment Checklist

## Pre-Deployment

- [ ] Backend environment variables prepared
- [ ] Frontend VITE_BACKEND_URL configured
- [ ] All secrets (API keys) available
- [ ] Repository is pushed to GitHub

## Deployment Steps

### 1. Deploy Backend to Render

1. Go to https://dashboard.render.com
2. Click "New +" → "Web Service"
3. Connect your GitHub account and select `job-pipeline` repo

**Configure Backend Service:**
- **Name**: `job-pipeline-backend`
- **Environment**: Node
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Root Directory**: `backend`
- **Plan**: Free or Paid (Free allows 1 free instance)

**Add Environment Variables:**
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
CORS_ORIGIN=https://your-frontend-url.onrender.com
```

**Get Your Backend URL:**
After deployment, you'll have:
```
https://job-pipeline-backend.onrender.com
```

### 2. Deploy Frontend to Render (Static Site)

1. Go to https://dashboard.render.com
2. Click "New +" → "Static Site"
3. Connect GitHub and select `job-pipeline` repo

**Configure Frontend Service:**
- **Name**: `job-pipeline-frontend`
- **Build Command**: `cd frontend && npm install && npm run build`
- **Publish Directory**: `frontend/dist`
- **Root Directory**: `.` (leave empty or set to root)

**Add Environment Variables:**
```
VITE_BACKEND_URL=https://job-pipeline-backend.onrender.com
```

## Verification

### Test Backend Health
```bash
curl https://job-pipeline-backend.onrender.com/health
# Should return: {"ok":true,"service":"job-pipeline-api"}
```

### Test Backend API
```bash
curl https://job-pipeline-backend.onrender.com/api/jobs
# Should return job data
```

### Test Frontend
1. Open your Static Site URL (e.g., https://job-pipeline-frontend.onrender.com)
2. Open DevTools → Network tab
3. Verify requests go to your backend URL
4. Check no CORS errors appear

## Auto-Redeployment

Render automatically redeploys when you push to GitHub main branch!

1. Make changes locally
2. `git commit` and `git push`
3. Render detects changes and redeploys automatically

## Known Issues

### Free Tier Limitations

Render Free tier has:
- Web services spin down after 15 minutes of inactivity (takes 30s to boot)
- Limited storage
- No custom domain

**Solution**: Use Paid plan for production, or use Railway instead

### Keep Backend Alive

To prevent spindown on free tier, add a health check cron job:

```javascript
// In your backend code
setInterval(async () => {
  try {
    await fetch('http://localhost:4000/health');
  } catch (err) {
    console.log('Health check ping');
  }
}, 5 * 60 * 1000); // Every 5 minutes
```

## Troubleshooting

### Frontend Shows "Failed to fetch jobs"
- [ ] Check browser DevTools Network tab
- [ ] Verify `VITE_BACKEND_URL` in Render environment
- [ ] Try accessing backend URL directly in browser
- [ ] Check for CORS errors in console

### Backend Returns 500 Error
- [ ] Check Render logs for detailed error
- [ ] Verify all environment variables are set
- [ ] Test Supabase connection

### Deployments Fail
- [ ] Check Render build logs
- [ ] Verify `backend/package.json` is correct
- [ ] Ensure all dependencies are listed
- [ ] Check for typos in build/start commands

### Free Tier Too Slow
- [ ] Upgrade to Paid plan
- [ ] Or switch to Railway for better free tier

---

For more detailed information, see `DEPLOYMENT.md`.
