import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import { validateVideoUrl, fetchVideoInfo } from "@/services/video-service";
import { rateLimit } from "@/lib/redis";

/**
 * Extract video information without downloading
 * Useful for previewing video details before download
 */
export async function POST(req: Request) {
  try {
    const { userId } = auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    // Rate limiting
    const rateLimitResult = await rateLimit(`extract:${userId}`, 20, 60);
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
    
    // Fetch video info
    const videoInfo = await fetchVideoInfo(url);
    
    return NextResponse.json({
      success: true,
      videoInfo,
    });
  } catch (error) {
    console.error("Video extract error:", error);
    return NextResponse.json(
      { error: "Failed to extract video information" },
      { status: 500 }
    );
  }
}
