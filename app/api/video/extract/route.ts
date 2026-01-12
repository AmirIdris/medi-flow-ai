import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { validateVideoUrl, extractVideoWithFormats } from "@/services/video-service";
import { rateLimit } from "@/lib/redis";
import { headers } from "next/headers";

/**
 * Extract video information with available formats and direct CDN URLs
 * Returns metadata and format options for client-side downloads
 * Open to all users - no authentication required
 */
export async function POST(req: Request) {
  try {
    // Optional: Get user if authenticated (for better rate limiting)
    const user = await getCurrentUser();
    
    // Rate limiting - use user ID if authenticated, otherwise use IP address
    const headersList = await headers();
    const clientIp = headersList.get("x-forwarded-for")?.split(",")[0]?.trim() 
      || headersList.get("x-real-ip") 
      || "unknown";
    
    const rateLimitKey = user 
      ? `extract:user:${user.id}` 
      : `extract:ip:${clientIp}`;
    
    const rateLimitResult = await rateLimit(rateLimitKey, 20, 60);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please try again later." },
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
