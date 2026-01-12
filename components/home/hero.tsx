"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
      // Extract video info and formats via API
      const response = await fetch("/api/video/extract", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url }),
      });
      
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        setError(data.error || "Failed to extract video information");
        return;
      }
      
      // Store video data in sessionStorage to pass to download page
      // The download page will use this data to show formats and trigger downloads
      sessionStorage.setItem("videoData", JSON.stringify({
        videoInfo: data.videoInfo,
        formats: data.formats,
        url,
      }));
      
      // Create a temporary download record ID for the page route
      // In a real app, you might want to create a record first
      const tempId = `temp-${Date.now()}`;
      sessionStorage.setItem(`download-${tempId}`, JSON.stringify({
        videoInfo: data.videoInfo,
        formats: data.formats,
        url,
      }));
      
      // Navigate to download page
      router.push(`/download/${tempId}`);
    } catch (err) {
      console.error("Extract error:", err);
      setError("An unexpected error occurred");
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
            <p className="text-sm text-red-400 mt-4">{error}</p>
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
