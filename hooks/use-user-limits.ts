"use client";

import { useEffect, useState } from "react";
import { getUserLimits } from "@/actions/user-action";
import type { UserLimits } from "@/types";

export function useUserLimits() {
  const [limits, setLimits] = useState<UserLimits | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchLimits = async () => {
      try {
        setLoading(true);
        const result = await getUserLimits();
        
        if (result.success && result.limits) {
          setLimits(result.limits as any);
        } else {
          setError(result.error || "Failed to fetch limits");
        }
      } catch (err) {
        setError("An unexpected error occurred");
      } finally {
        setLoading(false);
      }
    };
    
    fetchLimits();
  }, []);
  
  const refresh = async () => {
    setLoading(true);
    try {
      const result = await getUserLimits();
      
      if (result.success && result.limits) {
        setLimits(result.limits as any);
      }
    } catch (err) {
      console.error("Failed to refresh limits:", err);
    } finally {
      setLoading(false);
    }
  };
  
  return { limits, loading, error, refresh };
}
