import { NextResponse } from "next/server";
import { checkYtDlpAvailable } from "@/services/ytdlp-service";

/**
 * Health check endpoint for yt-dlp service
 * Returns service status and yt-dlp availability
 * 
 * GET /api/ytdlp/health
 */
export async function GET() {
  try {
    // Check if we're on Vercel (where this won't work)
    if (process.env.VERCEL === "1") {
      return NextResponse.json(
        {
          status: "unavailable",
          ytdlp_available: false,
          ytdlp_version: "Not available",
          python_version: "Not available",
          message: "yt-dlp subprocess execution is not supported on Vercel. Please use an external Python service.",
        },
        { status: 503 }
      );
    }

    // Check yt-dlp availability
    const checkResult = await checkYtDlpAvailable();

    // Get Python version
    let pythonVersion = "Not available";
    try {
      const { execFile } = await import("child_process");
      const { promisify } = await import("util");
      const execFileAsync = promisify(execFile);

      const pythonCmd = checkResult.command?.includes("python") 
        ? checkResult.command.split(" ")[0] 
        : "python";
      
      try {
        const { stdout } = await execFileAsync(pythonCmd, ["--version"], {
          timeout: 3000,
        });
        pythonVersion = stdout.trim();
      } catch {
        // Try python3
        try {
          const { stdout } = await execFileAsync("python3", ["--version"], {
            timeout: 3000,
          });
          pythonVersion = stdout.trim();
        } catch {
          // Python not found
        }
      }
    } catch {
      // Ignore Python version check errors
    }

    return NextResponse.json({
      status: "ok",
      ytdlp_available: checkResult.available,
      ytdlp_version: checkResult.version || "Not available",
      python_version: pythonVersion,
      command: checkResult.command || "Not found",
    });
  } catch (error) {
    console.error("Health check error:", error);
    return NextResponse.json(
      {
        status: "error",
        ytdlp_available: false,
        ytdlp_version: "Not available",
        python_version: "Not available",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
