import { getDownloadStatus } from "@/actions/download-action";
import { ResultCard } from "@/components/download/result-card";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/shared/navbar";

export default async function DownloadPage({
  params,
}: {
  params: { id: string };
}) {
  // Check if it's a temporary ID (starts with "temp-")
  const isTempId = params.id.startsWith("temp-");
  
  if (isTempId) {
    // For temporary IDs, the data is in sessionStorage (handled client-side)
    // Return a client component that will read from sessionStorage
    return (
      <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-white min-h-screen flex flex-col">
        <Navbar />
        <ResultCard downloadId={params.id} />
        <footer className="mt-12 py-8 border-t border-slate-200 dark:border-[#282839] text-center">
          <p className="text-slate-400 dark:text-[#9d9db9] text-xs">
            © 2024 MediaFlow AI. Powered by Advanced Neural Networks.
          </p>
        </footer>
      </div>
    );
  }
  
  // For real download IDs, fetch from database
  const result = await getDownloadStatus(params.id);
  
  if (!result.success) {
    redirect("/");
  }
  
  return (
    <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-white min-h-screen flex flex-col">
      <Navbar />
      <ResultCard download={result.download!} />
      <footer className="mt-12 py-8 border-t border-slate-200 dark:border-[#282839] text-center">
        <p className="text-slate-400 dark:text-[#9d9db9] text-xs">
          © 2024 MediaFlow AI. Powered by Advanced Neural Networks.
        </p>
      </footer>
    </div>
  );
}
