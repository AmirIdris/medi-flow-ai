import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is not defined");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
  typescript: true,
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
