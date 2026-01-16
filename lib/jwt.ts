import jwt, { SignOptions } from "jsonwebtoken";
import { cookies } from "next/headers";

const JWT_SECRET: string = process.env.JWT_SECRET || "your-secret-key-change-in-production";
const JWT_REFRESH_SECRET: string = process.env.JWT_REFRESH_SECRET || "your-refresh-secret-key-change-in-production";
const JWT_EXPIRES_IN: string = process.env.JWT_EXPIRES_IN || "15m";
const JWT_REFRESH_EXPIRES_IN: string = process.env.JWT_REFRESH_EXPIRES_IN || "7d";

export interface TokenPayload {
  userId: string;
  email: string;
}

export interface RefreshTokenPayload {
  userId: string;
}

/**
 * Sign an access token
 */
export function signToken(userId: string, email: string): string {
  const payload: TokenPayload = { userId, email };
  if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured");
  }
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN || "7d",
  } as SignOptions);
}

/**
 * Sign a refresh token
 */
export function signRefreshToken(userId: string): string {
  const payload: RefreshTokenPayload = { userId };
  if (!JWT_REFRESH_SECRET) {
    throw new Error("JWT_REFRESH_SECRET is not configured");
  }
  return jwt.sign(payload, JWT_REFRESH_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRES_IN || "7d",
  } as SignOptions);
}

/**
 * Verify an access token
 */
export function verifyToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
    return decoded;
  } catch (error) {
    return null;
  }
}

/**
 * Verify a refresh token
 */
export function verifyRefreshToken(token: string): RefreshTokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET) as RefreshTokenPayload;
    return decoded;
  } catch (error) {
    return null;
  }
}

/**
 * Set authentication cookies
 */
export function setAuthCookies(accessToken: string, refreshToken: string) {
  const cookieStore = cookies();
  
  // Access token cookie (15 minutes)
  cookieStore.set("accessToken", accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 15 * 60, // 15 minutes
    path: "/",
  });
  
  // Refresh token cookie (7 days)
  cookieStore.set("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60, // 7 days
    path: "/",
  });
}

/**
 * Clear authentication cookies
 */
export function clearAuthCookies() {
  const cookieStore = cookies();
  cookieStore.delete("accessToken");
  cookieStore.delete("refreshToken");
}

/**
 * Get access token from cookies
 */
export function getAccessToken(): string | null {
  const cookieStore = cookies();
  return cookieStore.get("accessToken")?.value || null;
}

/**
 * Get refresh token from cookies
 */
export function getRefreshToken(): string | null {
  const cookieStore = cookies();
  return cookieStore.get("refreshToken")?.value || null;
}
