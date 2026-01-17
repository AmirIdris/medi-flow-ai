import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { verifyPayment } from "@/lib/chapa";
import { prisma } from "@/lib/prisma";
import { updateUserPlan } from "@/actions/user-action";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Verify webhook signature (if Chapa provides one)
    const signature = headers().get("chapa-signature");
    
    if (!signature) {
      // For now, we'll verify via API call
      // In production, implement proper signature verification
    }
    
    const { tx_ref, status } = body;
    
    if (!tx_ref) {
      return new NextResponse("Missing transaction reference", { status: 400 });
    }
    
    // Verify payment with Chapa API
    const verification = await verifyPayment(tx_ref);
    
    if (verification.status === "success" && status === "success") {
      // Get payment metadata
      const metadata = verification.data;
      const userId = metadata.customization?.userId;
      const planName = metadata.customization?.planName;
      
      if (!userId || !planName) {
        throw new Error("Missing payment metadata");
      }
      
      // Create payment record
      await prisma.payment.create({
        data: {
          userId,
          amount: metadata.amount,
          currency: metadata.currency || "ETB",
          provider: "chapa",
          status: "completed",
          planName,
          transactionId: tx_ref,
          metadata,
        },
      });
      
      // Update user plan
      await updateUserPlan(planName as any);
    }
    
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Chapa webhook error:", error);
    return new NextResponse("Webhook Handler Error", { status: 500 });
  }
}
