import { Hero } from "@/components/home/hero";
import { Features } from "@/components/home/features";
import { Navbar } from "@/components/shared/navbar";
import { Footer } from "@/components/shared/footer";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="relative flex-1">
        <Hero />
        <Features />
      </main>
      <Footer />
    </div>
  );
}
