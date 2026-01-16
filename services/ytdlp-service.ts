/**
 * yt-dlp Service Utility
 * Provides functions to execute yt-dlp directly from Node.js
 * Works on Render, local development, and other platforms that support subprocesses
 * Does NOT work on Vercel (use external Python service instead)
 * 
 * Now uses the production-grade downloader engine with:
 * - Advanced request simulation (headers, User-Agent rotation)
 * - Proxy rotation
 * - Cookie pool management
 * - Memory-efficient streaming
 * - Comprehensive error handling
 */

import { extractVideoMetadata, streamVideoFile } from "@/lib/downloader/engine";
import { getRandomUserAgent, getMobileUserAgent, getDesktopUserAgent } from "@/lib/downloader/user-agents";
import { getProxyPool, getProxyForYtDlp } from "@/lib/downloader/proxies";
import { getCookiePool, getCookieFileForYtDlp } from "@/lib/downloader/cookies";
import { ErrorType, parseYtDlpError } from "@/lib/downloader/error-parser";
import { getConfig } from "@/lib/downloader/config";
import { execFileSync } from "child_process";
import { promisify } from "util";
import { execFile } from "child_process";

const execFileAsync = promisify(execFile);

/**
 * Player configuration for YouTube extraction
 * Each config tries a different client type to avoid bot detection
 */
export type PlayerConfig = {
  clientType: string;
  skipType?: string;
  additionalArgs?: string[];
};

/**
 * Default player configurations (same as Python service)
 */
export const DEFAULT_PLAYER_CONFIGS: PlayerConfig[] = [
  { clientType: "web", skipType: "webpage" }, // Web client with webpage skip
  { clientType: "web" }, // Web client without skip (for Shorts)
  { clientType: "ios" }, // iOS client
  { clientType: "android" }, // Android client
  { clientType: "mweb" }, // Mobile web client
];

/**
 * Check if yt-dlp is available
 * Tries multiple command variations
 */
export async function checkYtDlpAvailable(): Promise<{
  available: boolean;
  version?: string;
  command?: string;
}> {
  const commands = [
    { cmd: "yt-dlp", args: ["--version"] },
    { cmd: "python", args: ["-m", "yt_dlp", "--version"] },
    { cmd: "python3", args: ["-m", "yt_dlp", "--version"] },
  ];

  for (const { cmd, args } of commands) {
    try {
      const { stdout } = await execFileAsync(cmd, args, {
        timeout: 5000,
        maxBuffer: 1024 * 1024, // 1MB
      });

      const version = stdout.trim();
      if (version) {
        return {
          available: true,
          version,
          command: cmd === "yt-dlp" ? cmd : `${cmd} -m yt_dlp`,
        };
      }
    } catch {
      // Try next command
      continue;
    }
  }

  return { available: false };
}

/**
 * Get Python executable path
 */
export function getPythonCommand(): string {
  // Try python3 first, then python
  try {
    // Check if python3 exists (synchronous check)
    execFileSync("python3", ["--version"], { 
      timeout: 1000,
      maxBuffer: 1024 * 1024, // 1MB
    });
    return "python3";
  } catch {
    try {
      execFileSync("python", ["--version"], { 
        timeout: 1000,
        maxBuffer: 1024 * 1024, // 1MB
      });
      return "python";
    } catch {
      return "python"; // Default fallback
    }
  }
}


/**
 * Run yt-dlp with given arguments
 */
export async function runYtDlp(
  args: string[],
  timeout: number = 60000
): Promise<{ stdout: string; stderr: string; success: boolean }> {
  // Determine command to use
  const ytDlpCheck = await checkYtDlpAvailable();
  
  let command: string;
  let commandArgs: string[];

  if (ytDlpCheck.command && ytDlpCheck.command === "yt-dlp") {
    command = "yt-dlp";
    commandArgs = args;
  } else {
    // Use python -m yt_dlp
    const pythonCmd = getPythonCommand();
    command = pythonCmd;
    commandArgs = ["-m", "yt_dlp", ...args];
  }

  try {
    const { stdout, stderr } = await execFileAsync(command, commandArgs, {
      timeout,
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
    });

    return {
      stdout: stdout || "",
      stderr: stderr || "",
      success: true,
    };
  } catch (error: any) {
    // Handle timeout
    if (error.code === "ETIMEDOUT" || error.signal === "SIGTERM") {
      throw new Error("Video extraction timed out");
    }

    // Handle command not found
    if (error.code === "ENOENT") {
      throw new Error(
        "yt-dlp is not installed. Please install:\n" +
        "  1. Python 3.7+: https://www.python.org/downloads/\n" +
        "  2. yt-dlp: pip install yt-dlp"
      );
    }

    // Return error output
    return {
      stdout: error.stdout || "",
      stderr: error.stderr || error.message || "",
      success: false,
    };
  }
}

/**
 * Extract video using yt-dlp with advanced retry logic
 * Uses the production-grade downloader engine with:
 * - User-Agent rotation
 * - Proxy rotation
 * - Cookie pool
 * - Multiple retry strategies
 */
export async function extractVideoWithClients(
  url: string,
  options: {
    cookiesFile?: string;
    playerConfigs?: PlayerConfig[];
    timeout?: number;
    maxRetries?: number;
  } = {}
): Promise<any> {
  const config = getConfig();
  const {
    cookiesFile = process.env.YTDLP_COOKIES_FILE,
    timeout = config.timeout,
    maxRetries = config.maxRetries,
  } = options;

  const proxyPool = getProxyPool();
  const cookiePool = getCookiePool();

  // Retry strategies with different configurations
  const retryStrategies = [
    { userAgent: getDesktopUserAgent(), proxy: null, useCookies: true },
    { userAgent: getMobileUserAgent(), proxy: null, useCookies: true },
    { userAgent: getRandomUserAgent(), proxy: getProxyForYtDlp(), useCookies: true },
    { userAgent: getRandomUserAgent(), proxy: getProxyForYtDlp(), useCookies: false },
    { userAgent: getRandomUserAgent(), proxy: null, useCookies: false },
  ];

  let lastError: any = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const strategy = retryStrategies[attempt % retryStrategies.length];
    
    try {
      if (process.env.NODE_ENV === "development") {
        console.log(`[ytdlp-service] Attempt ${attempt + 1}/${maxRetries} with strategy: UA=${strategy.userAgent.substring(0, 50)}..., proxy=${strategy.proxy ? "yes" : "no"}, cookies=${strategy.useCookies}`);
      }

      // Get cookie file (skip if placeholder or doesn't exist)
      let cookieFile: string | null = null;
      if (strategy.useCookies) {
        const candidateFile = cookiesFile || getCookieFileForYtDlp(url);
        // Only use if it's a real file path (not placeholder)
        if (candidateFile && !candidateFile.includes("/path/to/") && !candidateFile.includes("placeholder")) {
          cookieFile = candidateFile;
        }
      }

      // Get proxy
      let proxy: string | null = strategy.proxy;
      if (proxy && attempt > 0) {
        // Mark previous proxy as failed if this is a retry
        const prevStrategy = retryStrategies[(attempt - 1) % retryStrategies.length];
        if (prevStrategy.proxy) {
          proxyPool.markFailure(prevStrategy.proxy, "Previous attempt failed");
        }
      }

      // Extract video using engine
      const result = await extractVideoMetadata({
        url,
        cookies: cookieFile,
        proxy,
        userAgent: strategy.userAgent,
        timeout,
        retryAttempt: attempt,
      });

      if (result.success && result.data) {
        // Success! Mark proxy as successful if used
        if (proxy) {
          proxyPool.markSuccess(proxy);
        }

        if (process.env.NODE_ENV === "development") {
          console.log(`[ytdlp-service] Successfully extracted video: ${result.data.title || "Unknown"} (attempt ${attempt + 1})`);
        }

        return result.data;
      }

      // Handle error
      if (result.error) {
        lastError = result.error;

        // Mark proxy as failed
        if (proxy) {
          proxyPool.markFailure(proxy, result.error.message);
        }

        // Check if error is retryable
        if (!result.error.retryable) {
          // Non-retryable error, throw immediately
          throw new Error(
            `${result.error.message}\n\nSuggestions:\n${result.error.suggestions.map((s, i) => `${i + 1}. ${s}`).join("\n")}`
          );
        }

        // Retryable error, continue to next attempt
        if (process.env.NODE_ENV === "development") {
          console.warn(`[ytdlp-service] Attempt ${attempt + 1} failed: ${result.error.message}`);
        }

        // Add exponential backoff
        if (attempt < maxRetries - 1) {
          const backoffMs = Math.min(1000 * Math.pow(2, attempt), 5000);
          await new Promise(resolve => setTimeout(resolve, backoffMs));
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      lastError = {
        type: ErrorType.UNKNOWN,
        message: errorMessage,
        retryable: true,
        suggestions: ["Try again", "Check system configuration"],
      };

      if (process.env.NODE_ENV === "development") {
        console.warn(`[ytdlp-service] Attempt ${attempt + 1} error:`, errorMessage);
      }

      // Add exponential backoff
      if (attempt < maxRetries - 1) {
        const backoffMs = Math.min(1000 * Math.pow(2, attempt), 5000);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
      }
    }
  }

  // All attempts failed
  const errorMessage = lastError?.message || "All extraction attempts failed";
  const suggestions = lastError?.suggestions || ["Try again later", "Check video URL"];

  // Provide helpful error message
  if (lastError?.type === ErrorType.BOT_DETECTION) {
    throw new Error(
      "YouTube bot detection: All attempts were blocked.\n\n" +
      "⚠️ COOKIES ARE REQUIRED: YouTube now requires browser cookies for most video extractions.\n\n" +
      "To fix this:\n" +
      "1. Install 'Get cookies.txt LOCALLY' extension in Chrome/Edge\n" +
      "2. Visit youtube.com and sign in\n" +
      "3. Click the extension → Export → Save as cookies.txt\n" +
      "4. Upload cookies.txt to your deployment platform\n" +
      "5. Set YTDLP_COOKIES_FILE environment variable to the file path\n\n" +
      "See ytdlp-service/COOKIES_SETUP.md for detailed instructions."
    );
  }

  throw new Error(
    `${errorMessage}\n\nSuggestions:\n${suggestions.map((s, i) => `${i + 1}. ${s}`).join("\n")}`
  );
}

/**
 * Download video with advanced retry strategies
 * Similar to extractVideoWithClients but returns a stream for downloading
 */
export async function downloadVideoWithStrategies(
  url: string,
  format: string = "best",
  options: {
    cookiesFile?: string;
    timeout?: number;
    maxRetries?: number;
  } = {}
): Promise<{ stream: NodeJS.ReadableStream; stderr: string }> {
  const config = getConfig();
  const {
    cookiesFile = process.env.YTDLP_COOKIES_FILE,
    timeout = config.timeout,
    maxRetries = 3, // Fewer retries for downloads (faster feedback)
  } = options;

  const proxyPool = getProxyPool();

  // Retry strategies with different configurations
  const retryStrategies = [
    { userAgent: getDesktopUserAgent(), proxy: null, useCookies: true },
    { userAgent: getMobileUserAgent(), proxy: null, useCookies: true },
    { userAgent: getRandomUserAgent(), proxy: getProxyForYtDlp(), useCookies: true },
  ];

  let lastError: any = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const strategy = retryStrategies[attempt % retryStrategies.length];
    
    try {
      if (process.env.NODE_ENV === "development") {
        console.log(`[ytdlp-service] Download attempt ${attempt + 1}/${maxRetries} with strategy: UA=${strategy.userAgent.substring(0, 50)}..., proxy=${strategy.proxy ? "yes" : "no"}, cookies=${strategy.useCookies}`);
      }

      // Get cookie file (skip if placeholder or doesn't exist)
      let cookieFile: string | null = null;
      if (strategy.useCookies) {
        const candidateFile = cookiesFile || getCookieFileForYtDlp(url);
        // Only use if it's a real file path (not placeholder)
        if (candidateFile && !candidateFile.includes("/path/to/") && !candidateFile.includes("placeholder")) {
          cookieFile = candidateFile;
        }
      }

      // Get proxy
      let proxy: string | null = strategy.proxy;

      // Download video using engine
      const result = await streamVideoFile({
        url,
        cookies: cookieFile,
        proxy,
        userAgent: strategy.userAgent,
        timeout,
        retryAttempt: attempt,
      });

      if (result.success && result.stream) {
        // Success! Mark proxy as successful if used
        if (proxy) {
          proxyPool.markSuccess(proxy);
        }

        if (process.env.NODE_ENV === "development") {
          console.log(`[ytdlp-service] Successfully started download stream (attempt ${attempt + 1})`);
        }

        return { stream: result.stream, stderr: "" };
      }

      // Handle error
      if (result.error) {
        lastError = result.error;

        // Mark proxy as failed
        if (proxy) {
          proxyPool.markFailure(proxy, result.error.message);
        }

        // Check if error is retryable
        if (!result.error.retryable) {
          // Non-retryable error, throw immediately
          throw new Error(
            `${result.error.message}\n\nSuggestions:\n${result.error.suggestions.map((s, i) => `${i + 1}. ${s}`).join("\n")}`
          );
        }

        // Retryable error, continue to next attempt
        if (process.env.NODE_ENV === "development") {
          console.log(`[ytdlp-service] Download attempt ${attempt + 1} failed (retryable): ${result.error.message}`);
        }

        // Add delay before retry (exponential backoff)
        if (attempt < maxRetries - 1) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    } catch (error) {
      lastError = error;
      
      if (process.env.NODE_ENV === "development") {
        console.error(`[ytdlp-service] Download attempt ${attempt + 1} error:`, error);
      }

      // Add delay before retry
      if (attempt < maxRetries - 1) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  // If all attempts fail, throw the last error
  throw new Error(
    lastError?.message || "Failed to download video after all retries"
  );
}

// Re-export helper functions for backward compatibility
export { getProxyForYtDlp, getProxyPool } from "@/lib/downloader/proxies";
export { getCookieFileForYtDlp, getCookiePool } from "@/lib/downloader/cookies";
