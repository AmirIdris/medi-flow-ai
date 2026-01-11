"use client";

import Link from "next/link";
import { UserButton, useAuth } from "@clerk/nextjs";
import { MobileNav } from "./mobile-nav";

export function Navbar() {
  const { isSignedIn } = useAuth();
  
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
              {isSignedIn && (
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
            {isSignedIn ? (
              <UserButton afterSignOutUrl="/" />
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
            
            <MobileNav />
          </div>
        </div>
      </div>
    </nav>
  );
}
