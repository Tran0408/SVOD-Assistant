"use client";
import { ShieldCheck, Layers, Gauge, Brain, BarChart3, Wand2, Activity, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type Feature = { icon: LucideIcon; title: string; body: string };

const features: Feature[] = [
  {
    icon: ShieldCheck,
    title: "Schema-locked Cypher",
    body: "Every generated query is read-only and safety-filtered. Internal Neo4j IDs and unsafe operations are rejected before they reach the database.",
  },
  {
    icon: Wand2,
    title: "Self-correcting agent",
    body: "Failed queries are repaired automatically — the LLM sees the exact Neo4j error and produces a fixed Cypher in one shot.",
  },
  {
    icon: Layers,
    title: "Evidence-backed reasoning",
    body: "For 'why' questions the agent plans 2-3 supporting queries, validates each, and synthesises an answer grounded in real rows.",
  },
  {
    icon: Brain,
    title: "Deep Think mode",
    body: "Toggle iterative analysis — up to four cycles of plan → run → reflect. Each cycle adds a new angle until the answer holds.",
  },
  {
    icon: Gauge,
    title: "LLM-as-judge confidence",
    body: "Every answer is scored across relevance, completeness, grounding, and sufficiency. Low-confidence results can escalate to Deep Think with one click.",
  },
  {
    icon: BarChart3,
    title: "Interactive visualizations",
    body: "Bar, line, area, pie, and scatter charts on every result set. Pick your axes and chart type — built on Recharts.",
  },
  {
    icon: Activity,
    title: "Live progress streaming",
    body: "Server-Sent Events push agent state to the UI — see 'Planning…', 'Cycle 2/4 — reflecting…', and per-query progress as it happens.",
  },
  {
    icon: Sparkles,
    title: "Multi-turn memory",
    body: "Follow-up questions resolve referents like 'those users' and 'each plan' using prior turns. Suggested next questions follow every answer.",
  },
];

export function Problem() {
  return (
    <section id="features" className="relative mx-auto w-full max-w-[1600px] px-6 py-24 md:px-12 md:py-32">
      <div className="mb-14 text-center">
        <p className="text-[11px] font-medium uppercase tracking-[2px] text-[var(--lg-electric-blue)]">
          Features
        </p>
        <h2
          className="mt-3 font-display font-bold text-black"
          style={{ fontSize: "clamp(32px, 4vw, 48px)", lineHeight: 1.1, letterSpacing: "-1.5px" }}
        >
          An agent that shows its work.
        </h2>
      </div>

      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        {features.map(({ icon: Icon, title, body }) => (
          <div
            key={title}
            className="rounded-[20px] border border-black/10 bg-white/55 p-7 backdrop-blur-xl"
            style={{ boxShadow: "inset 0px 4px 4px 0px rgba(255,255,255,0.4)" }}
          >
            <div className="mb-5 inline-flex h-10 w-10 items-center justify-center rounded-[12px] border border-black/10 bg-white/70">
              <Icon className="h-5 w-5 text-[var(--lg-electric-blue)]" />
            </div>
            <h3 className="font-display text-[22px] font-bold tracking-tight text-black">
              {title}
            </h3>
            <p className="mt-2 text-[14px] leading-relaxed text-black/65">{body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
