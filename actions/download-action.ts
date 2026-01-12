"use server";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/redis";
import { 
  validateVideoUrl, 
  detectPlatform, 
  extractVideoWithFormats 
} from "@/services/video-service";
import type { DownloadRequest, VideoInfo, VideoFormatOption } from "@/types";

/**
 * Record download in history (metadata only - no file processing)
 * Downloads happen client-side directly from CDN URLs
 */
export async function recordDownload(
  url: string,
  videoInfo: VideoInfo,
  selectedFormat: VideoFormatOption
) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return { success: false, error: "Unauthorized" };
    }
    
    // Check rate limiting
    const rateLimitResult = await rateLimit(currentUser.id, 10, 60);
    if (!rateLimitResult.success) {
      return { 
        success: false, 
        error: "Rate limit exceeded. Please try again later." 
      };
    }
    
    // Get user and check limits
    const user = await prisma.user.findUnique({
      where: { id: currentUser.id },
    });
    
    if (!user) {
      return { success: false, error: "User not found" };
    }
    
    if (user.downloadCount >= user.downloadLimit && user.downloadLimit !== -1) {
      return { 
        success: false, 
        error: "Download limit reached. Please upgrade your plan." 
      };
    }
    
    // Create download record (metadata only)
    const download = await prisma.download.create({
      data: {
        userId: user.id,
        url,
        platform: videoInfo.platform,
        format: selectedFormat.format,
        quality: selectedFormat.quality,
        title: videoInfo.title,
        thumbnail: videoInfo.thumbnail,
        duration: videoInfo.duration,
        author: videoInfo.author,
        fileUrl: selectedFormat.url, // Store CDN URL for reference
        fileSize: BigInt(selectedFormat.fileSize),
        status: "completed", // Immediately completed since download is client-side
        expiresAt: selectedFormat.expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });
    
    // Increment user download count
    await prisma.user.update({
      where: { id: user.id },
      data: {
        downloadCount: {
          increment: 1,
        },
      },
    });
    
    return { 
      success: true, 
      downloadId: download.id,
      message: "Download recorded" 
    };
  } catch (error) {
    console.error("Record download error:", error);
    return { success: false, error: "Failed to record download" };
  }
}

/**
 * Extract video info and formats (for use in client components)
 * This is a server action wrapper around the extract API
 * Open to all users - no authentication required
 */
export async function extractVideo(url: string) {
  try {
    // Validate URL
    const validation = validateVideoUrl(url);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }
    
    // Extract video with formats
    const result = await extractVideoWithFormats(url);
    
    return {
      success: true,
      videoInfo: result.videoInfo,
      formats: result.formats,
    };
  } catch (error) {
    console.error("Extract video error:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to extract video" 
    };
  }
}

/**
 * Legacy function - kept for backward compatibility
 * Now just records metadata, actual download happens client-side
 */
export async function processDownload(request: DownloadRequest) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return { success: false, error: "Unauthorized" };
    }
    
    // Validate URL
    const validation = validateVideoUrl(request.url);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }
    
    // Extract video info and formats
    const extractResult = await extractVideoWithFormats(request.url);
    
    // Find the requested format or default to first available
    const selectedFormat = extractResult.formats.find(
      f => f.quality === (request.quality || "720p") && f.format === (request.format || "mp4")
    ) || extractResult.formats[0];
    
    if (!selectedFormat) {
      return { success: false, error: "No available formats found" };
    }
    
    // Record download in history
    const recordResult = await recordDownload(
      request.url,
      extractResult.videoInfo,
      selectedFormat
    );
    
    if (!recordResult.success) {
      return recordResult;
    }
    
    return {
      success: true,
      downloadId: recordResult.downloadId,
      videoInfo: extractResult.videoInfo,
      formats: extractResult.formats,
      selectedFormat,
    };
  } catch (error) {
    console.error("Process download error:", error);
    return { success: false, error: "Failed to process download" };
  }
}

/**
 * Get download status
 */
export async function getDownloadStatus(downloadId: string) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return { success: false, error: "Unauthorized" };
    }
    
    const download = await prisma.download.findFirst({
      where: {
        id: downloadId,
        userId: user.id,
      },
    });
    
    if (!download) {
      return { success: false, error: "Download not found" };
    }
    
    return { success: true, download };
  } catch (error) {
    console.error("Get download status error:", error);
    return { success: false, error: "Failed to get download status" };
  }
}

/**
 * Get user's download history
 */
export async function getDownloadHistory(limit: number = 20) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return { success: false, error: "Unauthorized" };
    }
    
    const downloads = await prisma.download.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    
    return { success: true, downloads };
  } catch (error) {
    console.error("Get download history error:", error);
    return { success: false, error: "Failed to get download history" };
  }
}

/**
 * Delete download
 */
export async function deleteDownload(downloadId: string) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return { success: false, error: "Unauthorized" };
    }
    
    await prisma.download.delete({
      where: {
        id: downloadId,
        userId: user.id,
      },
    });
    
    return { success: true, message: "Download deleted" };
  } catch (error) {
    console.error("Delete download error:", error);
    return { success: false, error: "Failed to delete download" };
  }
}
