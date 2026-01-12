import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-white/5 py-12 px-6">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-slate-500 text-sm">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-lg">layers</span>
          <span className="font-semibold text-slate-300">MediaFlow AI</span>
          <span className="mx-2 opacity-30">|</span>
          <span>© 2024 All rights reserved.</span>
        </div>
        <div className="flex items-center gap-8">
          <a className="hover:text-white transition-colors" href="#">
            Privacy Policy
          </a>
          <a className="hover:text-white transition-colors" href="#">
            Terms of Service
          </a>
          <a className="hover:text-white transition-colors" href="#">
            API Reference
          </a>
        </div>
      </div>
    </footer>
  );
}
