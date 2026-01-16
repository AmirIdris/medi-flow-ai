import type { VideoProvider, VideoExtractResponse } from "./base-provider";
import { YtDlpProvider } from "./ytdlp-provider";
import { detectPlatform } from "../video-service";

/**
 * Manages video extraction providers
 * Uses yt-dlp for all platforms (YouTube and others)
 * yt-dlp includes production-grade features: headers, cookies, proxies, retry logic
 */
export class ProviderManager {
  private providers: VideoProvider[] = [];
  
  constructor() {
    this.loadProviders();
  }
  
  /**
   * Load all configured providers from environment variables
   * yt-dlp is the primary provider (free, no API keys needed)
   */
  private loadProviders(): void {
    // Primary: yt-dlp provider (free, no API keys needed)
    const ytdlpProvider = new YtDlpProvider();
    // Check availability asynchronously, but add it anyway
    // It will be filtered out if not available when actually used
    this.providers.push(ytdlpProvider);
    
    // Filter out unavailable providers (sync check)
    // Note: yt-dlp availability is checked asynchronously, so it may be included even if not ready yet
    this.providers = this.providers.filter(p => {
      // For yt-dlp, we'll check availability when actually used (async)
      return p.isAvailable();
    });
    
    if (this.providers.length === 0) {
      console.warn(
        "[ProviderManager] No video extraction providers configured.\n" +
        "Please install yt-dlp (free, recommended): pip install yt-dlp"
      );
    } else {
      if (process.env.NODE_ENV === "development") {
        console.log(`[ProviderManager] Loaded ${this.providers.length} provider(s): ${this.providers.map(p => p.name).join(", ")}`);
      }
    }
  }
  
  /**
   * Extract video using the first available provider
   * Tries providers in order until one succeeds
   * Includes retry logic for transient failures
   */
  async extractVideo(url: string, retries: number = 1): Promise<VideoExtractResponse> {
    const platform = detectPlatform(url);
    
    // For all platforms (including YouTube): Use yt-dlp only
    // yt-dlp includes production-grade features: headers, cookies, proxies, retry logic
    const allProviders: VideoProvider[] = [];
    
    // Use yt-dlp for all platforms (service or local installation)
    const ytdlpProvider = new YtDlpProvider();
    // Always try yt-dlp - it will check for service first, then fallback to local
    allProviders.push(ytdlpProvider);
    
    if (allProviders.length === 0) {
      throw new Error(
        "No video extraction providers available.\n\n" +
        "Please install yt-dlp (free, recommended):\n" +
        "  - Install Python 3.7+: https://www.python.org/downloads/\n" +
        "  - Install yt-dlp: pip install yt-dlp\n" +
        "  - Or deploy the yt-dlp service and set YTDLP_API_URL in your .env file"
      );
    }
    
    // Use the same logic for all platforms
    if (true) {
      const providers = allProviders;
      
      // Try each provider in order with retries
      const errors: Array<{ provider: string; error: string }> = [];
      
      for (const provider of providers) {
        // Retry logic for each provider
        let lastError: Error | null = null;
        
        for (let attempt = 0; attempt <= retries; attempt++) {
          try {
            if (process.env.NODE_ENV === "development") {
              console.log(`[ProviderManager] Trying provider: ${provider.name} (attempt ${attempt + 1}/${retries + 1})`);
            }
            
            const result = await provider.extractVideo(url);
            
            if (process.env.NODE_ENV === "development") {
              console.log(`[ProviderManager] Success with provider: ${provider.name}`);
            }
            
            return result;
          } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            const errorMessage = lastError.message;
            
            // Don't retry on certain errors
            const isNonRetryableError = 
              errorMessage.includes("Video not found") ||
              errorMessage.includes("Invalid YouTube URL") ||
              errorMessage.includes("age-restricted") ||
              errorMessage.includes("region-locked") ||
              errorMessage.includes("removed") ||
              errorMessage.includes("private") ||
              errorMessage.includes("bot detection") ||
              errorMessage.includes("Sign in to confirm");
            
            if (isNonRetryableError) {
              break; // Don't retry these errors
            }
            
            // For yt-dlp connection errors, skip silently (service just isn't running)
            const isConnectionError = errorMessage.includes("ECONNREFUSED") || 
                                     errorMessage.includes("fetch failed") ||
                                     errorMessage.includes("not reachable") ||
                                     errorMessage.includes("not available");
            
            if (isConnectionError && provider.name === "yt-dlp") {
              // Don't add connection errors for yt-dlp - just skip it silently
              if (process.env.NODE_ENV === "development") {
                console.log(`[ProviderManager] yt-dlp service not available, skipping`);
              }
              lastError = null; // Clear error so we don't add it to errors array
              break; // Skip to next provider
            }
            
            // If this is not the last attempt, wait before retrying
            if (attempt < retries && !isNonRetryableError) {
              const delay = Math.min(500 * Math.pow(2, attempt), 2000); // Exponential backoff, max 2s
              if (process.env.NODE_ENV === "development") {
                console.log(`[ProviderManager] Provider ${provider.name} attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
              }
              await new Promise(resolve => setTimeout(resolve, delay));
              continue;
            }
          }
        }
        
        // If we have an error, add it to the errors array
        if (lastError) {
          const errorMessage = lastError.message;
          errors.push({ provider: provider.name, error: errorMessage });
          
          if (process.env.NODE_ENV === "development") {
            console.warn(`[ProviderManager] Provider ${provider.name} failed after ${retries + 1} attempt(s): ${errorMessage}`);
          }
        }
        
        // Continue to next provider
        continue;
      }
      
      // All providers failed
      // Filter out connection errors for yt-dlp (they're not real failures, just service not running)
      const meaningfulErrors = errors.filter(e => {
        if (e.provider === "yt-dlp") {
          const isConnectionError = e.error.includes("ECONNREFUSED") || 
                                   e.error.includes("fetch failed") ||
                                   e.error.includes("not reachable") ||
                                   e.error.includes("not available");
          return !isConnectionError; // Only include non-connection errors
        }
        return true;
      });
      
      // Check if any error is due to bot detection
      const hasBotDetection = meaningfulErrors.some(e => 
        e.error.includes("bot detection") || 
        e.error.includes("Sign in to confirm") ||
        e.error.includes("not a bot") ||
        e.error.includes("Failed to extract any player response") ||
        e.error.includes("Unable to extract video") ||
        e.error.includes("player response")
      );
      
      // Check if yt-dlp was configured but not running
      const ytdlpConfigured = !!process.env.YTDLP_API_URL;
      const ytdlpConnectionError = errors.some(e => 
        e.provider === "yt-dlp" && (
          e.error.includes("ECONNREFUSED") || 
          e.error.includes("fetch failed") ||
          e.error.includes("not reachable") ||
          e.error.includes("not available")
        )
      );
      
      let suggestion = "";
      if (ytdlpConfigured && ytdlpConnectionError) {
        suggestion = `\n\n💡 Note: yt-dlp service is configured but not running at ${process.env.YTDLP_API_URL}.\n` +
          `   Start the service to enable extraction. See ytdlp-service/README.md for instructions.`;
      } else if (!ytdlpConfigured) {
        suggestion = `\n\n💡 Suggestion: For more reliable extraction, set up the yt-dlp service:\n` +
          `  1. Deploy the yt-dlp service (see ytdlp-service/README.md)\n` +
          `  2. Set YTDLP_API_URL in your .env file\n` +
          `  3. Or install yt-dlp locally: pip install yt-dlp`;
      }
      
      // Build a more user-friendly error message
      let errorMessage = `Unable to extract video${platform === "youtube" ? " from YouTube" : ""}.`;
      
      if (hasBotDetection) {
        // Special handling for bot detection errors
        errorMessage = `YouTube is blocking automated access to this video.`;
        errorMessage += `\n\nThis is due to YouTube's bot detection system.`;
        errorMessage += `\n\nSolutions:\n` +
          `• Wait a few minutes and try again\n` +
          `• Try a different video URL\n` +
          `• Use cookies for more reliable access (see ytdlp-service/COOKIES_SETUP.md)`;
      } else if (meaningfulErrors.length > 0) {
        // Show actual error messages from providers (first 2-3 lines max)
        errorMessage += "\n\nError details:";
        meaningfulErrors.slice(0, 2).forEach((e, index) => {
          // Get first few lines of error, truncate if too long
          const errorLines = e.error.split('\n').slice(0, 2).join(' ').trim();
          const truncatedError = errorLines.length > 300 
            ? errorLines.substring(0, 300) + "..." 
            : errorLines;
          
          if (truncatedError && truncatedError.length > 0) {
            errorMessage += `\n${index + 1}. ${e.provider}: ${truncatedError}`;
          }
        });
      }
      
      if (!hasBotDetection) {
        // Add helpful context based on error type
        const hasTimeout = meaningfulErrors.some(e => 
          e.error.includes("timeout") || 
          e.error.includes("aborted") ||
          e.error.includes("timed out")
        );
        
        if (hasTimeout) {
          errorMessage += `\n\nThe extraction service is taking too long to respond.`;
          errorMessage += `\n\nThis may be due to:\n` +
            `• Service is temporarily overloaded\n` +
            `• Network connectivity issues\n` +
            `• Video is very large or complex`;
        } else {
          errorMessage += `\n\nThis may be due to:\n` +
            `• Video is age-restricted or region-locked\n` +
            `• Video has been removed or made private\n` +
            `• Temporary service unavailability`;
        }
        
        errorMessage += `\n\nPlease try:\n` +
          `• Verifying the video URL is correct\n` +
          `• Trying again in a few moments\n` +
          `• Using a different video URL`;
      }
      
      if (suggestion) {
        errorMessage += suggestion;
      }
      
      throw new Error(errorMessage);
    }
  }
  
  /**
   * Get list of configured provider names
   */
  getProviderNames(): string[] {
    return this.providers.map(p => p.name);
  }
  
  /**
   * Get number of configured providers
   */
  getProviderCount(): number {
    return this.providers.length;
  }
}

// Singleton instance
let providerManagerInstance: ProviderManager | null = null;

/**
 * Get the singleton provider manager instance
 */
export function getProviderManager(): ProviderManager {
  if (!providerManagerInstance) {
    providerManagerInstance = new ProviderManager();
  }
  return providerManagerInstance;
}
