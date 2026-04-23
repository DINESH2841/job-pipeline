# Deployment Guide

This guide explains how to deploy the backend and frontend separately to Railway or Render.

## Overview

- **Backend**: Node.js Express API server (runs on port 4000)
- **Frontend**: React + Vite (communicates with backend via API)

The backend and frontend are now completely decoupled and can be deployed independently.

---

## Backend Deployment

### Option 1: Deploy on Railway

#### Prerequisites
- Railway account (https://railway.app)
- GitHub repository with this code

#### Steps

1. **Push code to GitHub** (if not already done)
   ```bash
   git add .
   git commit -m "Separate backend for independent deployment"
   git push
   ```

2. **Create Railway Project**
   - Go to https://railway.app/dashboard
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Select your job-pipeline repository

3. **Configure Railway**
   - Railway will auto-detect Node.js
   - Set **Root Directory**: `backend`
   - Set **Start Command**: `npm start`

4. **Set Environment Variables**
   - Go to Variables tab in Railway
   - Add all variables from `backend/.env.example`:
     ```
     PORT=4000
     NODE_ENV=production
     SUPABASE_URL=...
     SUPABASE_KEY=...
     GOOGLE_PRIVATE_KEY=...
     (and others as needed)
     ```

5. **Deploy**
   - Click "Deploy" or just push changes to GitHub
   - Railway automatically redeploys on push

6. **Get Backend URL**
   - After deployment, Railway provides a URL (e.g., `https://job-pipeline-api-prod.railway.app`)
   - Copy this URL for frontend configuration

---

### Option 2: Deploy on Render

#### Prerequisites
- Render account (https://render.com)
- GitHub repository with this code

#### Steps

1. **Create New Web Service on Render**
   - Go to https://dashboard.render.com
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Select the job-pipeline repository

2. **Configure Service**
   - **Name**: `job-pipeline-backend`
   - **Root Directory**: `backend`
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Choose Free or Paid

3. **Set Environment Variables**
   - Go to Environment tab
   - Add all variables from `backend/.env.example`:
     ```
     PORT=4000
     NODE_ENV=production
     SUPABASE_URL=...
     SUPABASE_KEY=...
     GOOGLE_PRIVATE_KEY=...
     (and others as needed)
     ```

4. **Deploy**
   - Click "Create Web Service"
   - Render automatically deploys and redeploys on GitHub push

5. **Get Backend URL**
   - Your backend will be available at: `https://job-pipeline-backend.onrender.com`
   - Copy this URL for frontend configuration

---

## Frontend Deployment

### Option 1: Deploy on Vercel (Recommended for React)

#### Steps

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Configure Frontend for Production API**
   - Create `frontend/.env.production`:
     ```
     VITE_BACKEND_URL=https://job-pipeline-backend.onrender.com
     # or Railway URL: https://job-pipeline-api-prod.railway.app
     ```

3. **Deploy**
   ```bash
   cd frontend
   vercel
   ```

4. **Set Environment Variables in Vercel Dashboard**
   - Go to Project Settings → Environment Variables
   - Add `VITE_BACKEND_URL` with your backend URL

---

### Option 2: Deploy on Netlify

#### Steps

1. **Create Netlify Site**
   - Go to https://app.netlify.com
   - Click "Add new site" → "Import an existing project"
   - Select GitHub repository

2. **Configure Build**
   - **Base directory**: `frontend`
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`

3. **Set Environment Variables**
   - Go to Site settings → Build & deploy → Environment
   - Add `VITE_BACKEND_URL`:
     ```
     VITE_BACKEND_URL=https://your-backend-url.onrender.com
     ```

4. **Deploy**
   - Netlify automatically deploys on push

---

### Option 3: Deploy on Render (Same as backend)

1. **Create Static Site on Render**
   - Click "New +" → "Static Site"
   - Connect GitHub repository

2. **Configure**
   - **Name**: `job-pipeline-frontend`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Publish Directory**: `dist`

3. **Set Environment Variables**
   - Add `VITE_BACKEND_URL=https://job-pipeline-backend.onrender.com`

4. **Deploy**
   - Click "Create Static Site"

---

## Testing Deployment

### 1. Verify Backend Health
```bash
curl https://your-backend-url/health
```

Should return:
```json
{"ok":true,"service":"job-pipeline-api"}
```

### 2. Verify Backend API
```bash
curl https://your-backend-url/api/jobs
```

### 3. Check Frontend Configuration
- In browser DevTools (Network tab), verify requests go to correct backend URL
- No CORS errors should appear

---

## Environment Variables Reference

### Backend Required Variables
```
PORT=4000
NODE_ENV=production
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key
GOOGLE_PRIVATE_KEY=your_google_private_key
GOOGLE_CLIENT_EMAIL=your_google_client_email
OPENAI_API_KEY=your_openai_key
```

### Frontend Required Variables
```
VITE_BACKEND_URL=https://your-deployed-backend.com
```

---

## Troubleshooting

### CORS Errors
If you see "CORS error" in browser console:
1. Backend must have `CORS_ORIGIN` set to include frontend URL
2. Update `backend/apiServer.js` CORS settings:
   ```javascript
   app.use(cors({
     origin: process.env.CORS_ORIGIN?.split(',') || '*',
     credentials: true
   }));
   ```

### Backend Not Responding
1. Check backend URL in browser DevTools Network tab
2. Visit `https://your-backend-url/health` to verify it's running
3. Check Railway/Render logs for errors

### Frontend Not Loading Data
1. Check browser DevTools Network tab
2. Verify `VITE_BACKEND_URL` is correct
3. Ensure backend environment variables are set correctly

### Railway/Render Deployment Fails
1. Check deployment logs for errors
2. Verify all required environment variables are set
3. Ensure `package.json` `start` script is correct
4. Check `backend/package.json` for missing dependencies

---

## Local Development

### Run Backend Locally
```bash
cd backend
npm install
npm run dev  # or npm start for production mode
```

Backend runs on `http://localhost:4000`

### Run Frontend Locally
```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`

The frontend will automatically use `VITE_BACKEND_URL` from `.env` or default to `http://localhost:4000`

---

## Next Steps

1. ✅ Update backend CORS configuration (see CORS Errors section)
2. ✅ Set up environment variables on Railway/Render
3. ✅ Deploy backend first
4. ✅ Get backend URL
5. ✅ Configure frontend with backend URL
6. ✅ Deploy frontend
7. ✅ Test API communication

Good luck! 🚀
