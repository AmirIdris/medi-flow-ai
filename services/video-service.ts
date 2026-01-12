import type { Platform, VideoInfo, DownloadResult, VideoFormat, VideoQuality } from "@/types";

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
 * Fetch video info from RapidAPI
 */
export async function fetchVideoInfo(url: string): Promise<VideoInfo> {
  if (!process.env.RAPIDAPI_KEY) {
    throw new Error("RAPIDAPI_KEY is not configured");
  }
  
  const platform = detectPlatform(url);
  
  // Create AbortController for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
  
  try {
    // This is a placeholder - implement actual RapidAPI integration
    // Different endpoints for different platforms
    const response = await fetch(`https://${process.env.RAPIDAPI_HOST}/video/info`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-RapidAPI-Key": process.env.RAPIDAPI_KEY,
        "X-RapidAPI-Host": process.env.RAPIDAPI_HOST || "",
      },
      body: JSON.stringify({ url }),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error("Failed to fetch video information");
    }
    
    const data = await response.json();
    
    return {
      title: data.title,
      thumbnail: data.thumbnail,
      duration: data.duration,
      author: data.author,
      platform,
      url,
    };
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Request timed out while fetching video information");
    }
    throw error;
  }
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
 * Get available formats for a video
 */
export async function getAvailableFormats(url: string): Promise<VideoFormat[]> {
  // Placeholder - would query RapidAPI for available formats
  return [
    { quality: "1080p", format: "mp4", fileSize: 100000000 },
    { quality: "720p", format: "mp4", fileSize: 50000000 },
    { quality: "480p", format: "mp4", fileSize: 25000000 },
    { quality: "audio", format: "mp3", fileSize: 5000000 },
  ];
}
