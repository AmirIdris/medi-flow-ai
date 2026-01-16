# Quick Setup Guide

## 🚀 Recommended: yt-dlp (Free, No Limits)

**yt-dlp is the recommended primary option** - it's free, has no rate limits, and supports 1000+ sites.

### Quick Install (2 Minutes)

1. **Install Python 3.7+** (if not already installed)
   - Windows: Download from [python.org](https://www.python.org/downloads/)
   - macOS/Linux: Usually pre-installed (`python3 --version`)

2. **Install yt-dlp**:
   ```bash
   pip install yt-dlp
   ```
   Or: `pip3 install yt-dlp`

3. **Verify**:
   ```bash
   python -m yt_dlp --version
   ```

4. **Done!** Restart your Next.js server. yt-dlp will be used automatically.

📖 **Full guide**: See [YTDLP_SETUP.md](YTDLP_SETUP.md) for detailed instructions

---

## 🔄 Alternative: RapidAPI Setup (5 Minutes)

If you prefer using RapidAPI or need it as a fallback:

### 1. Sign Up
- Go to [rapidapi.com](https://rapidapi.com) and create an account

### 2. Subscribe to an API
- Search for **"all-in-one-video-downloader"** or **"social-media-video-downloader"**
- Click **"Subscribe"** → Choose **Free/Basic** plan
- ✅ Make sure you complete the subscription (not just viewing)

### 3. Get Credentials
- On the API page, find:
  - **X-RapidAPI-Key** (your API key)
  - **X-RapidAPI-Host** (e.g., `all-in-one-video-downloader.p.rapidapi.com`)

### 4. Configure `.env.local`
Create/update `.env.local` in your project root:

**Primary Provider (Optional - used as fallback if yt-dlp fails):**
```env
RAPIDAPI_KEY=paste_your_key_here
RAPIDAPI_HOST=social-all-in-one-video-downloader2.p.rapidapi.com
RAPIDAPI_ENDPOINT=/index.php
```

**Secondary Provider (Optional - for additional failover):**
```env
RAPIDAPI_2_KEY=your_secondary_key_here
RAPIDAPI_2_HOST=another-video-downloader.p.rapidapi.com
RAPIDAPI_2_ENDPOINT=/getVideoInfo
```

**Note**: The endpoint `/index.php` is extracted from the curl request:
```bash
curl --request POST \
  --url https://social-all-in-one-video-downloader2.p.rapidapi.com/index.php \
  --header 'Content-Type: application/x-www-form-urlencoded' \
  --header 'x-rapidapi-host: social-all-in-one-video-downloader2.p.rapidapi.com' \
  --header 'x-rapidapi-key: YOUR_KEY'
```

You can leave `RAPIDAPI_ENDPOINT` unset - it defaults to `/index.php`. Only change it if your API uses a different endpoint.

**Provider Priority**: The system tries providers in this order:
1. **yt-dlp** (free, recommended - if installed)
2. **RapidAPI Primary** (if configured)
3. **RapidAPI Secondary** (if configured)
4. **RapidAPI Tertiary** (if configured)

This ensures yt-dlp is used first (avoiding rate limits), with RapidAPI as automatic fallback.

**Note**: If you get "endpoint not found" error:
1. Check your API's documentation page on RapidAPI
2. Find the correct endpoint path (e.g., `/video/info`, `/info`, `/download`)
3. Update `RAPIDAPI_ENDPOINT` in `.env.local`
4. The app will also try common endpoints automatically

### 5. Restart Server
```bash
# Stop your dev server (Ctrl+C)
npm run dev
```

### 6. Test
Try downloading a video URL in your app!

---

## 📝 Endpoint Configuration

The endpoint `/index.php` is extracted from the curl request format:
- **URL**: `https://social-all-in-one-video-downloader2.p.rapidapi.com/index.php`
- **Method**: POST
- **Content-Type**: `application/x-www-form-urlencoded`
- **Headers**: `x-rapidapi-host` and `x-rapidapi-key`

The code automatically uses `/index.php` as the default endpoint. You don't need to set `RAPIDAPI_ENDPOINT` unless your API uses a different endpoint path.

## 🔄 Multiple Provider Configuration (Failover)

To improve reliability, you can configure multiple API providers. If the primary provider fails, the system automatically tries the secondary provider.

**Example configuration:**
```env
# Primary Provider
RAPIDAPI_KEY=primary_key
RAPIDAPI_HOST=primary-api.p.rapidapi.com
RAPIDAPI_ENDPOINT=/index.php

# Secondary Provider (fallback)
RAPIDAPI_2_KEY=secondary_key
RAPIDAPI_2_HOST=secondary-api.p.rapidapi.com
RAPIDAPI_2_ENDPOINT=/getVideoInfo

# Tertiary Provider (optional)
RAPIDAPI_3_KEY=tertiary_key
RAPIDAPI_3_HOST=tertiary-api.p.rapidapi.com
RAPIDAPI_3_ENDPOINT=/video/info
```

**Benefits:**
- Automatic failover if primary provider is down
- Better reliability and uptime
- Can use cheaper providers as primary, premium as backup

---

## ❌ Troubleshooting

| Error | Solution |
|-------|----------|
| "Not subscribed" | Click Subscribe and select a plan |
| "Invalid API key" | Check `.env.local` and restart server |
| "Endpoint not found" | Update endpoint path in `video-service.ts` |

---

📖 **Full guide**: See `RAPIDAPI_SETUP.md` for detailed instructions
