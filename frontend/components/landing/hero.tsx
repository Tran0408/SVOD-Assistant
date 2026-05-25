"use client";
import Link from "next/link";
import { ArrowRight, Star } from "lucide-react";

export function Hero() {
  return (
    <section className="relative mx-auto w-full max-w-[1600px] px-6 pt-[160px] pb-24 md:px-12">
      {/* Background glow blobs (top-left) */}
      <div
        className="lg-glow-blob"
        style={{
          top: "-80px",
          left: "-120px",
          width: "560px",
          height: "560px",
          background: "var(--lg-glow-blue-a)",
        }}
      />
      <div
        className="lg-glow-blob"
        style={{
          top: "60px",
          left: "180px",
          width: "420px",
          height: "420px",
          background: "var(--lg-glow-blue-b)",
          opacity: 0.4,
        }}
      />

      <div className="relative z-10 grid grid-cols-1 items-center gap-12 md:grid-cols-2">
        {/* Left: copy */}
        <div className="flex flex-col">
          <div className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-black/10 bg-white/60 px-3 py-1.5 backdrop-blur-md">
            <div className="flex items-center gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className="h-3.5 w-3.5"
                  fill="var(--lg-star)"
                  stroke="var(--lg-star)"
                />
              ))}
            </div>
            <span className="text-[12px] font-medium text-black/70">
              Trusted by data teams shipping graph-powered analytics
            </span>
          </div>

          <h1
            className="font-display font-bold text-black"
            style={{
              fontSize: "clamp(40px, 6vw, 75px)",
              lineHeight: 1.05,
              letterSpacing: "-2px",
            }}
          >
            Talk to your data.
            <br />
            Get answers, not queries.
          </h1>

          <p
            className="mt-6 max-w-xl text-black/65"
            style={{
              fontSize: "18px",
              letterSpacing: "-1px",
              lineHeight: 1.5,
            }}
          >
            SVOD turns your relational data into a knowledge graph, then lets your team
            ask plain-English questions and get executive-ready answers — Cypher,
            evidence, confidence, and all.
          </p>

          <div className="mt-9 flex items-center gap-4">
            <Link
              href="/chat"
              className="lg-cta inline-flex items-center gap-3 px-6 py-3 text-[15px] font-medium"
            >
              Launch the assistant
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white text-[var(--lg-electric-blue)]">
                <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </Link>
            <a
              href="#how"
              className="text-[14px] font-medium text-black/70 underline-offset-4 hover:underline"
            >
              How it works
            </a>
          </div>

          <p className="mt-8 text-[11px] uppercase tracking-[2px] text-black/40">
            1,000 accounts · 273K relationships · ~4 LLM calls per query
          </p>
        </div>

        {/* Right: orb */}
        <div className="relative flex items-center justify-center overflow-visible">
          <video
            src="https://future.co/images/homepage/glassy-orb/orb-purple.webm"
            autoPlay
            loop
            muted
            playsInline
            className="lg-orb-filter w-full max-w-[640px] scale-125"
          />
        </div>
      </div>
    </section>
  );
}
