import { NextRequest, NextResponse } from "next/server";

/**
 * Proxy route for video downloads
 * Streams video from CDN to client to avoid CORS issues
 */

// Configure route to handle large files and streaming
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes for large video downloads

// Handle CORS preflight
export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
    },
  });
}

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const videoUrl = searchParams.get("url");
    const refererParam = searchParams.get("referer");
    const expiresAtParam = searchParams.get("expiresAt");
    
    if (!videoUrl) {
      return NextResponse.json(
        { 
          error: "URL parameter is required",
          type: "missing_url"
        },
        { status: 400 }
      );
    }
    
    // Validate URL first (needed for expiration check)
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(videoUrl);
    } catch {
      return NextResponse.json(
        { 
          error: "Invalid URL",
          type: "invalid_url"
        },
        { status: 400 }
      );
    }
    
    // Check if URL has expired (from expiresAt parameter)
    if (expiresAtParam) {
      try {
        const expiresAt = new Date(expiresAtParam);
        const now = Date.now();
        const expiresTime = expiresAt.getTime();
        
        if (expiresTime < now) {
          return NextResponse.json(
            {
              error: "Video URL has expired",
              type: "expired_url",
              suggestion: "Please re-extract the video to get a fresh download link"
            },
            { status: 403 }
          );
        }
        
        // Warn if URL is close to expiring (within 5 minutes)
        const timeUntilExpiry = expiresTime - now;
        if (timeUntilExpiry < 5 * 60 * 1000 && process.env.NODE_ENV === "development") {
          console.warn(`[Proxy] URL expires in ${Math.round(timeUntilExpiry / 1000)} seconds`);
        }
      } catch {
        // Invalid date format, ignore
      }
    }
    
    // Also check for expire parameter in YouTube URLs (Unix timestamp in seconds)
    if (parsedUrl.hostname.includes("googlevideo.com") && videoUrl.includes("expire=")) {
      try {
        const urlParams = new URLSearchParams(parsedUrl.search);
        const expireTimestamp = urlParams.get("expire");
        if (expireTimestamp) {
          const expireTime = parseInt(expireTimestamp, 10) * 1000; // Convert to milliseconds
          const now = Date.now();
          
          if (expireTime < now) {
            const expiredSecondsAgo = Math.round((now - expireTime) / 1000);
            if (process.env.NODE_ENV === "development") {
              console.error(`[Proxy] URL expired ${expiredSecondsAgo} seconds ago (expire=${expireTimestamp}, now=${Math.round(now / 1000)})`);
            }
            
            return NextResponse.json(
              {
                error: "Video URL has expired",
                type: "expired_url",
                suggestion: "Please re-extract the video to get a fresh download link"
              },
              { status: 403 }
            );
          }
          
          // Warn if URL is close to expiring (within 5 minutes)
          const timeUntilExpiry = expireTime - now;
          if (timeUntilExpiry < 5 * 60 * 1000 && process.env.NODE_ENV === "development") {
            console.warn(`[Proxy] URL expires in ${Math.round(timeUntilExpiry / 1000)} seconds`);
          }
        }
      } catch (err) {
        if (process.env.NODE_ENV === "development") {
          console.warn(`[Proxy] Failed to parse expire parameter:`, err);
        }
      }
    }
    
    // Only allow certain domains for security
    const allowedDomains = [
      "googlevideo.com",
      "ytimg.com",
      "youtube.com",
      "tiktok.com",
      "cdninstagram.com",
      "fbcdn.net",
      "vimeo.com",
      "dailymotion.com",
    ];
    
    const isAllowed = allowedDomains.some(domain => 
      parsedUrl.hostname.includes(domain)
    );
    
    if (!isAllowed) {
      return NextResponse.json(
        { 
          error: "Domain not allowed",
          type: "domain_rejected",
          domain: parsedUrl.hostname,
          suggestion: "This domain is not in the allowed list for security reasons"
        },
        { status: 403 }
      );
    }
    
    // Determine the correct Referer header
    let referer: string;
    if (refererParam) {
      // Use provided referer (e.g., platform origin URL)
      try {
        const refererUrl = new URL(refererParam);
        referer = refererUrl.origin;
      } catch {
        // Invalid referer URL, fall back to default
        referer = parsedUrl.hostname.includes("googlevideo.com") 
          ? "https://www.youtube.com" 
          : parsedUrl.origin;
      }
    } else {
      // Default referer logic
      if (parsedUrl.hostname.includes("googlevideo.com")) {
        // For YouTube videos, use youtube.com as referer
        referer = "https://www.youtube.com";
      } else {
        // For other platforms, use the origin
        referer = parsedUrl.origin;
      }
    }
    
    if (process.env.NODE_ENV === "development") {
      console.log(`[Proxy] Fetching video from ${parsedUrl.hostname} with Referer: ${referer}`);
    }
    
    // Build request headers to mimic browser request
    const requestHeaders: HeadersInit = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      "Referer": referer,
      "Accept": "*/*",
      "Accept-Language": "en-US,en;q=0.9",
      "Accept-Encoding": "identity", // Don't compress - we need raw video data
      "Sec-Fetch-Dest": "video",
      "Sec-Fetch-Mode": "no-cors",
      "Sec-Fetch-Site": "cross-site",
      "Sec-Ch-Ua": '"Chromium";v="131", "Not_A Brand";v="24"',
      "Sec-Ch-Ua-Mobile": "?0",
      "Sec-Ch-Ua-Platform": '"Windows"',
      // Range header is important for YouTube - start with full range
      "Range": "bytes=0-",
    };
    
    // For YouTube videos, add Origin header (should match Referer domain)
    if (parsedUrl.hostname.includes("googlevideo.com")) {
      try {
        const refererUrl = new URL(referer);
        requestHeaders["Origin"] = refererUrl.origin;
      } catch {
        // If referer is not a valid URL, use youtube.com as origin
        requestHeaders["Origin"] = "https://www.youtube.com";
      }
    }
    
    // Fetch the video from the CDN with proper headers
    const videoResponse = await fetch(videoUrl, {
      method: "GET",
      headers: requestHeaders,
      // Don't follow redirects automatically - handle them explicitly
      redirect: "follow",
    });
    
    // Accept both 200 (OK) and 206 (Partial Content) as success
    if (!videoResponse.ok && videoResponse.status !== 206) {
      // Get error details from CDN response
      let errorDetails = "";
      try {
        const errorText = await videoResponse.text();
        if (errorText && errorText.length < 500) {
          errorDetails = errorText;
        }
      } catch {
        // Ignore if we can't read error text
      }
      
      console.error(`[Proxy] Failed to fetch video: ${videoResponse.status} ${videoResponse.statusText}`);
      if (errorDetails) {
        console.error(`[Proxy] CDN error details: ${errorDetails}`);
      }
      
      // Provide specific error messages based on status code
      if (videoResponse.status === 403) {
        // Check if URL might be expired by checking the expire parameter
        let isExpired = false;
        let expiredInfo = "";
        
        if (parsedUrl.hostname.includes("googlevideo.com") && videoUrl.includes("expire=")) {
          try {
            const urlParams = new URLSearchParams(parsedUrl.search);
            const expireTimestamp = urlParams.get("expire");
            if (expireTimestamp) {
              const expireTime = parseInt(expireTimestamp, 10) * 1000; // Convert to milliseconds
              const now = Date.now();
              if (expireTime < now) {
                isExpired = true;
                const expiredSecondsAgo = Math.round((now - expireTime) / 1000);
                expiredInfo = ` (expired ${expiredSecondsAgo} seconds ago)`;
              }
            }
          } catch {
            // Ignore parsing errors
          }
        }
        
        // Also check error details for expiration hints
        if (!isExpired && errorDetails) {
          isExpired = errorDetails.toLowerCase().includes("expired") || 
                     errorDetails.toLowerCase().includes("expire");
        }
        
        let suggestion = "The video URL may have expired or the CDN is blocking the request. Try re-extracting the video.";
        if (isExpired) {
          suggestion = "The video URL has expired. Please re-extract the video to get a fresh download link.";
        }
        
        if (process.env.NODE_ENV === "development") {
          console.error(`[Proxy] 403 Error Details:`, {
            url: videoUrl.substring(0, 100) + "...",
            referer,
            errorDetails: errorDetails.substring(0, 200),
            isExpired,
            expiredInfo,
          });
        }
        
        return NextResponse.json(
          {
            error: isExpired ? `Video URL has expired${expiredInfo}` : "Video URL rejected by CDN",
            type: isExpired ? "expired_url" : "cdn_rejected",
            status: videoResponse.status,
            statusText: videoResponse.statusText,
            suggestion
          },
          { status: 403 }
        );
      }
      
      if (videoResponse.status === 404) {
        return NextResponse.json(
          {
            error: "Video not found",
            type: "not_found",
            status: videoResponse.status,
            suggestion: "The video may have been removed or the URL is invalid"
          },
          { status: 404 }
        );
      }
      
      return NextResponse.json(
        {
          error: `Failed to fetch video: ${videoResponse.status} ${videoResponse.statusText}`,
          type: "cdn_error",
          status: videoResponse.status,
          statusText: videoResponse.statusText
        },
        { status: videoResponse.status }
      );
    }

    // Get content type and size from the upstream response
    const contentType = videoResponse.headers.get("content-type") || "video/mp4";
    const contentLength = videoResponse.headers.get("content-length");
    const acceptRanges = videoResponse.headers.get("accept-ranges");
    const contentRange = videoResponse.headers.get("content-range");
    
    console.log(`[Proxy] Streaming video. Content-Type: ${contentType}, Size: ${contentLength || "unknown"} bytes`);
    
    // Stream the video to the client
    const videoStream = videoResponse.body;
    
    if (!videoStream) {
      return NextResponse.json(
        { error: "No video stream available" },
        { status: 500 }
      );
    }
    
    // Create response with proper headers for video streaming
    const headers = new Headers();
    
    // Preserve content type exactly as received (important for video playback)
    headers.set("Content-Type", contentType);
    
    // Preserve content length if available (important for progress tracking)
    if (contentLength) {
      headers.set("Content-Length", contentLength);
    }
    
    // Preserve range support for video seeking (if the CDN supports it)
    if (acceptRanges) {
      headers.set("Accept-Ranges", acceptRanges);
    }
    
    if (contentRange) {
      headers.set("Content-Range", contentRange);
    }
    
    // Set download headers - use attachment to force download
    const fileExtension = contentType.split("/")[1]?.split(";")[0] || "mp4";
    // Use attachment to force download instead of inline playback
    headers.set("Content-Disposition", `attachment; filename="video.${fileExtension}"`);
    
    // Don't cache the proxy response (cache the original CDN response instead)
    headers.set("Cache-Control", "no-cache, no-store, must-revalidate");
    headers.set("Pragma", "no-cache");
    headers.set("Expires", "0");
    
    // Allow CORS for the client
    headers.set("Access-Control-Allow-Origin", "*");
    headers.set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
    headers.set("Access-Control-Expose-Headers", "Content-Length, Content-Type, Content-Range, Accept-Ranges");
    
    // Ensure we're streaming binary data without any transformation
    // Use ReadableStream directly to avoid any buffering issues
    // Use the same status code as the upstream response (200 or 206)
    return new NextResponse(videoStream as any, {
      status: videoResponse.status,
      headers,
    });
  } catch (error) {
    console.error("Video proxy error:", error);
    return NextResponse.json(
      { error: "Failed to proxy video" },
      { status: 500 }
    );
  }
}
