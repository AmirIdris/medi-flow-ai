"use client";

import { useState } from "react";

export function useCopyToClipboard() {
  const [copied, setCopied] = useState(false);
  
  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      
      // Reset after 2 seconds
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };
  
  return { copy, copied };
}
