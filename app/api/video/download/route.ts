import { NextRequest, NextResponse } from "next/server";
import { downloadVideoWithStrategies } from "@/services/ytdlp-service";

/**
 * Download video using yt-dlp directly
 * This handles all CDN authentication and streaming automatically
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const url = searchParams.get("url");
    const format = searchParams.get("format") || "best";
    const quality = searchParams.get("quality");
    
    if (!url) {
      return NextResponse.json(
        { error: "Missing required parameter: url" },
        { status: 400 }
      );
    }

    console.log(`[Download] Starting yt-dlp download for: ${url.substring(0, 100)}...`);
    console.log(`[Download] Format: ${format}, Quality: ${quality || "default"}`);

    // Build yt-dlp format selector
    let formatSelector = "best";
    if (quality) {
      // Map quality to yt-dlp format
      const qualityMap: Record<string, string> = {
        "4k": "bestvideo[height<=2160]+bestaudio/best[height<=2160]",
        "1440p": "bestvideo[height<=1440]+bestaudio/best[height<=1440]",
        "1080p": "bestvideo[height<=1080]+bestaudio/best[height<=1080]",
        "720p": "bestvideo[height<=720]+bestaudio/best[height<=720]",
        "480p": "bestvideo[height<=480]+bestaudio/best[height<=480]",
        "360p": "bestvideo[height<=360]+bestaudio/best[height<=360]",
        "audio": "bestaudio/best",
      };
      formatSelector = qualityMap[quality] || "best";
    }

    // Use download service with advanced retry strategies
    // This handles bot detection, proxies, cookies, etc.
    const { stream, stderr: stderrOutput } = await downloadVideoWithStrategies(
      url,
      formatSelector,
      {
        cookiesFile: process.env.YTDLP_COOKIES_FILE,
        timeout: 120000, // 2 minutes
        maxRetries: 3,
      }
    );

    // Determine content type and filename from format
    let contentType = "video/mp4";
    let filename = "video.mp4";
    
    if (format === "mp4") {
      contentType = "video/mp4";
      filename = "video.mp4";
    } else if (format === "webm") {
      contentType = "video/webm";
      filename = "video.webm";
    } else if (quality === "audio") {
      contentType = "audio/mp4";
      filename = "audio.m4a";
    }

    // Set up response headers
    const headers = new Headers();
    headers.set("Content-Type", contentType);
    headers.set("Content-Disposition", `attachment; filename="${filename}"`);
    headers.set("Cache-Control", "no-cache");
    headers.set("Access-Control-Allow-Origin", "*");
    headers.set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");

    // Convert Node.js stream to Web ReadableStream
    const responseStream = new ReadableStream({
      start(controller) {
        stream.on("data", (chunk: Buffer) => {
          controller.enqueue(chunk);
        });

        stream.on("end", () => {
          controller.close();
        });

        stream.on("error", (error: Error) => {
          console.error("[Download] Stream error:", error);
          if (stderrOutput) {
            console.error("[Download] yt-dlp stderr:", stderrOutput);
          }
          controller.error(error);
        });
      },
    });

    return new NextResponse(responseStream, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error("[Download] Error:", error);
    return NextResponse.json(
      { 
        error: "Failed to download video",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
