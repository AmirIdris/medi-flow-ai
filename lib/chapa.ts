/**
 * Chapa Payment Gateway Configuration
 * Ethiopian payment processing
 */

if (!process.env.CHAPA_SECRET_KEY) {
  throw new Error("CHAPA_SECRET_KEY is not defined");
}

const CHAPA_API_URL = "https://api.chapa.co/v1";

export interface ChapaPaymentRequest {
  amount: number;
  currency: string;
  email: string;
  first_name: string;
  last_name: string;
  tx_ref: string;
  callback_url: string;
  return_url: string;
  customization?: {
    title?: string;
    description?: string;
  };
}

export interface ChapaPaymentResponse {
  message: string;
  status: string;
  data: {
    checkout_url: string;
  };
}

/**
 * Initialize Chapa payment
 */
export async function initializePayment(
  data: ChapaPaymentRequest
): Promise<ChapaPaymentResponse> {
  const response = await fetch(`${CHAPA_API_URL}/transaction/initialize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.CHAPA_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error("Failed to initialize Chapa payment");
  }

  return response.json();
}

/**
 * Verify Chapa payment
 */
export async function verifyPayment(txRef: string): Promise<any> {
  const response = await fetch(`${CHAPA_API_URL}/transaction/verify/${txRef}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${process.env.CHAPA_SECRET_KEY}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to verify Chapa payment");
  }

  return response.json();
}

// Chapa product plans (in ETB)
export const CHAPA_PLANS = {
  FREE: {
    name: "Free",
    downloadLimit: 5,
    aiSummaryLimit: 3,
    price: 0,
  },
  BASIC: {
    name: "Basic",
    downloadLimit: 50,
    aiSummaryLimit: 25,
    price: 500, // ETB
  },
  PRO: {
    name: "Pro",
    downloadLimit: 200,
    aiSummaryLimit: 100,
    price: 1500, // ETB
  },
  UNLIMITED: {
    name: "Unlimited",
    downloadLimit: -1,
    aiSummaryLimit: -1,
    price: 5000, // ETB
  },
} as const;

export type ChapaPlan = keyof typeof CHAPA_PLANS;
