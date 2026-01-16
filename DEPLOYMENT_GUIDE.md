# Comprehensive Deployment Guide for MediaFlow AI

Complete step-by-step guide for deploying both the Next.js application and the Python yt-dlp service.

## Overview

This guide covers two deployment options:

### Option 1: Hybrid Deployment (Vercel + Python Service)
1. **Next.js Application** → Vercel
2. **Python yt-dlp Service** → Railway/Render/Fly.io

### Option 2: All-in-One Deployment (Render) ✅ **RECOMMENDED FOR INTEGRATED YT-DLP**
1. **Next.js Application with Integrated yt-dlp** → Render
   - Everything in one service
   - No separate Python service needed
   - Simpler deployment and management

## Architecture

```
┌─────────────────┐         HTTP API          ┌──────────────────┐
│                 │ ────────────────────────> │                  │
│  Vercel (Next.js│                            │  Python Service  │
│     App)        │ <──────────────────────── │  (yt-dlp wrapper) │
│                 │      JSON Response        │  (Railway/Render) │
└─────────────────┘                            └──────────────────┘
```

## Prerequisites Checklist

Before starting, ensure you have:

- [ ] GitHub account with your code pushed to a repository
- [ ] Render account (free tier available at [render.com](https://render.com)) - **For all-in-one deployment**
- [ ] OR Vercel account (for hybrid deployment)
- [ ] OR Railway/Render/Fly.io account (for Python service in hybrid deployment)
- [ ] PostgreSQL database (Vercel Postgres, Supabase, Neon, or Render Postgres)
- [ ] Upstash Redis account (for rate limiting)
- [ ] (Optional) Browser cookies exported for YouTube (see `ytdlp-service/COOKIES_SETUP.md`)

---

## 🚀 Quick Start: Render Deployment (All-in-One) ✅ **RECOMMENDED**

**Best for:** Integrated yt-dlp functionality, simpler deployment, everything in one service

### Render Deployment Steps

#### Step 1: Sign Up

1. Go to [render.com](https://render.com)
2. Sign in with GitHub

#### Step 2: Create Web Service

1. Click "New" → "Web Service"
2. Connect your GitHub repository
3. Configure:
   - **Name**: `mediaflow-ai`
   - **Environment**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Root Directory**: `./` (root)

#### Step 3: Install Python & yt-dlp

Render needs Python and yt-dlp installed. Add this to your `package.json`:

```json
{
  "scripts": {
    "postinstall": "prisma generate && (python3 -m pip install yt-dlp || pip3 install yt-dlp || echo 'yt-dlp install skipped')"
  }
}
```

Or create a `render-build.sh`:

```bash
#!/bin/bash
npm install
npm run build
python3 -m pip install yt-dlp || pip3 install yt-dlp
```

#### Step 4: Environment Variables

Add in Render dashboard → Environment:

**Required:**
```env
DATABASE_URL=postgresql://user:password@host:5432/database
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-upstash-token
NEXT_PUBLIC_APP_URL=https://your-app.onrender.com
```

**Optional:**
```env
YTDLP_COOKIES_FILE=/opt/render/project/src/cookies.txt
JWT_SECRET=your-random-secret-key
```

#### Step 5: Deploy

1. Click "Create Web Service"
2. Wait for deployment (5-10 minutes)
3. Copy your service URL
4. Update `NEXT_PUBLIC_APP_URL` with your Render URL

#### Step 6: Test

1. Visit your app: `https://your-app.onrender.com`
2. Test video extraction with a YouTube URL
3. Check `/api/ytdlp/health` endpoint

**Benefits:**
- ✅ Everything in one service (no separate Python service)
- ✅ Integrated yt-dlp works perfectly on Render
- ✅ Simpler deployment and management
- ✅ Lower cost (one service instead of two)

**Note:** Free tier sleeps after 15 min inactivity (30-60s cold start)

---

## Part 1: Deploy Python yt-dlp Service

### Option A: Railway (Recommended - Easiest)

#### Step 1: Sign Up

1. Go to [railway.app](https://railway.app)
2. Click "Start a New Project"
3. Sign in with GitHub

#### Step 2: Create New Project

1. Click "New Project"
2. Select "Deploy from GitHub repo"
3. Choose your `medi-flow-ai` repository
4. **Important**: Set **Root Directory** to `ytdlp-service`
   - In Railway dashboard → Your service → Settings → Root Directory → Set to `ytdlp-service`

#### Step 3: Configure Environment Variables

1. Go to your service → Variables tab
2. Add the following:

```env
CORS_ORIGIN=*
```

**Note**: You'll update this to your Vercel URL after deploying the Next.js app.

#### Step 4: Deploy

1. Railway will automatically:
   - Detect Python
   - Install dependencies from `requirements.txt`
   - Start the service using `python main.py`

2. Wait for deployment (usually 2-3 minutes)
3. Copy your service URL (e.g., `https://ytdlp-api-production.up.railway.app`)

#### Step 5: Test the Service

```bash
# Health check
curl https://your-service-url.railway.app/health

# Expected response:
# {
#   "status": "ok",
#   "ytdlp_available": true,
#   "ytdlp_version": "2024.3.10",
#   "python_version": "3.11.x"
# }
```

#### Step 6: (Optional) Add Cookies for YouTube

If you want to avoid YouTube bot detection:

1. Export cookies from your browser (see `ytdlp-service/COOKIES_SETUP.md`)
2. Upload `cookies.txt` to Railway:
   - Go to your service → Settings → Volumes
   - Create a new volume
   - Mount it to `/app/cookies.txt`
   - Upload your cookies file

3. Add environment variable:
   ```env
   YTDLP_COOKIES_FILE=/app/cookies.txt
   ```

---

### Option B: Render

#### Step 1: Sign Up

1. Go to [render.com](https://render.com)
2. Sign in with GitHub

#### Step 2: Create Web Service

1. Click "New" → "Web Service"
2. Connect your GitHub repository
3. Configure:
   - **Name**: `ytdlp-api`
   - **Root Directory**: `ytdlp-service`
   - **Environment**: Python 3
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `python main.py`

#### Step 3: Environment Variables

Add in the Environment tab:

```env
CORS_ORIGIN=*
PORT=8000
```

#### Step 4: Deploy

1. Click "Create Web Service"
2. Wait for deployment
3. Note your service URL

**Note**: Render free tier services sleep after 15 minutes of inactivity. First request after sleep may take 30-60 seconds.

---

### Option C: Fly.io

#### Step 1: Install Fly CLI

```bash
# Windows (PowerShell)
iwr https://fly.io/install.ps1 -useb | iex

# Mac/Linux
curl -L https://fly.io/install.sh | sh
```

#### Step 2: Login

```bash
fly auth login
```

#### Step 3: Initialize and Deploy

```bash
cd ytdlp-service
fly launch
# Follow prompts:
# - App name: ytdlp-api (or your choice)
# - Region: Choose closest to you
# - PostgreSQL: No (we don't need it for this service)
# - Redis: No

# Add environment variable
fly secrets set CORS_ORIGIN="*"

# Deploy
fly deploy
```

#### Step 4: Get Service URL

```bash
fly info
# Note the Hostname (e.g., https://ytdlp-api.fly.dev)
```

---

## Part 2: Set Up Database (PostgreSQL)

### Option A: Vercel Postgres (Easiest - Recommended)

1. **After importing project to Vercel** (see Part 4):
   - Go to your Vercel project dashboard
   - Click "Storage" tab
   - Click "Create Database"
   - Select "Postgres"
   - Choose a name and region
   - Click "Create"

2. **Get Connection String**:
   - Go to Storage → Your database
   - Copy the `DATABASE_URL` (starts with `postgresql://`)
   - This will be automatically available as an environment variable

### Option B: Supabase

1. Sign up at [supabase.com](https://supabase.com)
2. Create new project
3. Go to Settings → Database
4. Copy connection string:
   - Use "URI" format
   - Format: `postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres`
   - Replace `[PASSWORD]` with your database password

### Option C: Neon

1. Sign up at [neon.tech](https://neon.tech)
2. Create new project
3. Copy connection string from dashboard
4. Use the connection pooling URL if available (better for serverless)

### Run Database Migrations

After getting your `DATABASE_URL`:

```bash
# Set locally (for migration)
# Windows PowerShell:
$env:DATABASE_URL="your-postgres-connection-string"

# Windows CMD:
set DATABASE_URL=your-postgres-connection-string

# Mac/Linux:
export DATABASE_URL="your-postgres-connection-string"

# Push schema to database
npx prisma db push

# Or generate migration
npx prisma migrate dev --name init
```

---

## Part 3: Set Up Redis (Upstash)

1. **Sign up at [upstash.com](https://upstash.com)**
2. **Create Redis Database**:
   - Click "Create Database"
   - Choose a name (e.g., `mediaflow-redis`)
   - Select region (closest to your Vercel deployment)
   - Choose "Regional" type
   - Click "Create"

3. **Get Credentials**:
   - Go to your database dashboard
   - Copy:
     - **REST URL** (e.g., `https://your-redis-12345.upstash.io`)
     - **REST Token** (long string starting with `AX`)

---

## Part 4: Deploy Next.js App to Vercel

### Step 1: Prepare Your Code

1. **Ensure all changes are committed**:
   ```bash
   git add .
   git commit -m "Prepare for deployment"
   git push origin main
   ```

2. **Verify these files exist**:
   - `vercel.json` (already exists)
   - `package.json`
   - `prisma/schema.prisma`
   - `.gitignore` (should exclude `.env.local`)

### Step 2: Import to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Click "Add New" → "Project"
3. Import your GitHub repository
4. Vercel will auto-detect Next.js

### Step 3: Configure Project Settings

1. **Project Name**: Choose a name (e.g., `mediaflow-ai`)
2. **Framework Preset**: Next.js (auto-detected)
3. **Root Directory**: `./` (root)
4. **Build Command**: `npm run build` (auto-detected)
5. **Output Directory**: `.next` (auto-detected)
6. **Install Command**: `npm install` (auto-detected)

### Step 4: Add Environment Variables

Click "Environment Variables" and add the following:

#### Required Variables:

```env
# Database
DATABASE_URL=postgresql://user:password@host:5432/database

# Redis (Upstash)
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-upstash-token

# yt-dlp Service
YTDLP_API_URL=https://your-ytdlp-service.railway.app
```

#### Optional Variables:

```env
# App URL (update after first deployment)
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app

# JWT Secret (generate a random string)
# Generate with: openssl rand -base64 32
JWT_SECRET=your-random-secret-key-here
```

**Important**:
- Set all variables for **Production**, **Preview**, and **Development** environments
- Click "Save" after adding each variable
- You can add `NEXT_PUBLIC_APP_URL` after the first deployment

### Step 5: Deploy

1. Click "Deploy"
2. Wait for build to complete (usually 2-5 minutes)
3. Your app will be live at `https://your-app.vercel.app`
4. **Copy your app URL** - you'll need it for the next step

### Step 6: Update Python Service CORS

After Vercel deployment:

1. Go back to Railway/Render/Fly.io dashboard
2. Update environment variable:
   ```env
   CORS_ORIGIN=https://your-app.vercel.app
   ```
3. Redeploy the Python service (or it will auto-redeploy if auto-deploy is enabled)

---

## Part 5: Verify Deployment

### Test Python Service

```bash
# Health check
curl https://your-ytdlp-service.railway.app/health

# Expected response:
# {
#   "status": "ok",
#   "ytdlp_available": true,
#   "ytdlp_version": "2024.3.10",
#   "python_version": "3.11.x"
# }
```

### Test Next.js App

1. **Visit your app**: `https://your-app.vercel.app`
2. **Test video extraction**:
   - Enter a YouTube URL (e.g., `https://www.youtube.com/watch?v=dQw4w9WgXcQ`)
   - Click "Download"
   - Should extract video information and show available formats

3. **Check for errors**:
   - Open browser console (F12)
   - Look for any red errors
   - Check Vercel function logs in dashboard

### Test Database Connection

1. Go to Vercel dashboard → Your project → Functions
2. Check logs for any database connection errors
3. If errors, verify `DATABASE_URL` is correct

### Test Video Download

1. Extract a video (should work)
2. Select a format and click download
3. Should download successfully
4. If you get 403 errors, the URL may have expired - re-extract the video

---

## Environment Variables Reference

### Next.js (Vercel)

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `DATABASE_URL` | ✅ Yes | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `UPSTASH_REDIS_REST_URL` | ✅ Yes | Upstash Redis REST URL | `https://xxx.upstash.io` |
| `UPSTASH_REDIS_REST_TOKEN` | ✅ Yes | Upstash Redis token | `AXxxxxx...` |
| `YTDLP_API_URL` | ✅ Yes | Python service URL | `https://ytdlp-api.railway.app` |
| `NEXT_PUBLIC_APP_URL` | ⚠️ Recommended | Your Vercel app URL | `https://your-app.vercel.app` |
| `JWT_SECRET` | ⚠️ Optional | Random secret for JWT | Generate with: `openssl rand -base64 32` |

### Python Service (Railway/Render/Fly.io)

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `CORS_ORIGIN` | ✅ Yes | Vercel app URL or `*` | `https://your-app.vercel.app` |
| `PORT` | ❌ No | Server port (auto-set by platform) | `8000` |
| `YTDLP_COOKIES_FILE` | ❌ Optional | Path to cookies file | `/app/cookies.txt` |

---

## Troubleshooting

### Issue: Python Service Not Available

**Symptoms**: Error "yt-dlp service is not available" or connection refused

**Solutions**:

1. Check service is running:
   ```bash
   curl https://your-service-url/health
   ```

2. Verify `YTDLP_API_URL` in Vercel matches your service URL exactly
3. Check service logs in Railway/Render dashboard
4. Ensure service is not sleeping (free tiers sleep after inactivity)
5. For Render: First request after sleep takes 30-60 seconds

### Issue: Database Connection Failed

**Symptoms**: "Can't reach database server" or Prisma errors

**Solutions**:

1. Verify `DATABASE_URL` format is correct
2. Check database allows external connections
3. For Supabase/Neon: Use connection pooling URL if available
4. Run migrations: `npx prisma db push` (locally with DATABASE_URL set)
5. Check database is not paused (some free tiers pause after inactivity)

### Issue: Build Fails on Vercel

**Symptoms**: Build error in Vercel dashboard

**Solutions**:

1. Check build logs for specific error
2. Verify `package.json` has correct scripts:
   ```json
   {
     "scripts": {
       "build": "next build",
       "postinstall": "prisma generate"
     }
   }
   ```
3. Ensure Prisma generates: Check `postinstall` script exists
4. Fix TypeScript errors locally first: `npm run build`
5. Check for missing dependencies

### Issue: Video Extraction Fails

**Symptoms**: "Unable to extract video" or "All providers failed"

**Solutions**:

1. Check Python service logs for errors
2. Test Python service directly:
   ```bash
   curl -X POST https://your-service/extract \
     -H "Content-Type: application/json" \
     -d '{"url":"https://www.youtube.com/watch?v=dQw4w9WgXcQ"}'
   ```
3. Verify `YTDLP_API_URL` is accessible from Vercel
4. Check if YouTube bot detection is blocking (see `ytdlp-service/COOKIES_SETUP.md`)
5. Verify yt-dlp is working (check logs)

### Issue: 403 Forbidden During Download

**Symptoms**: "Video URL rejected by CDN" or "403 Forbidden"

**Solutions**:

1. Video URL likely expired (YouTube URLs expire after ~6 hours)
2. Re-extract the video to get a fresh URL
3. Check expiration in logs: Look for "URL expired X seconds ago"
4. Ensure you're downloading immediately after extraction

### Issue: CORS Errors

**Symptoms**: "Access to fetch has been blocked by CORS policy"

**Solutions**:

1. Verify `CORS_ORIGIN` in Python service matches your Vercel URL exactly
2. Check for trailing slashes (should be no trailing slash)
3. Ensure Python service is redeployed after changing CORS_ORIGIN
4. For development, you can temporarily set `CORS_ORIGIN=*`

---

## Cost Estimates

### Free Tier Limits

**Vercel (Hobby Plan - Free)**:
- Unlimited deployments
- 100GB bandwidth/month
- Serverless function execution time: 10s (Hobby), 60s (Pro)
- 100GB-hours function execution time/month

**Railway (Free Tier)**:
- $5 credit/month
- ~500 hours of usage
- Auto-sleeps after inactivity
- Recommended for production

**Render (Free Tier)**:
- 750 hours/month
- Auto-sleeps after 15 min inactivity
- Slower cold starts (30-60 seconds)
- Good for development/testing

**Upstash Redis (Free Tier)**:
- 10,000 commands/day
- 256MB storage
- Perfect for rate limiting

**Vercel Postgres (Free Tier)**:
- 256MB storage
- 60 hours compute time/month
- Good for small projects

### Recommended Setup

- **Vercel**: Hobby plan (free) or Pro ($20/month for better limits)
- **Railway**: Free tier or Starter ($5/month for always-on)
- **Upstash**: Free tier
- **Database**: Vercel Postgres (free tier) or Supabase (free tier)

**Total Cost**: $0/month (free tier) or ~$25/month (with always-on services)

---

## Monitoring

### Vercel

- **Function logs**: Dashboard → Your Project → Functions → Click function → Logs
- **Analytics**: Dashboard → Analytics tab
- **Real-time logs**: Dashboard → Logs tab
- **Deployments**: Dashboard → Deployments tab

### Railway

- **Service logs**: Dashboard → Your Service → Logs tab
- **Metrics**: Dashboard → Metrics tab
- **Deployments**: Dashboard → Deployments tab

### Render

- **Service logs**: Dashboard → Your Service → Logs
- **Metrics**: Dashboard → Metrics tab
- **Events**: Dashboard → Events tab

---

## Updating the Deployment

### Update Python Service

1. Make changes to `ytdlp-service/` directory
2. Commit and push to GitHub:
   ```bash
   git add ytdlp-service/
   git commit -m "Update yt-dlp service"
   git push
   ```
3. Railway/Render will auto-deploy (if auto-deploy is enabled)
4. Or manually trigger deployment from dashboard

### Update Next.js App

1. Make changes to code
2. Commit and push to GitHub:
   ```bash
   git add .
   git commit -m "Update app"
   git push
   ```
3. Vercel will auto-deploy
4. Check deployment status in Vercel dashboard

### Update Environment Variables

1. **Vercel**: 
   - Dashboard → Your Project → Settings → Environment Variables
   - Add/Edit variables
   - Redeploy to apply changes

2. **Railway**: 
   - Dashboard → Your Service → Variables tab
   - Add/Edit variables
   - Service will auto-redeploy

3. **Render**: 
   - Dashboard → Your Service → Environment tab
   - Add/Edit variables
   - Service will auto-redeploy

---

## Post-Deployment Checklist

After successful deployment:

- [ ] Python service health check returns `ok`
- [ ] Next.js app loads without errors
- [ ] Video extraction works (test with a YouTube URL)
- [ ] Video download works (test downloading a video)
- [ ] Database connection is working (check Vercel logs)
- [ ] Redis is working (rate limiting should function)
- [ ] CORS is configured correctly (no CORS errors in console)
- [ ] Environment variables are set correctly
- [ ] (Optional) Cookies are uploaded for YouTube bot detection

---

## Quick Reference Commands

### Test Python Service

```bash
# Health check
curl https://your-service-url/health

# Test extraction
curl -X POST https://your-service-url/extract \
  -H "Content-Type: application/json" \
  -d '{"url":"https://www.youtube.com/watch?v=dQw4w9WgXcQ"}'
```

### Test Database Connection

```bash
# Set DATABASE_URL
export DATABASE_URL="your-connection-string"

# Test Prisma connection
npx prisma db push

# Generate Prisma client
npx prisma generate
```

### Generate JWT Secret

```bash
# Mac/Linux
openssl rand -base64 32

# Windows PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

---

## Support

If you encounter issues:

1. Check service logs (Vercel, Railway/Render)
2. Test services individually (Python service health check)
3. Verify all environment variables are set correctly
4. Check database and Redis connections
5. Review error messages in browser console
6. Check expiration times for video URLs
7. Verify CORS configuration

---

## Next Steps

After successful deployment:

1. Set up custom domain (optional)
2. Configure analytics (Vercel Analytics)
3. Set up monitoring/alerts
4. Configure backup strategy for database
5. Set up CI/CD workflows
6. (Optional) Add cookies for better YouTube access
7. Monitor usage and costs

---

## Additional Resources

- **Vercel Docs**: [vercel.com/docs](https://vercel.com/docs)
- **Railway Docs**: [docs.railway.app](https://docs.railway.app)
- **Render Docs**: [render.com/docs](https://render.com/docs)
- **Upstash Docs**: [docs.upstash.com](https://docs.upstash.com)
- **Prisma Docs**: [prisma.io/docs](https://www.prisma.io/docs)
- **yt-dlp Docs**: [github.com/yt-dlp/yt-dlp](https://github.com/yt-dlp/yt-dlp)
