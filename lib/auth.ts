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
    
    try {
      // Add a timeout wrapper to prevent hanging
      const userPromise = prisma.user.findUnique({
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
      
      // Race against a timeout
      const timeoutPromise = new Promise<null>((resolve) => {
        setTimeout(() => resolve(null), 3000); // 3 second timeout
      });
      
      const user = await Promise.race([userPromise, timeoutPromise]);
      
      return user;
    } catch (dbError) {
      // If database query fails (e.g., schema not migrated), return null
      // This allows the app to load even if database isn't ready
      console.error("Database query error in getCurrentUser:", dbError);
      return null;
    }
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
