import { openai, OPENAI_MODELS, SUMMARIZATION_PROMPTS } from "@/lib/openai";
import type { 
  TranscriptionRequest, 
  TranscriptionResult,
  SummarizationRequest,
  SummarizationResult,
  SummarizationLevel 
} from "@/types";

/**
 * Transcribe audio/video using OpenAI Whisper
 */
export async function transcribeVideo(
  request: TranscriptionRequest
): Promise<TranscriptionResult> {
  try {
    // Download the video file first (you'd need to implement this)
    const audioFile = await downloadAudioFromVideo(request.videoUrl);
    
    const response = await openai.audio.transcriptions.create({
      file: audioFile,
      model: OPENAI_MODELS.TRANSCRIPTION,
      language: request.language || "en",
      response_format: "verbose_json",
    });
    
    return {
      text: response.text,
      language: response.language || request.language || "en",
      duration: response.duration || 0,
      confidence: 0.9, // Whisper doesn't return confidence, using placeholder
    };
  } catch (error) {
    console.error("Transcription error:", error);
    throw new Error("Failed to transcribe video");
  }
}

/**
 * Generate summary from transcript using GPT-4
 */
export async function generateSummary(
  request: SummarizationRequest
): Promise<SummarizationResult> {
  try {
    const prompt = SUMMARIZATION_PROMPTS[request.level];
    
    const response = await openai.chat.completions.create({
      model: OPENAI_MODELS.CHAT,
      messages: [
        {
          role: "system",
          content: "You are an expert at analyzing and summarizing video transcripts. Provide clear, concise, and accurate summaries.",
        },
        {
          role: "user",
          content: `${prompt}\n\nTranscript:\n${request.transcript}`,
        },
      ],
      temperature: 0.7,
      max_tokens: request.level === "DETAILED" ? 2000 : request.level === "MEDIUM" ? 1000 : 500,
    });
    
    const summaryText = response.choices[0].message.content || "";
    
    // Extract key points if available
    const keyPoints = extractKeyPoints(summaryText);
    const topics = extractTopics(summaryText);
    
    return {
      id: crypto.randomUUID(),
      summary: summaryText,
      level: request.level,
      keyPoints,
      topics,
      createdAt: new Date(),
    };
  } catch (error) {
    console.error("Summarization error:", error);
    throw new Error("Failed to generate summary");
  }
}

/**
 * Transcribe and summarize in one call
 */
export async function transcribeAndSummarize(
  videoUrl: string,
  level: SummarizationLevel = "MEDIUM"
): Promise<{ transcript: TranscriptionResult; summary: SummarizationResult }> {
  const transcript = await transcribeVideo({ videoUrl });
  const summary = await generateSummary({ 
    transcript: transcript.text, 
    level 
  });
  
  return { transcript, summary };
}

/**
 * Analyze sentiment from transcript
 */
export async function analyzeSentiment(
  transcript: string
): Promise<"positive" | "neutral" | "negative"> {
  try {
    const response = await openai.chat.completions.create({
      model: OPENAI_MODELS.CHAT,
      messages: [
        {
          role: "system",
          content: "You are a sentiment analysis expert. Respond with only one word: positive, neutral, or negative.",
        },
        {
          role: "user",
          content: `Analyze the sentiment of this transcript:\n\n${transcript.slice(0, 2000)}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 10,
    });
    
    const sentiment = response.choices[0].message.content?.toLowerCase().trim() as any;
    return sentiment === "positive" || sentiment === "negative" ? sentiment : "neutral";
  } catch (error) {
    console.error("Sentiment analysis error:", error);
    return "neutral";
  }
}

// Helper functions

/**
 * Extract key points from summary text
 */
function extractKeyPoints(summaryText: string): string[] {
  const lines = summaryText.split("\n");
  const keyPoints: string[] = [];
  
  for (const line of lines) {
    const trimmed = line.trim();
    // Look for bullet points or numbered lists
    if (trimmed.match(/^[-*•]\s/) || trimmed.match(/^\d+\.\s/)) {
      keyPoints.push(trimmed.replace(/^[-*•]\s/, "").replace(/^\d+\.\s/, ""));
    }
  }
  
  return keyPoints.length > 0 ? keyPoints : [];
}

/**
 * Extract topics from summary text
 */
function extractTopics(summaryText: string): string[] {
  // Simple topic extraction - could be enhanced with NLP
  const commonWords = new Set(["the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "by"]);
  const words = summaryText.toLowerCase().match(/\b\w+\b/g) || [];
  
  const wordFreq = new Map<string, number>();
  
  for (const word of words) {
    if (word.length > 4 && !commonWords.has(word)) {
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
    }
  }
  
  // Get top 5 most frequent words as topics
  const topics = Array.from(wordFreq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word]) => word);
  
  return topics;
}

/**
 * Download audio from video URL
 * This is a placeholder - implement actual audio extraction
 */
async function downloadAudioFromVideo(videoUrl: string): Promise<File> {
  // In a real implementation:
  // 1. Download the video
  // 2. Extract audio using ffmpeg or similar
  // 3. Return as File object
  throw new Error("downloadAudioFromVideo not implemented - integrate with video-service");
}
