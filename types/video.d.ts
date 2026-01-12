/**
 * Video and Download related types
 */

export type Platform = 
  | "youtube"
  | "tiktok"
  | "instagram"
  | "facebook"
  | "twitter"
  | "vimeo"
  | "dailymotion"
  | "other";

export type DownloadStatus = 
  | "pending"
  | "processing"
  | "completed"
  | "failed";

export type VideoFormat = 
  | "mp4"
  | "webm"
  | "mp3"
  | "m4a";

export type VideoQuality = 
  | "360p"
  | "480p"
  | "720p"
  | "1080p"
  | "1440p"
  | "4k"
  | "audio";

export interface VideoInfo {
  title: string;
  thumbnail: string;
  duration: number;
  author: string;
  platform: Platform;
  url: string;
}

export interface VideoFormatOption {
  quality: VideoQuality;
  format: VideoFormat;
  fileSize: number;
  url: string; // Direct CDN URL for download
  expiresAt?: Date; // URL expiration timestamp
}

// Keep old interface for backward compatibility
export interface VideoFormat {
  quality: VideoQuality;
  format: VideoFormat;
  fileSize: number;
  url?: string;
}

export interface DownloadRequest {
  url: string;
  format?: VideoFormat;
  quality?: VideoQuality;
}

export interface DownloadResult {
  id: string;
  videoInfo: VideoInfo;
  downloadUrl: string;
  format: VideoFormat;
  quality: VideoQuality;
  fileSize: number;
  expiresAt: Date;
}

export interface RapidAPIResponse {
  status: string;
  data: {
    title: string;
    thumbnail: string;
    duration: number;
    author: string;
    downloadUrl: string;
    formats?: VideoFormatOption[];
  };
}

export interface VideoExtractResponse {
  videoInfo: VideoInfo;
  formats: VideoFormatOption[];
}
