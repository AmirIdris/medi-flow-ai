import type { VideoExtractResponse } from "@/types/video";

/**
 * Base interface for all video extraction providers
 */
export interface VideoProvider {
  /** Human-readable name of the provider */
  name: string;
  
  /** Extract video information and formats */
  extractVideo(url: string): Promise<VideoExtractResponse>;
  
  /** Check if the provider is available/configured */
  isAvailable(): boolean;
}

/**
 * Base class for video providers with common functionality
 */
export abstract class BaseProvider implements VideoProvider {
  abstract name: string;
  
  abstract extractVideo(url: string): Promise<VideoExtractResponse>;
  
  abstract isAvailable(): boolean;
  
  /**
   * Create an AbortController with timeout
   */
  protected createTimeoutController(timeoutMs: number = 30000): {
    controller: AbortController;
    timeoutId: NodeJS.Timeout;
  } {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    return { controller, timeoutId };
  }
  
  /**
   * Clear timeout and handle abort errors
   */
  protected handleTimeout(
    timeoutId: NodeJS.Timeout,
    error: unknown
  ): never {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Request timed out while extracting video information");
    }
    throw error;
  }
}
