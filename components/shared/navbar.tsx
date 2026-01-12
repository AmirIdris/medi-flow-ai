"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { MobileNav } from "./mobile-nav";

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
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="text-xl font-bold">
              MediaFlow AI
            </Link>
            
            <div className="hidden md:flex items-center gap-6">
              <Link 
                href="/" 
                className="text-sm font-medium hover:text-primary transition-colors"
              >
                Home
              </Link>
              {isAuthenticated && (
                <>
                  <Link 
                    href="/dashboard" 
                    className="text-sm font-medium hover:text-primary transition-colors"
                  >
                    Dashboard
                  </Link>
                  <Link 
                    href="/ai-lab" 
                    className="text-sm font-medium hover:text-primary transition-colors"
                  >
                    AI Lab
                  </Link>
                  <Link 
                    href="/history" 
                    className="text-sm font-medium hover:text-primary transition-colors"
                  >
                    History
                  </Link>
                </>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {!loading && (
              <>
                {isAuthenticated ? (
                  <div className="hidden md:flex items-center gap-4">
                    <Link 
                      href="/settings"
                      className="text-sm font-medium hover:text-primary transition-colors"
                    >
                      {user?.name || user?.email}
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="text-sm font-medium hover:text-primary transition-colors"
                    >
                      Sign Out
                    </button>
                  </div>
                ) : (
                  <div className="hidden md:flex items-center gap-4">
                    <Link 
                      href="/sign-in"
                      className="text-sm font-medium hover:text-primary transition-colors"
                    >
                      Sign In
                    </Link>
                    <Link 
                      href="/sign-up"
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
                    >
                      Sign Up
                    </Link>
                  </div>
                )}
              </>
            )}
            
            <MobileNav />
          </div>
        </div>
      </div>
    </nav>
  );
}
