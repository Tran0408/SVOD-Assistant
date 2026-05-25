const stack = [
  { name: "Next.js", role: "App Router · React 19" },
  { name: "Tailwind CSS", role: "Styling" },
  { name: "Flask", role: "Python API" },
  { name: "LangGraph", role: "Agent workflow" },
  { name: "Groq", role: "gpt-oss-120b" },
  { name: "Neo4j AuraDB", role: "Knowledge graph" },
];

export function Stack() {
  return (
    <section id="stack" className="relative mx-auto w-full max-w-[1600px] px-6 py-24 md:px-12 md:py-32">
      <div className="mb-12 text-center">
        <p className="text-[11px] font-medium uppercase tracking-[2px] text-[var(--lg-electric-blue)]">
          Built on
        </p>
        <h2
          className="mt-3 font-display font-bold text-black"
          style={{ fontSize: "clamp(32px, 4vw, 48px)", lineHeight: 1.1, letterSpacing: "-1.5px" }}
        >
          A modern, deployable stack.
        </h2>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        {stack.map((s) => (
          <div
            key={s.name}
            className="group flex items-center gap-3 rounded-full border border-black/10 bg-white/50 px-5 py-2.5 backdrop-blur-xl transition-all hover:border-[var(--lg-electric-blue)]/40 hover:shadow-[0_4px_24px_-6px_rgba(0,132,255,0.25)]"
            style={{ boxShadow: "inset 0px 2px 2px 0px rgba(255,255,255,0.4)" }}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--lg-electric-blue)]" />
            <span className="text-[14px] font-semibold text-black">{s.name}</span>
            <span className="text-[12px] text-black/55">{s.role}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
