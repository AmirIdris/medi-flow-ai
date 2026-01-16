/**
 * Downloader Configuration
 * Environment-aware configuration for paths and settings
 * Detects Render/Docker vs local development
 */

import * as fs from "fs";
import { execFileSync } from "child_process";

export interface DownloaderConfig {
  isVercel: boolean;
  isRender: boolean;
  isDocker: boolean;
  isLocal: boolean;
  ytDlpPath: string;
  ytDlpCommand: string[];
  ffmpegPath: string | null;
  forceIPv4: boolean;
  timeout: number;
  maxRetries: number;
}

/**
 * Detect if running on Vercel
 */
function detectVercel(): boolean {
  return process.env.VERCEL === "1" || !!process.env.VERCEL_URL;
}

/**
 * Detect if running on Render
 */
function detectRender(): boolean {
  return !!process.env.RENDER || !!process.env.RENDER_SERVICE_ID;
}

/**
 * Detect if running in Docker
 */
function detectDocker(): boolean {
  return fs.existsSync("/.dockerenv") || !!process.env.DOCKER_CONTAINER;
}

/**
 * Find yt-dlp command
 */
function findYtDlpCommand(): string[] {
  // Try direct yt-dlp command first
  try {
    execFileSync("yt-dlp", ["--version"], {
      timeout: 2000,
      stdio: "ignore",
    });
    return ["yt-dlp"];
  } catch {
    // Try python -m yt_dlp
  }

  // Try python3
  try {
    execFileSync("python3", ["-m", "yt_dlp", "--version"], {
      timeout: 2000,
      stdio: "ignore",
    });
    return ["python3", "-m", "yt_dlp"];
  } catch {
    // Try python
  }

  try {
    execFileSync("python", ["-m", "yt_dlp", "--version"], {
      timeout: 2000,
      stdio: "ignore",
    });
    return ["python", "-m", "yt_dlp"];
  } catch {
    // Fallback
  }

  // Default fallback
  return ["python3", "-m", "yt_dlp"];
}

/**
 * Find FFmpeg path
 */
function findFFmpegPath(): string | null {
  const paths = [
    "ffmpeg",
    "/usr/bin/ffmpeg",
    "/usr/local/bin/ffmpeg",
    "/opt/homebrew/bin/ffmpeg",
  ];

  for (const ffmpegPath of paths) {
    try {
      execFileSync(ffmpegPath, ["-version"], {
        timeout: 2000,
        stdio: "ignore",
      });
      return ffmpegPath;
    } catch {
      continue;
    }
  }

  return null;
}

/**
 * Get downloader configuration
 */
export function getDownloaderConfig(): DownloaderConfig {
  const isVercel = detectVercel();
  const isRender = detectRender();
  const isDocker = detectDocker();
  const isLocal = !isVercel && !isRender && !isDocker;

  const ytDlpCommand = findYtDlpCommand();
  const ytDlpPath = ytDlpCommand[0];
  const ffmpegPath = findFFmpegPath();

  // Force IPv4 on Render (recommended to avoid IPv6 issues)
  const forceIPv4 = process.env.YTDLP_FORCE_IPV4 === "true" || isRender;

  // Timeout settings
  const timeout = parseInt(process.env.YTDLP_TIMEOUT || "60000", 10); // 60 seconds default

  // Max retries
  const maxRetries = parseInt(process.env.YTDLP_MAX_RETRIES || "3", 10);

  return {
    isVercel,
    isRender,
    isDocker,
    isLocal,
    ytDlpPath,
    ytDlpCommand,
    ffmpegPath,
    forceIPv4,
    timeout,
    maxRetries,
  };
}

/**
 * Get yt-dlp base arguments (common flags)
 */
export function getBaseYtDlpArgs(): string[] {
  const config = getDownloaderConfig();
  const args: string[] = [];

  // Force IPv4 if configured
  if (config.forceIPv4) {
    args.push("--force-ipv4");
  }

  // No certificate check (sometimes needed for proxies)
  if (process.env.YTDLP_NO_CHECK_CERT === "true") {
    args.push("--no-check-certificate");
  }

  // Prefer free formats (no DRM)
  if (process.env.YTDLP_PREFER_FREE_FORMATS !== "false") {
    args.push("--prefer-free-formats");
  }

  // No warnings (cleaner output)
  args.push("--no-warnings");

  // No playlist (single video only)
  args.push("--no-playlist");

  return args;
}

/**
 * Get environment info for debugging
 */
export function getEnvironmentInfo(): {
  platform: string;
  nodeVersion: string;
  isVercel: boolean;
  isRender: boolean;
  isDocker: boolean;
  ytDlpAvailable: boolean;
  ffmpegAvailable: boolean;
} {
  const config = getDownloaderConfig();

  return {
    platform: process.platform,
    nodeVersion: process.version,
    isVercel: config.isVercel,
    isRender: config.isRender,
    isDocker: config.isDocker,
    ytDlpAvailable: config.ytDlpPath !== null,
    ffmpegAvailable: config.ffmpegPath !== null,
  };
}

// Export singleton config instance
let configInstance: DownloaderConfig | null = null;

/**
 * Get cached config instance
 */
export function getConfig(): DownloaderConfig {
  if (!configInstance) {
    configInstance = getDownloaderConfig();
  }
  return configInstance;
}
