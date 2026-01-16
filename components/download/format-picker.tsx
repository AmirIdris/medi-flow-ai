"use client";

import { useState } from "react";
import type { VideoFormat, VideoQuality, VideoFormatOption } from "@/types";
import { formatFileSize } from "@/lib/utils";

interface FormatPickerProps {
  formats: VideoFormatOption[];
  onSelect: (quality: VideoQuality, format: VideoFormat, formatOption: VideoFormatOption) => void;
  selectedQuality?: VideoQuality;
  selectedFormatType?: "video" | "audio";
}

export function FormatPicker({ 
  formats, 
  onSelect, 
  selectedQuality,
  selectedFormatType = "video"
}: FormatPickerProps) {
  // Filter out audio-only formats - we only want merged video+audio formats
  const mergedFormats = formats.filter(f => f.quality !== "audio");
  
  const [formatType, setFormatType] = useState<"video" | "audio">("video"); // Always video (merged)
  const [selectedFormat, setSelectedFormat] = useState(mergedFormats[0] || formats[0]);
  
  const handleSelect = () => {
    onSelect(selectedFormat.quality, selectedFormat.format, selectedFormat);
  };

  // Filter formats - ONLY show merged formats (video + audio together)
  // Exclude audio-only formats (quality === "audio")
  // Only show video formats that include audio (merged formats)
  const videoFormats = mergedFormats.filter(f => 
    f.format === "mp4" || f.format === "webm"
  );
  // Audio-only formats are excluded - we only want merged video+audio formats
  const audioFormats: VideoFormatOption[] = []; // Empty - we don't show separate audio files
  const availableFormats = videoFormats; // Always use video formats (merged with audio)
  
  // Update selected format when formats change
  if (availableFormats.length > 0 && (!selectedFormat || !availableFormats.includes(selectedFormat))) {
    setSelectedFormat(availableFormats[0]);
  }

  // Quality labels
  const getQualityLabel = (quality: VideoQuality) => {
    const labels: Record<VideoQuality, string> = {
      "360p": "360p SD",
      "480p": "480p SD",
      "720p": "720p HD",
      "1080p": "1080p Full HD",
      "1440p": "1440p QHD",
      "4k": "4K Ultra HD",
      "audio": "High Quality Audio"
    };
    return labels[quality] || quality;
  };

  // Check if quality is PRO (1080p, 1440p, 4k)
  const isProQuality = (quality: VideoQuality) => {
    return quality === "1080p" || quality === "1440p" || quality === "4k";
  };

  // Get quality description
  const getQualityDescription = (quality: VideoQuality, fileSize: number) => {
    if (quality === "720p") return `Standard Quality • ${formatFileSize(fileSize)}`;
    if (quality === "1080p") return `High Bitrate • ${formatFileSize(fileSize)}`;
    if (quality === "4k") return `Cinematic • ${formatFileSize(fileSize)}`;
    return `${formatFileSize(fileSize)}`;
  };
  
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-bold mb-1">Download Options</h2>
        <p className="text-sm text-slate-500 dark:text-[#9d9db9]">Select your preferred quality and format</p>
      </div>

      {/* Format Toggle - Only show video option (merged formats with audio) */}
      {/* Audio-only formats are hidden - we only provide merged video+audio files */}
      {videoFormats.length > 0 && (
        <div className="flex bg-slate-100 dark:bg-[#282839] p-1 rounded-xl h-12">
          <label className="flex cursor-pointer h-full grow items-center justify-center rounded-lg px-2 bg-white dark:bg-background-dark shadow-sm text-primary dark:text-white">
            <span className="text-sm font-bold flex items-center gap-2">
              <span className="material-symbols-outlined !text-lg">videocam</span>
              Video with Audio
            </span>
          </label>
        </div>
      )}

      {/* Quality Grid */}
      <div className="grid grid-cols-1 gap-3">
        {availableFormats.length > 0 ? (
          availableFormats.map((format, index) => {
            const isSelected = selectedFormat === format;
            const isPro = isProQuality(format.quality);
            
            return (
              <button
                key={index}
                onClick={() => setSelectedFormat(format)}
                className={`flex items-center justify-between p-4 rounded-xl border transition-all group relative overflow-hidden ${
                  isSelected
                    ? "border-2 border-primary/40 bg-primary/5 dark:bg-primary/10"
                    : "border border-slate-200 dark:border-[#282839] hover:border-primary/50 bg-transparent"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`material-symbols-outlined ${
                    isSelected ? "text-primary" : "text-slate-400 group-hover:text-primary"
                  }`}>
                    {format.quality === "4k" ? "4k" : format.quality === "1080p" ? "high_quality" : "hd"}
                  </span>
                  <div className="text-left">
                    <p className="font-bold text-sm">{getQualityLabel(format.quality)}</p>
                    <p className="text-xs text-slate-500 dark:text-[#9d9db9]">
                      {getQualityDescription(format.quality, format.fileSize)}
                    </p>
                  </div>
                </div>
                {isPro ? (
                  <div className="flex items-center gap-1 text-xs font-bold text-amber-500">
                    <span className="material-symbols-outlined !text-sm fill-1">crown</span>
                    <span>PRO</span>
                  </div>
                ) : (
                  <span className="text-xs font-bold text-slate-400 bg-slate-100 dark:bg-[#282839] px-2 py-1 rounded">
                    FREE
                  </span>
                )}
                {isSelected && (
                  <div className="absolute right-0 top-0 bottom-0 w-1 bg-primary"></div>
                )}
              </button>
            );
          })
        ) : (
          <div className="text-center py-4 text-slate-500 dark:text-[#9d9db9] text-sm">
            No {formatType} formats available
          </div>
        )}
      </div>

      {/* AI Enhancements */}
      <div className="pt-4 border-t border-slate-100 dark:border-[#282839] flex flex-col gap-4">
        <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 dark:text-[#9d9db9]">
          AI Enhancements
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <button className="flex items-center justify-center gap-2 p-3 rounded-lg bg-slate-100 dark:bg-[#282839] hover:bg-slate-200 dark:hover:bg-[#34344a] transition-colors text-xs font-bold">
            <span className="material-symbols-outlined !text-lg text-primary">auto_awesome</span>
            Summarize
          </button>
          <button className="flex items-center justify-center gap-2 p-3 rounded-lg bg-slate-100 dark:bg-[#282839] hover:bg-slate-200 dark:hover:bg-[#34344a] transition-colors text-xs font-bold">
            <span className="material-symbols-outlined !text-lg text-primary">magic_button</span>
            No Watermark
          </button>
        </div>
      </div>

      {/* Main CTA - triggers download when format is selected */}
      {selectedFormat && selectedFormat.url && (
        <button
          onClick={() => onSelect(selectedFormat.quality, selectedFormat.format, selectedFormat)}
          className="w-full h-14 bg-primary text-white font-bold rounded-xl flex items-center justify-center gap-3 hover:brightness-110 active:scale-[0.98] transition-all shadow-lg shadow-primary/20"
        >
          <span className="material-symbols-outlined">download</span>
          Start Download
        </button>
      )}
    </div>
  );
}
