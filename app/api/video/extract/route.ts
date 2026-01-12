import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { validateVideoUrl, extractVideoWithFormats } from "@/services/video-service";
import { rateLimit } from "@/lib/redis";

/**
 * Extract video information with available formats and direct CDN URLs
 * Returns metadata and format options for client-side downloads
 */
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    // Rate limiting
    const rateLimitResult = await rateLimit(`extract:${user.id}`, 20, 60);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: "Rate limit exceeded" },
        { status: 429 }
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
    
    // Validate URL
    const validation = validateVideoUrl(url);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }
    
    // Extract video info with formats and direct CDN URLs
    const result = await extractVideoWithFormats(url);
    
    return NextResponse.json({
      success: true,
      videoInfo: result.videoInfo,
      formats: result.formats, // Direct CDN URLs for client-side downloads
    });
  } catch (error) {
    console.error("Video extract error:", error);
    
    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes("RAPIDAPI")) {
        return NextResponse.json(
          { error: "Video service configuration error. Please contact support." },
          { status: 500 }
        );
      }
      if (error.message.includes("timeout")) {
        return NextResponse.json(
          { error: "Request timed out. Please try again." },
          { status: 504 }
        );
      }
      return NextResponse.json(
        { error: error.message || "Failed to extract video information" },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: "Failed to extract video information" },
      { status: 500 }
    );
  }
}
