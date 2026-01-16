/**
 * Download Engine
 * Core download logic using spawn() for memory-efficient streaming
 * Handles yt-dlp execution with advanced configuration
 */

import { spawn, ChildProcess } from "child_process";
import { Readable } from "stream";
import { getConfig, getBaseYtDlpArgs } from "./config";
import { getPlatformHeaders, headersToYtDlpArgs } from "./headers";
import { getProxyForYtDlp, proxyToYtDlpArgs } from "./proxies";
import { getCookieFileForYtDlp, cookiesToYtDlpArgs } from "./cookies";
import { parseYtDlpError, ErrorType } from "./error-parser";
import { detectPlatform } from "@/services/video-service";

export interface DownloadOptions {
  url: string;
  format?: string;
  output?: string; // "-" for stdout streaming
  cookies?: string | null;
  proxy?: string | null;
  userAgent?: string;
  timeout?: number;
  retryAttempt?: number;
}

export interface DownloadResult {
  success: boolean;
  data?: any; // JSON data for --dump-json
  stream?: Readable; // Stream for file download
  error?: {
    type: ErrorType;
    message: string;
    retryable: boolean;
    suggestions: string[];
  };
}

/**
 * Build yt-dlp command arguments
 */
function buildYtDlpArgs(options: DownloadOptions): string[] {
  const config = getConfig();
  const args: string[] = [];

  // Base arguments
  args.push(...getBaseYtDlpArgs());

  // Output format
  if (options.output) {
    args.push("-o", options.output);
  } else if (options.format === "json") {
    args.push("--dump-json");
  } else {
    // Default: JSON for metadata extraction
    args.push("--dump-json");
  }

  // Headers (browser simulation)
  const platform = detectPlatform(options.url);
  const headers = getPlatformHeaders(platform, options.url);
  
  // Override User-Agent if provided
  if (options.userAgent) {
    headers["User-Agent"] = options.userAgent;
  }

  args.push(...headersToYtDlpArgs(headers));

  // Cookies
  const cookieFile = options.cookies ?? getCookieFileForYtDlp(options.url);
  if (cookieFile) {
    args.push(...cookiesToYtDlpArgs(cookieFile));
  }

  // Proxy (only if explicitly provided - don't auto-fetch from pool)
  // This allows strategies to explicitly disable proxies by passing null
  if (options.proxy !== undefined) {
    if (options.proxy) {
      // Validate proxy URL format
      try {
        new URL(options.proxy);
        args.push(...proxyToYtDlpArgs(options.proxy));
      } catch {
        // Invalid proxy URL, skip it
        if (process.env.NODE_ENV === "development") {
          console.warn(`[DownloadEngine] Invalid proxy URL, skipping: ${options.proxy}`);
        }
      }
    }
    // If options.proxy is null, explicitly don't use a proxy
  } else {
    // If not specified, try to get from pool (for backward compatibility)
    const proxy = getProxyForYtDlp();
    if (proxy) {
      try {
        new URL(proxy);
        args.push(...proxyToYtDlpArgs(proxy));
      } catch {
        if (process.env.NODE_ENV === "development") {
          console.warn(`[DownloadEngine] Invalid proxy URL from pool, skipping: ${proxy}`);
        }
      }
    }
  }

  // YouTube-specific options (for bot detection)
  if (platform === "youtube") {
    // Try different player clients based on retry attempt
    const clientTypes = ["web", "ios", "android", "mweb"];
    const clientIndex = (options.retryAttempt || 0) % clientTypes.length;
    const clientType = clientTypes[clientIndex];

    args.push(
      "--extractor-args",
      `youtube:player_client=${clientType}`
    );

    // Additional YouTube options
    args.push(
      "--extractor-args",
      "youtube:player_params=8AEB",
      "--extractor-args",
      "youtube:include_live_chat=false",
      "--extractor-args",
      "youtube:skip=dash,translated_subs"
    );
  }

  // Add URL
  args.push(options.url);

  return args;
}

/**
 * Execute yt-dlp and return JSON data (for metadata extraction)
 */
export async function extractVideoMetadata(options: DownloadOptions): Promise<DownloadResult> {
  const config = getConfig();
  const timeout = options.timeout || config.timeout;

  // Build command
  const command = config.ytDlpCommand[0];
  const commandArgs = [
    ...config.ytDlpCommand.slice(1),
    ...buildYtDlpArgs({ ...options, format: "json" }),
  ];

  return new Promise((resolve) => {
    let stdout = "";
    let stderr = "";
    let process: ChildProcess | null = null;

    // Timeout handler
    const timeoutId = setTimeout(() => {
      if (process) {
        process.kill("SIGTERM");
      }
      resolve({
        success: false,
        error: {
          type: ErrorType.TIMEOUT,
          message: "Video extraction timed out",
          retryable: true,
          suggestions: [
            "Video may be too large",
            "Server may be slow",
            "Try again with a longer timeout",
          ],
        },
      });
    }, timeout);

    try {
      if (process.env.NODE_ENV === "development") {
        console.log(`[DownloadEngine] Executing: ${command} ${commandArgs.join(" ")}`);
      }

      // Spawn process
      process = spawn(command, commandArgs, {
        stdio: ["ignore", "pipe", "pipe"],
      });

      // Collect stdout (JSON data)
      process.stdout?.on("data", (chunk: Buffer) => {
        stdout += chunk.toString();
      });

      // Collect stderr (errors)
      process.stderr?.on("data", (chunk: Buffer) => {
        stderr += chunk.toString();
      });

      // Handle process completion
      process.on("close", (code) => {
        clearTimeout(timeoutId);

        if (code === 0) {
          // Success - parse JSON
          try {
            const data = JSON.parse(stdout);
            resolve({
              success: true,
              data,
            });
          } catch (parseError) {
            resolve({
              success: false,
              error: {
                type: ErrorType.UNKNOWN,
                message: "Failed to parse yt-dlp output",
                retryable: true,
                suggestions: ["Try again", "Check yt-dlp installation"],
              },
            });
          }
        } else {
          // Error - parse stderr
          // Log actual error for debugging
          if (process.env.NODE_ENV === "development") {
            console.error(`[DownloadEngine] yt-dlp error (exit code ${code}):`);
            console.error(`[DownloadEngine] stderr: ${stderr.substring(0, 1000)}`);
            if (stdout) {
              console.error(`[DownloadEngine] stdout: ${stdout.substring(0, 500)}`);
            }
          }
          
          const parsedError = parseYtDlpError(stderr, stdout);
          resolve({
            success: false,
            error: {
              type: parsedError.type,
              message: parsedError.message,
              retryable: parsedError.retryable,
              suggestions: parsedError.suggestions,
            },
          });
        }
      });

      // Handle process errors
      process.on("error", (error) => {
        clearTimeout(timeoutId);
        resolve({
          success: false,
          error: {
            type: ErrorType.NETWORK_ERROR,
            message: `Failed to execute yt-dlp: ${error.message}`,
            retryable: true,
            suggestions: [
              "Check if yt-dlp is installed",
              "Verify Python is available",
              "Check system permissions",
            ],
          },
        });
      });
    } catch (error) {
      clearTimeout(timeoutId);
      const errorMessage = error instanceof Error ? error.message : String(error);
      resolve({
        success: false,
        error: {
          type: ErrorType.UNKNOWN,
          message: `Unexpected error: ${errorMessage}`,
          retryable: true,
          suggestions: ["Try again", "Check system configuration"],
        },
      });
    }
  });
}

/**
 * Stream video file directly (memory-efficient)
 * Returns a Readable stream that can be piped to response
 */
export async function streamVideoFile(
  options: DownloadOptions
): Promise<DownloadResult> {
  const config = getConfig();
  const timeout = options.timeout || config.timeout;

  // Build command (output to stdout)
  const command = config.ytDlpCommand[0];
  const commandArgs = [
    ...config.ytDlpCommand.slice(1),
    ...buildYtDlpArgs({ ...options, output: "-" }),
  ];

  return new Promise((resolve) => {
    let stderr = "";
    let process: ChildProcess | null = null;

    // Timeout handler
    const timeoutId = setTimeout(() => {
      if (process) {
        process.kill("SIGTERM");
      }
      resolve({
        success: false,
        error: {
          type: ErrorType.TIMEOUT,
          message: "Video download timed out",
          retryable: true,
          suggestions: [
            "Video may be too large",
            "Server may be slow",
            "Try again with a longer timeout",
          ],
        },
      });
    }, timeout);

    try {
      if (process.env.NODE_ENV === "development") {
        console.log(`[DownloadEngine] Streaming: ${command} ${commandArgs.join(" ")}`);
      }

      // Spawn process
      process = spawn(command, commandArgs, {
        stdio: ["ignore", "pipe", "pipe"],
      });

      // Collect stderr for error parsing
      process.stderr?.on("data", (chunk: Buffer) => {
        stderr += chunk.toString();
      });

      // Handle process errors
      process.on("error", (error) => {
        clearTimeout(timeoutId);
        resolve({
          success: false,
          error: {
            type: ErrorType.NETWORK_ERROR,
            message: `Failed to execute yt-dlp: ${error.message}`,
            retryable: true,
            suggestions: [
              "Check if yt-dlp is installed",
              "Verify Python is available",
            ],
          },
        });
      });

      // Handle process completion
      process.on("close", (code) => {
        clearTimeout(timeoutId);

        if (code !== 0) {
          // Error - parse stderr
          const parsedError = parseYtDlpError(stderr);
          resolve({
            success: false,
            error: {
              type: parsedError.type,
              message: parsedError.message,
              retryable: parsedError.retryable,
              suggestions: parsedError.suggestions,
            },
          });
        }
        // If code === 0, stream was already resolved
      });

      // Return stream immediately (don't wait for completion)
      if (process.stdout) {
        resolve({
          success: true,
          stream: process.stdout,
        });
      } else {
        resolve({
          success: false,
          error: {
            type: ErrorType.UNKNOWN,
            message: "Failed to create stream",
            retryable: true,
            suggestions: ["Try again"],
          },
        });
      }
    } catch (error) {
      clearTimeout(timeoutId);
      const errorMessage = error instanceof Error ? error.message : String(error);
      resolve({
        success: false,
        error: {
          type: ErrorType.UNKNOWN,
          message: `Unexpected error: ${errorMessage}`,
          retryable: true,
          suggestions: ["Try again"],
        },
      });
    }
  });
}
