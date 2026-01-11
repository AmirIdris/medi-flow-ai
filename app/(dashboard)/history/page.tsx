import { getDownloadHistory } from "@/actions/download-action";
import { getAISummaryHistory } from "@/actions/ai-action";
import { HistoryTable } from "@/components/dashboard/history-table";
import { redirect } from "next/navigation";

export default async function HistoryPage() {
  const downloadsResult = await getDownloadHistory(50);
  const summariesResult = await getAISummaryHistory(50);
  
  if (!downloadsResult.success || !summariesResult.success) {
    redirect("/sign-in");
  }
  
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">History</h1>
        <p className="text-muted-foreground">
          View your download and AI summary history
        </p>
      </div>
      
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold mb-4">Downloads</h2>
          <HistoryTable 
            type="downloads"
            data={downloadsResult.downloads || []} 
          />
        </div>
        
        <div>
          <h2 className="text-2xl font-semibold mb-4">AI Summaries</h2>
          <HistoryTable 
            type="summaries"
            data={summariesResult.summaries || []} 
          />
        </div>
      </div>
    </div>
  );
}
