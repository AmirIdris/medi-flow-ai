# RapidAPI Setup Guide

This guide will walk you through subscribing to a video downloader API on RapidAPI and configuring it in your application.

> **Note**: RapidAPI is now used as a **fallback provider**. The recommended primary option is **yt-dlp** (free, no rate limits). See [YTDLP_SETUP.md](YTDLP_SETUP.md) for yt-dlp installation. RapidAPI will be used automatically if yt-dlp is not available or fails.

## Step 1: Create a RapidAPI Account

1. Go to [https://rapidapi.com](https://rapidapi.com)
2. Click **"Sign Up"** in the top right corner
3. Choose your preferred sign-up method:
   - Email
   - Google
   - GitHub
4. Complete the registration process

## Step 2: Search for Video Downloader APIs

1. Once logged in, use the search bar at the top
2. Search for one of these popular video downloader APIs:
   - **"all-in-one-video-downloader"**
   - **"social-media-video-downloader"**
   - **"youtube-video-downloader"**
   - **"tiktok-video-downloader"**
   - **"instagram-video-downloader"**

## Step 3: Choose and Subscribe to an API

1. Click on an API from the search results
2. Review the API details:
   - **Pricing plans** (many have free tiers)
   - **Supported platforms** (YouTube, TikTok, Instagram, etc.)
   - **Rate limits**
   - **Documentation**

3. Click **"Subscribe"** or **"Subscribe to Test"**
4. Select a pricing plan:
   - **Basic/Free**: Usually limited requests per month
   - **Pro**: More requests, better support
   - **Ultra**: Highest tier with maximum requests

5. Complete the subscription process

## Step 4: Get Your API Credentials

1. After subscribing, you'll be taken to the API's page
2. Look for the **"Code Snippets"** or **"Endpoints"** section
3. You'll see:
   - **X-RapidAPI-Key**: Your unique API key
   - **X-RapidAPI-Host**: The API host (e.g., `all-in-one-video-downloader.p.rapidapi.com`)

4. **Alternative method**: Go to your [RapidAPI Dashboard](https://rapidapi.com/developer/dashboard)
   - Click on your profile → **"My Apps"**
   - Find your API key under **"Default Application"** or create a new app

## Step 5: Find the Correct Endpoint

1. On the API's page, navigate to the **"Endpoints"** tab
2. Look for endpoints that get video information, such as:
   - `/getVideoInfo`
   - `/video/info`
   - `/info`
   - `/download/info`
   - `/video`
   - `/getInfo`

3. Check the **documentation** for:
   - Required parameters (usually `url`)
   - Request method (GET or POST)
   - Response format

4. **Copy the exact endpoint path** (e.g., `/video/info`)

**Note**: The application will automatically try common endpoints, but setting the correct one in `.env` is faster.

## Step 6: Configure Your Environment Variables

1. In your project root, open or create a `.env.local` file (or `.env`)

2. Add your primary provider credentials:
   ```env
   RAPIDAPI_KEY=your_rapidapi_key_here
   RAPIDAPI_HOST=all-in-one-video-downloader.p.rapidapi.com
   RAPIDAPI_ENDPOINT=/getVideoInfo
   ```

   **Example:**
   ```env
   RAPIDAPI_KEY=abc123def456ghi789jkl012mno345pqr678stu901vwx234yz
   RAPIDAPI_HOST=all-in-one-video-downloader.p.rapidapi.com
   RAPIDAPI_ENDPOINT=/getVideoInfo
   ```

   **Note**: 
   - `RAPIDAPI_ENDPOINT` is optional - the app will try common endpoints automatically
   - If you get "endpoint not found" errors, set this to your API's exact endpoint path
   - The endpoint should start with `/` (e.g., `/video/info`, not `video/info`)

3. **(Optional) Configure Secondary Provider for Failover:**
   
   To improve reliability, you can configure a backup provider that will be used automatically if the primary provider fails:
   
   ```env
   # Secondary Provider
   RAPIDAPI_2_KEY=your_secondary_key_here
   RAPIDAPI_2_HOST=another-video-downloader.p.rapidapi.com
   RAPIDAPI_2_ENDPOINT=/video/info
   ```
   
   **Benefits of Multiple Providers:**
   - Automatic failover if primary provider is unavailable
   - Better reliability and uptime
   - Can use different pricing tiers (cheap primary, premium backup)
   - No code changes needed - just configure environment variables

3. **Important**: 
   - Never commit `.env` files to Git
   - Make sure `.env` is in your `.gitignore`
   - Restart your Next.js dev server after adding environment variables

## Step 7: Configure the API Endpoint (if needed)

**The application automatically tries common endpoints**, but if you get "endpoint not found" errors:

1. Check your API's documentation on RapidAPI for the exact endpoint path
2. Add it to your `.env.local`:
   ```env
   RAPIDAPI_ENDPOINT=/your-endpoint-here
   ```
   
   **Examples:**
   - `/getVideoInfo`
   - `/video/info`
   - `/info`
   - `/download/info`

3. Restart your dev server

**Note**: The endpoint path should:
- Start with `/`
- Match exactly what's in the API documentation
- Not include the base URL (that's in `RAPIDAPI_HOST`)

## Step 8: Provider Priority and Failover

The application uses a hybrid approach with automatic failover. **yt-dlp is the primary provider** (free, no rate limits), and RapidAPI serves as fallback.

### Provider Priority Order

1. **yt-dlp** (Primary - Free, recommended)
   - Used first if installed
   - No API keys needed
   - No rate limits
   - See [YTDLP_SETUP.md](YTDLP_SETUP.md) for installation

2. **RapidAPI Primary** (Fallback)
   - Used if yt-dlp fails or not installed
   - Requires API subscription

3. **RapidAPI Secondary** (Additional Fallback)
   - Used if primary RapidAPI fails

4. **RapidAPI Tertiary** (Additional Fallback)
   - Used if secondary RapidAPI fails

### How Failover Works

1. The system tries providers in order: yt-dlp → RapidAPI Primary → RapidAPI Secondary → RapidAPI Tertiary
2. If a provider fails, it automatically tries the next one
3. Returns the first successful result
4. If all providers fail, shows an error with details

### Configuration

Add secondary and tertiary RapidAPI providers to your `.env.local` (optional):

```env
# Primary RapidAPI Provider (optional - used as fallback if yt-dlp fails)
RAPIDAPI_KEY=your_primary_key
RAPIDAPI_HOST=primary-api.p.rapidapi.com
RAPIDAPI_ENDPOINT=/index.php

# Secondary RapidAPI Provider (optional - for additional failover)
RAPIDAPI_2_KEY=your_secondary_key
RAPIDAPI_2_HOST=secondary-api.p.rapidapi.com
RAPIDAPI_2_ENDPOINT=/getVideoInfo

# Tertiary RapidAPI Provider (optional)
RAPIDAPI_3_KEY=your_tertiary_key
RAPIDAPI_3_HOST=tertiary-api.p.rapidapi.com
RAPIDAPI_3_ENDPOINT=/video/info
```

### Benefits

- **Free Primary**: yt-dlp has no costs or rate limits
- **Resilience**: Automatic failover if yt-dlp fails
- **Cost Management**: Use free yt-dlp as primary, RapidAPI as backup
- **No Code Changes**: Just install yt-dlp or configure RapidAPI
- **Better Error Messages**: Clear indication of which providers were tried

### When Failover Happens

Failover automatically occurs when:
- yt-dlp is not installed → tries RapidAPI
- yt-dlp fails → tries RapidAPI
- RapidAPI provider returns an error (401, 403, 404, 500, etc.)
- Provider times out

The system logs which provider succeeded (in development mode) for debugging.

## Step 9: Test Your Configuration

1. Restart your Next.js development server:
   ```bash
   npm run dev
   ```

2. Try extracting a video URL in your application
3. If you see errors, check:
   - API key is correct
   - API host matches the subscribed API
   - Endpoint path is correct
   - You're subscribed to the API (not just viewing it)

## Recommended APIs

### All-in-One Video Downloader
- **Host**: `all-in-one-video-downloader.p.rapidapi.com`
- **Endpoint**: `/getVideoInfo`
- **Supports**: YouTube, TikTok, Instagram, Facebook, Twitter, etc.
- **Free Tier**: Usually 100-500 requests/month

### Social Media Video Downloader
- **Host**: `social-media-video-downloader.p.rapidapi.com`
- **Endpoint**: `/video/info` or `/getVideoInfo`
- **Supports**: Multiple platforms
- **Free Tier**: Varies by provider

## Troubleshooting

### Error: "You are not subscribed to this API"
- **Solution**: Make sure you clicked "Subscribe" and selected a plan (even the free one)

### Error: "Invalid API Key"
- **Solution**: 
  - Double-check your `RAPIDAPI_KEY` in `.env`
  - Make sure there are no extra spaces or quotes
  - Restart your dev server

### Error: "API endpoint not found"
- **Solution**: 
  1. Go to your API's page on RapidAPI
  2. Click the **"Endpoints"** tab
  3. Find the endpoint that gets video information
  4. Copy the exact path (e.g., `/video/info`)
  5. Add to `.env.local`:
     ```env
     RAPIDAPI_ENDPOINT=/video/info
     ```
  6. Restart your dev server
  7. The app will also automatically try common endpoints if this isn't set

### Error: "Rate limit exceeded"
- **Solution**: 
  - You've hit your plan's request limit
  - Wait for the limit to reset (usually monthly)
  - Or upgrade to a higher tier

## Security Notes

- **Never share your API key publicly**
- **Don't commit `.env` files to version control**
- **Use environment variables for all API keys**
- **Rotate your API key if it's exposed**

## Need Help?

- [RapidAPI Documentation](https://docs.rapidapi.com/)
- [RapidAPI Support](https://rapidapi.com/support)
- Check the specific API's documentation page for endpoint details
