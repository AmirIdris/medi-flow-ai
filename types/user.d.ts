/**
 * User and Credits related types
 */

export type UserPlan = "FREE" | "BASIC" | "PRO" | "UNLIMITED";

export type PaymentProvider = "stripe" | "chapa";

export type PaymentStatus = 
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "refunded";

export interface UserProfile {
  id: string;
  email: string;
  name?: string;
  imageUrl?: string;
  plan: UserPlan;
  credits: UserCredits;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserCredits {
  downloadCount: number;
  downloadLimit: number;
  aiSummaryCount: number;
  aiSummaryLimit: number;
  resetDate: Date;
}

export interface UserLimits {
  canDownload: boolean;
  canUseSummary: boolean;
  downloadsRemaining: number;
  summariesRemaining: number;
}

export interface Payment {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  provider: PaymentProvider;
  status: PaymentStatus;
  planName: string;
  transactionId?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface UsageStats {
  totalDownloads: number;
  totalSummaries: number;
  downloadsThisMonth: number;
  summariesThisMonth: number;
  storageUsed: number;
  lastActivity: Date;
}
