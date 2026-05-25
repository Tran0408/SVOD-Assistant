"use client";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

export function LandingNav() {
  return (
    <nav className="fixed left-1/2 top-[30px] z-50 w-fit -translate-x-1/2">
      <div className="lg-navbar flex items-center gap-6 px-5 py-2.5">
        <Link href="/" className="font-display text-[18px] font-bold tracking-tight text-black">
          SVOD
        </Link>
        <ul className="hidden items-center gap-5 text-[13px] font-medium text-black/70 md:flex">
          <li><a href="#features" className="hover:text-black transition-colors">Features</a></li>
          <li><a href="#how" className="hover:text-black transition-colors">How it works</a></li>
          <li><a href="#dataset" className="hover:text-black transition-colors">Dataset</a></li>
          <li><a href="#stack" className="hover:text-black transition-colors">Stack</a></li>
        </ul>
        <Link
          href="/chat"
          className="inline-flex items-center gap-1.5 rounded-[12px] border border-black/10 bg-white/40 px-3 py-1.5 text-[13px] font-medium text-black backdrop-blur-md hover:bg-white/60 transition-colors"
        >
          Launch
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </nav>
  );
}
