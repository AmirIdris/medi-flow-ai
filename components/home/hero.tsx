"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { extractVideo } from "@/actions/download-action";

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
      // Extract video info and formats via server action (no auth required)
      const result = await extractVideo(url);
      
      if (!result.success) {
        setError(result.error || "Failed to extract video information");
        return;
      }
      
      // Store video data in sessionStorage to pass to download page
      // The download page will use this data to show formats and trigger downloads
      sessionStorage.setItem("videoData", JSON.stringify({
        videoInfo: result.videoInfo,
        formats: result.formats,
        url,
      }));
      
      // Create a temporary download record ID for the page route
      // In a real app, you might want to create a record first
      const tempId = `temp-${Date.now()}`;
      sessionStorage.setItem(`download-${tempId}`, JSON.stringify({
        videoInfo: result.videoInfo,
        formats: result.formats,
        url,
      }));
      
      // Navigate to download page
      router.push(`/download/${tempId}`);
    } catch (err) {
      console.error("Extract error:", err);
      // Extract the actual error message if available
      const errorMessage = err instanceof Error 
        ? err.message 
        : "An unexpected error occurred";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setUrl(text);
    } catch (err) {
      console.error("Failed to read clipboard:", err);
    }
  };
  
  return (
    <section className="relative pt-20 pb-16 px-6 overflow-hidden">
      <div className="max-w-4xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-widest mb-6">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
          </span>
          Now with 4K AI Upscaling
        </div>
        <h1 className="text-4xl md:text-6xl font-black text-white leading-tight mb-6 tracking-tight">
          Download Media from Anywhere, <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-violet-400">Instantly.</span>
        </h1>
        <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          AI-powered social media downloader for high-quality video, audio, and images. 
          Support for 100+ platforms with one-click processing.
        </p>
        {/* Tool Input */}
        <div className="max-w-2xl mx-auto mb-12">
          <form onSubmit={handleSubmit} className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary to-violet-600 rounded-xl blur opacity-25 group-focus-within:opacity-50 transition duration-1000"></div>
            <div className="relative flex items-center p-2 rounded-xl glass border-white/20">
              <div className="pl-4 pr-2 text-slate-500">
                <span className="material-symbols-outlined">link</span>
              </div>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Paste your link here (YouTube, TikTok, Instagram...)"
                className="w-full bg-transparent border-none text-white focus:ring-0 placeholder:text-slate-500 text-base md:text-lg py-4"
                required
              />
              <div className="flex items-center gap-2 pr-1">
                <button
                  type="button"
                  onClick={handlePaste}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-2 bg-white/5 hover:bg-white/10 text-slate-300 text-sm font-semibold rounded-lg border border-white/10 transition-colors"
                >
                  <span className="material-symbols-outlined text-lg">content_paste</span>
                  Paste
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-primary hover:bg-primary/90 text-white font-bold py-3 px-6 rounded-lg shadow-lg transition-transform active:scale-95 whitespace-nowrap disabled:opacity-50"
                >
                  {loading ? "Processing..." : "Download"}
                </button>
              </div>
            </div>
          </form>
          {error && (
            <div className="mt-4 p-4 rounded-lg bg-red-500/10 border border-red-500/20">
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-red-400 flex-shrink-0 mt-0.5">error</span>
                <div className="flex-1">
                  <p className="text-sm text-red-400 font-medium mb-2">Unable to Extract Video</p>
                  
                  {/* Format multi-line errors better */}
                  {error.includes("\n") ? (
                    <div className="text-sm text-red-300/90 leading-relaxed space-y-2">
                      {error.split("\n").map((line, idx) => {
                        // Skip empty lines
                        if (!line.trim()) return null;
                        
                        // Format bullet points (both - and •)
                        if (line.trim().startsWith("-") || line.trim().startsWith("•")) {
                          const bulletContent = line.trim().startsWith("-") 
                            ? line.trim().substring(1).trim()
                            : line.trim().substring(1).trim();
                          return (
                            <div key={idx} className="ml-4 flex items-start gap-2">
                              <span className="text-red-400 mt-1">•</span>
                              <span>{bulletContent}</span>
                            </div>
                          );
                        }
                        
                        // Format headers (lines ending with :)
                        if (line.trim().endsWith(":")) {
                          return (
                            <p key={idx} className="font-semibold text-red-400 mt-2 first:mt-0">
                              {line.trim()}
                            </p>
                          );
                        }
                        
                        // Regular text
                        return <p key={idx}>{line.trim()}</p>;
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-red-300/90 leading-relaxed">{error}</p>
                  )}
                  
                  {/* Special handling for bot detection errors */}
                  {error.includes("bot detection") && (
                    <div className="mt-3 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                      <p className="text-xs text-yellow-300/90 font-medium mb-1">💡 What you can try:</p>
                      <ul className="text-xs text-yellow-300/70 space-y-1 ml-4 list-disc">
                        <li>Wait a few minutes and try again</li>
                        <li>Try a different video URL</li>
                        <li>Use cookies for more reliable access (see ytdlp-service/COOKIES_SETUP.md)</li>
                        <li>Some videos may be age-restricted or region-locked</li>
                        <li>Try a different video URL</li>
                      </ul>
                    </div>
                  )}
                  
                  {/* Special handling for yt-dlp setup suggestion */}
                  {error.includes("yt-dlp service") && (
                    <div className="mt-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                      <p className="text-xs text-blue-300/90 font-medium mb-1">💡 Setup yt-dlp for better reliability:</p>
                      <p className="text-xs text-blue-300/70">
                        See <code className="bg-blue-500/20 px-1 rounded">ytdlp-service/README.md</code> for deployment instructions.
                      </p>
                    </div>
                  )}
                  
                  {/* Legacy RapidAPI setup (if still referenced) */}
                  {error.includes("API subscription required") && (
                    <div className="mt-3 text-xs text-red-300/70 space-y-1">
                      <p className="font-medium">Quick Setup:</p>
                      <ol className="list-decimal list-inside space-y-1 ml-2">
                        <li>Visit <a href="https://rapidapi.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-red-200">RapidAPI</a> and search for "video downloader"</li>
                        <li>Subscribe to an API (e.g., "all-in-one-video-downloader")</li>
                        <li>Copy your API key and host from the dashboard</li>
                        <li>Add them to your <code className="bg-red-500/20 px-1 rounded">.env</code> file:
                          <pre className="mt-1 p-2 bg-red-500/10 rounded text-[10px] font-mono">
                            RAPIDAPI_KEY=your_key_here{'\n'}
                            RAPIDAPI_HOST=api-host.p.rapidapi.com
                          </pre>
                        </li>
                      </ol>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
        {/* Platform Logos */}
        <div className="flex flex-wrap justify-center gap-4 md:gap-8 opacity-60">
          <div className="flex items-center gap-2 text-white/80 hover:text-white transition-all cursor-default group">
            <span className="material-symbols-outlined text-2xl group-hover:text-red-500">movie</span>
            <span className="font-bold">YouTube</span>
          </div>
          <div className="flex items-center gap-2 text-white/80 hover:text-white transition-all cursor-default group">
            <span className="material-symbols-outlined text-2xl group-hover:text-cyan-400">music_note</span>
            <span className="font-bold">TikTok</span>
          </div>
          <div className="flex items-center gap-2 text-white/80 hover:text-white transition-all cursor-default group">
            <span className="material-symbols-outlined text-2xl group-hover:text-pink-500">photo_camera</span>
            <span className="font-bold">Instagram</span>
          </div>
          <div className="flex items-center gap-2 text-white/80 hover:text-white transition-all cursor-default group">
            <span className="material-symbols-outlined text-2xl group-hover:text-blue-500">social_leaderboard</span>
            <span className="font-bold">Facebook</span>
          </div>
        </div>
      </div>
    </section>
  );
}
