"use server";

import { auth } from "@clerk/nextjs";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/redis";
import { 
  validateVideoUrl, 
  detectPlatform, 
  fetchVideoInfo, 
  downloadVideo 
} from "@/services/video-service";
import type { DownloadRequest } from "@/types";

/**
 * Process video download request
 */
export async function processDownload(request: DownloadRequest) {
  try {
    const { userId } = auth();
    
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }
    
    // Validate URL
    const validation = validateVideoUrl(request.url);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }
    
    // Check rate limiting
    const rateLimitResult = await rateLimit(userId, 10, 60);
    if (!rateLimitResult.success) {
      return { 
        success: false, 
        error: "Rate limit exceeded. Please try again later." 
      };
    }
    
    // Get user and check limits
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
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
    
    // Detect platform
    const platform = detectPlatform(request.url);
    
    // Create download record
    const download = await prisma.download.create({
      data: {
        userId: user.id,
        url: request.url,
        platform,
        format: request.format || "mp4",
        quality: request.quality || "720p",
        status: "processing",
      },
    });
    
    // Process download in background
    processDownloadInBackground(download.id, request).catch(console.error);
    
    return { 
      success: true, 
      downloadId: download.id,
      message: "Download started" 
    };
  } catch (error) {
    console.error("Download error:", error);
    return { success: false, error: "Failed to process download" };
  }
}

/**
 * Process download in background
 */
async function processDownloadInBackground(
  downloadId: string,
  request: DownloadRequest
) {
  try {
    // Fetch video info
    const videoInfo = await fetchVideoInfo(request.url);
    
    // Download video - get direct download URL from RapidAPI
    const result = await downloadVideo(
      request.url,
      request.format || "mp4",
      request.quality || "720p"
    );
    
    // Update download record with direct download URL
    await prisma.download.update({
      where: { id: downloadId },
      data: {
        title: videoInfo.title,
        thumbnail: videoInfo.thumbnail,
        duration: videoInfo.duration,
        author: videoInfo.author,
        fileUrl: result.downloadUrl, // Direct URL from RapidAPI/social media platform
        fileSize: result.fileSize,
        status: "completed",
        expiresAt: result.expiresAt,
      },
    });
    
    // Increment user download count
    await prisma.user.update({
      where: { id: (await prisma.download.findUnique({ where: { id: downloadId } }))?.userId },
      data: {
        downloadCount: {
          increment: 1,
        },
      },
    });
  } catch (error) {
    console.error("Background download error:", error);
    
    await prisma.download.update({
      where: { id: downloadId },
      data: {
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
      },
    });
  }
}

/**
 * Get download status
 */
export async function getDownloadStatus(downloadId: string) {
  try {
    const { userId } = auth();
    
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }
    
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });
    
    if (!user) {
      return { success: false, error: "User not found" };
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
    const { userId } = auth();
    
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }
    
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });
    
    if (!user) {
      return { success: false, error: "User not found" };
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
    const { userId } = auth();
    
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }
    
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });
    
    if (!user) {
      return { success: false, error: "User not found" };
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
