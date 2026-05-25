"use client";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function FinalCTA() {
  return (
    <section className="relative mx-auto w-full max-w-[1600px] px-6 pb-24 md:px-12 md:pb-32">
      <div
        className="relative overflow-hidden rounded-[28px] border border-black/10 bg-white/55 p-12 text-center backdrop-blur-xl md:p-20"
        style={{ boxShadow: "inset 0px 4px 4px 0px rgba(255,255,255,0.4)" }}
      >
        <div
          className="lg-glow-blob"
          style={{
            top: "-60px",
            left: "50%",
            transform: "translateX(-50%)",
            width: "640px",
            height: "300px",
            background: "var(--lg-glow-blue-a)",
            opacity: 0.35,
          }}
        />
        <h2
          className="relative font-display font-bold text-black"
          style={{ fontSize: "clamp(32px, 4vw, 52px)", lineHeight: 1.05, letterSpacing: "-1.5px" }}
        >
          See it answer your questions
          <br /> in real time.
        </h2>
        <p className="relative mx-auto mt-5 max-w-xl text-[16px] text-black/65" style={{ letterSpacing: "-0.5px" }}>
          Open the assistant and ask anything about the knowledge graph. Cypher, evidence,
          and confidence visible on every answer.
        </p>
        <div className="relative mt-9 flex justify-center">
          <Link
            href="/chat"
            className="lg-cta inline-flex items-center gap-3 px-7 py-3.5 text-[15px] font-medium"
          >
            Open the assistant
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white text-[var(--lg-electric-blue)]">
              <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}
