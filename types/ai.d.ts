/**
 * AI and Summarization related types
 */

export type SummarizationLevel = "SHORT" | "MEDIUM" | "DETAILED";

export type AIStatus = 
  | "pending"
  | "transcribing"
  | "summarizing"
  | "completed"
  | "failed";

export interface TranscriptionRequest {
  videoUrl: string;
  language?: string;
}

export interface TranscriptionResult {
  text: string;
  language: string;
  duration: number;
  confidence: number;
}

export interface SummarizationRequest {
  transcript: string;
  level: SummarizationLevel;
}

export interface SummarizationResult {
  id: string;
  summary: string;
  level: SummarizationLevel;
  keyPoints?: string[];
  topics?: string[];
  sentiment?: "positive" | "neutral" | "negative";
  createdAt: Date;
}

export interface AISummary {
  id: string;
  userId: string;
  downloadId?: string;
  videoTitle: string;
  videoUrl: string;
  transcript: string;
  summary: string;
  level: SummarizationLevel;
  status: AIStatus;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}
