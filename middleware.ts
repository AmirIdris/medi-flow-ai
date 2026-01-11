import { authMiddleware } from "@clerk/nextjs";

// This example protects all routes including api/trpc routes
// Please edit this to allow other routes to be public as needed.
// See https://clerk.com/docs/references/nextjs/auth-middleware for more information about configuring your Middleware
export default authMiddleware({
  // Public routes that don't require authentication
  publicRoutes: [
    "/",
    "/sign-in(.*)",
    "/sign-up(.*)",
    "/api/webhooks(.*)",
  ],
  // Routes that can be accessed while signed out
  ignoredRoutes: [
    "/api/webhooks/stripe",
    "/api/webhooks/chapa",
  ],
});

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};
