"use client";

import { formatFileSize, formatDuration } from "@/lib/utils";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";

interface Download {
  id: string;
  title?: string;
  thumbnail?: string;
  duration?: number;
  author?: string;
  platform: string;
  format: string;
  quality: string;
  fileSize?: bigint;
  fileUrl?: string;
  status: string;
  error?: string;
}

export function ResultCard({ download }: { download: Download }) {
  const { copy, copied } = useCopyToClipboard();
  
  if (download.status === "processing") {
    return (
      <div className="rounded-lg border p-8 text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-4"></div>
        <h2 className="text-2xl font-semibold mb-2">Processing...</h2>
        <p className="text-muted-foreground">
          Your video is being processed. This may take a few minutes.
        </p>
      </div>
    );
  }
  
  if (download.status === "failed") {
    return (
      <div className="rounded-lg border border-destructive p-8 text-center">
        <h2 className="text-2xl font-semibold mb-2 text-destructive">
          Download Failed
        </h2>
        <p className="text-muted-foreground">{download.error || "An error occurred"}</p>
      </div>
    );
  }
  
  if (download.status === "completed") {
    return (
      <div className="space-y-6">
        <div className="rounded-lg border overflow-hidden">
          {download.thumbnail && (
            <img
              src={download.thumbnail}
              alt={download.title || "Video thumbnail"}
              className="w-full aspect-video object-cover"
            />
          )}
          
          <div className="p-6 space-y-4">
            <div>
              <h1 className="text-2xl font-bold mb-2">
                {download.title || "Video"}
              </h1>
              {download.author && (
                <p className="text-muted-foreground">by {download.author}</p>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Platform:</span>{" "}
                <span className="font-medium capitalize">{download.platform}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Format:</span>{" "}
                <span className="font-medium uppercase">{download.format}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Quality:</span>{" "}
                <span className="font-medium">{download.quality}</span>
              </div>
              {download.duration && (
                <div>
                  <span className="text-muted-foreground">Duration:</span>{" "}
                  <span className="font-medium">{formatDuration(download.duration)}</span>
                </div>
              )}
              {download.fileSize && (
                <div>
                  <span className="text-muted-foreground">Size:</span>{" "}
                  <span className="font-medium">{formatFileSize(Number(download.fileSize))}</span>
                </div>
              )}
            </div>
            
            {download.fileUrl && (
              <div className="flex gap-2">
                <a
                  href={download.fileUrl}
                  download
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-md text-center font-medium hover:bg-primary/90"
                >
                  Download File
                </a>
                <button
                  onClick={() => copy(download.fileUrl!)}
                  className="px-4 py-2 border rounded-md hover:bg-accent"
                >
                  {copied ? "Copied!" : "Copy URL"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
  
  return null;
}
