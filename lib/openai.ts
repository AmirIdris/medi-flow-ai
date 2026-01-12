import OpenAI from "openai";

// Initialize OpenAI client lazily to prevent startup crashes
let openaiInstance: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not defined. Please set it in your environment variables.");
  }
  
  if (!openaiInstance) {
    openaiInstance = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 60000, // 60 second timeout for all requests
      maxRetries: 2,
    });
  }
  
  return openaiInstance;
}

// Export a proxy that lazily initializes the OpenAI client
export const openai = new Proxy({} as OpenAI, {
  get(_target, prop) {
    const client = getOpenAI();
    const value = client[prop as keyof OpenAI];
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  }
}) as OpenAI;

// Default model configurations
export const OPENAI_MODELS = {
  TRANSCRIPTION: "whisper-1",
  CHAT: "gpt-4-turbo-preview",
  EMBEDDING: "text-embedding-3-small",
} as const;

// Summarization prompts
export const SUMMARIZATION_PROMPTS = {
  SHORT: `Provide a concise 2-3 sentence summary of the following transcript. Focus on the main points and key takeaways.`,
  
  MEDIUM: `Analyze the following transcript and provide:
1. A brief overview (2-3 sentences)
2. Key points (3-5 bullet points)
3. Main takeaways

Keep it clear and concise.`,
  
  DETAILED: `Provide a comprehensive analysis of the following transcript including:
1. Executive Summary (paragraph)
2. Main Topics Discussed (bullet points)
3. Key Insights and Takeaways (bullet points)
4. Notable Quotes or Moments (if applicable)
5. Conclusion

Be thorough but maintain clarity.`,
} as const;

export type SummarizationLevel = keyof typeof SUMMARIZATION_PROMPTS;
