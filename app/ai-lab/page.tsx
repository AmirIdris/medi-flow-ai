"use client";

import { useState } from "react";
import { Navbar } from "@/components/shared/navbar";
import { Footer } from "@/components/shared/footer";
import { generateVideoSummary, getAISummaryStatus } from "@/actions/ai-action";

export default function AILabPage() {
  const [videoUrl, setVideoUrl] = useState("");
  const [level, setLevel] = useState<"SHORT" | "MEDIUM" | "DETAILED">("MEDIUM");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);
    
    try {
      const response = await generateVideoSummary(videoUrl, level);
      
      if (!response.success) {
        setError(response.error || "Failed to generate summary");
        return;
      }
      
      // Poll for status
      const summaryId = response.summaryId;
      const pollInterval = setInterval(async () => {
        const statusResponse = await getAISummaryStatus(summaryId!);
        
        if (statusResponse.success && statusResponse.summary) {
          const summary = statusResponse.summary;
          
          if (summary.status === "completed") {
            setResult(summary);
            clearInterval(pollInterval);
            setLoading(false);
          } else if (summary.status === "failed") {
            setError(summary.error || "Failed to generate summary");
            clearInterval(pollInterval);
            setLoading(false);
          }
        }
      }, 2000);
      
      // Timeout after 5 minutes
      setTimeout(() => {
        clearInterval(pollInterval);
        if (loading) {
          setError("Request timed out");
          setLoading(false);
        }
      }, 300000);
    } catch (err) {
      setError("An unexpected error occurred");
      setLoading(false);
    }
  };
  
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl font-bold">AI Lab</h1>
            <p className="text-muted-foreground">
              Generate AI-powered summaries for any video
            </p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Video URL
              </label>
              <input
                type="url"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://youtube.com/watch?v=..."
                className="w-full px-4 py-2 border rounded-md"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">
                Summary Level
              </label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value as any)}
                className="w-full px-4 py-2 border rounded-md"
              >
                <option value="SHORT">Short (2-3 sentences)</option>
                <option value="MEDIUM">Medium (Key points)</option>
                <option value="DETAILED">Detailed (Comprehensive)</option>
              </select>
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? "Processing..." : "Generate Summary"}
            </button>
          </form>
          
          {error && (
            <div className="p-4 bg-destructive/10 text-destructive rounded-md">
              {error}
            </div>
          )}
          
          {result && (
            <div className="space-y-4 p-6 border rounded-lg">
              <h2 className="text-2xl font-semibold">Summary</h2>
              <p className="whitespace-pre-wrap">{result.summary}</p>
              
              {result.keyPoints && result.keyPoints.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Key Points</h3>
                  <ul className="list-disc list-inside space-y-1">
                    {result.keyPoints.map((point: string, i: number) => (
                      <li key={i}>{point}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {result.sentiment && (
                <p className="text-sm text-muted-foreground">
                  Sentiment: <span className="capitalize">{result.sentiment}</span>
                </p>
              )}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
