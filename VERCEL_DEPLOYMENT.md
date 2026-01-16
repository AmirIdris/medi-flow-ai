# Vercel Deployment Guide

Complete guide for deploying medi-flow-ai to Vercel with full yt-dlp support.

## Architecture Overview

The application consists of two services:

1. **Next.js App (Vercel)** - Main application
2. **Python yt-dlp Service (Railway/Render)** - Video extraction microservice

```
┌─────────────────┐         HTTP API          ┌──────────────────┐
│                 │ ────────────────────────> │                  │
│  Vercel (Next.js│                            │  Python Service  │
│     App)        │ <──────────────────────── │  (yt-dlp wrapper) │
│                 │      JSON Response        │  (Railway/Render) │
└─────────────────┘                            └──────────────────┘
```

## Prerequisites

- GitHub account (for Vercel deployment)
- Railway or Render account (for Python service)
- PostgreSQL database (Vercel Postgres, Supabase, Neon, etc.)
- Upstash Redis account (for rate limiting)

## Step 1: Deploy Python yt-dlp Service

### Option A: Railway (Recommended)

1. **Sign up at [Railway](https://railway.app)**
   - Use GitHub to sign in

2. **Create New Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository
   - Set **Root Directory** to: `ytdlp-service`

3. **Configure Service**
   - Railway will auto-detect Python
   - Add environment variable:
     - `CORS_ORIGIN`: Your Vercel app URL (e.g., `https://your-app.vercel.app`)
     - Or set to `*` for development

4. **Deploy**
   - Railway will automatically build and deploy
   - Note the service URL (e.g., `https://ytdlp-api.railway.app`)

5. **Test the Service**
   ```bash
   curl https://your-service.railway.app/health
   ```

### Option B: Render

1. **Sign up at [Render](https://render.com)**
   - Use GitHub to sign in

2. **Create New Web Service**
   - Click "New" → "Web Service"
   - Connect your GitHub repository
   - Configure:
     - **Name**: `ytdlp-api`
     - **Root Directory**: `ytdlp-service`
     - **Environment**: Python 3
     - **Build Command**: `pip install -r requirements.txt`
     - **Start Command**: `python main.py`

3. **Add Environment Variables**
   - `CORS_ORIGIN`: Your Vercel app URL

4. **Deploy**
   - Click "Create Web Service"
   - Wait for deployment to complete
   - Note the service URL

### Option C: Fly.io

1. **Install Fly CLI**
   ```bash
   curl -L https://fly.io/install.sh | sh
   ```

2. **Login**
   ```bash
   fly auth login
   ```

3. **Initialize and Deploy**
   ```bash
   cd ytdlp-service
   fly launch
   fly deploy
   ```

## Step 2: Set Up Database

### Option A: Vercel Postgres (Easiest)

1. In your Vercel project dashboard
2. Go to "Storage" tab
3. Click "Create Database" → "Postgres"
4. Copy the `DATABASE_URL` connection string

### Option B: Supabase

1. Sign up at [Supabase](https://supabase.com)
2. Create a new project
3. Go to Settings → Database
4. Copy the connection string (use "URI" format)

### Option C: Neon

1. Sign up at [Neon](https://neon.tech)
2. Create a new project
3. Copy the connection string

### Run Migrations

After getting your database URL:

```bash
# Set DATABASE_URL in your local .env
DATABASE_URL="your-postgres-connection-string"

# Push schema to database
npx prisma db push

# Or generate and run migrations
npx prisma migrate dev --name init
```

## Step 3: Set Up Redis (Upstash)

1. **Sign up at [Upstash](https://upstash.com)**
2. **Create Redis Database**
   - Choose a region close to your Vercel deployment
   - Copy the REST URL and REST Token

## Step 4: Deploy to Vercel

### Initial Deployment

1. **Push code to GitHub**
   ```bash
   git add .
   git commit -m "Prepare for Vercel deployment"
   git push
   ```

2. **Import to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "Add New" → "Project"
   - Import your GitHub repository
   - Vercel will auto-detect Next.js

3. **Configure Build Settings**
   - Framework Preset: Next.js
   - Root Directory: `./` (root)
   - Build Command: `npm run build` (auto-detected)
   - Output Directory: `.next` (auto-detected)

4. **Add Environment Variables**
   
   Click "Environment Variables" and add:

   **Required:**
   ```env
   DATABASE_URL=your-postgres-connection-string
   UPSTASH_REDIS_REST_URL=your-upstash-redis-url
   UPSTASH_REDIS_REST_TOKEN=your-upstash-redis-token
   YTDLP_API_URL=https://your-ytdlp-service.railway.app
   ```

   **Optional (for RapidAPI fallback):**
   ```env
   RAPIDAPI_KEY=your-rapidapi-key
   RAPIDAPI_HOST=your-rapidapi-host
   RAPIDAPI_ENDPOINT=/index.php
   ```

   **Optional (for full functionality):**
   ```env
   NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
   JWT_SECRET=your-jwt-secret
   ```

5. **Deploy**
   - Click "Deploy"
   - Wait for build to complete
   - Your app will be live at `https://your-app.vercel.app`

### Update Python Service CORS

After deploying to Vercel, update your Python service's `CORS_ORIGIN` environment variable to your Vercel app URL.

## Step 5: Verify Deployment

### Test Python Service

```bash
# Health check
curl https://your-ytdlp-service.railway.app/health

# Should return:
# {
#   "status": "ok",
#   "ytdlp_available": true,
#   "ytdlp_version": "2024.3.10",
#   "python_version": "3.11.x"
# }
```

### Test Vercel App

1. **Visit your app**: `https://your-app.vercel.app`
2. **Test video extraction**:
   - Enter a YouTube URL
   - Should extract video info using yt-dlp service
3. **Check browser console** for any errors
4. **Check Vercel function logs** in dashboard

## Environment Variables Reference

### Vercel (Next.js App)

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `UPSTASH_REDIS_REST_URL` | Yes | Upstash Redis REST URL |
| `UPSTASH_REDIS_REST_TOKEN` | Yes | Upstash Redis token |
| `YTDLP_API_URL` | Yes | Python service URL (e.g., `https://ytdlp-api.railway.app`) |
| `RAPIDAPI_KEY` | No | RapidAPI key (fallback) |
| `RAPIDAPI_HOST` | No | RapidAPI host (fallback) |
| `RAPIDAPI_ENDPOINT` | No | RapidAPI endpoint (default: `/index.php`) |
| `NEXT_PUBLIC_APP_URL` | No | Public app URL |
| `JWT_SECRET` | No | JWT secret for authentication |

### Python Service (Railway/Render)

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | Server port (auto-set by platform) |
| `CORS_ORIGIN` | Yes | Vercel app URL or `*` for all |
| `YTDLP_COOKIES_FILE` | No | Path to cookies file (optional, helps avoid YouTube bot detection) |

## Troubleshooting

### Python Service Not Available

**Error**: `yt-dlp service is not available`

**Solutions**:
1. Check Python service is deployed and running
2. Verify `YTDLP_API_URL` is set correctly in Vercel
3. Test service health: `curl https://your-service-url/health`
4. Check service logs in Railway/Render dashboard

### Database Connection Issues

**Error**: `Can't reach database server`

**Solutions**:
1. Verify `DATABASE_URL` is correct
2. Check database allows connections from Vercel IPs
3. For Supabase/Neon: Ensure connection pooling is configured
4. Run `npx prisma db push` to ensure schema is up to date

### Video Extraction Fails

**Error**: `All video extraction providers failed`

**Solutions**:
1. Check Python service logs
2. Verify `YTDLP_API_URL` is accessible
3. Test Python service directly with curl
4. Check if RapidAPI fallback is configured
5. Verify video URL is valid

### Build Failures

**Error**: Build fails on Vercel

**Solutions**:
1. Check build logs in Vercel dashboard
2. Ensure `package.json` has correct scripts
3. Verify Prisma generates correctly (`postinstall` script)
4. Check for TypeScript errors locally first

## Cost Estimates

### Free Tier Limits

**Vercel (Hobby Plan)**:
- Unlimited deployments
- 100GB bandwidth/month
- Serverless function execution time: 10s (Hobby), 60s (Pro)

**Railway (Free Tier)**:
- $5 credit/month
- ~500 hours of usage
- Auto-sleeps after inactivity

**Render (Free Tier)**:
- 750 hours/month
- Auto-sleeps after 15 min inactivity
- Slower cold starts

**Upstash Redis (Free Tier)**:
- 10,000 commands/day
- 256MB storage

### Recommended Setup

- **Vercel**: Hobby plan (free) or Pro ($20/month)
- **Railway**: Free tier or Starter ($5/month)
- **Upstash**: Free tier
- **Database**: Vercel Postgres (free tier) or Supabase (free tier)

## Monitoring

### Vercel

- Function logs: Dashboard → Your Project → Functions
- Analytics: Dashboard → Analytics tab
- Real-time logs: Dashboard → Logs tab

### Railway/Render

- Service logs: Dashboard → Your Service → Logs
- Metrics: Dashboard → Metrics tab

## Updating the Deployment

### Update Python Service

1. Make changes to `ytdlp-service/`
2. Push to GitHub
3. Railway/Render will auto-deploy

### Update Vercel App

1. Make changes to code
2. Push to GitHub
3. Vercel will auto-deploy

### Update Environment Variables

1. Vercel: Dashboard → Settings → Environment Variables
2. Railway: Dashboard → Variables tab
3. Render: Dashboard → Environment tab

## Support

If you encounter issues:

1. Check service logs (Vercel, Railway/Render)
2. Test services individually (Python service health check)
3. Verify all environment variables are set
4. Check database and Redis connections
5. Review error messages in browser console

## Next Steps

After successful deployment:

1. Set up custom domain (optional)
2. Configure analytics
3. Set up monitoring/alerts
4. Configure backup strategy for database
5. Set up CI/CD workflows
