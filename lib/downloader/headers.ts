/**
 * Browser Headers Generator
 * Generates realistic browser headers including Chrome Client Hints
 * Mimics real browser behavior to avoid bot detection
 */

import { getRandomUserAgent, getMobileUserAgent, getDesktopUserAgent } from "./user-agents";

export interface BrowserHeaders {
  "User-Agent": string;
  "Accept": string;
  "Accept-Language": string;
  "Accept-Encoding": string;
  "Sec-Ch-Ua"?: string;
  "Sec-Ch-Ua-Mobile"?: string;
  "Sec-Ch-Ua-Platform"?: string;
  "Sec-Fetch-Dest"?: string;
  "Sec-Fetch-Mode"?: string;
  "Sec-Fetch-Site"?: string;
  "Sec-Fetch-User"?: string;
  "Referer"?: string;
  "Origin"?: string;
}

/**
 * Chrome Client Hints for different Chrome versions
 */
const CHROME_CLIENT_HINTS = {
  "121": '"Google Chrome";v="121", "Chromium";v="121", "Not A(Brand";v="99"',
  "120": '"Google Chrome";v="120", "Chromium";v="120", "Not A(Brand";v="99"',
  "119": '"Google Chrome";v="119", "Chromium";v="119", "Not A(Brand";v="99"',
};

/**
 * Accept-Language variations (weighted by popularity)
 */
const ACCEPT_LANGUAGES = [
  "en-US,en;q=0.9",
  "en-GB,en;q=0.9",
  "en-US,en;q=0.9,es;q=0.8",
  "en-US,en;q=0.9,fr;q=0.8",
  "en-US,en;q=0.9,de;q=0.8",
  "en,en-US;q=0.9",
];

/**
 * Get random Accept-Language header
 */
function getRandomAcceptLanguage(): string {
  return ACCEPT_LANGUAGES[Math.floor(Math.random() * ACCEPT_LANGUAGES.length)];
}

/**
 * Extract Chrome version from User-Agent
 */
function extractChromeVersion(userAgent: string): string {
  const match = userAgent.match(/Chrome\/(\d+)/);
  return match ? match[1] : "121";
}

/**
 * Detect if User-Agent is mobile
 */
function isMobileUserAgent(userAgent: string): boolean {
  return /Mobile|Android|iPhone|iPad/i.test(userAgent);
}

/**
 * Detect OS from User-Agent
 */
function detectOS(userAgent: string): string {
  if (/Windows NT 10.0/i.test(userAgent)) return "Windows";
  if (/Macintosh|Mac OS X/i.test(userAgent)) return "macOS";
  if (/Linux/i.test(userAgent)) return "Linux";
  if (/Android/i.test(userAgent)) return "Android";
  if (/iPhone|iPad/i.test(userAgent)) return "iOS";
  return "Windows"; // Default
}

/**
 * Generate full browser headers for a request
 * Includes Chrome Client Hints and Sec-Fetch headers
 */
export function generateBrowserHeaders(options: {
  userAgent?: string;
  isMobile?: boolean;
  referer?: string;
  origin?: string;
  platform?: string;
} = {}): BrowserHeaders {
  // Get User-Agent
  let userAgent: string;
  if (options.userAgent) {
    userAgent = options.userAgent;
  } else if (options.isMobile) {
    userAgent = getMobileUserAgent();
  } else {
    userAgent = getDesktopUserAgent();
  }

  const isMobile = options.isMobile ?? isMobileUserAgent(userAgent);
  const os = options.platform ?? detectOS(userAgent);
  const chromeVersion = extractChromeVersion(userAgent);
  const isChrome = /Chrome/i.test(userAgent) && !/Edg|OPR/i.test(userAgent);

  const headers: BrowserHeaders = {
    "User-Agent": userAgent,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
    "Accept-Language": getRandomAcceptLanguage(),
    "Accept-Encoding": "gzip, deflate, br",
  };

  // Add Chrome Client Hints (only for Chrome browsers)
  if (isChrome) {
    const clientHint = CHROME_CLIENT_HINTS[chromeVersion as keyof typeof CHROME_CLIENT_HINTS] || CHROME_CLIENT_HINTS["121"];
    
    headers["Sec-Ch-Ua"] = clientHint;
    headers["Sec-Ch-Ua-Mobile"] = isMobile ? "?1" : "?0";
    headers["Sec-Ch-Ua-Platform"] = `"${os}"`;
    
    // Sec-Fetch headers (Chrome-specific)
    headers["Sec-Fetch-Dest"] = "document";
    headers["Sec-Fetch-Mode"] = "navigate";
    headers["Sec-Fetch-Site"] = options.referer ? "cross-site" : "none";
    headers["Sec-Fetch-User"] = "?1";
  }

  // Add Referer if provided
  if (options.referer) {
    headers["Referer"] = options.referer;
  }

  // Add Origin if provided
  if (options.origin) {
    headers["Origin"] = options.origin;
  }

  return headers;
}

/**
 * Convert headers object to yt-dlp --add-header format
 * Returns array of ["--add-header", "Header: Value"] pairs
 */
export function headersToYtDlpArgs(headers: BrowserHeaders): string[] {
  const args: string[] = [];

  for (const [key, value] of Object.entries(headers)) {
    if (value) {
      args.push("--add-header", `${key}: ${value}`);
    }
  }

  return args;
}

/**
 * Get headers for a specific platform
 */
export function getPlatformHeaders(platform: string, url: string): BrowserHeaders {
  const isMobile = Math.random() > 0.7; // 30% chance of mobile

  let referer: string | undefined;
  let origin: string | undefined;

  // Platform-specific referers
  switch (platform.toLowerCase()) {
    case "youtube":
      referer = "https://www.youtube.com/";
      origin = "https://www.youtube.com";
      break;
    case "instagram":
      referer = "https://www.instagram.com/";
      origin = "https://www.instagram.com";
      break;
    case "facebook":
      referer = "https://www.facebook.com/";
      origin = "https://www.facebook.com";
      break;
    case "tiktok":
      referer = "https://www.tiktok.com/";
      origin = "https://www.tiktok.com";
      break;
    case "twitter":
    case "x.com":
      referer = "https://twitter.com/";
      origin = "https://twitter.com";
      break;
    default:
      // Extract origin from URL
      try {
        const urlObj = new URL(url);
        origin = urlObj.origin;
        referer = `${urlObj.origin}/`;
      } catch {
        // Invalid URL, skip
      }
  }

  return generateBrowserHeaders({
    isMobile,
    referer,
    origin,
  });
}
