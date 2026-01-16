import type { Platform, VideoInfo, DownloadResult, VideoFormat, VideoQuality, VideoFormatOption, VideoExtractResponse } from "@/types/video";
import { getProviderManager } from "./providers/provider-manager";

/**
 * Detect platform from URL
 */
export function detectPlatform(url: string): Platform {
  const urlLower = url.toLowerCase();
  
  if (urlLower.includes("youtube.com") || urlLower.includes("youtu.be")) {
    return "youtube";
  } else if (urlLower.includes("tiktok.com")) {
    return "tiktok";
  } else if (urlLower.includes("instagram.com")) {
    return "instagram";
  } else if (urlLower.includes("facebook.com") || urlLower.includes("fb.watch")) {
    return "facebook";
  } else if (urlLower.includes("twitter.com") || urlLower.includes("x.com")) {
    return "twitter";
  } else if (urlLower.includes("vimeo.com")) {
    return "vimeo";
  } else if (urlLower.includes("dailymotion.com")) {
    return "dailymotion";
  }
  
  return "other";
}

/**
 * Validate video URL
 */
export function validateVideoUrl(url: string): { valid: boolean; error?: string } {
  try {
    const parsedUrl = new URL(url);
    
    if (!parsedUrl.protocol.startsWith("http")) {
      return { valid: false, error: "URL must use HTTP or HTTPS protocol" };
    }
    
    const platform = detectPlatform(url);
    if (platform === "other") {
      return { valid: false, error: "Unsupported platform" };
    }
    
    return { valid: true };
  } catch (error) {
    return { valid: false, error: "Invalid URL format" };
  }
}

/**
 * Extract video ID from URL
 */
export function extractVideoId(url: string, platform: Platform): string | null {
  try {
    const urlObj = new URL(url);
    
    switch (platform) {
      case "youtube":
        // Handle youtube.com/watch?v=ID or youtu.be/ID
        if (urlObj.hostname.includes("youtu.be")) {
          return urlObj.pathname.slice(1);
        }
        return urlObj.searchParams.get("v");
        
      case "tiktok":
        // Handle tiktok.com/@user/video/ID
        const tiktokMatch = urlObj.pathname.match(/\/video\/(\d+)/);
        return tiktokMatch ? tiktokMatch[1] : null;
        
      case "instagram":
        // Handle instagram.com/p/ID or instagram.com/reel/ID
        const igMatch = urlObj.pathname.match(/\/(p|reel)\/([^/]+)/);
        return igMatch ? igMatch[2] : null;
        
      default:
        return null;
    }
  } catch (error) {
    return null;
  }
}

/**
 * Extract video info and available formats with direct CDN URLs
 * This is the main function that returns everything needed for client-side downloads
 * 
 * Uses the provider manager to try multiple configured providers with automatic failover.
 * 
 * Setup Instructions:
 * 1. Go to RapidAPI (https://rapidapi.com) and subscribe to a video downloader API
 *    Popular options: "all-in-one-video-downloader", "social-media-video-downloader", "youtube-video-downloader"
 * 2. Get your API key from RapidAPI dashboard
 * 3. Get the API host (e.g., "all-in-one-video-downloader.p.rapidapi.com")
 * 4. Set environment variables:
 *    RAPIDAPI_KEY=your_api_key_here
 *    RAPIDAPI_HOST=api-host-name.p.rapidapi.com
 *    RAPIDAPI_ENDPOINT=/index.php (optional)
 * 
 * For multiple providers (failover support):
 *    RAPIDAPI_2_KEY=secondary_key
 *    RAPIDAPI_2_HOST=secondary-host.p.rapidapi.com
 *    RAPIDAPI_2_ENDPOINT=/endpoint (optional)
 */
export async function extractVideoWithFormats(url: string): Promise<VideoExtractResponse> {
  const providerManager = getProviderManager();
  return providerManager.extractVideo(url);
}

/**
 * Helper to map quality strings to VideoQuality type
 */
function mapQualityString(quality: string): VideoQuality {
  const q = quality.toLowerCase();
  
  // Handle specific quality labels like "2160p50", "1440p50", "1080p50", "720p50"
  if (q.includes("2160") || q.includes("4k")) return "4k";
  if (q.includes("1440") || q.includes("2k")) return "1440p";
  if (q.includes("1080")) return "1080p";
  if (q.includes("720")) return "720p";
  if (q.includes("480")) return "480p";
  if (q.includes("360")) return "360p";
  if (q.includes("240")) return "360p"; // Map 240p to 360p as fallback
  if (q.includes("144")) return "360p"; // Map 144p to 360p as fallback
  
  // Handle audio formats
  if (q.includes("audio") || q.includes("sound") || q.includes("m4a") || q.includes("opus") || q.includes("mp3")) {
    return "audio";
  }
  
  // Default fallback
  return "720p";
}

/**
 * Helper to map format strings to VideoFormat type
 */
function mapFormatString(format: string): VideoFormat {
  const f = format.toLowerCase();
  if (f === "mp4") return "mp4";
  if (f === "webm") return "webm";
  if (f === "mp3") return "mp3";
  if (f === "m4a") return "m4a";
  return "mp4"; // Default
}

/**
 * Fetch video info from RapidAPI (legacy function, kept for backward compatibility)
 */
export async function fetchVideoInfo(url: string): Promise<VideoInfo> {
  const result = await extractVideoWithFormats(url);
  return result.videoInfo;
}

/**
 * Download video from RapidAPI
 */
export async function downloadVideo(
  url: string,
  format: VideoFormat = "mp4",
  quality: VideoQuality = "720p"
): Promise<DownloadResult> {
  if (!process.env.RAPIDAPI_KEY) {
    throw new Error("RAPIDAPI_KEY is not configured");
  }
  
  const videoInfo = await fetchVideoInfo(url);
  
  // Create AbortController for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout for downloads
  
  try {
    // This is a placeholder - implement actual RapidAPI download integration
    const response = await fetch(`https://${process.env.RAPIDAPI_HOST}/video/download`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-RapidAPI-Key": process.env.RAPIDAPI_KEY,
        "X-RapidAPI-Host": process.env.RAPIDAPI_HOST || "",
      },
      body: JSON.stringify({ url, format, quality }),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error("Failed to download video");
    }
    
    const data = await response.json();
    
    return {
      id: data.id,
      videoInfo,
      downloadUrl: data.downloadUrl,
      format,
      quality,
      fileSize: data.fileSize,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    };
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Request timed out while downloading video");
    }
    throw error;
  }
}

/**
 * Get available formats for a video with direct CDN URLs
 */
export async function getAvailableFormats(url: string): Promise<VideoFormatOption[]> {
  const result = await extractVideoWithFormats(url);
  return result.formats;
}
