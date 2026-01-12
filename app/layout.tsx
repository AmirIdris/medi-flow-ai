import type { Metadata } from "next";
import { Spline_Sans } from "next/font/google";
import "@/styles/globals.css";

const splineSans = Spline_Sans({ 
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "MediaFlow AI - High-Quality Social Media Downloader",
  description: "AI-powered social media downloader for high-quality video, audio, and images. Support for 100+ platforms with one-click processing.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${splineSans.variable} font-display`}>
        {children}
      </body>
    </html>
  );
}
