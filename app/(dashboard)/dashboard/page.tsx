import { getUserProfile, getUserLimits, getUserStats } from "@/actions/user-action";
import { StatsCard } from "@/components/dashboard/stats-card";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const profileResult = await getUserProfile();
  const limitsResult = await getUserLimits();
  const statsResult = await getUserStats();
  
  if (!profileResult.success || !limitsResult.success || !statsResult.success) {
    redirect("/sign-in");
  }
  
  const { user } = profileResult;
  const { limits } = limitsResult;
  const { stats } = statsResult;
  
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {user?.name || "User"}!
        </p>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Downloads This Month"
          value={limits?.downloadCount || 0}
          limit={limits?.downloadLimit || 0}
          description={`${limits?.downloadsRemaining === -1 ? "Unlimited" : `${limits?.downloadsRemaining} remaining`}`}
        />
        <StatsCard
          title="AI Summaries This Month"
          value={limits?.aiSummaryCount || 0}
          limit={limits?.aiSummaryLimit || 0}
          description={`${limits?.summariesRemaining === -1 ? "Unlimited" : `${limits?.summariesRemaining} remaining`}`}
        />
        <StatsCard
          title="Total Downloads"
          value={stats?.totalDownloads || 0}
          description="All time"
        />
        <StatsCard
          title="Total Summaries"
          value={stats?.totalSummaries || 0}
          description="All time"
        />
      </div>
      
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border p-6">
          <h2 className="text-xl font-semibold mb-4">Current Plan</h2>
          <p className="text-3xl font-bold text-primary">{user?.plan}</p>
          <p className="text-sm text-muted-foreground mt-2">
            Resets on {new Date(limits?.resetDate || new Date()).toLocaleDateString()}
          </p>
        </div>
        
        <div className="rounded-lg border p-6">
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="space-y-2">
            <a href="/" className="block text-primary hover:underline">
              Download Video
            </a>
            <a href="/ai-lab" className="block text-primary hover:underline">
              AI Summarizer
            </a>
            <a href="/history" className="block text-primary hover:underline">
              View History
            </a>
            <a href="/settings" className="block text-primary hover:underline">
              Account Settings
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
