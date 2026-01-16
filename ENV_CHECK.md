# Environment Variable Check

## Issue: Endpoint Error

If you're seeing an error like:
```
Endpoint '/https:/social-all-in-one-video-downloader2.p.rapidapi.com' does not exist
```

This means your `RAPIDAPI_ENDPOINT` in `.env.local` is set incorrectly.

## Fix

Open your `.env.local` file and check:

### ❌ Wrong (Full URL):
```env
RAPIDAPI_ENDPOINT=https://social-all-in-one-video-downloader2.p.rapidapi.com
# or
RAPIDAPI_ENDPOINT=https://social-all-in-one-video-downloader2.p.rapidapi.com/index.php
```

### ✅ Correct (Just the path):
```env
RAPIDAPI_ENDPOINT=/index.php
```

## Correct .env.local Format

```env
RAPIDAPI_KEY=your_api_key_here
RAPIDAPI_HOST=social-all-in-one-video-downloader2.p.rapidapi.com
RAPIDAPI_ENDPOINT=/index.php
```

**Important:**
- `RAPIDAPI_ENDPOINT` should **ONLY** be the path (e.g., `/index.php`)
- Do **NOT** include the full URL or host
- The path must start with `/`

## Quick Fix

1. Open `.env.local` in your project root
2. Find `RAPIDAPI_ENDPOINT`
3. Change it to: `RAPIDAPI_ENDPOINT=/index.php`
4. Save the file
5. Restart your dev server: `npm run dev`

## If RAPIDAPI_ENDPOINT is not set

If you don't have `RAPIDAPI_ENDPOINT` in your `.env.local`, the code will use `/index.php` by default, which is correct for your API.

You can either:
- Leave it unset (default will be used)
- Or explicitly set it: `RAPIDAPI_ENDPOINT=/index.php`
