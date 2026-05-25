"use client";
import { Database, Brain, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type Step = { n: string; icon: LucideIcon; title: string; body: string };

const steps: Step[] = [
  {
    n: "01",
    icon: Database,
    title: "Bring your data",
    body: "We ingest any relational source and reshape it into a Neo4j knowledge graph — accounts, services, content, relationships.",
  },
  {
    n: "02",
    icon: Brain,
    title: "Ask anything",
    body: "Business users type plain English. The agent classifies intent, generates schema-locked Cypher, and self-corrects on failure.",
  },
  {
    n: "03",
    icon: Sparkles,
    title: "Get answers",
    body: "Executive summary, key metrics, insights, and confidence — with evidence queries and a Deep Think mode for causal questions.",
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="relative mx-auto w-full max-w-[1600px] px-6 py-24 md:px-12 md:py-32">
      <div className="mb-14 text-center">
        <p className="text-[11px] font-medium uppercase tracking-[2px] text-[var(--lg-electric-blue)]">
          How it works
        </p>
        <h2
          className="mt-3 font-display font-bold text-black"
          style={{ fontSize: "clamp(32px, 4vw, 48px)", lineHeight: 1.1, letterSpacing: "-1.5px" }}
        >
          Three steps from data to insight.
        </h2>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        {steps.map(({ n, icon: Icon, title, body }) => (
          <div
            key={title}
            className="relative rounded-[20px] border border-black/10 bg-white/50 p-7 backdrop-blur-xl transition-shadow hover:shadow-[0_8px_40px_-12px_rgba(0,132,255,0.25)]"
            style={{ boxShadow: "inset 0px 4px 4px 0px rgba(255,255,255,0.4)" }}
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] text-black/40">{n}</span>
              <Icon className="h-5 w-5 text-[var(--lg-electric-blue)]" />
            </div>
            <h3 className="mt-5 font-display text-[22px] font-bold tracking-tight text-black">
              {title}
            </h3>
            <p className="mt-2 text-[14px] leading-relaxed text-black/65">{body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
