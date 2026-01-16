import Stripe from "stripe";

// Only check in runtime, not at build time
function getStripeSecretKey(): string {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not defined");
  }
  return key;
}

// Lazy initialization to avoid build-time errors
let stripeInstance: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeInstance) {
    stripeInstance = new Stripe(getStripeSecretKey(), {
      apiVersion: "2023-10-16",
      typescript: true,
    });
  }
  return stripeInstance;
}

// Export getter for backward compatibility (lazy-loaded)
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    return (getStripe() as any)[prop];
  },
});

// Stripe product plans
export const STRIPE_PLANS = {
  FREE: {
    name: "Free",
    downloadLimit: 5,
    aiSummaryLimit: 3,
    price: 0,
  },
  BASIC: {
    name: "Basic",
    priceId: process.env.STRIPE_BASIC_PRICE_ID,
    downloadLimit: 50,
    aiSummaryLimit: 25,
    price: 9.99,
  },
  PRO: {
    name: "Pro",
    priceId: process.env.STRIPE_PRO_PRICE_ID,
    downloadLimit: 200,
    aiSummaryLimit: 100,
    price: 29.99,
  },
  UNLIMITED: {
    name: "Unlimited",
    priceId: process.env.STRIPE_UNLIMITED_PRICE_ID,
    downloadLimit: -1, // -1 means unlimited
    aiSummaryLimit: -1,
    price: 99.99,
  },
} as const;

export type StripePlan = keyof typeof STRIPE_PLANS;
