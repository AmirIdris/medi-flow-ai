"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";

export function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);
  const { isSignedIn } = useAuth();
  
  return (
    <div className="md:hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 hover:bg-accent rounded-md"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          {isOpen ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          )}
        </svg>
      </button>
      
      {isOpen && (
        <div className="absolute top-16 left-0 right-0 bg-background border-b shadow-lg p-4 space-y-4">
          <Link 
            href="/" 
            className="block py-2 hover:text-primary"
            onClick={() => setIsOpen(false)}
          >
            Home
          </Link>
          
          {isSignedIn ? (
            <>
              <Link 
                href="/dashboard" 
                className="block py-2 hover:text-primary"
                onClick={() => setIsOpen(false)}
              >
                Dashboard
              </Link>
              <Link 
                href="/ai-lab" 
                className="block py-2 hover:text-primary"
                onClick={() => setIsOpen(false)}
              >
                AI Lab
              </Link>
              <Link 
                href="/history" 
                className="block py-2 hover:text-primary"
                onClick={() => setIsOpen(false)}
              >
                History
              </Link>
            </>
          ) : (
            <>
              <Link 
                href="/sign-in" 
                className="block py-2 hover:text-primary"
                onClick={() => setIsOpen(false)}
              >
                Sign In
              </Link>
              <Link 
                href="/sign-up" 
                className="block py-2 hover:text-primary"
                onClick={() => setIsOpen(false)}
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
      )}
    </div>
  );
}
