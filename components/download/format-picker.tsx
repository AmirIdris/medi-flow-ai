"use client";

import { useState } from "react";
import type { VideoFormat, VideoQuality } from "@/types";

interface FormatPickerProps {
  formats: Array<{ quality: VideoQuality; format: VideoFormat; fileSize: number }>;
  onSelect: (quality: VideoQuality, format: VideoFormat) => void;
}

export function FormatPicker({ formats, onSelect }: FormatPickerProps) {
  const [selectedFormat, setSelectedFormat] = useState(formats[0]);
  
  const handleSelect = () => {
    onSelect(selectedFormat.quality, selectedFormat.format);
  };
  
  return (
    <div className="space-y-4">
      <h3 className="font-semibold">Choose Format & Quality</h3>
      
      <div className="space-y-2">
        {formats.map((format, index) => (
          <label
            key={index}
            className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-accent ${
              selectedFormat === format ? "border-primary bg-accent" : ""
            }`}
          >
            <input
              type="radio"
              name="format"
              checked={selectedFormat === format}
              onChange={() => setSelectedFormat(format)}
              className="mr-3"
            />
            <div className="flex-1">
              <div className="font-medium">
                {format.quality} - {format.format.toUpperCase()}
              </div>
              <div className="text-sm text-muted-foreground">
                {(format.fileSize / 1024 / 1024).toFixed(2)} MB
              </div>
            </div>
          </label>
        ))}
      </div>
      
      <button
        onClick={handleSelect}
        className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90"
      >
        Download Selected Format
      </button>
    </div>
  );
}
