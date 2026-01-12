"use server";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { UserPlan, UsageStats } from "@/types";

/**
 * Get or create user profile
 */
export async function getUserProfile() {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return { success: false, error: "Unauthorized" };
    }
    
    // Get full user data
    const fullUser = await prisma.user.findUnique({
      where: { id: user.id },
    });
    
    if (!fullUser) {
      return { success: false, error: "User not found" };
    }
    
    return { success: true, user: fullUser };
  } catch (error) {
    console.error("Get user profile error:", error);
    return { success: false, error: "Failed to get user profile" };
  }
}

/**
 * Update user profile
 */
export async function updateUserProfile(data: {
  name?: string;
  imageUrl?: string;
}) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return { success: false, error: "Unauthorized" };
    }
    
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data,
    });
    
    return { success: true, user: updatedUser };
  } catch (error) {
    console.error("Update user profile error:", error);
    return { success: false, error: "Failed to update user profile" };
  }
}

/**
 * Get user limits and usage
 */
export async function getUserLimits() {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return { success: false, error: "Unauthorized" };
    }
    
    const fullUser = await prisma.user.findUnique({
      where: { id: user.id },
    });
    
    if (!fullUser) {
      return { success: false, error: "User not found" };
    }
    
    // Check if reset date has passed
    const now = new Date();
    if (now > fullUser.resetDate) {
      // Reset monthly limits
      const nextResetDate = new Date(now);
      nextResetDate.setMonth(nextResetDate.getMonth() + 1);
      
      await prisma.user.update({
        where: { id: fullUser.id },
        data: {
          downloadCount: 0,
          aiSummaryCount: 0,
          resetDate: nextResetDate,
        },
      });
      
      fullUser.downloadCount = 0;
      fullUser.aiSummaryCount = 0;
      fullUser.resetDate = nextResetDate;
    }
    
    const limits = {
      canDownload: fullUser.downloadLimit === -1 || fullUser.downloadCount < fullUser.downloadLimit,
      canUseSummary: fullUser.aiSummaryLimit === -1 || fullUser.aiSummaryCount < fullUser.aiSummaryLimit,
      downloadsRemaining: fullUser.downloadLimit === -1 ? -1 : Math.max(0, fullUser.downloadLimit - fullUser.downloadCount),
      summariesRemaining: fullUser.aiSummaryLimit === -1 ? -1 : Math.max(0, fullUser.aiSummaryLimit - fullUser.aiSummaryCount),
      downloadCount: fullUser.downloadCount,
      downloadLimit: fullUser.downloadLimit,
      aiSummaryCount: fullUser.aiSummaryCount,
      aiSummaryLimit: fullUser.aiSummaryLimit,
      resetDate: fullUser.resetDate,
    };
    
    return { success: true, limits };
  } catch (error) {
    console.error("Get user limits error:", error);
    return { success: false, error: "Failed to get user limits" };
  }
}

/**
 * Update user plan
 */
export async function updateUserPlan(plan: UserPlan) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return { success: false, error: "Unauthorized" };
    }
    
    // Define plan limits
    const planLimits = {
      FREE: { downloadLimit: 5, aiSummaryLimit: 3 },
      BASIC: { downloadLimit: 50, aiSummaryLimit: 25 },
      PRO: { downloadLimit: 200, aiSummaryLimit: 100 },
      UNLIMITED: { downloadLimit: -1, aiSummaryLimit: -1 },
    };
    
    const limits = planLimits[plan];
    
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        plan,
        downloadLimit: limits.downloadLimit,
        aiSummaryLimit: limits.aiSummaryLimit,
      },
    });
    
    return { success: true, user: updatedUser };
  } catch (error) {
    console.error("Update user plan error:", error);
    return { success: false, error: "Failed to update user plan" };
  }
}

/**
 * Get user usage statistics
 */
export async function getUserStats(): Promise<{ success: boolean; stats?: UsageStats; error?: string }> {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return { success: false, error: "Unauthorized" };
    }
    
    const fullUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        downloads: {
          where: { status: "completed" },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        aiSummaries: true,
      },
    });
    
    if (!fullUser) {
      return { success: false, error: "User not found" };
    }
    
    // Calculate stats
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const downloadsThisMonth = await prisma.download.count({
      where: {
        userId: fullUser.id,
        createdAt: { gte: firstDayOfMonth },
      },
    });
    
    const summariesThisMonth = await prisma.aISummary.count({
      where: {
        userId: fullUser.id,
        createdAt: { gte: firstDayOfMonth },
      },
    });
    
    const totalDownloads = await prisma.download.count({
      where: { userId: fullUser.id },
    });
    
    const totalSummaries = await prisma.aISummary.count({
      where: { userId: fullUser.id },
    });
    
    const stats: UsageStats = {
      totalDownloads,
      totalSummaries,
      downloadsThisMonth,
      summariesThisMonth,
      storageUsed: 0, // TODO: Calculate actual storage
      lastActivity: fullUser.downloads[0]?.createdAt || fullUser.createdAt,
    };
    
    return { success: true, stats };
  } catch (error) {
    console.error("Get user stats error:", error);
    return { success: false, error: "Failed to get user stats" };
  }
}
