"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";

export function Navbar() {
  const router = useRouter();
  const { isAuthenticated, user, loading, refetch } = useAuth();

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
      });
      router.push("/");
      router.refresh();
      refetch();
    } catch (error) {
      console.error("Logout error:", error);
    }
  };
  
  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 glass">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-primary p-1.5 rounded-lg flex items-center justify-center">
            <span className="material-symbols-outlined text-white text-xl">layers</span>
          </div>
          <h2 className="text-white text-xl font-bold tracking-tight">MediaFlow AI</h2>
        </div>
        <nav className="hidden md:flex items-center gap-8">
          <a className="text-sm font-medium text-slate-400 hover:text-white transition-colors" href="#">
            Features
          </a>
          <a className="text-sm font-medium text-slate-400 hover:text-white transition-colors" href="#">
            Pricing
          </a>
          <a className="text-sm font-medium text-slate-400 hover:text-white transition-colors" href="#">
            FAQ
          </a>
        </nav>
        <div className="flex items-center gap-3">
          {!loading && (
            <>
              {isAuthenticated ? (
                <>
                  <button 
                    onClick={handleLogout}
                    className="hidden sm:flex text-sm font-semibold px-4 py-2 text-white hover:bg-white/5 rounded-lg transition-colors"
                  >
                    Sign Out
                  </button>
                  <Link
                    href="/dashboard"
                    className="bg-primary hover:bg-primary/90 text-white text-sm font-bold px-5 py-2 rounded-lg transition-all shadow-lg shadow-primary/20"
                  >
                    Dashboard
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/sign-in"
                    className="hidden sm:flex text-sm font-semibold px-4 py-2 text-white hover:bg-white/5 rounded-lg transition-colors"
                  >
                    Login
                  </Link>
                  <Link
                    href="/sign-up"
                    className="bg-primary hover:bg-primary/90 text-white text-sm font-bold px-5 py-2 rounded-lg transition-all shadow-lg shadow-primary/20"
                  >
                    Get Pro
                  </Link>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </header>
  );
}
