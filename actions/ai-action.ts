"use server";

import { auth } from "@clerk/nextjs";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/redis";
import { 
  transcribeAndSummarize, 
  analyzeSentiment 
} from "@/services/ai-service";
import type { SummarizationLevel } from "@/types";

/**
 * Generate AI summary for a video
 */
export async function generateVideoSummary(
  videoUrl: string,
  level: SummarizationLevel = "MEDIUM"
) {
  try {
    const { userId } = auth();
    
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }
    
    // Check rate limiting
    const rateLimitResult = await rateLimit(`ai:${userId}`, 5, 60);
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
    
    if (user.aiSummaryCount >= user.aiSummaryLimit && user.aiSummaryLimit !== -1) {
      return { 
        success: false, 
        error: "AI summary limit reached. Please upgrade your plan." 
      };
    }
    
    // Create AI summary record
    const aiSummary = await prisma.aISummary.create({
      data: {
        userId: user.id,
        videoUrl,
        videoTitle: "Processing...",
        transcript: "",
        summary: "",
        level,
        status: "transcribing",
      },
    });
    
    // Process in background
    processAISummaryInBackground(aiSummary.id, videoUrl, level).catch(console.error);
    
    return { 
      success: true, 
      summaryId: aiSummary.id,
      message: "AI summary generation started" 
    };
  } catch (error) {
    console.error("Generate summary error:", error);
    return { success: false, error: "Failed to generate summary" };
  }
}

/**
 * Process AI summary in background
 */
async function processAISummaryInBackground(
  summaryId: string,
  videoUrl: string,
  level: SummarizationLevel
) {
  try {
    // Update status to transcribing
    await prisma.aISummary.update({
      where: { id: summaryId },
      data: { status: "transcribing" },
    });
    
    // Transcribe and summarize
    const result = await transcribeAndSummarize(videoUrl, level);
    
    // Update status to summarizing
    await prisma.aISummary.update({
      where: { id: summaryId },
      data: { status: "summarizing" },
    });
    
    // Analyze sentiment
    const sentiment = await analyzeSentiment(result.transcript.text);
    
    // Update with results
    await prisma.aISummary.update({
      where: { id: summaryId },
      data: {
        transcript: result.transcript.text,
        summary: result.summary.summary,
        keyPoints: result.summary.keyPoints,
        topics: result.summary.topics,
        sentiment,
        status: "completed",
      },
    });
    
    // Increment user AI summary count
    await prisma.user.update({
      where: { 
        id: (await prisma.aISummary.findUnique({ where: { id: summaryId } }))?.userId 
      },
      data: {
        aiSummaryCount: {
          increment: 1,
        },
      },
    });
  } catch (error) {
    console.error("Background AI summary error:", error);
    
    await prisma.aISummary.update({
      where: { id: summaryId },
      data: {
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
      },
    });
  }
}

/**
 * Get AI summary status
 */
export async function getAISummaryStatus(summaryId: string) {
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
    
    const summary = await prisma.aISummary.findFirst({
      where: {
        id: summaryId,
        userId: user.id,
      },
    });
    
    if (!summary) {
      return { success: false, error: "Summary not found" };
    }
    
    return { success: true, summary };
  } catch (error) {
    console.error("Get AI summary status error:", error);
    return { success: false, error: "Failed to get AI summary status" };
  }
}

/**
 * Get user's AI summary history
 */
export async function getAISummaryHistory(limit: number = 20) {
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
    
    const summaries = await prisma.aISummary.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    
    return { success: true, summaries };
  } catch (error) {
    console.error("Get AI summary history error:", error);
    return { success: false, error: "Failed to get AI summary history" };
  }
}

/**
 * Delete AI summary
 */
export async function deleteAISummary(summaryId: string) {
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
    
    await prisma.aISummary.delete({
      where: {
        id: summaryId,
        userId: user.id,
      },
    });
    
    return { success: true, message: "AI summary deleted" };
  } catch (error) {
    console.error("Delete AI summary error:", error);
    return { success: false, error: "Failed to delete AI summary" };
  }
}
