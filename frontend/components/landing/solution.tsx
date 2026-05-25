"use client";
import { Users, CreditCard, PlayCircle, Film, Tag, CalendarDays } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type Node = { icon: LucideIcon; label: string; count: string; sub: string };

const nodes: Node[] = [
  { icon: Users, label: "Account", count: "1,000", sub: "sampled customer accounts" },
  { icon: CreditCard, label: "Service", count: "27K", sub: "subscription instances across 4 plans" },
  { icon: Film, label: "Content", count: "23K", sub: "episodes & features (FEATURE / EPISODE)" },
  { icon: Tag, label: "Genre", count: "35", sub: "Drama, Comedy, Thriller, Horror, etc." },
  { icon: CalendarDays, label: "Month", count: "120+", sub: "monthly buckets for acquisitions, churn, views" },
  { icon: PlayCircle, label: "Relationships", count: "287K", sub: "SUBSCRIBED_TO, VIEWED, CHURNED_IN, HAS_GENRE…" },
];

const examples = [
  "Top 5 most watched content by total hours",
  "Average billing per plan",
  "How many accounts churned in 2024 by product tier?",
  "Show users that churned at least twice",
  "Which genres do high-value accounts watch most?",
  "Why is Annual plan billed higher than Basic?",
];

export function Solution() {
  return (
    <section id="dataset" className="relative mx-auto w-full max-w-[1600px] px-6 py-24 md:px-12 md:py-32">
      <div className="mb-14 text-center">
        <p className="text-[11px] font-medium uppercase tracking-[2px] text-[var(--lg-electric-blue)]">
          The demo dataset
        </p>
        <h2
          className="mt-3 font-display font-bold text-black"
          style={{ fontSize: "clamp(32px, 4vw, 48px)", lineHeight: 1.1, letterSpacing: "-1.5px" }}
        >
          SVOD streaming customer data.
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-[15px] text-black/65" style={{ letterSpacing: "-0.3px" }}>
          A sampled subscription-video-on-demand dataset modelled as a Neo4j knowledge graph.
          Three CSVs (accounts, services, viewership) become a six-label graph the assistant can traverse in one query.
        </p>
      </div>

      {/* Schema cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {nodes.map(({ icon: Icon, label, count, sub }) => (
          <div
            key={label}
            className="rounded-[20px] border border-black/10 bg-white/55 p-6 backdrop-blur-xl"
            style={{ boxShadow: "inset 0px 4px 4px 0px rgba(255,255,255,0.4)" }}
          >
            <div className="mb-4 inline-flex h-9 w-9 items-center justify-center rounded-[10px] border border-black/10 bg-white/70">
              <Icon className="h-4.5 w-4.5 text-[var(--lg-electric-blue)]" />
            </div>
            <div className="flex items-baseline gap-2">
              <span
                className="font-display font-bold text-black"
                style={{ fontSize: 32, letterSpacing: "-1px" }}
              >
                {count}
              </span>
              <span className="text-[13px] font-semibold text-black/70">{label}</span>
            </div>
            <p className="mt-1 text-[13px] text-black/55">{sub}</p>
          </div>
        ))}
      </div>

      {/* Example questions */}
      <div className="mt-10">
        <p className="mb-4 text-[12px] font-medium uppercase tracking-[1.5px] text-black/50">
          What you can ask
        </p>
        <div className="flex flex-wrap gap-2">
          {examples.map((q) => (
            <span
              key={q}
              className="rounded-full border border-black/10 bg-white/60 px-4 py-2 text-[13px] text-black/75 backdrop-blur-xl"
              style={{ boxShadow: "inset 0px 2px 2px 0px rgba(255,255,255,0.4)" }}
            >
              {q}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
