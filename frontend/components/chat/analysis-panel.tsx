"use client";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/shared/tabs";
import { DataResults } from "./data-results";
import { ReportView } from "./report-view";
import { Visualizations } from "./visualizations";
import type { QuerySuccess } from "@/lib/types";
import { BarChart3 } from "lucide-react";

export function AnalysisPanel({ data }: { data: QuerySuccess | null }) {
  if (!data) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-center px-6 py-10">
        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-[color:var(--border-strong)] bg-[color:var(--bg-elevated)]">
          <BarChart3 className="h-5 w-5 text-[color:var(--accent)]" />
        </div>
        <p className="text-sm font-medium">Analysis appears here</p>
        <p className="mt-1 max-w-xs text-xs text-[color:var(--foreground-muted)]">
          Ask a question and the executive summary, key metrics, and raw rows
          will populate on this side.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <Tabs defaultValue="report" className="flex h-full flex-col">
        <div className="border-b border-[color:var(--border)] px-4 py-3">
          <TabsList>
            <TabsTrigger value="report">Analysis Report</TabsTrigger>
            <TabsTrigger value="viz">Visualizations</TabsTrigger>
            <TabsTrigger value="data">Data Results</TabsTrigger>
          </TabsList>
        </div>
        <div className="min-h-0 flex-1 overflow-auto px-4 py-4">
          <TabsContent value="report" className="mt-0">
            <ReportView data={data} />
          </TabsContent>
          <TabsContent value="viz" className="mt-0">
            <Visualizations rows={data.results} />
          </TabsContent>
          <TabsContent value="data" className="mt-0">
            <DataResults rows={data.results} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
