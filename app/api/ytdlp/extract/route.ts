import { NextResponse } from "next/server";
import { extractVideoWithClients } from "@/services/ytdlp-service";

/**
 * Extract video information using yt-dlp
 * Returns JSON in the same format as yt-dlp --dump-json
 * Tries multiple player clients to avoid YouTube bot detection
 * 
 * POST /api/ytdlp/extract
 * Body: { url: string }
 */
export async function POST(req: Request) {
  try {
    // Check if we're on Vercel (where this won't work)
    if (process.env.VERCEL === "1") {
      return NextResponse.json(
        {
          error: "yt-dlp subprocess execution is not supported on Vercel serverless functions.",
          suggestion: "Please deploy the Python yt-dlp service separately (Railway/Render) and set YTDLP_API_URL environment variable.",
        },
        { status: 503 }
      );
    }

    const body = await req.json();
    const { url } = body;

    if (!url) {
      return NextResponse.json(
        { error: "URL is required" },
        { status: 400 }
      );
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { error: "Invalid URL format" },
        { status: 400 }
      );
    }

    if (process.env.NODE_ENV === "development") {
      console.log(`[ytdlp-extract] Extracting video: ${url}`);
    }

    // Extract video with multiple client strategies
    const data = await extractVideoWithClients(url, {
      cookiesFile: process.env.YTDLP_COOKIES_FILE,
      timeout: 60000, // 60 seconds
    });

    // Return raw yt-dlp JSON output (same format as Python service)
    return NextResponse.json(data);
  } catch (error) {
    console.error("Video extract error:", error);

    const errorMessage = error instanceof Error ? error.message : String(error);

    // Provide specific error responses
    if (errorMessage.includes("timed out")) {
      return NextResponse.json(
        {
          error: "Video extraction timed out",
          detail: "The video may be too large or the server is slow. Please try again.",
        },
        { status: 504 }
      );
    }

    if (errorMessage.includes("not installed")) {
      return NextResponse.json(
        {
          error: "yt-dlp is not installed",
          detail: errorMessage,
          suggestion: "Please install yt-dlp: pip install yt-dlp",
        },
        { status: 503 }
      );
    }

    if (errorMessage.includes("bot detection") || errorMessage.includes("COOKIES ARE REQUIRED")) {
      return NextResponse.json(
        {
          error: "YouTube bot detection",
          detail: errorMessage,
        },
        { status: 403 }
      );
    }

    return NextResponse.json(
      {
        error: "Failed to extract video",
        detail: errorMessage,
      },
      { status: 500 }
    );
  }
}
