import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { error: "Verification token is required" },
        { status: 400 }
      );
    }

    // Find user with this token
    const user = await prisma.user.findFirst({
      where: {
        emailVerificationToken: token,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid or expired verification token" },
        { status: 400 }
      );
    }

    // Update user
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerificationToken: null,
      },
    });

    // Redirect to sign-in page with success message
    const signInUrl = new URL("/sign-in", req.url);
    signInUrl.searchParams.set("verified", "true");
    return redirect(signInUrl.toString());
  } catch (error) {
    // Suppress "Dynamic server usage" errors during build - these are expected
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (!errorMessage.includes("Dynamic server usage")) {
      console.error("Email verification error:", error);
    }
    return NextResponse.json(
      { error: "Failed to verify email" },
      { status: 500 }
    );
  }
}
