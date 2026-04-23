# Backend Separation & Deployment Guide

## What's Been Set Up

Your backend and frontend are now **completely independent** and ready for separate deployment! 

### Structure

```
job-pipeline/
├── backend/           ← Node.js Express API (runs on port 4000)
│   ├── apiServer.js   ← API server entry point
│   ├── Dockerfile     ← For Docker deployment
│   ├── .env.example   ← Environment variables template
│   └── package.json
├── frontend/          ← React + Vite app (runs on port 5173)
│   ├── .env.local     ← Points to http://localhost:4000
│   └── package.json
└── Deployment docs...
```

---

## 🚀 Quick Start: Run Locally

### Option 1: Windows Users
```cmd
start-dev.bat
```
This opens both backend and frontend in separate terminal windows.

### Option 2: Mac/Linux Users
```bash
./start-dev.sh
```

### Option 3: Manual Control
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

Open browser to `http://localhost:5173` - frontend will automatically fetch from `http://localhost:4000`

---

## 📦 Backend: How It Works Now

### Before (Coupled)
- Backend and frontend had to run together
- Frontend couldn't access data without backend

### After (Decoupled) ✅
- Backend is a standalone REST API
- Frontend makes HTTP requests to backend API
- Can deploy separately
- Can be used by multiple frontends

### Backend Features
- **Health Check**: `GET /health` → `{"ok":true,"service":"job-pipeline-api"}`
- **Get Jobs**: `GET /api/jobs` → Returns jobs from Supabase
- **Get History**: `GET /api/history` → Returns application history
- **CORS**: Configured to accept requests from frontend
- **Environment Variables**: All sensitive data in `.env` file

---

## 🌐 Frontend: How It Works Now

### Configuration
Frontend looks for backend URL in this order:
1. `VITE_BACKEND_URL` environment variable
2. Falls back to `http://localhost:4000`

### Environment Files

**Local Development** (`frontend/.env.local`):
```env
VITE_BACKEND_URL=http://localhost:4000
```

**Production** (create `frontend/.env.production`):
```env
VITE_BACKEND_URL=https://your-backend-url.onrender.com
```

---

## 🎯 Deployment: Choose Your Platform

### Option 1: Railway (Recommended) ✅

**Advantages:**
- ✅ Simple setup
- ✅ Free tier available
- ✅ Auto-redeploy on GitHub push
- ✅ Good for Node.js backends

**Steps:**
1. See `RAILWAY_DEPLOYMENT.md`
2. Backend URL: `https://job-pipeline-backend.railway.app`
3. Frontend on Vercel: `https://job-pipeline-frontend.vercel.app`

### Option 2: Render

**Advantages:**
- ✅ Free tier available
- ✅ Static site hosting included
- ✅ Easy GitHub integration

**Disadvantages:**
- ⚠️ Free tier spins down after 15 min inactivity

**Steps:**
1. See `RENDER_DEPLOYMENT.md`
2. Backend URL: `https://job-pipeline-backend.onrender.com`
3. Frontend URL: `https://job-pipeline-frontend.onrender.com`

---

## 📋 Deployment Checklist

### Before Deployment

- [ ] All code pushed to GitHub
- [ ] Backend `.env` file created (copy from `backend/.env.example`)
- [ ] All environment variables filled in:
  - [ ] `SUPABASE_URL` and `SUPABASE_KEY`
  - [ ] `GOOGLE_PRIVATE_KEY` and related Google vars
  - [ ] `OPENAI_API_KEY` (if using)
  - [ ] Email configuration (`SMTP_*` variables)

### Deploy Backend First

- [ ] Backend deployed to Railway or Render
- [ ] Get backend URL (e.g., `https://job-pipeline-backend.railway.app`)
- [ ] Test backend health: `curl https://your-backend-url/health`
- [ ] Update `CORS_ORIGIN` in backend env vars to include frontend URL

### Then Deploy Frontend

- [ ] Frontend `.env.production` created with backend URL
- [ ] Frontend deployed to Vercel or Render
- [ ] Test frontend loads at its URL
- [ ] Verify frontend can fetch data from backend (Network tab in DevTools)

---

## 🔧 Environment Variables

### Backend Variables
Copy all to your Railway/Render dashboard:

```env
# Server
PORT=4000
NODE_ENV=production

# Supabase
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_KEY=eyJhbGciOi...

# Google Sheets
GOOGLE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...
GOOGLE_CLIENT_EMAIL=...@iam.gserviceaccount.com
GOOGLE_PROJECT_ID=my-project-id
SHEET_ID=1BxiMVs0XRA5nFMXT...

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-char-app-password
ADMIN_EMAIL=recipient@example.com

# AI
OPENAI_API_KEY=sk-...

# CORS (set to your frontend URL during deployment)
CORS_ORIGIN=https://job-pipeline-frontend.onrender.com
```

### Frontend Variables
In deployment platform:
```env
VITE_BACKEND_URL=https://your-deployed-backend-url.com
```

---

## ✅ Testing Deployment

### Backend Tests

```bash
# Health check
curl https://your-backend-url/health
# Should return: {"ok":true,"service":"job-pipeline-api"}

# Jobs endpoint
curl https://your-backend-url/api/jobs
# Should return: {"ok":true,"jobs":[...]}
```

### Frontend Tests

1. Open frontend URL in browser
2. Open DevTools (F12) → Network tab
3. Look for requests to your backend URL
4. Verify no CORS errors in Console tab
5. Check if data loads on page

---

## 🆘 Troubleshooting

### Frontend can't connect to backend

**Error**: "Failed to fetch jobs" or CORS error

**Fix:**
1. Check DevTools Network tab - what URL is being called?
2. Visit backend health endpoint directly: `https://your-backend-url/health`
3. Update `VITE_BACKEND_URL` in frontend environment
4. Update `CORS_ORIGIN` in backend environment to include frontend URL

### Backend returns 500 error

**Check logs:**
- Railway: View logs in dashboard
- Render: View logs in dashboard
- Verify all environment variables are set
- Test Supabase connection

### Data shows locally but not in production

**Causes:**
- Backend URL misconfigured
- Environment variables not set on server
- CORS blocking the request
- Backend not running

**Fix:**
1. Check backend is running: `curl https://your-backend-url/health`
2. Check frontend points to correct URL
3. Check no CORS errors in frontend DevTools
4. Check all env vars in deployment platform

---

## 📚 Documentation Files

| File | Purpose |
|------|---------|
| `DEPLOYMENT.md` | Complete deployment guide |
| `RAILWAY_DEPLOYMENT.md` | Step-by-step Railway setup |
| `RENDER_DEPLOYMENT.md` | Step-by-step Render setup |
| `backend/.env.example` | Backend config template |
| `frontend/.env.example` | Frontend config template |
| `frontend/.env.local` | Local development config |
| `backend/Dockerfile` | Docker configuration |

---

## 🎯 Next Steps

### Immediately
1. ✅ Test locally: `npm run dev` in backend, `npm run dev` in frontend
2. ✅ Verify frontend shows data from backend
3. ✅ Make sure no CORS errors appear

### For Deployment
1. ✅ Choose Railway or Render
2. ✅ Read the appropriate deployment guide
3. ✅ Prepare all environment variables
4. ✅ Deploy backend first
5. ✅ Get backend URL
6. ✅ Configure frontend with backend URL
7. ✅ Deploy frontend
8. ✅ Test in production

### Optional
- [ ] Set up auto-redeploy webhooks
- [ ] Add monitoring/alerts
- [ ] Set up CI/CD pipeline
- [ ] Configure custom domain

---

## 💡 Quick Reference

| What | Local | Railway | Render |
|------|-------|---------|--------|
| Backend | `http://localhost:4000` | `https://xxx.railway.app` | `https://xxx.onrender.com` |
| Frontend | `http://localhost:5173` | Vercel | `https://xxx.onrender.com` |
| Speed | Instant | 10-30s deploy | 5-10s deploy (free tier slow) |
| Cost | Free | Free tier available | Free tier available |
| Setup | Auto | Medium | Medium |

---

## 🚀 You're All Set!

Your backend and frontend are now ready to run independently. Start with local testing, then deploy to your chosen platform!

Questions? Check the documentation files or the platform-specific guides.

Happy coding! 🎉
