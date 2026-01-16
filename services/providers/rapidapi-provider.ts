import type { VideoExtractResponse, VideoInfo, VideoFormatOption, VideoQuality, VideoFormat, Platform } from "@/types/video";
import { BaseProvider } from "./base-provider";
import { detectPlatform } from "../video-service";

/**
 * RapidAPI video extraction provider
 * Supports multiple RapidAPI service instances via configuration
 */
export class RapidAPIProvider extends BaseProvider {
  private apiKey: string;
  private host: string;
  private endpoint?: string;
  
  constructor(
    apiKey: string,
    host: string,
    endpoint?: string,
    public readonly name: string = "RapidAPI"
  ) {
    super();
    this.apiKey = apiKey;
    this.host = host;
    this.endpoint = endpoint;
  }
  
  isAvailable(): boolean {
    return !!(this.apiKey && this.host);
  }
  
  async extractVideo(url: string): Promise<VideoExtractResponse> {
    if (!this.isAvailable()) {
      throw new Error(`${this.name} is not configured. Please set API key and host.`);
    }
    
    const platform = detectPlatform(url);
    const { controller, timeoutId } = this.createTimeoutController(30000);
    
    try {
      // Normalize endpoint
      let endpoint = this.endpoint || "/index.php";
      
      if (endpoint.includes(".p.rapidapi.com")) {
        const parts = endpoint.split("/");
        const hostIndex = parts.findIndex(p => p.includes("rapidapi.com"));
        if (hostIndex >= 0 && parts.length > hostIndex + 1) {
          endpoint = "/" + parts.slice(hostIndex + 1).join("/");
        } else {
          endpoint = "/index.php";
        }
      }
      
      if (!endpoint.startsWith("/")) {
        endpoint = `/${endpoint}`;
      }
      
      if (endpoint === "/" || !endpoint || endpoint.length < 2) {
        endpoint = "/index.php";
      }
      
      // Common endpoints to try if the primary one fails
      const endpointsToTry = [
        endpoint,
        "/getVideoInfo",
        "/video/info",
        "/info",
        "/download/info",
        "/video",
        "/getInfo",
        "/get-video-info",
        "/videoInfo",
        "/download",
        "/extract",
        "/get",
        "/api/video/info",
        "/api/info",
      ];
      
      let response: Response | null = null;
      let lastError: string | null = null;
      let triedEndpoints: string[] = [];
      
      // Try each endpoint until one works
      for (const tryEndpoint of endpointsToTry) {
        const tryUrl = `https://${this.host}${tryEndpoint}`;
        triedEndpoints.push(tryEndpoint);
        
        if (process.env.NODE_ENV === "development") {
          console.log(`[${this.name}] Trying endpoint: ${tryEndpoint}`);
        }
        
        try {
          response = await fetch(tryUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
              "x-rapidapi-host": this.host,
              "x-rapidapi-key": this.apiKey,
            },
            body: new URLSearchParams({ url }),
            signal: controller.signal,
          });
          
          if (response.ok) {
            if (process.env.NODE_ENV === "development") {
              console.log(`[${this.name}] Success with endpoint: ${tryEndpoint}`);
            }
            break;
          }
          
          if (response.status === 404) {
            continue;
          }
          
          if (response.status === 415) {
            response = await fetch(tryUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-rapidapi-host": this.host,
                "x-rapidapi-key": this.apiKey,
              },
              body: JSON.stringify({ url }),
              signal: controller.signal,
            });
            
            if (response.ok) {
              if (process.env.NODE_ENV === "development") {
                console.log(`[${this.name}] Success with endpoint: ${tryEndpoint} (JSON)`);
              }
              break;
            }
            
            if (response.status === 404) {
              continue;
            }
          }
          
          if (response.status === 405) {
            const urlParams = new URLSearchParams({ url });
            response = await fetch(`${tryUrl}?${urlParams}`, {
              method: "GET",
              headers: {
                "x-rapidapi-host": this.host,
                "x-rapidapi-key": this.apiKey,
              },
              signal: controller.signal,
            });
            
            if (response.ok) {
              if (process.env.NODE_ENV === "development") {
                console.log(`[${this.name}] Success with endpoint: ${tryEndpoint} (GET)`);
              }
              break;
            }
            
            if (response.status === 404) {
              continue;
            }
          }
          
          if (response.status !== 404) {
            lastError = `Status ${response.status}`;
            break;
          }
        } catch (fetchError) {
          if (fetchError instanceof Error && fetchError.name === "AbortError") {
            throw fetchError;
          }
          continue;
        }
      }
      
      clearTimeout(timeoutId);
      
      if (!response || !response.ok) {
        let errorMessage = lastError || `Failed to extract video: ${response?.status || "unknown"}`;
        
        if (response) {
          try {
            const errorData = await response.json();
            if (errorData.message) {
              errorMessage = errorData.message;
            } else if (typeof errorData === 'string') {
              errorMessage = errorData;
            } else {
              errorMessage = JSON.stringify(errorData);
            }
          } catch {
            if (response) {
              try {
                const errorText = await response.text();
                if (errorText) {
                  try {
                    const parsed = JSON.parse(errorText);
                    errorMessage = parsed.message || errorText;
                  } catch {
                    errorMessage = errorText || errorMessage;
                  }
                }
              } catch {
                // Ignore text parsing errors
              }
            }
          }
        }
        
        if (response && response.status === 403) {
          const cleanMessage = errorMessage.replace(/\.+/g, '.').trim();
          throw new Error(`API subscription required: ${cleanMessage} Please subscribe to the video downloader API on RapidAPI and ensure your API key and host are correctly configured.`);
        } else if (response && response.status === 401) {
          throw new Error(`Invalid API key: ${errorMessage}. Please check your API key configuration.`);
        } else if (!response || response.status === 404) {
          const endpointsList = triedEndpoints.join(", ");
          throw new Error(`API endpoint not found. Tried endpoints: ${endpointsList}. Error: ${errorMessage}. Please check your API documentation for the correct endpoint path.`);
        } else {
          throw new Error(`${this.name} error (${response?.status || "unknown"}): ${errorMessage}`);
        }
      }
      
      if (!response) {
        throw new Error("Failed to get response from API after trying all endpoints");
      }
      
      const data = await response.json();
      
      // Parse response
      let videoInfo: VideoInfo;
      let formats: VideoFormatOption[] = [];
      
      if (data.error === true || data.success === false) {
        throw new Error(data.message || "API returned an error");
      }
      
      // Handle the "medias" array format
      if (data.medias && Array.isArray(data.medias)) {
        videoInfo = {
          title: data.title || "Untitled Video",
          thumbnail: data.thumbnail || "",
          duration: data.duration || 0,
          author: data.author || data.channel || "Unknown",
          platform: (data.source || platform) as Platform,
          url: data.url || url,
        };
        
        // First, try to find merged formats (video with audio)
        // Then fall back to video-only formats if no merged formats exist
        const allFormats = data.medias.filter((media: any) => media.url);
        
        // Separate merged and video-only formats
        const mergedFormats = allFormats.filter((media: any) => {
          const mimeType = media.mimeType?.toLowerCase() || "";
          const isAudioMime = mimeType.startsWith("audio/");
          const isVideoMime = mimeType.startsWith("video/");
          const isAudio = isAudioMime || media.type === "audio" || (media.is_audio === true && !isVideoMime);
          
          // Skip pure audio formats
          if (isAudioMime && !isVideoMime) return false;
          
          // Include video formats that are likely merged (not explicitly audio-only)
          return isVideoMime && !isAudio;
        });
        
        // Use merged formats if available, otherwise use all video formats
        const formatsToProcess = mergedFormats.length > 0 
          ? mergedFormats 
          : allFormats.filter((media: any) => {
              const mimeType = media.mimeType?.toLowerCase() || "";
              const isAudioMime = mimeType.startsWith("audio/");
              const isVideoMime = mimeType.startsWith("video/");
              // Include video formats, exclude pure audio
              return isVideoMime || (!isAudioMime && (media.qualityLabel || media.quality));
            });
        
        formats = formatsToProcess
          .filter((media: any) => {
            // Final check - exclude pure audio formats and M3U8/HLS playlists
            const mimeType = media.mimeType?.toLowerCase() || "";
            const url = (media.url || "").toLowerCase();
            
            // Exclude audio-only formats
            if (mimeType.startsWith("audio/") && !mimeType.startsWith("video/")) {
              return false;
            }
            
            // Exclude M3U8/HLS playlist files (not actual video files)
            if (mimeType.includes("mpegurl") || 
                mimeType.includes("x-mpegurl") || 
                mimeType.includes("application/vnd.apple.mpegurl") ||
                url.includes(".m3u8") ||
                url.includes("m3u8")) {
              return false; // Skip playlist files
            }
            
            return true;
          })
          .map((media: any) => {
            const mimeType = media.mimeType?.toLowerCase() || "";
            const isAudioMime = mimeType.startsWith("audio/");
            const isVideoMime = mimeType.startsWith("video/");
            const isAudio = isAudioMime || media.type === "audio" || (media.is_audio === true && !isVideoMime);
            
            let qualityLabel = media.qualityLabel || media.quality || media.label || "";
            const mappedQuality = isAudio 
              ? "audio" as VideoQuality
              : this.mapQualityString(qualityLabel);
            
            let extension = media.extension;
            if (!extension) {
              if (isAudioMime) {
                extension = mimeType.includes("m4a") ? "m4a" : mimeType.includes("opus") ? "webm" : "mp3";
              } else {
                extension = media.mimeType?.split("/")[1]?.split(";")[0] || "mp4";
              }
            }
            const mappedFormat = this.mapFormatString(extension);
            
            // Get file size - check multiple possible fields
            const fileSize = media.contentLength 
              ? (typeof media.contentLength === "string" ? parseInt(media.contentLength, 10) : media.contentLength)
              : (media.size || media.filesize || media.file_size || media.fileSize || 0);
            
            return {
              quality: mappedQuality,
              format: mappedFormat,
              fileSize: fileSize,
              url: media.url,
              expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            };
          })
          .filter((fmt: VideoFormatOption) => fmt.url);
        
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
      // Handle nested data structure
      else if (data.data) {
        videoInfo = {
          title: data.data.title || data.title || "Untitled Video",
          thumbnail: data.data.thumbnail || data.thumbnail || "",
          duration: data.data.duration || data.duration || 0,
          author: data.data.author || data.author || data.data.channel || "Unknown",
          platform,
          url,
        };
        
        if (data.data.formats || data.data.videos || data.data.links || data.data.medias) {
          const formatArray = data.data.formats || data.data.videos || data.data.links || data.data.medias || [];
          formats = formatArray.map((fmt: any) => ({
            quality: this.mapQualityString(fmt.quality || fmt.qualityLabel || fmt.resolution || fmt.label || "720p"),
            format: this.mapFormatString(fmt.format || fmt.extension || fmt.ext || "mp4"),
            fileSize: typeof fmt.contentLength === "string" 
              ? parseInt(fmt.contentLength, 10) 
              : (fmt.size || fmt.filesize || fmt.file_size || 0),
            url: fmt.url || fmt.link || fmt.downloadUrl || "",
            expiresAt: fmt.expiresAt ? new Date(fmt.expiresAt) : new Date(Date.now() + 24 * 60 * 60 * 1000),
          })).filter((fmt: VideoFormatOption) => fmt.url);
        }
      }
      // Handle direct response structure
      else {
        videoInfo = {
          title: data.title || "Untitled Video",
          thumbnail: data.thumbnail || "",
          duration: data.duration || 0,
          author: data.author || data.channel || "Unknown",
          platform: (data.source || platform) as Platform,
          url: data.url || url,
        };
        
        if (data.formats || data.videos || data.links || data.medias) {
          const formatArray = data.formats || data.videos || data.links || data.medias || [];
          formats = formatArray.map((fmt: any) => ({
            quality: this.mapQualityString(fmt.quality || fmt.qualityLabel || fmt.resolution || fmt.label || "720p"),
            format: this.mapFormatString(fmt.format || fmt.extension || fmt.ext || "mp4"),
            fileSize: typeof fmt.contentLength === "string"
              ? parseInt(fmt.contentLength, 10)
              : (fmt.size || fmt.filesize || fmt.file_size || 0),
            url: fmt.url || fmt.link || fmt.downloadUrl || "",
            expiresAt: fmt.expiresAt ? new Date(fmt.expiresAt) : new Date(Date.now() + 24 * 60 * 60 * 1000),
          })).filter((fmt: VideoFormatOption) => fmt.url);
        }
      }
      
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
      return this.handleTimeout(timeoutId, error);
    }
  }
  
  private mapQualityString(quality: string): VideoQuality {
    const q = quality.toLowerCase();
    
    if (q.includes("2160") || q.includes("4k")) return "4k";
    if (q.includes("1440") || q.includes("2k")) return "1440p";
    if (q.includes("1080")) return "1080p";
    if (q.includes("720")) return "720p";
    if (q.includes("480")) return "480p";
    if (q.includes("360")) return "360p";
    if (q.includes("240")) return "360p";
    if (q.includes("144")) return "360p";
    
    if (q.includes("audio") || q.includes("sound") || q.includes("m4a") || q.includes("opus") || q.includes("mp3")) {
      return "audio";
    }
    
    return "720p";
  }
  
  private mapFormatString(format: string): VideoFormat {
    const f = format.toLowerCase().replace(".", "");
    
    if (f === "mp4" || f === "m4v") return "mp4";
    if (f === "webm") return "webm";
    if (f === "mp3") return "mp3";
    if (f === "m4a") return "m4a";
    
    return "mp4";
  }
}
