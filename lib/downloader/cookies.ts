/**
 * Cookie Pool Manager
 * Manages cookies for different platforms
 * Supports loading from files or environment variables
 */

import * as fs from "fs";
import * as path from "path";

export interface CookieInfo {
  platform: string;
  filePath: string;
  lastModified: number;
  exists: boolean;
}

export class CookiePool {
  private cookies: Map<string, CookieInfo> = new Map();

  constructor() {
    this.loadCookies();
  }

  /**
   * Load cookies from environment and default locations
   */
  private loadCookies(): void {
    // Check for global cookie file
    const globalCookieFile = process.env.YTDLP_COOKIES_FILE;
    if (globalCookieFile) {
      this.addCookieFile("global", globalCookieFile);
    }

    // Platform-specific cookie files
    const platforms = ["youtube", "instagram", "facebook", "tiktok", "twitter"];

    for (const platform of platforms) {
      const envKey = `YTDLP_COOKIES_${platform.toUpperCase()}_FILE`;
      const cookieFile = process.env[envKey];

      if (cookieFile) {
        this.addCookieFile(platform, cookieFile);
      } else {
        // Check default locations
        const defaultPaths = [
          path.join(process.cwd(), "cookies.txt"),
          path.join(process.cwd(), `cookies-${platform}.txt`),
          path.join(process.cwd(), "lib", "downloader", `cookies-${platform}.txt`),
        ];

        for (const defaultPath of defaultPaths) {
          if (fs.existsSync(defaultPath)) {
            this.addCookieFile(platform, defaultPath);
            break;
          }
        }
      }
    }
  }

  /**
   * Add a cookie file for a platform
   */
  addCookieFile(platform: string, filePath: string): void {
    const fullPath = path.resolve(filePath);
    const exists = fs.existsSync(fullPath);

    this.cookies.set(platform, {
      platform,
      filePath: fullPath,
      lastModified: exists ? fs.statSync(fullPath).mtimeMs : 0,
      exists,
    });

    if (process.env.NODE_ENV === "development" && exists) {
      console.log(`[CookiePool] Loaded cookies for ${platform}: ${fullPath}`);
    }
  }

  /**
   * Get cookie file for a platform
   * Returns null if not found
   */
  getCookieFile(platform: string): string | null {
    // Try platform-specific first
    const platformCookie = this.cookies.get(platform);
    if (platformCookie?.exists) {
      // Check if file still exists and is recent
      if (fs.existsSync(platformCookie.filePath)) {
        return platformCookie.filePath;
      }
    }

    // Fall back to global cookie file
    const globalCookie = this.cookies.get("global");
    if (globalCookie?.exists) {
      if (fs.existsSync(globalCookie.filePath)) {
        return globalCookie.filePath;
      }
    }

    return null;
  }

  /**
   * Get cookie file for a URL (auto-detect platform)
   */
  getCookieFileForUrl(url: string): string | null {
    const platform = this.detectPlatform(url);
    return this.getCookieFile(platform);
  }

  /**
   * Detect platform from URL
   */
  private detectPlatform(url: string): string {
    const urlLower = url.toLowerCase();

    if (urlLower.includes("youtube.com") || urlLower.includes("youtu.be")) {
      return "youtube";
    }
    if (urlLower.includes("instagram.com")) {
      return "instagram";
    }
    if (urlLower.includes("facebook.com") || urlLower.includes("fb.com")) {
      return "facebook";
    }
    if (urlLower.includes("tiktok.com")) {
      return "tiktok";
    }
    if (urlLower.includes("twitter.com") || urlLower.includes("x.com")) {
      return "twitter";
    }

    return "global";
  }

  /**
   * Check if cookies are available for a platform
   */
  hasCookies(platform: string): boolean {
    return this.getCookieFile(platform) !== null;
  }

  /**
   * Check if cookies are available for a URL
   */
  hasCookiesForUrl(url: string): boolean {
    return this.getCookieFileForUrl(url) !== null;
  }

  /**
   * Get all available cookie files
   */
  getAllCookies(): CookieInfo[] {
    return Array.from(this.cookies.values()).filter(c => c.exists);
  }

  /**
   * Refresh cookie file info (check if files still exist)
   */
  refresh(): void {
    for (const [platform, info] of Array.from(this.cookies.entries())) {
      const exists = fs.existsSync(info.filePath);
      if (exists) {
        info.exists = true;
        info.lastModified = fs.statSync(info.filePath).mtimeMs;
      } else {
        info.exists = false;
        info.lastModified = 0;
      }
    }
  }
}

/**
 * Global cookie pool instance
 */
let globalCookiePool: CookiePool | null = null;

/**
 * Get the global cookie pool instance
 */
export function getCookiePool(): CookiePool {
  if (!globalCookiePool) {
    globalCookiePool = new CookiePool();
  }
  return globalCookiePool;
}

/**
 * Get cookie file path for yt-dlp
 * Returns null if not available
 */
export function getCookieFileForYtDlp(url?: string): string | null {
  const pool = getCookiePool();
  
  if (url) {
    return pool.getCookieFileForUrl(url);
  }

  // Return global cookie file
  return pool.getCookieFile("global");
}

/**
 * Convert cookie file path to yt-dlp --cookies format
 * Returns ["--cookies", "/path/to/cookies.txt"] or empty array
 */
export function cookiesToYtDlpArgs(cookieFile: string | null): string[] {
  if (!cookieFile) {
    return [];
  }

  // Verify file exists and is not a placeholder
  if (!cookieFile || cookieFile.includes("/path/to/") || cookieFile.includes("placeholder")) {
    // Skip placeholder paths
    return [];
  }

  if (!fs.existsSync(cookieFile)) {
    if (process.env.NODE_ENV === "development") {
      console.warn(`[CookiePool] Cookie file not found: ${cookieFile}`);
    }
    return [];
  }

  return ["--cookies", cookieFile];
}
