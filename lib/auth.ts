import { cookies } from "next/headers";
import { verifyToken, getAccessToken } from "./jwt";
import { prisma } from "./prisma";
import { NextResponse } from "next/server";

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  imageUrl: string | null;
  emailVerified: boolean;
  plan: string;
}

/**
 * Get current authenticated user from JWT token
 * Replaces Clerk's auth() and currentUser()
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const token = getAccessToken();
    
    if (!token) {
      return null;
    }
    
    const payload = verifyToken(token);
    
    if (!payload) {
      return null;
    }
    
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        name: true,
        imageUrl: true,
        emailVerified: true,
        plan: true,
      },
    });
    
    return user;
  } catch (error) {
    console.error("Get current user error:", error);
    return null;
  }
}

/**
 * Require authentication - throws error if not authenticated
 * Use in API routes and server actions
 */
export async function requireAuth(): Promise<AuthUser> {
  const user = await getCurrentUser();
  
  if (!user) {
    throw new Error("Unauthorized");
  }
  
  return user;
}

/**
 * Middleware helper to check authentication
 * Returns NextResponse with error if not authenticated
 */
export async function checkAuth(): Promise<{ user: AuthUser } | { error: NextResponse }> {
  const user = await getCurrentUser();
  
  if (!user) {
    return {
      error: NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      ),
    };
  }
  
  return { user };
}
