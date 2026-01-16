# Download 403 Error Fix

## Problem

YouTube's CDN was rejecting download requests with 403 Forbidden errors, even with proper headers and referers. This is because:

1. **YouTube has strict URL validation** - Direct URLs extracted by yt-dlp expire quickly and have complex authentication
2. **CDN validation** - YouTube's CDN validates multiple parameters beyond just headers (IP, session, timing, etc.)
3. **Proxy limitations** - Routing through Next.js proxy adds complexity and can break YouTube's validation

## Solution

Created a new **yt-dlp direct download endpoint** (`/api/video/download`) that:

### How It Works

1. **Uses yt-dlp for download, not just extraction**
   - Instead of extracting URL → downloading via proxy
   - Now: Use yt-dlp to both extract AND download
   - yt-dlp handles all CDN authentication internally

2. **Advanced retry strategies with bot detection evasion**
   - Tries multiple User-Agent strings (Desktop, Mobile, Random)
   - Rotates between different YouTube client types (web, ios, android)
   - Uses cookies for authenticated access (if configured)
   - Supports proxy rotation for IP-based blocking
   - Exponential backoff between retries

3. **Streams directly from yt-dlp**
   - Spawns yt-dlp as a child process
   - Streams stdout directly to client
   - No intermediate storage (memory efficient)

4. **Automatic fallback**
   - YouTube videos → Use `/api/video/download` (yt-dlp with retry strategies)
   - Other platforms → Use `/api/video/proxy` (direct URL)

### Architecture

```
Before (failing):
┌─────────────┐      ┌──────────┐      ┌────────────┐      ┌─────────────┐
│   Client    │─────>│  yt-dlp  │─────>│  Next.js   │─────>│  YouTube    │
│             │      │ (extract)│      │   Proxy    │      │     CDN     │
└─────────────┘      └──────────┘      └────────────┘      └─────────────┘
                                              ↑
                                              └─ 403 Forbidden

After (working):
┌─────────────┐      ┌──────────────────────────────┐      ┌─────────────┐
│   Client    │─────>│  /api/video/download         │─────>│  YouTube    │
│             │      │  (yt-dlp downloads directly) │      │     CDN     │
└─────────────┘      └──────────────────────────────┘      └─────────────┘
                              ↑
                              └─ yt-dlp handles all auth
```

### Files Changed

1. **`app/api/video/download/route.ts`** (NEW)
   - New endpoint that uses yt-dlp for direct downloads
   - Calls `downloadVideoWithStrategies()` with retry logic
   - Streams video data from yt-dlp stdout
   - Handles quality/format selection
   - Automatic bot detection evasion

2. **`services/ytdlp-service.ts`** (UPDATED)
   - Added `downloadVideoWithStrategies()` function
   - Implements multiple retry strategies
   - Handles User-Agent rotation
   - Manages cookies and proxies
   - Exponential backoff for retries

3. **`components/download/result-card.tsx`** (UPDATED)
   - Updated to detect YouTube URLs
   - Uses new download endpoint for YouTube
   - Falls back to proxy for other platforms
   - Retrieves original URL from sessionStorage

### Benefits

✅ **Fixes 403 errors** - yt-dlp handles all YouTube authentication  
✅ **Fixes bot detection** - Multiple retry strategies with different clients  
✅ **More reliable** - Uses yt-dlp's proven CDN handling  
✅ **Memory efficient** - Streams directly without buffering  
✅ **Cookie support** - Automatically uses cookies if configured  
✅ **Proxy support** - Can use proxies via yt-dlp config  
✅ **Smart retries** - Exponential backoff with different User-Agents  
✅ **Future-proof** - yt-dlp updates handle YouTube changes  

## Usage

The download automatically detects YouTube URLs and uses the appropriate method:

- **YouTube**: `/api/video/download?url=...&quality=720p&format=mp4`
- **Other platforms**: `/api/video/proxy?url=...&referer=...`

No changes needed in the UI - it works automatically!

## Testing

1. Extract a YouTube video
2. Select a quality/format
3. Click download
4. Should download without 403 errors

Check console logs for:
```
[Download] Using yt-dlp download for YouTube
[Download] Starting yt-dlp download for: https://www.youtube.com/...
```

## Environment Variables

Optional for better reliability:

```env
# Cookies for authenticated YouTube access
YTDLP_COOKIES_PATH=/path/to/cookies.txt

# Proxies (if needed)
YTDLP_PROXY=http://proxy:8080
```

See `ytdlp-service/COOKIES_SETUP.md` for cookie setup instructions.
