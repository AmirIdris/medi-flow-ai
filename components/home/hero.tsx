"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { processDownload } from "@/actions/download-action";

export function Hero() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    try {
      const result = await processDownload({ url });
      
      if (!result.success) {
        setError(result.error || "Failed to process download");
        return;
      }
      
      // Redirect to download page
      router.push(`/download/${result.downloadId}`);
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <section className="py-20 px-4 bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-background">
      <div className="container mx-auto max-w-4xl text-center space-y-8">
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
          Download Videos &{" "}
          <span className="text-primary">AI Summaries</span>
        </h1>
        
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Download videos from YouTube, TikTok, Instagram and more. 
          Get AI-powered transcriptions and summaries instantly.
        </p>
        
        <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-4">
          <div className="flex gap-2">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Paste video URL here..."
              className="flex-1 px-4 py-3 border rounded-md text-lg"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? "Processing..." : "Download"}
            </button>
          </div>
          
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </form>
        
        <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
          <span>✓ YouTube</span>
          <span>✓ TikTok</span>
          <span>✓ Instagram</span>
          <span>✓ Facebook</span>
          <span>✓ Twitter</span>
          <span>✓ More</span>
        </div>
      </div>
    </section>
  );
}
