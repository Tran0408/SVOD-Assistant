"use client";
import { formatNumber } from "@/lib/format";
import { Download } from "lucide-react";

function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const cols = Object.keys(rows[0]);
  const head = cols.join(",");
  const body = rows
    .map((r) =>
      cols
        .map((c) => {
          const v = r[c];
          const s = v == null ? "" : String(v);
          return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(","),
    )
    .join("\n");
  return `${head}\n${body}`;
}

export function DataResults({
  rows,
}: {
  rows: Record<string, unknown>[];
}) {
  if (!rows.length) {
    return (
      <div className="text-sm text-[color:var(--foreground-muted)]">
        No rows returned.
      </div>
    );
  }
  const cols = Object.keys(rows[0]);

  const download = () => {
    const csv = toCsv(rows);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "results.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-[color:var(--foreground-muted)]">
          Showing {rows.length} row{rows.length === 1 ? "" : "s"}
        </p>
        <button
          onClick={download}
          className="inline-flex items-center gap-1 rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] px-2 py-1 text-[11px] hover:bg-[color:var(--surface-hover)] cursor-pointer"
        >
          <Download className="h-3 w-3" /> CSV
        </button>
      </div>
      <div className="overflow-auto rounded-xl border border-[color:var(--border)] bg-[color:var(--bg-elevated)]">
        <table className="min-w-full text-xs">
          <thead className="bg-[color:var(--bg-deep)] sticky top-0">
            <tr>
              {cols.map((c) => (
                <th
                  key={c}
                  className="px-3 py-2 text-left font-medium text-[color:var(--foreground-muted)] uppercase tracking-wide text-[10px] border-b border-[color:var(--border)]"
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 500).map((row, i) => (
              <tr
                key={i}
                className="border-b border-[color:var(--border)] last:border-0 hover:bg-black/[0.025]"
              >
                {cols.map((c) => {
                  const v = row[c];
                  const isNum = typeof v === "number";
                  return (
                    <td
                      key={c}
                      className={
                        "px-3 py-2 align-top " +
                        (isNum ? "tabular-nums text-right" : "")
                      }
                    >
                      {formatNumber(v)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > 500 && (
        <p className="text-[11px] text-[color:var(--foreground-subtle)]">
          Showing first 500 of {rows.length}. Download CSV for full set.
        </p>
      )}
    </div>
  );
}
