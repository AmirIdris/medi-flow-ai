"use client";

import { formatRelativeTime } from "@/lib/utils";
import { deleteDownload } from "@/actions/download-action";
import { deleteAISummary } from "@/actions/ai-action";
import { useState } from "react";

interface HistoryTableProps {
  type: "downloads" | "summaries";
  data: any[];
}

export function HistoryTable({ type, data }: HistoryTableProps) {
  const [items, setItems] = useState(data);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  const handleDelete = async (id: string) => {
    setDeletingId(id);
    
    const result = type === "downloads" 
      ? await deleteDownload(id)
      : await deleteAISummary(id);
    
    if (result.success) {
      setItems(items.filter(item => item.id !== id));
    }
    
    setDeletingId(null);
  };
  
  if (items.length === 0) {
    return (
      <div className="text-center py-12 border rounded-lg">
        <p className="text-muted-foreground">
          No {type} yet. Start by {type === "downloads" ? "downloading a video" : "generating an AI summary"}!
        </p>
      </div>
    );
  }
  
  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted">
            <tr>
              <th className="text-left p-4 font-medium">
                {type === "downloads" ? "Video" : "Title"}
              </th>
              <th className="text-left p-4 font-medium">Status</th>
              <th className="text-left p-4 font-medium">Date</th>
              <th className="text-right p-4 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-accent/50">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    {type === "downloads" && item.thumbnail && (
                      <img
                        src={item.thumbnail}
                        alt=""
                        className="w-16 h-9 object-cover rounded"
                      />
                    )}
                    <div>
                      <p className="font-medium line-clamp-1">
                        {item.title || item.videoTitle || "Untitled"}
                      </p>
                      {type === "downloads" && (
                        <p className="text-sm text-muted-foreground capitalize">
                          {item.platform} • {item.quality}
                        </p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="p-4">
                  <span
                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      item.status === "completed"
                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                        : item.status === "failed"
                        ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                        : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                    }`}
                  >
                    {item.status}
                  </span>
                </td>
                <td className="p-4 text-sm text-muted-foreground">
                  {formatRelativeTime(item.createdAt)}
                </td>
                <td className="p-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {type === "downloads" && item.fileUrl && (
                      <a
                        href={item.fileUrl}
                        download
                        className="text-sm text-primary hover:underline"
                      >
                        Download
                      </a>
                    )}
                    {type === "summaries" && item.status === "completed" && (
                      <a
                        href={`/ai-lab?id=${item.id}`}
                        className="text-sm text-primary hover:underline"
                      >
                        View
                      </a>
                    )}
                    <button
                      onClick={() => handleDelete(item.id)}
                      disabled={deletingId === item.id}
                      className="text-sm text-destructive hover:underline disabled:opacity-50"
                    >
                      {deletingId === item.id ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
