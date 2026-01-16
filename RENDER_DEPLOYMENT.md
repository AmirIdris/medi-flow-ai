# Render Deployment Guide - All-in-One with Integrated yt-dlp

Complete guide for deploying MediaFlow AI to Render with integrated yt-dlp functionality (no separate Python service needed).

## Overview

Render supports long-running Node.js processes and Python subprocesses, making it perfect for integrated yt-dlp functionality. Everything runs in one service!

## Architecture

```
┌─────────────────────────────────────┐
│   Next.js App (Render Web Service)  │
│                                     │
│  ┌───────────────────────────────┐ │
│  │  /api/ytdlp/health            │ │
│  │  /api/ytdlp/extract           │ │
│  └───────────────────────────────┘ │
│           │                         │
│           ▼                         │
│  ┌───────────────────────────────┐ │
│  │  child_process.execFile()     │ │
│  │  → python -m yt_dlp           │ │
│  │  ✅ WORKS ON RENDER!          │ │
│  └───────────────────────────────┘ │
└─────────────────────────────────────┘
```

## Prerequisites

- [ ] GitHub account with code pushed to repository
- [ ] Render account (free tier available)
- [ ] PostgreSQL database (Render Postgres, Supabase, or Neon)
- [ ] Upstash Redis account
- [ ] (Optional) Browser cookies for YouTube

## Step 1: Install Python & yt-dlp on Render

Render needs Python and yt-dlp installed. We'll add this to the build process.

### Option A: Using package.json (Recommended)

Add to your `package.json`:

```json
{
  "scripts": {
    "postinstall": "prisma generate",
    "render-setup": "python3 -m pip install yt-dlp || pip3 install yt-dlp || echo 'yt-dlp install skipped'"
  }
}
```

Then update build command in Render to:
```
npm install && npm run render-setup && npm run build
```

### Option B: Using Build Script

Create `render-build.sh`:

```bash
#!/bin/bash
set -e

# Install Node.js dependencies
npm install

# Install Python and yt-dlp
python3 --version || (apt-get update && apt-get install -y python3 python3-pip)
python3 -m pip install yt-dlp || pip3 install yt-dlp

# Build Next.js app
npm run build
```

Make it executable:
```bash
chmod +x render-build.sh
```

Then set build command in Render to:
```
./render-build.sh
```

## Step 2: Create Web Service on Render

1. **Go to [render.com](https://render.com)**
2. **Sign in with GitHub**
3. **Click "New" → "Web Service"**
4. **Connect your GitHub repository**
5. **Configure:**
   - **Name**: `mediaflow-ai` (or your choice)
   - **Environment**: Node
   - **Region**: Choose closest to you
   - **Branch**: `main` (or your default branch)
   - **Root Directory**: `./` (root)
   - **Build Command**: `npm install && npm run render-setup && npm run build` (or `./render-build.sh`)
   - **Start Command**: `npm start`

## Step 3: Set Up Database

### Option A: Render Postgres (Easiest)

1. In Render dashboard, click "New" → "PostgreSQL"
2. Choose name and region
3. Copy the **Internal Database URL** (for Render services)
4. Copy the **External Database URL** (for local migrations)

### Option B: Supabase/Neon

Follow the same steps as in `DEPLOYMENT_GUIDE.md` Part 2.

### Run Migrations

```bash
# Set DATABASE_URL locally
export DATABASE_URL="your-postgres-connection-string"

# Push schema
npx prisma db push
```

## Step 4: Set Up Redis (Upstash)

1. Sign up at [upstash.com](https://upstash.com)
2. Create Redis database
3. Copy REST URL and REST Token

## Step 5: Add Environment Variables

In Render dashboard → Your service → Environment:

**Required:**
```env
DATABASE_URL=postgresql://user:password@host:5432/database
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-upstash-token
NODE_ENV=production
```

**Important (Set after first deployment):**
```env
NEXT_PUBLIC_APP_URL=https://your-app.onrender.com
```

**Optional:**
```env
YTDLP_COOKIES_FILE=/opt/render/project/src/cookies.txt
JWT_SECRET=your-random-secret-key
```

## Step 6: Deploy

1. Click "Create Web Service"
2. Wait for build to complete (5-10 minutes)
3. Copy your service URL (e.g., `https://mediaflow-ai.onrender.com`)
4. **Update `NEXT_PUBLIC_APP_URL`** with your Render URL

## Step 7: (Optional) Upload Cookies for YouTube

1. Export cookies from browser (see `ytdlp-service/COOKIES_SETUP.md`)
2. Add `cookies.txt` to your repository root
3. **Important:** Add to `.gitignore` for security:
   ```
   cookies.txt
   ```
4. Or upload via Render's file system
5. Set `YTDLP_COOKIES_FILE` environment variable

## Step 8: Verify Deployment

### Test Health Endpoint

```bash
curl https://your-app.onrender.com/api/ytdlp/health
```

Expected response:
```json
{
  "status": "ok",
  "ytdlp_available": true,
  "ytdlp_version": "2024.3.10",
  "python_version": "3.11.x",
  "command": "python3 -m yt_dlp"
}
```

### Test Video Extraction

1. Visit your app: `https://your-app.onrender.com`
2. Enter a YouTube URL
3. Should extract video using integrated yt-dlp
4. Check browser console for any errors

### Test Database Connection

1. Go to Render dashboard → Your service → Logs
2. Check for any database connection errors
3. Verify `DATABASE_URL` is correct

## Environment Variables Reference

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `DATABASE_URL` | ✅ Yes | PostgreSQL connection string | `postgresql://...` |
| `UPSTASH_REDIS_REST_URL` | ✅ Yes | Upstash Redis REST URL | `https://xxx.upstash.io` |
| `UPSTASH_REDIS_REST_TOKEN` | ✅ Yes | Upstash Redis token | `AXxxxxx...` |
| `NEXT_PUBLIC_APP_URL` | ⚠️ Important | Your Render service URL | `https://your-app.onrender.com` |
| `YTDLP_COOKIES_FILE` | ❌ Optional | Path to cookies file | `/opt/render/project/src/cookies.txt` |
| `JWT_SECRET` | ❌ Optional | Random secret for JWT | Generate with: `openssl rand -base64 32` |

## Troubleshooting

### Issue: yt-dlp Not Found

**Symptoms**: Health check returns `ytdlp_available: false`

**Solutions:**
1. Check build logs for Python/yt-dlp installation errors
2. Verify build command includes yt-dlp installation
3. Try adding Python installation to build script:
   ```bash
   apt-get update && apt-get install -y python3 python3-pip
   pip3 install yt-dlp
   ```

### Issue: Service Sleeps (Free Tier)

**Symptoms**: First request takes 30-60 seconds

**Solutions:**
1. This is normal for Render free tier (sleeps after 15 min inactivity)
2. Upgrade to paid plan for always-on service
3. Use a service like [UptimeRobot](https://uptimerobot.com) to ping your service every 5 minutes

### Issue: Build Fails

**Symptoms**: Build error in Render logs

**Solutions:**
1. Check build logs for specific error
2. Verify `package.json` has correct scripts
3. Ensure Prisma generates: Check `postinstall` script
4. Fix TypeScript errors locally first: `npm run build`

### Issue: Video Extraction Fails

**Symptoms**: "Failed to extract video" or timeout

**Solutions:**
1. Check service logs in Render dashboard
2. Test health endpoint: `/api/ytdlp/health`
3. Verify yt-dlp is installed (check health endpoint)
4. Check if YouTube bot detection is blocking (add cookies)
5. Verify `NEXT_PUBLIC_APP_URL` is set correctly

## Cost Estimates

### Render Free Tier

- **750 hours/month** (enough for ~24/7 if you keep it awake)
- **Auto-sleeps** after 15 min inactivity
- **Cold starts**: 30-60 seconds after sleep
- **Perfect for**: Development, testing, low-traffic apps

### Render Starter Plan ($7/month)

- **Always-on** (no sleeping)
- **512MB RAM**
- **No cold starts**
- **Perfect for**: Production apps with moderate traffic

## Monitoring

- **Service logs**: Render dashboard → Your service → Logs
- **Metrics**: Render dashboard → Metrics tab
- **Events**: Render dashboard → Events tab

## Updating the Deployment

1. Make changes to code
2. Commit and push to GitHub:
   ```bash
   git add .
   git commit -m "Update app"
   git push
   ```
3. Render will auto-deploy
4. Check deployment status in Render dashboard

## Benefits of Render Deployment

✅ **Everything in one service** - No separate Python service needed  
✅ **Integrated yt-dlp works perfectly** - Full subprocess support  
✅ **Simpler deployment** - One service instead of two  
✅ **Lower cost** - One service instead of two  
✅ **Faster communication** - No HTTP calls between services  
✅ **Easier debugging** - All logs in one place  

## Next Steps

After successful deployment:

1. Set up custom domain (optional)
2. Configure monitoring/alerts
3. Set up backup strategy for database
4. (Optional) Add cookies for better YouTube access
5. Monitor usage and costs

## Support

If you encounter issues:

1. Check Render service logs
2. Test health endpoint: `/api/ytdlp/health`
3. Verify all environment variables are set
4. Check database and Redis connections
5. Review error messages in browser console
