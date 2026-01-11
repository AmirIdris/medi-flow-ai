import { getDownloadStatus } from "@/actions/download-action";
import { ResultCard } from "@/components/download/result-card";
import { Navbar } from "@/components/shared/navbar";
import { Footer } from "@/components/shared/footer";
import { redirect } from "next/navigation";

export default async function DownloadPage({
  params,
}: {
  params: { id: string };
}) {
  const result = await getDownloadStatus(params.id);
  
  if (!result.success) {
    redirect("/");
  }
  
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <ResultCard download={result.download!} />
        </div>
      </main>
      <Footer />
    </div>
  );
}
