"use client";

import { useState, useEffect } from "react";
import { formatFileSize, formatDuration } from "@/lib/utils";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { FormatPicker } from "./format-picker";
import Link from "next/link";
import type { VideoQuality, VideoFormat, VideoFormatOption, VideoInfo } from "@/types";
import { recordDownload } from "@/actions/download-action";

interface Download {
  id: string;
  title?: string | null;
  thumbnail?: string | null;
  duration?: number | null;
  author?: string | null;
  platform: string;
  format: string;
  quality: string;
  fileSize?: bigint | null;
  fileUrl?: string | null;
  status: string;
  error?: string | null;
}

interface ResultCardProps {
  download?: Download;
  downloadId?: string; // For temporary IDs from sessionStorage
}

export function ResultCard({ download, downloadId }: ResultCardProps) {
  const { copy, copied } = useCopyToClipboard();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [selectedQuality, setSelectedQuality] = useState<VideoQuality>("720p");
  const [selectedFormat, setSelectedFormat] = useState<VideoFormat>("mp4");
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [availableFormats, setAvailableFormats] = useState<VideoFormatOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Set mounted flag to prevent hydration issues
  useEffect(() => {
    setMounted(true);
  }, []);

  // Load data from sessionStorage if it's a temporary ID
  useEffect(() => {
    if (downloadId && downloadId.startsWith("temp-")) {
      const storedData = sessionStorage.getItem(`download-${downloadId}`);
      if (storedData) {
        try {
          const data = JSON.parse(storedData);
          setVideoInfo(data.videoInfo);
          // Convert expiresAt strings back to Date objects
          const formats = (data.formats || []).map((fmt: any) => ({
            ...fmt,
            expiresAt: fmt.expiresAt ? new Date(fmt.expiresAt) : undefined,
          }));
          setAvailableFormats(formats);
        } catch (err) {
          console.error("Failed to parse stored video data:", err);
        }
      }
    } else if (download) {
      // Convert database download to format
      if (download.fileUrl) {
        setAvailableFormats([{
          quality: download.quality as VideoQuality,
          format: download.format as VideoFormat,
          fileSize: download.fileSize ? Number(download.fileSize) : 0,
          url: download.fileUrl,
        }]);
      }
      setVideoInfo({
        title: download.title || "Video",
        thumbnail: download.thumbnail || "",
        duration: download.duration || 0,
        author: download.author || "Unknown",
        platform: download.platform as any,
        url: "",
      });
    }
  }, [downloadId, download]);

  const handleFormatSelect = async (quality: VideoQuality, format: VideoFormat, formatOption: VideoFormatOption) => {
    setSelectedQuality(quality);
    setSelectedFormat(format);
    
    // Trigger client-side download
    await triggerClientDownload(formatOption);
  };

  const triggerClientDownload = async (formatOption: VideoFormatOption) => {
    if (!formatOption.url) {
      console.error("No download URL available");
      return;
    }

    setIsDownloading(true);
    setDownloadProgress(0);
    setDownloadError(null);

    try {
      // Get original video URL from sessionStorage for yt-dlp download
      let originalUrl = "";
      let useYtDlpDownload = false;
      
      if (downloadId && downloadId.startsWith("temp-")) {
        const storedData = sessionStorage.getItem(`download-${downloadId}`);
        if (storedData) {
          try {
            const data = JSON.parse(storedData);
            originalUrl = data.url || "";
            // Use yt-dlp download for YouTube videos (it handles CDN auth better)
            useYtDlpDownload = originalUrl.includes("youtube.com") || originalUrl.includes("youtu.be");
          } catch (err) {
            console.error("Failed to get URL from stored data:", err);
          }
        }
      }
      
      let response: Response;
      
      if (useYtDlpDownload && originalUrl) {
        // Use yt-dlp download endpoint for YouTube (handles CDN authentication)
        console.log("[Download] Using yt-dlp download for YouTube");
        const downloadParams = new URLSearchParams({
          url: originalUrl,
          quality: formatOption.quality,
          format: formatOption.format,
        });
        
        const downloadUrl = `/api/video/download?${downloadParams.toString()}`;
        response = await fetch(downloadUrl, {
          method: "GET",
        });
      } else {
        // Use proxy for non-YouTube or when original URL not available
        console.log("[Download] Using proxy download");
        
        // Check if URL has expired
        if (formatOption.expiresAt && new Date(formatOption.expiresAt) < new Date()) {
          throw new Error("Video URL has expired. Please re-extract the video to get a fresh download link.");
        }
        
        // Build proxy URL with referer if available
        const proxyParams = new URLSearchParams({
          url: formatOption.url,
        });
        
        if (formatOption.referer) {
          proxyParams.set("referer", formatOption.referer);
        }
        
        if (formatOption.expiresAt) {
          // Handle both Date objects and string dates (from sessionStorage)
          const expiresAtDate = formatOption.expiresAt instanceof Date 
            ? formatOption.expiresAt 
            : new Date(formatOption.expiresAt);
          proxyParams.set("expiresAt", expiresAtDate.toISOString());
        }
        
        const proxyUrl = `/api/video/proxy?${proxyParams.toString()}`;
        response = await fetch(proxyUrl, {
          method: "GET",
        });
      }

      if (!response.ok) {
        // Try to parse error response for better error messages
        let errorMessage = `Download failed: ${response.status} ${response.statusText}`;
        let errorDetails = "";
        
        try {
          const errorData = await response.json();
          if (errorData.error) {
            errorMessage = errorData.error;
          }
          if (errorData.suggestion) {
            errorDetails = errorData.suggestion;
          }
          if (errorData.type) {
            // Add context based on error type
            if (errorData.type === "expired_url") {
              errorMessage = "Video URL has expired";
              errorDetails = "Please re-extract the video to get a fresh download link.";
            } else if (errorData.type === "domain_rejected") {
              errorMessage = `Domain not allowed: ${errorData.domain || "unknown"}`;
              errorDetails = "This domain is not in the allowed list for security reasons.";
            } else if (errorData.type === "cdn_rejected") {
              errorMessage = "Video URL rejected by CDN";
              errorDetails = errorData.suggestion || "The video URL may have expired or the CDN is blocking the request. Try re-extracting the video.";
            }
          }
        } catch {
          // If response is not JSON, use default error message
        }
        
        const fullError = errorDetails 
          ? `${errorMessage}\n\n${errorDetails}`
          : errorMessage;
        
        throw new Error(fullError);
      }

      // Get content type and length
      const contentType = response.headers.get("content-type") || "video/mp4";
      const contentLength = response.headers.get("content-length");
      const total = contentLength ? parseInt(contentLength, 10) : 0;

      // Check if this is an M3U8/HLS playlist file (not an actual video)
      // This should be filtered out by providers, but double-check here
      const isPlaylist = contentType.includes("mpegurl") || 
                        contentType.includes("x-mpegurl") ||
                        contentType.includes("application/vnd.apple.mpegurl") ||
                        formatOption.url.includes(".m3u8") ||
                        formatOption.url.includes("m3u8");
      
      if (isPlaylist) {
        console.error(`[Download] ERROR: M3U8/HLS playlist file detected! This should have been filtered out.`);
        console.error(`[Download] Content-Type: ${contentType}, URL: ${formatOption.url}`);
        
        // Show error to user
        alert(
          "Error: This format is an HLS/M3U8 playlist (not a video file).\n\n" +
          "Playlist files cannot be played directly. Please try a different quality/format option.\n\n" +
          "The system should have filtered this out - this may indicate a provider configuration issue."
        );
        
        setIsDownloading(false);
        setDownloadProgress(0);
        return;
      }

      // Use response.blob() - this is more reliable than manual chunk reading
      // It properly handles binary data and creates a blob correctly
      console.log(`[Download] Starting download. Expected size: ${total} bytes, Content-Type: ${contentType}`);
      
      const blob = await response.blob();
      
      console.log(`[Download] Blob created. Size: ${blob.size} bytes, Type: ${blob.type}`);
      
      // Verify blob is valid
      if (!blob || blob.size === 0) {
        throw new Error("Downloaded file is empty or corrupted");
      }
      
      // Verify blob size matches expected content length (if available)
      if (total > 0 && blob.size !== total) {
        console.warn(`[Download] Size mismatch! Expected: ${total} bytes, Got: ${blob.size} bytes`);
        // Don't throw - sometimes content-length is approximate
        // But log it for debugging
      }
      
      // Verify blob type matches content type
      if (blob.type && contentType && !blob.type.includes(contentType.split("/")[0])) {
        console.warn(`[Download] Type mismatch! Expected: ${contentType}, Got: ${blob.type}`);
      }
      
      // Basic validation: Check if blob has minimum size for a video file (at least 1KB)
      if (blob.size < 1024) {
        throw new Error(`Downloaded file is too small (${blob.size} bytes). The file may be corrupted or incomplete.`);
      }
      
      // Try to read first few bytes to verify it's a video file
      // MP4 files start with specific bytes, but we'll just check it's not empty text
      try {
        const firstChunk = await blob.slice(0, Math.min(100, blob.size)).arrayBuffer();
        const bytes = new Uint8Array(firstChunk);
        // Check if it looks like binary data (not all zeros or all same value)
        const uniqueBytes = new Set(bytes);
        if (uniqueBytes.size < 3 && bytes.length > 10) {
          console.warn(`[Download] File might be corrupted - first bytes are suspicious: ${Array.from(bytes.slice(0, 20)).join(",")}`);
        }
      } catch (err) {
        console.warn(`[Download] Could not verify file header:`, err);
      }

      // Create object URL from blob
      const url = window.URL.createObjectURL(blob);
      
      // Determine file extension from content type or format
      const extension = formatOption.format || contentType.split("/")[1]?.split(";")[0] || "mp4";
      const filename = videoInfo?.title 
        ? `${videoInfo.title.replace(/[^a-z0-9]/gi, "_").substring(0, 50)}.${extension}`
        : `video.${extension}`;
      
      // Create download link and trigger
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.style.display = "none";
      document.body.appendChild(a);
      
      console.log(`[Download] Triggering download: ${filename} (${blob.size} bytes)`);
      a.click();
      
      // Clean up after download starts (give it time to initiate)
      setTimeout(() => {
        if (document.body.contains(a)) {
          document.body.removeChild(a);
        }
        // Don't revoke URL immediately - browser needs it for download
        // Revoke after a longer delay
        setTimeout(() => {
          window.URL.revokeObjectURL(url);
        }, 10000); // 10 seconds should be enough for download to start
      }, 1000);

      setDownloadProgress(100);
      console.log(`[Download] Download initiated successfully`);

      // Record download in history if we have video info
      if (videoInfo) {
        // Get the original URL from sessionStorage or use a placeholder
        let originalUrl = "";
        if (downloadId && downloadId.startsWith("temp-")) {
          const storedData = sessionStorage.getItem(`download-${downloadId}`);
          if (storedData) {
            try {
              const data = JSON.parse(storedData);
              originalUrl = data.url || "";
            } catch (err) {
              console.error("Failed to get URL from stored data:", err);
            }
          }
        } else if (download) {
          originalUrl = download.url || "";
        }
        
        if (originalUrl) {
          await recordDownload(originalUrl, videoInfo, formatOption);
        }
      }

      // Clear download state after a delay
      setTimeout(() => {
        setIsDownloading(false);
        setDownloadProgress(0);
      }, 2000);
    } catch (error) {
      console.error("Download error:", error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred during download";
      setDownloadError(errorMessage);
      setIsDownloading(false);
      setDownloadProgress(0);
    }
  };

  // Show loading state if we're loading from sessionStorage
  if (downloadId && downloadId.startsWith("temp-") && !videoInfo && !loading) {
    setLoading(true);
    return null; // Will re-render when data loads
  }

  if (loading && !videoInfo) {
    return (
      <div className="max-w-[1200px] mx-auto w-full px-6 py-8">
        <div className="rounded-lg border border-slate-200 dark:border-[#282839] p-8 text-center bg-white dark:bg-[#1a1a2e]">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold mb-2 text-slate-900 dark:text-white">Loading...</h2>
        </div>
      </div>
    );
  }

  if (download?.status === "processing") {
    return (
      <div className="max-w-[1200px] mx-auto w-full px-6 py-8">
        <div className="rounded-lg border border-slate-200 dark:border-[#282839] p-8 text-center bg-white dark:bg-[#1a1a2e]">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold mb-2 text-slate-900 dark:text-white">Processing...</h2>
          <p className="text-slate-500 dark:text-[#9d9db9]">
            Your video is being processed. This may take a few minutes.
          </p>
        </div>
      </div>
    );
  }

  if (download?.status === "failed") {
    return (
      <div className="max-w-[1200px] mx-auto w-full px-6 py-8">
        <div className="rounded-lg border border-destructive p-8 text-center bg-white dark:bg-[#1a1a2e]">
          <h2 className="text-2xl font-bold mb-2 text-destructive">Download Failed</h2>
          <p className="text-slate-500 dark:text-[#9d9db9]">{download.error || "An error occurred"}</p>
        </div>
      </div>
    );
  }

  // Use videoInfo if available, otherwise fall back to download
  const displayInfo = videoInfo || (download ? {
    title: download.title || "Video",
    thumbnail: download.thumbnail || "",
    duration: download.duration || 0,
    author: download.author || "Unknown",
    platform: download.platform,
  } : null);

  if (!displayInfo) {
    return (
      <div className="max-w-[1200px] mx-auto w-full px-6 py-8">
        <div className="rounded-lg border border-slate-200 dark:border-[#282839] p-8 text-center bg-white dark:bg-[#1a1a2e]">
          <h2 className="text-2xl font-bold mb-2 text-slate-900 dark:text-white">No video data found</h2>
          <Link href="/" className="text-primary hover:underline">Go back to home</Link>
        </div>
      </div>
    );
  }

  const totalDuration = displayInfo.duration || 0;
  const progressPercent = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;

    return (
      <main className="flex-1 max-w-[1200px] mx-auto w-full px-6 py-8">
        {/* Breadcrumbs & Heading */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Link href="/history" className="text-slate-400 dark:text-[#9d9db9] text-sm font-medium hover:text-primary">
              Media
            </Link>
            <span className="text-slate-300 dark:text-[#282839] text-sm">
              <span className="material-symbols-outlined !text-sm">chevron_right</span>
            </span>
            <span className="text-slate-900 dark:text-white text-sm font-medium">Download Result</span>
          </div>
          <div className="flex flex-wrap justify-between items-end gap-4">
            <div className="flex flex-col gap-1">
              <h1 className="text-slate-900 dark:text-white text-3xl font-black leading-tight tracking-tight">
                {displayInfo.title}
              </h1>
              <p className="text-slate-500 dark:text-[#9d9db9] text-sm font-normal">
                {downloadId ? `Video ID: ${downloadId.slice(0, 6)}` : download ? `Video ID: ${download.id.slice(0, 6)}` : ""} | Source: {displayInfo.platform.charAt(0).toUpperCase() + displayInfo.platform.slice(1)} | Duration: {displayInfo.duration ? formatDuration(displayInfo.duration) : "N/A"}
              </p>
            </div>
            <Link
              href="/"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 dark:bg-[#282839] text-slate-700 dark:text-white text-sm font-bold hover:bg-slate-200 dark:hover:bg-[#34344a] transition-colors"
            >
              <span className="material-symbols-outlined !text-sm">arrow_back</span>
              <span>Back to Search</span>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: Media Player & Preview */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            {/* Media Player */}
            <div className="bg-white dark:bg-[#1a1a2e] rounded-xl overflow-hidden shadow-sm ring-1 ring-slate-200 dark:ring-white/5">
              <div className="relative group aspect-video bg-black flex items-center justify-center overflow-hidden">
                {displayInfo.thumbnail && (
                  <img
                    alt="Video thumbnail"
                    className="absolute inset-0 w-full h-full object-cover opacity-80"
                    src={displayInfo.thumbnail}
                  />
                )}
                {!isPlaying && (
                  <button
                    onClick={() => setIsPlaying(true)}
                    className="z-10 flex shrink-0 items-center justify-center rounded-full size-20 bg-primary/90 text-white shadow-xl hover:scale-110 transition-transform"
                  >
                    <span className="material-symbols-outlined !text-4xl fill-1">play_arrow</span>
                  </button>
                )}

                {/* Video Controls Overlay */}
                {isPlaying && (
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-6 py-4">
                    <div className="flex h-1.5 items-center justify-center mb-3 gap-0">
                      <div className="h-1 flex-1 rounded-full bg-primary" style={{ width: `${Math.min(progressPercent, 100)}%` }}></div>
                      <div className="relative">
                        <div className="absolute -left-1 -top-1.5 size-4 rounded-full bg-white border-2 border-primary"></div>
                      </div>
                      <div className="h-1 flex-[2] rounded-full bg-white/30"></div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => setIsPlaying(false)}
                          className="material-symbols-outlined text-white !text-xl cursor-pointer"
                        >
                          pause
                        </button>
                        <span className="material-symbols-outlined text-white !text-xl cursor-pointer">volume_up</span>
                        <p className="text-white text-xs font-medium tabular-nums">
                          {formatDuration(currentTime)} / {formatDuration(totalDuration)}
                        </p>
                      </div>
                      <span className="material-symbols-outlined text-white !text-xl cursor-pointer">fullscreen</span>
                    </div>
                  </div>
                )}
              </div>
              <div className="p-6">
                <h3 className="font-bold text-lg mb-2 text-slate-900 dark:text-white">Detailed Analysis</h3>
                <p className="text-slate-500 dark:text-[#9d9db9] text-sm leading-relaxed">
                  {displayInfo.title || "This video is ready for download. Select your preferred quality and format below."}
                </p>
              </div>
            </div>

            {/* Skeleton State for Recommendations */}
            <div className="flex flex-col gap-4">
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Processing More Content</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-3">
                  <div className="aspect-video w-full rounded-lg bg-slate-200 dark:bg-[#282839] animate-pulse"></div>
                  <div className="h-4 w-3/4 rounded bg-slate-200 dark:bg-[#282839] animate-pulse"></div>
                </div>
                <div className="flex flex-col gap-3">
                  <div className="aspect-video w-full rounded-lg bg-slate-200 dark:bg-[#282839] animate-pulse"></div>
                  <div className="h-4 w-1/2 rounded bg-slate-200 dark:bg-[#282839] animate-pulse"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Download Options Card */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white dark:bg-[#1a1a2e] rounded-xl shadow-xl ring-1 ring-slate-200 dark:ring-white/10 p-6 flex flex-col gap-6">
              {availableFormats.length > 0 ? (
                <FormatPicker
                  formats={availableFormats}
                  onSelect={handleFormatSelect}
                  selectedQuality={selectedQuality}
                  selectedFormatType="video"
                />
              ) : (
                <div className="text-center py-8">
                  <p className="text-slate-500 dark:text-[#9d9db9]">No formats available</p>
                </div>
              )}
            </div>

            {/* Download Progress Toast */}
            {isDownloading && (
              <div className="relative bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/30 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="size-10 rounded-full bg-emerald-500 flex items-center justify-center text-white">
                    <span className="material-symbols-outlined">check_circle</span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-emerald-800 dark:text-emerald-400">Download Started</p>
                    <p className="text-xs text-emerald-700/70 dark:text-emerald-500/70">Estimated time: 14 seconds</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <p className="text-xs font-bold text-emerald-800 dark:text-emerald-400">{downloadProgress}%</p>
                  <div className="w-24 h-1.5 bg-emerald-500/20 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500" style={{ width: `${downloadProgress}%` }}></div>
                  </div>
                </div>
              </div>
            )}

            {/* Download Error Toast */}
            {mounted && downloadError && !isDownloading && (
              <div className="relative bg-red-500/10 dark:bg-red-500/20 border border-red-500/30 rounded-xl p-4">
                <div className="flex items-start gap-4">
                  <div className="size-10 rounded-full bg-red-500 flex items-center justify-center text-white flex-shrink-0">
                    <span className="material-symbols-outlined">error</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-red-800 dark:text-red-400 mb-2">Download Failed</p>
                    <div className="text-xs text-red-700/90 dark:text-red-500/90 whitespace-pre-line">
                      {downloadError.split('\n').map((line, index) => (
                        <p key={index} className={index > 0 ? "mt-1" : ""}>
                          {line}
                        </p>
                      ))}
                    </div>
                    <button
                      onClick={() => setDownloadError(null)}
                      className="mt-3 text-xs text-red-600 dark:text-red-400 hover:underline"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Direct Download Link (if available from database record) */}
            {download?.fileUrl && !isDownloading && availableFormats.length === 0 && (
              <div className="bg-white dark:bg-[#1a1a2e] rounded-xl shadow-xl ring-1 ring-slate-200 dark:ring-white/10 p-6">
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-sm text-slate-900 dark:text-white">Ready to Download</p>
                      <p className="text-xs text-slate-500 dark:text-[#9d9db9]">
                        {download.fileSize ? formatFileSize(Number(download.fileSize)) : "File ready"}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <a
                      href={download.fileUrl}
                      download
                      className="flex-1 px-4 py-2 bg-primary text-white rounded-lg text-center font-bold hover:brightness-110 transition-all"
                    >
                      Download File
                    </a>
                    <button
                      onClick={() => copy(download.fileUrl!)}
                      className="px-4 py-2 border border-slate-200 dark:border-[#282839] rounded-lg hover:bg-slate-100 dark:hover:bg-[#282839] transition-colors text-sm font-bold"
                    >
                      {copied ? "Copied!" : "Copy URL"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    );
}
