import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { updateUserPlan } from "@/actions/user-action";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.text();
  const signature = headers().get("stripe-signature");
  
  if (!signature) {
    return new NextResponse("No signature", { status: 400 });
  }
  
  let event: Stripe.Event;
  
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (error) {
    console.error("Webhook signature verification failed:", error);
    return new NextResponse("Webhook Error", { status: 400 });
  }
  
  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        
        // Get user from metadata
        const userId = session.metadata?.userId;
        const planName = session.metadata?.planName;
        
        if (!userId || !planName) {
          throw new Error("Missing metadata");
        }
        
        // Create payment record
        await prisma.payment.create({
          data: {
            userId,
            amount: (session.amount_total || 0) / 100,
            currency: session.currency || "usd",
            provider: "stripe",
            status: "completed",
            planName,
            transactionId: session.id,
            metadata: session.metadata || undefined,
          },
        });
        
        // Update user plan
        await updateUserPlan(planName as any);
        
        break;
      }
      
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        
        // Handle subscription updates
        // TODO: Implement subscription logic
        
        break;
      }
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
    
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook handler error:", error);
    return new NextResponse("Webhook Handler Error", { status: 500 });
  }
}
