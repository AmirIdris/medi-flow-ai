import type { Platform, VideoInfo, DownloadResult, VideoFormat, VideoQuality, VideoFormatOption, VideoExtractResponse } from "@/types";

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
 */
export async function extractVideoWithFormats(url: string): Promise<VideoExtractResponse> {
  if (!process.env.RAPIDAPI_KEY) {
    throw new Error("RAPIDAPI_KEY is not configured");
  }
  
  if (!process.env.RAPIDAPI_HOST) {
    throw new Error("RAPIDAPI_HOST is not configured");
  }
  
  const platform = detectPlatform(url);
  
  // Create AbortController for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
  
  try {
    // Use RapidAPI's all-in-one video downloader endpoint
    // Most providers use GET with query params or POST with body
    // Try POST first (most common), fallback to GET if needed
    
    // Build the API endpoint - common patterns:
    // - /getVideoInfo?url=...
    // - /video/info
    // - /download
    
    const apiUrl = `https://${process.env.RAPIDAPI_HOST}/getVideoInfo`;
    const urlParams = new URLSearchParams({ url });
    
    // Try POST method first (most common for RapidAPI video services)
    let response = await fetch(`${apiUrl}?${urlParams}`, {
      method: "GET",
      headers: {
        "X-RapidAPI-Key": process.env.RAPIDAPI_KEY,
        "X-RapidAPI-Host": process.env.RAPIDAPI_HOST,
      },
      signal: controller.signal,
    });
    
    // If GET fails, try POST with body
    if (!response.ok && response.status === 405) {
      response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-RapidAPI-Key": process.env.RAPIDAPI_KEY,
          "X-RapidAPI-Host": process.env.RAPIDAPI_HOST,
        },
        body: JSON.stringify({ url }),
        signal: controller.signal,
      });
    }
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to extract video: ${response.status} ${errorText}`);
    }
    
    const data = await response.json();
    
    // Parse response based on RapidAPI provider format
    // Common formats:
    // 1. { data: { title, thumbnail, formats: [{ quality, url, size }] } }
    // 2. { title, thumbnail, videos: [{ quality, url, size }] }
    // 3. { result: { title, thumbnail, links: [{ quality, url, size }] } }
    
    let videoInfo: VideoInfo;
    let formats: VideoFormatOption[] = [];
    
    // Handle different response structures
    if (data.data) {
      videoInfo = {
        title: data.data.title || data.title || "Untitled Video",
        thumbnail: data.data.thumbnail || data.thumbnail || "",
        duration: data.data.duration || data.duration || 0,
        author: data.data.author || data.author || data.data.channel || "Unknown",
        platform,
        url,
      };
      
      // Parse formats from response
      if (data.data.formats || data.data.videos || data.data.links) {
        const formatArray = data.data.formats || data.data.videos || data.data.links || [];
        formats = formatArray.map((fmt: any) => ({
          quality: mapQualityString(fmt.quality || fmt.resolution || fmt.label || "720p"),
          format: mapFormatString(fmt.format || fmt.ext || "mp4"),
          fileSize: fmt.size || fmt.filesize || fmt.file_size || 0,
          url: fmt.url || fmt.link || fmt.downloadUrl || "",
          expiresAt: fmt.expiresAt ? new Date(fmt.expiresAt) : new Date(Date.now() + 24 * 60 * 60 * 1000), // Default 24h
        })).filter((fmt: VideoFormatOption) => fmt.url); // Only include formats with valid URLs
      }
    } else {
      // Direct response structure
      videoInfo = {
        title: data.title || "Untitled Video",
        thumbnail: data.thumbnail || "",
        duration: data.duration || 0,
        author: data.author || data.channel || "Unknown",
        platform,
        url,
      };
      
      if (data.formats || data.videos || data.links) {
        const formatArray = data.formats || data.videos || data.links || [];
        formats = formatArray.map((fmt: any) => ({
          quality: mapQualityString(fmt.quality || fmt.resolution || fmt.label || "720p"),
          format: mapFormatString(fmt.format || fmt.ext || "mp4"),
          fileSize: fmt.size || fmt.filesize || fmt.file_size || 0,
          url: fmt.url || fmt.link || fmt.downloadUrl || "",
          expiresAt: fmt.expiresAt ? new Date(fmt.expiresAt) : new Date(Date.now() + 24 * 60 * 60 * 1000),
        })).filter((fmt: VideoFormatOption) => fmt.url);
      }
    }
    
    // If no formats returned, create a default one (fallback)
    if (formats.length === 0 && data.downloadUrl) {
      formats = [{
        quality: "720p",
        format: "mp4",
        fileSize: data.fileSize || 0,
        url: data.downloadUrl,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      }];
    }
    
    return {
      videoInfo,
      formats,
    };
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Request timed out while extracting video information");
    }
    throw error;
  }
}

/**
 * Helper to map quality strings to VideoQuality type
 */
function mapQualityString(quality: string): VideoQuality {
  const q = quality.toLowerCase();
  if (q.includes("4k") || q.includes("2160")) return "4k";
  if (q.includes("1440") || q.includes("2k")) return "1440p";
  if (q.includes("1080")) return "1080p";
  if (q.includes("720")) return "720p";
  if (q.includes("480")) return "480p";
  if (q.includes("360")) return "360p";
  if (q.includes("audio") || q.includes("sound")) return "audio";
  return "720p"; // Default
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
