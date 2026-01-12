import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    // Add timeout to prevent hanging
    const timeoutPromise = new Promise<null>((resolve) => {
      setTimeout(() => resolve(null), 5000); // 5 second timeout
    });

    const userPromise = getCurrentUser();
    const user = await Promise.race([userPromise, timeoutPromise]);

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 200 } // Return 200 so client can handle it gracefully
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        imageUrl: user.imageUrl,
        emailVerified: user.emailVerified,
        plan: user.plan,
      },
    });
  } catch (error) {
    console.error("Get user error:", error);
    // Return success: false instead of error to prevent hanging
    return NextResponse.json(
      { success: false, error: "Failed to get user" },
      { status: 200 } // Return 200 so client can handle it
    );
  }
}
