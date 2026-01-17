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
 * Get enhanced PATH environment variable
 * Includes user's local bin directory where pip install --user installs binaries
 */
function getEnhancedPath(): string {
  const userLocalBin = process.env.HOME ? `${process.env.HOME}/.local/bin` : null;
  const currentPath = process.env.PATH || "";
  
  if (userLocalBin && !currentPath.includes(userLocalBin)) {
    return `${userLocalBin}:${currentPath}`;
  }
  
  return currentPath;
}

/**
 * Get enhanced PYTHONPATH environment variable
 * Includes user's local Python site-packages where pip install --user installs modules
 */
function getEnhancedPythonPath(): string {
  const home = process.env.HOME;
  if (!home) return process.env.PYTHONPATH || "";
  
  // Try to find Python version by actually running Python
  let pythonVersion = "3.11"; // Default fallback
  const pythonCmds = ["python3", "python"];
  
  for (const pythonCmd of pythonCmds) {
    try {
      // Get Python version
      const versionOutput = execFileSync(pythonCmd, ["--version"], {
        timeout: 2000,
        encoding: "utf-8",
        stdio: "pipe",
      });
      const match = versionOutput.match(/Python (\d+\.\d+)/);
      if (match) {
        pythonVersion = match[1];
        break;
      }
    } catch {
      continue;
    }
  }
  
  // Try multiple possible site-packages locations
  const possiblePaths = [
    `${home}/.local/lib/python${pythonVersion}/site-packages`,
    `${home}/.local/lib/python${Math.floor(parseFloat(pythonVersion))}/site-packages`, // e.g., python3.11 -> python3
    `${home}/.local/lib/python3/site-packages`,
  ];
  
  // Check which path actually exists
  const fs = require("fs");
  let userSitePackages = "";
  for (const path of possiblePaths) {
    if (fs.existsSync(path)) {
      userSitePackages = path;
      break;
    }
  }
  
  // If none found, use the first one (most likely)
  if (!userSitePackages) {
    userSitePackages = possiblePaths[0];
  }
  
  const currentPythonPath = process.env.PYTHONPATH || "";
  
  if (userSitePackages && !currentPythonPath.includes(userSitePackages)) {
    return currentPythonPath 
      ? `${userSitePackages}:${currentPythonPath}`
      : userSitePackages;
  }
  
  return currentPythonPath || userSitePackages;
}

/**
 * Find yt-dlp command
 * Tries multiple strategies to locate yt-dlp installation
 */
function findYtDlpCommand(): string[] {
  const enhancedPath = getEnhancedPath();
  const enhancedPythonPath = getEnhancedPythonPath();
  const enhancedEnv = {
    ...process.env,
    PATH: enhancedPath,
    PYTHONPATH: enhancedPythonPath,
  };

  // Get user's local bin path (where pip install --user installs binaries)
  const userLocalBin = process.env.HOME ? `${process.env.HOME}/.local/bin` : null;

  // Strategy 1: Try direct yt-dlp binary/script (highest priority)
  const ytDlpPaths = [
    "yt-dlp",
    ...(userLocalBin ? [`${userLocalBin}/yt-dlp`] : []),
    "/usr/local/bin/yt-dlp",
    "/usr/bin/yt-dlp",
    "/opt/homebrew/bin/yt-dlp",
  ];

  for (const ytDlpPath of ytDlpPaths) {
    try {
      execFileSync(ytDlpPath, ["--version"], {
        timeout: 3000,
        stdio: "pipe",
        env: enhancedEnv,
      });
      if (process.env.NODE_ENV === "development") {
        console.log(`[DownloaderConfig] Found yt-dlp at: ${ytDlpPath}`);
      }
      return [ytDlpPath];
    } catch (error) {
      // Continue to next path
      if (process.env.NODE_ENV === "development") {
        console.log(`[DownloaderConfig] yt-dlp not found at: ${ytDlpPath}`);
      }
      continue;
    }
  }

  // Strategy 2: Try to find Python and check if yt_dlp module is available
  // First, try to find which Python to use
  const pythonCommands = ["python3", "python"];
  
  for (const pythonCmd of pythonCommands) {
    try {
      // Check if Python is available
      execFileSync(pythonCmd, ["--version"], {
        timeout: 2000,
        stdio: "pipe",
        env: enhancedEnv,
      });

      // Try python -m yt_dlp with enhanced environment
      try {
        const result = execFileSync(pythonCmd, ["-m", "yt_dlp", "--version"], {
          timeout: 3000,
          stdio: "pipe",
          encoding: "utf-8",
          env: enhancedEnv,
        });
        
        if (process.env.NODE_ENV === "development") {
          console.log(`[DownloaderConfig] Found yt-dlp via: ${pythonCmd} -m yt_dlp`);
          console.log(`[DownloaderConfig] PYTHONPATH: ${enhancedPythonPath}`);
          console.log(`[DownloaderConfig] PATH: ${enhancedPath}`);
        }
        
        return [pythonCmd, "-m", "yt_dlp"];
      } catch (moduleError) {
        // Module not found - try to find where it might be installed
        if (process.env.NODE_ENV === "development") {
          const errorMsg = moduleError instanceof Error ? moduleError.message : String(moduleError);
          console.log(`[DownloaderConfig] ${pythonCmd} -m yt_dlp failed: ${errorMsg}`);
        }
        continue;
      }
    } catch {
      // Python command not found, try next
      continue;
    }
  }

  // Strategy 3: Try to find yt-dlp script in user's local bin
  if (userLocalBin) {
    const fs = require("fs");
    const ytDlpScript = `${userLocalBin}/yt-dlp`;
    if (fs.existsSync(ytDlpScript)) {
      try {
        execFileSync(ytDlpScript, ["--version"], {
          timeout: 3000,
          stdio: "pipe",
          env: enhancedEnv,
        });
        if (process.env.NODE_ENV === "development") {
          console.log(`[DownloaderConfig] Found yt-dlp script at: ${ytDlpScript}`);
        }
        return [ytDlpScript];
      } catch {
        // Script exists but doesn't work
      }
    }
  }

  // Strategy 4: Use Python to find where yt_dlp is installed
  for (const pythonCmd of pythonCommands) {
    try {
      // Try to get yt_dlp location using Python
      const pythonCode = `
import sys
try:
    import yt_dlp
    print(yt_dlp.__file__)
    sys.exit(0)
except ImportError:
    # Try to find it in user site-packages
    import site
    user_site = site.getusersitepackages()
    import os
    yt_dlp_path = os.path.join(user_site, 'yt_dlp')
    if os.path.exists(yt_dlp_path):
        print(yt_dlp_path)
        sys.exit(0)
    sys.exit(1)
`;
      
      try {
        const result = execFileSync(pythonCmd, ["-c", pythonCode], {
          timeout: 3000,
          encoding: "utf-8",
          stdio: "pipe",
          env: enhancedEnv,
        });
        
        const modulePath = result.trim();
        if (modulePath) {
          if (process.env.NODE_ENV === "development") {
            console.log(`[DownloaderConfig] Found yt_dlp module at: ${modulePath}`);
          }
          // Use python -m yt_dlp with the enhanced environment
          return [pythonCmd, "-m", "yt_dlp"];
        }
      } catch {
        // Python code failed, continue
        continue;
      }
    } catch {
      continue;
    }
  }

  // Final fallback - but log a warning
  if (process.env.NODE_ENV === "development" || process.env.RENDER) {
    console.warn(`[DownloaderConfig] yt-dlp not found, using fallback: python3 -m yt_dlp`);
    console.warn(`[DownloaderConfig] Enhanced PATH: ${enhancedPath}`);
    console.warn(`[DownloaderConfig] Enhanced PYTHONPATH: ${enhancedPythonPath}`);
  }

  // Default fallback - will use enhanced PATH/PYTHONPATH at runtime
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

/**
 * Get enhanced environment variables for spawn/exec calls
 * Includes PATH and PYTHONPATH with user's local directories
 */
export function getEnhancedEnv(): NodeJS.ProcessEnv {
  const enhancedPath = getEnhancedPath();
  const enhancedPythonPath = getEnhancedPythonPath();
  
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    PATH: enhancedPath,
  };
  
  // Only set PYTHONPATH if it's not empty
  if (enhancedPythonPath) {
    env.PYTHONPATH = enhancedPythonPath;
  }
  
  // Log in development or on Render for debugging
  if (process.env.NODE_ENV === "development" || process.env.RENDER) {
    if (process.env.NODE_ENV === "development") {
      console.log(`[DownloaderConfig] Enhanced PATH: ${enhancedPath}`);
      console.log(`[DownloaderConfig] Enhanced PYTHONPATH: ${enhancedPythonPath}`);
    }
  }
  
  return env;
}
