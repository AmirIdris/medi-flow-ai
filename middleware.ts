import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "./lib/jwt";

// Public routes that don't require authentication
const publicRoutes = [
  "/",
  "/sign-in",
  "/sign-up",
  "/api/webhooks",
  "/api/auth",
];

// Check if a route is public
function isPublicRoute(pathname: string): boolean {
  return publicRoutes.some((route) => {
    if (route.endsWith("(.*)")) {
      const baseRoute = route.replace("(.*)", "");
      return pathname.startsWith(baseRoute);
    }
    return pathname === route || pathname.startsWith(`${route}/`);
  });
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // Protected routes that require authentication
  const protectedRoutes = ["/dashboard", "/history", "/settings", "/ai-lab"];
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));

  // Check for access token in cookies
  const accessToken = request.cookies.get("accessToken")?.value;

  if (!accessToken) {
    // Redirect to sign-in if trying to access protected route
    if (isProtectedRoute) {
      const signInUrl = new URL("/sign-in", request.url);
      signInUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(signInUrl);
    }
    
    // For protected API routes (not auth routes), return 401
    if (pathname.startsWith("/api") && !pathname.startsWith("/api/auth") && !pathname.startsWith("/api/webhooks")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    // Allow other routes to proceed
    return NextResponse.next();
  }

  // Verify token
  try {
    const payload = verifyToken(accessToken);

    if (!payload) {
      // Invalid token - clear cookies and redirect
      if (isProtectedRoute) {
        const response = NextResponse.redirect(new URL("/sign-in", request.url));
        response.cookies.delete("accessToken");
        response.cookies.delete("refreshToken");
        return response;
      }
      
      // For protected API routes, return 401
      if (pathname.startsWith("/api") && !pathname.startsWith("/api/auth") && !pathname.startsWith("/api/webhooks")) {
        return NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 }
        );
      }
      
      return NextResponse.next();
    }

    // Token is valid, allow request to proceed
    return NextResponse.next();
  } catch (error) {
    // Error verifying token - allow request to proceed (will be handled by route)
    console.error("Token verification error:", error);
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
