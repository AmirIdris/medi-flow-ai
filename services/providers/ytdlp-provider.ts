import type { VideoExtractResponse, VideoInfo, VideoFormatOption, VideoQuality, VideoFormat, Platform } from "@/types/video";
import { BaseProvider } from "./base-provider";
import { detectPlatform } from "../video-service";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

/**
 * yt-dlp video extraction provider
 * Uses HTTP API to call a separate Python service (for Vercel deployment)
 * Falls back to local Python execution if YTDLP_API_URL is not set (for local dev)
 */
export class YtDlpProvider extends BaseProvider {
  public readonly name = "yt-dlp";
  private apiUrl: string | null = null;
  private isAvailableCache: boolean | null = null;
  private localYtDlpCache: boolean | null = null;
  private ytDlpCommand: string | null = null;
  
  constructor() {
    super();
    // Get API URL from environment variable
    this.apiUrl = process.env.YTDLP_API_URL || null;
  }
  
  /**
   * Check if local yt-dlp is installed
   */
  private async checkLocalYtDlp(): Promise<boolean> {
    // Return cached value if available
    if (this.localYtDlpCache !== null) {
      return this.localYtDlpCache;
    }
    
    // Check for yt-dlp command
    const commands = ["yt-dlp", "ytdlp", "python -m yt_dlp"];
    
    for (const cmd of commands) {
      try {
        const [command, ...args] = cmd.split(" ");
        const { timeoutId } = this.createTimeoutController(3000);
        
        try {
          await execFileAsync(command, args.length > 0 ? args : ["--version"], {
            timeout: 3000,
          });
          
          clearTimeout(timeoutId);
          this.ytDlpCommand = cmd;
          this.localYtDlpCache = true;
          
          if (process.env.NODE_ENV === "development") {
            console.log(`[${this.name}] Found local yt-dlp: ${cmd}`);
          }
          
          return true;
        } catch {
          clearTimeout(timeoutId);
          continue;
        }
      } catch {
        continue;
      }
    }
    
    this.localYtDlpCache = false;
    return false;
  }
  
  /**
   * Check if yt-dlp is available
   * For Vercel: checks if YTDLP_API_URL is configured
   * For local: checks if Python/yt-dlp is installed
   */
  async isAvailableAsync(): Promise<boolean> {
    // If API URL is configured, check service availability
    if (this.apiUrl) {
      const available = await this.checkAvailability();
      if (available) return true;
    }
    
    // Check for local yt-dlp (only in non-Vercel environments)
    if (process.env.VERCEL !== "1") {
      return await this.checkLocalYtDlp();
    }
    
    return false;
  }
  
  isAvailable(): boolean {
    // Synchronous check - return true if API URL is configured or local might be available
    if (this.apiUrl) {
      return this.isAvailableCache !== false;
    }
    
    // For local development, return true if we haven't checked yet
    // (will be checked asynchronously when needed)
    if (process.env.VERCEL !== "1") {
      return this.localYtDlpCache !== false;
    }
    
    return false;
  }
  
  /**
   * Check availability asynchronously
   * For API mode: checks if the service is reachable
   */
  private async checkAvailability(): Promise<boolean> {
    // Return cached value if available
    if (this.isAvailableCache !== null) {
      return this.isAvailableCache;
    }
    
    // If API URL is configured, check if service is reachable
    if (this.apiUrl) {
      try {
        const { controller, timeoutId } = this.createTimeoutController(5000);
        const response = await fetch(`${this.apiUrl}/health`, {
          method: "GET",
          signal: controller.signal as any,
        });
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const health = await response.json();
          this.isAvailableCache = health.ytdlp_available === true;
          return this.isAvailableCache;
        }
        
        this.isAvailableCache = false;
        return false;
      } catch (error) {
        if (process.env.NODE_ENV === "development") {
          const errorMsg = error instanceof Error ? error.message : String(error);
          // Don't log connection refused as warning - it's expected if service isn't running
          if (!errorMsg.includes("ECONNREFUSED") && !errorMsg.includes("fetch failed")) {
            console.warn(`[${this.name}] Health check failed:`, error);
          }
        }
        this.isAvailableCache = false;
        return false;
      }
    }
    
    // No API URL configured
    this.isAvailableCache = false;
    return false;
  }
  
  /**
   * Extract video using local yt-dlp installation
   */
  private async extractVideoLocal(url: string): Promise<VideoExtractResponse> {
    if (!this.ytDlpCommand) {
      const hasLocal = await this.checkLocalYtDlp();
      if (!hasLocal || !this.ytDlpCommand) {
        throw new Error(
          "yt-dlp is not installed locally. Please install:\n" +
          "  1. Python 3.7+: https://www.python.org/downloads/\n" +
          "  2. yt-dlp: pip install yt-dlp"
        );
      }
    }
    
    const platform = detectPlatform(url);
    const { controller, timeoutId } = this.createTimeoutController(60000); // 60 second timeout
    
    try {
      if (process.env.NODE_ENV === "development") {
        console.log(`[${this.name}] Extracting video locally: ${url}`);
      }
      
      const [command, ...baseArgs] = this.ytDlpCommand.split(" ");
      const args = [
        ...baseArgs,
        "--dump-json",
        "--no-warnings",
        "--no-playlist",
        url,
      ];
      
      // Execute yt-dlp
      const { stdout, stderr } = await Promise.race([
        execFileAsync(command, args, {
          timeout: 60000,
          maxBuffer: 10 * 1024 * 1024, // 10MB buffer
        }),
        new Promise<never>((_, reject) => {
          controller.signal.addEventListener("abort", () => {
            reject(new Error("Request timed out"));
          });
        }),
      ]);
      
      clearTimeout(timeoutId);
      
      if (stderr && !stderr.includes("WARNING")) {
        if (process.env.NODE_ENV === "development") {
          console.warn(`[${this.name}] yt-dlp stderr:`, stderr);
        }
        
        // Check for bot detection errors in stderr
        if (stderr.includes("Sign in to confirm") || stderr.includes("not a bot") || stderr.includes("bot detection")) {
          throw new Error(
            "YouTube bot detection: YouTube is blocking automated access.\n\n" +
            "Solutions:\n" +
            "  1. Use the yt-dlp service with cookies (see ytdlp-service/COOKIES_SETUP.md)\n" +
            "  2. Wait a few minutes and try again\n" +
            "  3. Try a different video URL"
          );
        }
      }
      
      // Parse JSON output
      let data: any;
      try {
        data = JSON.parse(stdout);
      } catch (parseError) {
        throw new Error(`Failed to parse yt-dlp output: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
      }
      
      // Use the same format mapping logic as API mode
      return this.parseYtDlpResponse(data, platform, url);
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error) {
        // Check if error message already contains bot detection info
        if (error.message.includes("YouTube bot detection") || 
            error.message.includes("Sign in to confirm") || 
            error.message.includes("not a bot")) {
          throw error; // Re-throw as-is
        }
        
        // Check error message for bot detection
        if (error.message.includes("Sign in to confirm") || error.message.includes("not a bot")) {
          throw new Error(
            "YouTube bot detection: YouTube is blocking automated access.\n\n" +
            "Solutions:\n" +
            "  1. Use the yt-dlp service with cookies (see ytdlp-service/COOKIES_SETUP.md)\n" +
            "  2. Wait a few minutes and try again\n" +
            "  3. Try a different video URL"
          );
        }
        
        // Handle timeout
        if (error.name === "AbortError" || error.message.includes("timeout")) {
          throw new Error("yt-dlp request timed out. The video may be too large or the server is slow.");
        }
        
        // Handle command not found
        if (error.message.includes("ENOENT") || error.message.includes("not found")) {
          throw new Error(
            "yt-dlp or Python not found. Please install:\n" +
            "  1. Python 3.7+: https://www.python.org/downloads/\n" +
            "  2. yt-dlp: pip install yt-dlp"
          );
        }
        
        throw new Error(`yt-dlp error: ${error.message}`);
      }
      
      throw error;
    }
  }
  
  /**
   * Parse yt-dlp JSON response into our format
   */
  private parseYtDlpResponse(data: any, platform: Platform, url: string): VideoExtractResponse {
    // Extract video info
    const webpageUrl = data.webpage_url || url;
    const videoInfo: VideoInfo = {
      title: data.title || "Untitled Video",
      thumbnail: data.thumbnail || data.thumbnails?.[0]?.url || "",
      duration: data.duration || 0,
      author: data.uploader || data.channel || data.creator || "Unknown",
      platform: this.mapPlatform(data.extractor || platform),
      url: webpageUrl,
    };
    
    // Determine referer URL based on platform
    let referer: string | undefined;
    try {
      const parsedWebpageUrl = new URL(webpageUrl);
      if (parsedWebpageUrl.hostname.includes("youtube.com") || parsedWebpageUrl.hostname.includes("youtu.be")) {
        referer = "https://www.youtube.com";
      } else {
        referer = parsedWebpageUrl.origin;
      }
    } catch {
      // Invalid URL, referer will be undefined
    }
    
    // Parse formats - PRIORITIZE MERGED FORMATS (video + audio together)
    const formats: VideoFormatOption[] = [];
    
    // FIRST: Check if the main data object is a merged format (video + audio)
    if (data.url) {
      // Exclude M3U8/HLS playlist files
      const url = (data.url || "").toLowerCase();
      const protocol = (data.protocol || "").toLowerCase();
      
      if (!url.includes(".m3u8") && 
          !url.includes("m3u8") &&
          protocol !== "m3u8" &&
          protocol !== "m3u8_native") {
        const hasVideo = data.vcodec && data.vcodec !== "none";
        const hasAudio = data.acodec && data.acodec !== "none";
        
        if (hasVideo && hasAudio) {
          formats.push({
            quality: this.mapQuality("", data.height || 720),
            format: this.mapFormat(data.ext || "mp4"),
            fileSize: data.filesize || 0,
            url: data.url,
            expiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000),
            referer: referer,
          });
        }
      }
    }
    
    // SECOND: Check formats array for additional merged formats
    if (data.formats && Array.isArray(data.formats)) {
      const mergedFormats = data.formats.filter((fmt: any) => {
        if (!fmt.url || fmt.url === data.url) return false;
        const hasVideo = fmt.vcodec && fmt.vcodec !== "none";
        const hasAudio = fmt.acodec && fmt.acodec !== "none";
        return hasVideo && hasAudio;
      });
      
      const formatsToProcess = mergedFormats.length > 0 
        ? mergedFormats 
        : data.formats.filter((fmt: any) => {
            if (!fmt.url || fmt.url === data.url) return false;
            const hasVideo = fmt.vcodec && fmt.vcodec !== "none";
            return hasVideo;
          });
      
      const processedFormats = formatsToProcess
        .filter((fmt: any) => {
          if (!fmt.url) return false;
          if (fmt.url === data.url) return false;
          
          const url = (fmt.url || "").toLowerCase();
          const protocol = (fmt.protocol || "").toLowerCase();
          
          if (url.includes(".m3u8") || 
              url.includes("m3u8") ||
              protocol === "m3u8" ||
              protocol === "m3u8_native") {
            return false;
          }
          
          return true;
        })
        .map((fmt: any) => {
          const resolution = fmt.format_note || fmt.resolution || "";
          const height = fmt.height || 0;
          const ext = fmt.ext || "mp4";
          
          let fileSize = fmt.filesize || fmt.filesize_approx || fmt.filesize_estimate || 0;
          if (fileSize === 0 && fmt.tbr && data.duration) {
            fileSize = Math.round((fmt.tbr * data.duration) / 8);
          }
          fileSize = Number(fileSize) || 0;
          
          return {
            quality: this.mapQuality(resolution, height),
            format: this.mapFormat(ext),
            fileSize,
            url: fmt.url,
            expiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000),
            referer: referer,
          };
        });
      
      const seen = new Set<string>();
      for (const fmt of processedFormats) {
        const key = `${fmt.quality}-${fmt.format}`;
        if (!seen.has(key)) {
          seen.add(key);
          formats.push(fmt);
        }
      }
      
      formats.sort((a, b) => {
        if (a.quality === "audio" && b.quality !== "audio") return 1;
        if (b.quality === "audio" && a.quality !== "audio") return -1;
        
        const qualityOrder: Record<VideoQuality, number> = {
          "4k": 6,
          "1440p": 5,
          "1080p": 4,
          "720p": 3,
          "480p": 2,
          "360p": 1,
          "audio": 0,
        };
        
        return (qualityOrder[b.quality] || 0) - (qualityOrder[a.quality] || 0);
      });
    }
    
    if (formats.length === 0 && data.url) {
      const hasVideo = data.vcodec && data.vcodec !== "none";
      const hasAudio = data.acodec && data.acodec !== "none";
      
      if (hasVideo && hasAudio) {
        formats.push({
          quality: this.mapQuality("", data.height || 720),
          format: this.mapFormat(data.ext || "mp4"),
          fileSize: data.filesize || 0,
          url: data.url,
          expiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000),
          referer: referer,
        });
      } else if (hasVideo) {
        formats.push({
          quality: this.mapQuality("", data.height || 720),
          format: this.mapFormat(data.ext || "mp4"),
          fileSize: data.filesize || 0,
          url: data.url,
          expiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000),
          referer: referer,
        });
      }
    }
    
    if (formats.length === 0) {
      throw new Error(
        "No video formats found. " +
        "Please check the video URL and ensure yt-dlp can access it."
      );
    }
    
    if (process.env.NODE_ENV === "development") {
      console.log(`[${this.name}] Successfully extracted ${formats.length} format(s)`);
    }
    
    return {
      videoInfo,
      formats,
    };
  }
  
  async extractVideo(url: string): Promise<VideoExtractResponse> {
    // On Vercel: Always use external service (subprocesses don't work)
    if (process.env.VERCEL === "1") {
      if (this.apiUrl) {
        try {
          const available = await this.checkAvailability();
          if (available) {
            return await this.extractVideoViaApi(url);
          }
        } catch (error) {
          // Service unavailable
        }
      }
      
      throw new Error(
        "yt-dlp service is required on Vercel. Please:\n" +
        "  1. Deploy the Python yt-dlp service (Railway/Render)\n" +
        "  2. Set YTDLP_API_URL environment variable in Vercel\n" +
        "  3. See DEPLOYMENT_GUIDE.md for instructions"
      );
    }

    // On Render/local: Try Next.js API routes first (if available), then external service, then local
    // 1. Try Next.js API routes (works on Render and local)
    try {
      if (process.env.NODE_ENV === "development") {
        console.log(`[${this.name}] Trying Next.js API routes...`);
      }
      
      return await this.extractVideoViaNextJsRoutes(url);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      
      // If Next.js routes are explicitly unavailable (503), try other options
      if (errorMsg.includes("503") || errorMsg.includes("not supported")) {
        if (process.env.NODE_ENV === "development") {
          console.log(`[${this.name}] Next.js routes unavailable, trying external service...`);
        }
      } else {
        // Other error from Next.js routes, re-throw
        throw error;
      }
    }

    // 2. Try external API service if configured
    if (this.apiUrl) {
      try {
        const available = await this.checkAvailability();
        if (available) {
          return await this.extractVideoViaApi(url);
        }
      } catch (error) {
        // Service unavailable - fall through to local execution
        if (process.env.NODE_ENV === "development") {
          const errorMsg = error instanceof Error ? error.message : String(error);
          if (errorMsg.includes("ECONNREFUSED") || errorMsg.includes("fetch failed")) {
            console.log(`[${this.name}] External service unavailable, trying local yt-dlp...`);
          }
        }
      }
    }
    
    // 3. Try local yt-dlp execution (direct subprocess)
    const hasLocal = await this.checkLocalYtDlp();
    if (hasLocal) {
      return await this.extractVideoLocal(url);
    }
    
    // All options failed
    if (this.apiUrl) {
      throw new Error(
        `All yt-dlp options failed:\n` +
        `  - Next.js API routes: Unavailable\n` +
        `  - External service (${this.apiUrl}): Unavailable\n` +
        `  - Local yt-dlp: Not installed\n\n` +
        "Please either:\n" +
        "  1. Install yt-dlp locally: pip install yt-dlp, or\n" +
        "  2. Deploy the yt-dlp service and ensure it's running"
      );
    }
    
    throw new Error(
      "yt-dlp is not available. Please either:\n" +
      "  1. Install yt-dlp locally: pip install yt-dlp, or\n" +
      "  2. Set YTDLP_API_URL and deploy the Python service"
    );
  }
  
  /**
   * Extract video via Next.js service (direct function call, not HTTP)
   * Works on Render/local, not Vercel
   * This is more efficient than HTTP calls when running server-side
   */
  private async extractVideoViaNextJsRoutes(url: string): Promise<VideoExtractResponse> {
    const platform = detectPlatform(url);

    try {
      if (process.env.NODE_ENV === "development") {
        console.log(`[${this.name}] Extracting video via Next.js service (direct call): ${url}`);
      }

      // Import and call the service function directly (no HTTP overhead)
      const { extractVideoWithClients } = await import("@/services/ytdlp-service");

      // Extract video with multiple client strategies
      const data = await extractVideoWithClients(url, {
        cookiesFile: process.env.YTDLP_COOKIES_FILE,
        timeout: 60000, // 60 seconds
      });

      // Parse and return in our format
      return this.parseYtDlpResponse(data, platform, url);
    } catch (error) {
      if (error instanceof Error) {
        // Check if it's a Vercel/platform error
        if (error.message.includes("not supported on Vercel") || error.message.includes("503")) {
          throw new Error("Next.js yt-dlp routes are not available on this platform (Vercel)");
        }

        // Check for timeout
        if (error.message.includes("timed out") || error.message.includes("timeout")) {
          throw new Error("yt-dlp request timed out. The video may be too large or the server is slow.");
        }

        // Check for installation error
        if (error.message.includes("not installed")) {
          throw new Error(
            "yt-dlp is not installed. Please install:\n" +
            "  1. Python 3.7+: https://www.python.org/downloads/\n" +
            "  2. yt-dlp: pip install yt-dlp"
          );
        }

        throw new Error(`Next.js yt-dlp service error: ${error.message}`);
      }

      throw error;
    }
  }

  /**
   * Extract video via external API service
   */
  private async extractVideoViaApi(url: string): Promise<VideoExtractResponse> {
    
    const platform = detectPlatform(url);
    const { controller, timeoutId } = this.createTimeoutController(60000); // 60 second timeout

    try {
      if (process.env.NODE_ENV === "development") {
        console.log(`[${this.name}] Extracting video via external API: ${url}`);
      }

      // Call the Python API service
      const response = await fetch(`${this.apiUrl}/extract`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url }),
        signal: controller.signal as any,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `API returned ${response.status}: ${response.statusText}`;
        
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.detail || errorMessage;
        } catch {
          // Use text as-is
          if (errorText) {
            errorMessage = errorText.substring(0, 500);
          }
        }
        
        if (response.status === 504) {
          throw new Error("yt-dlp request timed out. The video may be too large or the server is slow.");
        }
        
        throw new Error(`yt-dlp API error: ${errorMessage}`);
      }
      
      // Parse JSON response (same format as yt-dlp --dump-json)
      let data: any;
      try {
        data = await response.json();
      } catch (parseError) {
        throw new Error(`Failed to parse API response: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
      }
      
      // Use shared parsing logic
      return this.parseYtDlpResponse(data, platform, url);
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error) {
        // Handle timeout
        if (error.name === "AbortError" || error.message.includes("timeout")) {
          throw new Error("yt-dlp request timed out. The video may be too large or the server is slow.");
        }
        
        throw new Error(`yt-dlp API error: ${error.message}`);
      }
      
      throw error;
    }
  }
  
  /**
   * Map yt-dlp extractor to our Platform type
   */
  private mapPlatform(extractor: string): Platform {
    const ext = extractor?.toLowerCase() || "";
    
    if (ext.includes("youtube")) return "youtube";
    if (ext.includes("tiktok")) return "tiktok";
    if (ext.includes("instagram")) return "instagram";
    if (ext.includes("facebook")) return "facebook";
    if (ext.includes("twitter") || ext.includes("x.com")) return "twitter";
    if (ext.includes("vimeo")) return "vimeo";
    if (ext.includes("dailymotion")) return "dailymotion";
    
    return "other";
  }
  
  /**
   * Map resolution/height to VideoQuality
   */
  private mapQuality(resolution: string, height: number): VideoQuality {
    const res = resolution.toLowerCase();
    
    // Check height first (more reliable)
    if (height >= 2160) return "4k";
    if (height >= 1440) return "1440p";
    if (height >= 1080) return "1080p";
    if (height >= 720) return "720p";
    if (height >= 480) return "480p";
    if (height >= 360) return "360p";
    
    // Check resolution string
    if (res.includes("2160") || res.includes("4k")) return "4k";
    if (res.includes("1440") || res.includes("2k")) return "1440p";
    if (res.includes("1080")) return "1080p";
    if (res.includes("720")) return "720p";
    if (res.includes("480")) return "480p";
    if (res.includes("360")) return "360p";
    
    // Default
    return "720p";
  }
  
  /**
   * Map file extension to VideoFormat
   */
  private mapFormat(ext: string): VideoFormat {
    const e = ext.toLowerCase().replace(".", "");
    
    if (e === "mp4" || e === "m4v") return "mp4";
    if (e === "webm") return "webm";
    if (e === "mp3") return "mp3";
    if (e === "m4a") return "m4a";
    
    return "mp4";
  }
}
