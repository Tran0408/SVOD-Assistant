"use client";
import { GlassCard } from "@/components/shared/glass-card";
import { formatNumber, metricKeyToLabel } from "@/lib/format";
import { Lightbulb, Target } from "lucide-react";
import type { QuerySuccess } from "@/lib/types";

export function ReportView({ data }: { data: QuerySuccess }) {
  const r = data.report;
  const metrics = Object.entries(r.key_metrics ?? {});
  const mainTable = r.tables?.[0];

  return (
    <div className="space-y-5">
      {r.executive_summary && (
        <GlassCard className="p-5">
          <div className="text-[10px] uppercase tracking-wider text-[color:var(--accent)]">
            Executive summary
          </div>
          <p className="mt-2 text-sm leading-relaxed">{r.executive_summary}</p>
        </GlassCard>
      )}

      {metrics.length > 0 && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {metrics.map(([k, v]) => (
            <div
              key={k}
              className="rounded-xl border border-[color:var(--border)] bg-[color:var(--bg-elevated)] p-3"
            >
              <div className="text-[10px] uppercase tracking-wider text-[color:var(--foreground-muted)]">
                {metricKeyToLabel(k)}
              </div>
              <div className="mt-1 text-xl font-semibold tabular-nums">
                {formatNumber(v)}
              </div>
            </div>
          ))}
        </div>
      )}

      {mainTable && mainTable.rows?.length > 0 && (
        <GlassCard className="p-0 overflow-hidden">
          <div className="border-b border-[color:var(--border)] px-4 py-2.5">
            <div className="text-xs font-medium">{mainTable.title}</div>
          </div>
          <div className="overflow-auto">
            <table className="min-w-full text-xs">
              <thead className="bg-[color:var(--bg-deep)]">
                <tr>
                  {mainTable.columns.map((c) => (
                    <th
                      key={c}
                      className="px-3 py-2 text-left font-medium text-[color:var(--foreground-muted)] uppercase tracking-wide text-[10px]"
                    >
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {mainTable.rows.slice(0, 10).map((row, i) => (
                  <tr
                    key={i}
                    className="border-t border-[color:var(--border)]"
                  >
                    {row.map((cell, j) => {
                      const isNum = typeof cell === "number";
                      return (
                        <td
                          key={j}
                          className={
                            "px-3 py-2 " +
                            (isNum ? "tabular-nums text-right" : "")
                          }
                        >
                          {formatNumber(cell)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}

      {r.insights?.length > 0 && (
        <GlassCard className="p-5">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-[color:var(--accent)]" />
            <span className="text-[10px] uppercase tracking-wider text-[color:var(--accent)]">
              Insights
            </span>
          </div>
          <ul className="mt-3 space-y-2 text-sm">
            {r.insights.map((s, i) => (
              <li
                key={i}
                className="flex gap-2 text-[color:var(--foreground)]"
              >
                <span className="mt-1.5 inline-block h-1 w-1 shrink-0 rounded-full bg-[color:var(--accent)]" />
                <span className="leading-relaxed">{s}</span>
              </li>
            ))}
          </ul>
        </GlassCard>
      )}

      {r.recommendations?.length > 0 && (
        <GlassCard className="p-5">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-emerald-300" />
            <span className="text-[10px] uppercase tracking-wider text-emerald-300">
              Recommendations
            </span>
          </div>
          <ul className="mt-3 space-y-2 text-sm">
            {r.recommendations.map((s, i) => (
              <li key={i} className="flex gap-2">
                <span className="mt-1.5 inline-block h-1 w-1 shrink-0 rounded-full bg-emerald-300" />
                <span className="leading-relaxed">{s}</span>
              </li>
            ))}
          </ul>
        </GlassCard>
      )}
    </div>
  );
}
