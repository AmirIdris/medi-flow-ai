"use server";

import { auth, currentUser } from "@clerk/nextjs";
import { prisma } from "@/lib/prisma";
import type { UserPlan, UsageStats } from "@/types";

/**
 * Get or create user profile
 */
export async function getUserProfile() {
  try {
    const { userId } = auth();
    
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }
    
    const clerkUser = await currentUser();
    
    if (!clerkUser) {
      return { success: false, error: "User not found" };
    }
    
    // Get or create user
    let user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });
    
    if (!user) {
      user = await prisma.user.create({
        data: {
          clerkId: userId,
          email: clerkUser.emailAddresses[0]?.emailAddress || "",
          name: `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim(),
          imageUrl: clerkUser.imageUrl,
        },
      });
    }
    
    return { success: true, user };
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
    
    // Check if reset date has passed
    const now = new Date();
    if (now > user.resetDate) {
      // Reset monthly limits
      const nextResetDate = new Date(now);
      nextResetDate.setMonth(nextResetDate.getMonth() + 1);
      
      await prisma.user.update({
        where: { id: user.id },
        data: {
          downloadCount: 0,
          aiSummaryCount: 0,
          resetDate: nextResetDate,
        },
      });
      
      user.downloadCount = 0;
      user.aiSummaryCount = 0;
      user.resetDate = nextResetDate;
    }
    
    const limits = {
      canDownload: user.downloadLimit === -1 || user.downloadCount < user.downloadLimit,
      canUseSummary: user.aiSummaryLimit === -1 || user.aiSummaryCount < user.aiSummaryLimit,
      downloadsRemaining: user.downloadLimit === -1 ? -1 : Math.max(0, user.downloadLimit - user.downloadCount),
      summariesRemaining: user.aiSummaryLimit === -1 ? -1 : Math.max(0, user.aiSummaryLimit - user.aiSummaryCount),
      downloadCount: user.downloadCount,
      downloadLimit: user.downloadLimit,
      aiSummaryCount: user.aiSummaryCount,
      aiSummaryLimit: user.aiSummaryLimit,
      resetDate: user.resetDate,
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
    const { userId } = auth();
    
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }
    
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      include: {
        downloads: {
          where: { status: "completed" },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        aiSummaries: true,
      },
    });
    
    if (!user) {
      return { success: false, error: "User not found" };
    }
    
    // Calculate stats
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const downloadsThisMonth = await prisma.download.count({
      where: {
        userId: user.id,
        createdAt: { gte: firstDayOfMonth },
      },
    });
    
    const summariesThisMonth = await prisma.aISummary.count({
      where: {
        userId: user.id,
        createdAt: { gte: firstDayOfMonth },
      },
    });
    
    const totalDownloads = await prisma.download.count({
      where: { userId: user.id },
    });
    
    const totalSummaries = await prisma.aISummary.count({
      where: { userId: user.id },
    });
    
    const stats: UsageStats = {
      totalDownloads,
      totalSummaries,
      downloadsThisMonth,
      summariesThisMonth,
      storageUsed: 0, // TODO: Calculate actual storage
      lastActivity: user.downloads[0]?.createdAt || user.createdAt,
    };
    
    return { success: true, stats };
  } catch (error) {
    console.error("Get user stats error:", error);
    return { success: false, error: "Failed to get user stats" };
  }
}
