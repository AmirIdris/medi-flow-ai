/**
 * Error Parser for yt-dlp
 * Parses stderr output to identify specific error types
 * Returns structured error information for better handling
 */

export enum ErrorType {
  BOT_DETECTION = "bot_detection",
  GEO_BLOCK = "geo_block",
  LOGIN_REQUIRED = "login_required",
  RATE_LIMIT = "rate_limit",
  VIDEO_NOT_FOUND = "video_not_found",
  PRIVATE_VIDEO = "private_video",
  AGE_RESTRICTED = "age_restricted",
  TIMEOUT = "timeout",
  NETWORK_ERROR = "network_error",
  UNKNOWN = "unknown",
}

export interface ParsedError {
  type: ErrorType;
  message: string;
  retryable: boolean;
  suggestions: string[];
  originalError: string;
}

/**
 * Parse yt-dlp error output
 */
export function parseYtDlpError(stderr: string, stdout?: string): ParsedError {
  const errorText = (stderr || stdout || "").toLowerCase();
  const fullError = stderr || stdout || "";

  // Bot Detection
  if (
    errorText.includes("sign in to confirm") ||
    errorText.includes("not a bot") ||
    errorText.includes("verify you're not a robot") ||
    errorText.includes("captcha") ||
    errorText.includes("challenge")
  ) {
    return {
      type: ErrorType.BOT_DETECTION,
      message: "YouTube bot detection triggered. Cookies are required.",
      retryable: true,
      suggestions: [
        "Use browser cookies (export with 'Get cookies.txt LOCALLY' extension)",
        "Try a different User-Agent",
        "Wait a few minutes before retrying",
        "Use a proxy server",
      ],
      originalError: fullError,
    };
  }

  // Geo-Block
  if (
    errorText.includes("not available in your country") ||
    errorText.includes("geo-blocked") ||
    errorText.includes("region locked") ||
    errorText.includes("this video is not available")
  ) {
    return {
      type: ErrorType.GEO_BLOCK,
      message: "Video is geo-blocked in your region.",
      retryable: true,
      suggestions: [
        "Use a proxy server in the allowed region",
        "Video may be restricted in your country",
      ],
      originalError: fullError,
    };
  }

  // Login Required
  if (
    errorText.includes("private video") ||
    errorText.includes("sign in to view") ||
    errorText.includes("login required") ||
    errorText.includes("authentication required")
  ) {
    return {
      type: ErrorType.LOGIN_REQUIRED,
      message: "Video requires login/authentication.",
      retryable: true,
      suggestions: [
        "Export cookies from your browser after logging in",
        "Use --cookies flag with yt-dlp",
        "Video may be private or require authentication",
      ],
      originalError: fullError,
    };
  }

  // Rate Limit
  if (
    errorText.includes("429") ||
    errorText.includes("too many requests") ||
    errorText.includes("rate limit") ||
    errorText.includes("quota exceeded")
  ) {
    return {
      type: ErrorType.RATE_LIMIT,
      message: "Rate limit exceeded. Too many requests.",
      retryable: true,
      suggestions: [
        "Wait a few minutes before retrying",
        "Use a different proxy server",
        "Reduce request frequency",
      ],
      originalError: fullError,
    };
  }

  // Video Not Found
  if (
    errorText.includes("video unavailable") ||
    errorText.includes("video not found") ||
    errorText.includes("404") ||
    errorText.includes("does not exist") ||
    errorText.includes("removed")
  ) {
    return {
      type: ErrorType.VIDEO_NOT_FOUND,
      message: "Video not found or has been removed.",
      retryable: false,
      suggestions: [
        "Verify the video URL is correct",
        "Video may have been deleted or made private",
        "Try a different video",
      ],
      originalError: fullError,
    };
  }

  // Private Video
  if (
    errorText.includes("private") ||
    errorText.includes("unlisted") ||
    errorText.includes("members only")
  ) {
    return {
      type: ErrorType.PRIVATE_VIDEO,
      message: "Video is private or unlisted.",
      retryable: false,
      suggestions: [
        "Video requires authentication to access",
        "Use cookies from an account with access",
      ],
      originalError: fullError,
    };
  }

  // Age Restricted
  if (
    errorText.includes("age restricted") ||
    errorText.includes("age verification") ||
    errorText.includes("sign in to confirm your age")
  ) {
    return {
      type: ErrorType.AGE_RESTRICTED,
      message: "Video is age-restricted.",
      retryable: true,
      suggestions: [
        "Use cookies from a logged-in account",
        "Video requires age verification",
      ],
      originalError: fullError,
    };
  }

  // Timeout
  if (
    errorText.includes("timeout") ||
    errorText.includes("timed out") ||
    errorText.includes("connection timeout") ||
    errorText.includes("read timeout")
  ) {
    return {
      type: ErrorType.TIMEOUT,
      message: "Request timed out.",
      retryable: true,
      suggestions: [
        "Video may be too large or server is slow",
        "Try again with a longer timeout",
        "Check your internet connection",
      ],
      originalError: fullError,
    };
  }

  // Network Error
  if (
    errorText.includes("network") ||
    errorText.includes("connection") ||
    errorText.includes("dns") ||
    errorText.includes("resolve") ||
    errorText.includes("econnrefused") ||
    errorText.includes("enotfound")
  ) {
    return {
      type: ErrorType.NETWORK_ERROR,
      message: "Network error occurred.",
      retryable: true,
      suggestions: [
        "Check your internet connection",
        "Try again in a few moments",
        "Verify the URL is accessible",
      ],
      originalError: fullError,
    };
  }

  // Unknown Error - include actual error text for debugging
  const errorPreview = fullError.substring(0, 200).replace(/\n/g, " ");
  return {
    type: ErrorType.UNKNOWN,
    message: `An unknown error occurred: ${errorPreview}${fullError.length > 200 ? "..." : ""}`,
    retryable: true,
    suggestions: [
      "Try again in a few moments",
      "Verify the video URL is correct",
      "Check yt-dlp logs for more details",
      `Error details: ${errorPreview}`,
    ],
    originalError: fullError,
  };
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: ParsedError): boolean {
  return error.retryable;
}

/**
 * Get user-friendly error message
 */
export function getUserFriendlyMessage(error: ParsedError): string {
  let message = error.message;

  if (error.suggestions.length > 0) {
    message += "\n\nSuggestions:\n";
    error.suggestions.forEach((suggestion, index) => {
      message += `${index + 1}. ${suggestion}\n`;
    });
  }

  return message;
}

/**
 * Extract specific error details from yt-dlp output
 */
export function extractErrorDetails(stderr: string): {
  videoId?: string;
  platform?: string;
  httpStatus?: number;
} {
  const details: {
    videoId?: string;
    platform?: string;
    httpStatus?: number;
  } = {};

  // Extract video ID (YouTube)
  const videoIdMatch = stderr.match(/\[youtube\]\s*([a-zA-Z0-9_-]{11})/i);
  if (videoIdMatch) {
    details.videoId = videoIdMatch[1];
  }

  // Extract platform
  const platformMatch = stderr.match(/\[(\w+)\]/);
  if (platformMatch) {
    details.platform = platformMatch[1];
  }

  // Extract HTTP status
  const statusMatch = stderr.match(/HTTP\s+(\d{3})/i);
  if (statusMatch) {
    details.httpStatus = parseInt(statusMatch[1], 10);
  }

  return details;
}
