"use client";
import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  BarChart, Bar,
  LineChart, Line,
  AreaChart, Area,
  PieChart, Pie, Cell,
  ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";
import { BarChart3, LineChart as LineIcon, AreaChart as AreaIcon, PieChart as PieIcon, ScatterChart as ScatterIcon } from "lucide-react";

type ChartType = "bar" | "line" | "area" | "pie" | "scatter";

const PALETTE = ["#0084FF", "#60B1FF", "#319AFF", "#7C5CFF", "#FF801E", "#10B981", "#EF4444", "#F59E0B"];

function classifyColumns(rows: Record<string, unknown>[]): { numeric: string[]; categorical: string[] } {
  if (!rows.length) return { numeric: [], categorical: [] };
  const cols = Object.keys(rows[0]);
  const numeric: string[] = [];
  const categorical: string[] = [];
  for (const c of cols) {
    const sample = rows.slice(0, 20).map((r) => r[c]).filter((v) => v != null);
    if (!sample.length) continue;
    const isNum = sample.every((v) => typeof v === "number" || (!isNaN(Number(v)) && v !== ""));
    if (isNum) numeric.push(c);
    else categorical.push(c);
  }
  return { numeric, categorical };
}

export function Visualizations({ rows }: { rows: Record<string, unknown>[] }) {
  const { numeric, categorical } = useMemo(() => classifyColumns(rows), [rows]);

  const defaultX = categorical[0] ?? numeric[0] ?? "";
  const defaultY = numeric.find((n) => n !== defaultX) ?? numeric[0] ?? "";

  const [chartType, setChartType] = useState<ChartType>("bar");
  const [xCol, setXCol] = useState<string>(defaultX);
  const [yCol, setYCol] = useState<string>(defaultY);

  const data = useMemo(() => {
    if (!xCol || !yCol) return [];
    return rows.slice(0, 100).map((r) => ({
      [xCol]: r[xCol],
      [yCol]: typeof r[yCol] === "number" ? r[yCol] : Number(r[yCol]),
    }));
  }, [rows, xCol, yCol]);

  if (!rows.length) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-center px-6 py-10">
        <BarChart3 className="h-8 w-8 text-[color:var(--foreground-muted)] mb-3" />
        <p className="text-sm text-[color:var(--foreground-muted)]">No rows to visualize yet.</p>
      </div>
    );
  }

  if (!numeric.length || !xCol || !yCol) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-center px-6 py-10">
        <BarChart3 className="h-8 w-8 text-[color:var(--foreground-muted)] mb-3" />
        <p className="text-sm text-[color:var(--foreground-muted)]">
          No numeric columns detected. Try a question that returns counts, sums, or averages.
        </p>
      </div>
    );
  }

  const allCols = [...categorical, ...numeric];

  const chartIcons: { type: ChartType; Icon: typeof BarChart3; label: string }[] = [
    { type: "bar", Icon: BarChart3, label: "Bar" },
    { type: "line", Icon: LineIcon, label: "Line" },
    { type: "area", Icon: AreaIcon, label: "Area" },
    { type: "pie", Icon: PieIcon, label: "Pie" },
    { type: "scatter", Icon: ScatterIcon, label: "Scatter" },
  ];

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 rounded-full border border-black/10 bg-white/60 p-1 backdrop-blur-xl">
          {chartIcons.map(({ type, Icon, label }) => (
            <button
              key={type}
              onClick={() => setChartType(type)}
              className={
                "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors cursor-pointer " +
                (chartType === type
                  ? "bg-[var(--lg-electric-blue)] text-white"
                  : "text-black/60 hover:text-black")
              }
              title={label}
            >
              <Icon className="h-3 w-3" />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-[11px]">
        <label className="inline-flex items-center gap-1.5">
          <span className="text-black/55">X:</span>
          <select
            value={xCol}
            onChange={(e) => setXCol(e.target.value)}
            className="rounded-md border border-black/10 bg-white/70 px-2 py-1 text-[11px] backdrop-blur"
          >
            {allCols.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label className="inline-flex items-center gap-1.5">
          <span className="text-black/55">Y:</span>
          <select
            value={yCol}
            onChange={(e) => setYCol(e.target.value)}
            className="rounded-md border border-black/10 bg-white/70 px-2 py-1 text-[11px] backdrop-blur"
          >
            {numeric.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <span className="text-[10px] text-black/40">
          {data.length} {data.length === 1 ? "point" : "points"}
        </span>
      </div>

      {/* Chart */}
      <div
        className="rounded-2xl border border-black/10 bg-white/55 p-4 backdrop-blur-xl"
        style={{ boxShadow: "inset 0px 4px 4px 0px rgba(255,255,255,0.4)", height: 420 }}
      >
        <ResponsiveContainer width="100%" height="100%">
          {chartType === "bar" ? (
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.08)" />
              <XAxis dataKey={xCol} tick={{ fontSize: 11, fill: "rgba(0,0,0,0.6)" }} />
              <YAxis tick={{ fontSize: 11, fill: "rgba(0,0,0,0.6)" }} />
              <Tooltip contentStyle={{ background: "rgba(255,255,255,0.95)", border: "1px solid rgba(0,0,0,0.1)", borderRadius: 12 }} />
              <Legend />
              <Bar dataKey={yCol} fill={PALETTE[0]} radius={[8, 8, 0, 0]} />
            </BarChart>
          ) : chartType === "line" ? (
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.08)" />
              <XAxis dataKey={xCol} tick={{ fontSize: 11, fill: "rgba(0,0,0,0.6)" }} />
              <YAxis tick={{ fontSize: 11, fill: "rgba(0,0,0,0.6)" }} />
              <Tooltip contentStyle={{ background: "rgba(255,255,255,0.95)", border: "1px solid rgba(0,0,0,0.1)", borderRadius: 12 }} />
              <Legend />
              <Line type="monotone" dataKey={yCol} stroke={PALETTE[0]} strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          ) : chartType === "area" ? (
            <AreaChart data={data}>
              <defs>
                <linearGradient id="lg-area" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={PALETTE[0]} stopOpacity={0.45} />
                  <stop offset="95%" stopColor={PALETTE[0]} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.08)" />
              <XAxis dataKey={xCol} tick={{ fontSize: 11, fill: "rgba(0,0,0,0.6)" }} />
              <YAxis tick={{ fontSize: 11, fill: "rgba(0,0,0,0.6)" }} />
              <Tooltip contentStyle={{ background: "rgba(255,255,255,0.95)", border: "1px solid rgba(0,0,0,0.1)", borderRadius: 12 }} />
              <Legend />
              <Area type="monotone" dataKey={yCol} stroke={PALETTE[0]} strokeWidth={2.5} fill="url(#lg-area)" />
            </AreaChart>
          ) : chartType === "pie" ? (
            <PieChart>
              <Tooltip contentStyle={{ background: "rgba(255,255,255,0.95)", border: "1px solid rgba(0,0,0,0.1)", borderRadius: 12 }} />
              <Legend />
              <Pie
                data={data.slice(0, 8)}
                dataKey={yCol}
                nameKey={xCol}
                cx="50%"
                cy="50%"
                outerRadius={130}
                label
              >
                {data.slice(0, 8).map((_, i) => (
                  <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                ))}
              </Pie>
            </PieChart>
          ) : (
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.08)" />
              <XAxis dataKey={xCol} tick={{ fontSize: 11, fill: "rgba(0,0,0,0.6)" }} />
              <YAxis dataKey={yCol} tick={{ fontSize: 11, fill: "rgba(0,0,0,0.6)" }} />
              <Tooltip contentStyle={{ background: "rgba(255,255,255,0.95)", border: "1px solid rgba(0,0,0,0.1)", borderRadius: 12 }} />
              <Scatter data={data} fill={PALETTE[0]} />
            </ScatterChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
