"use client";
import { useChat } from "@/hooks/use-chat";
import { MessageList } from "./messages";
import { Composer } from "./composer";
import { ExampleChips } from "./example-chips";
import { AnalysisPanel } from "./analysis-panel";
import { HealthPill } from "./health-pill";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/shared/button";
import { ChevronLeft, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/shared/tabs";

export function ChatShell() {
  const { messages, sending, send, reset, lastAnswer, deepMode, setDeepMode } = useChat();
  const [mobileTab, setMobileTab] = useState<"chat" | "analysis">("chat");

  const empty = messages.length === 0;

  return (
    <div className="chat-light relative flex h-[100dvh] flex-col overflow-hidden">
      {/* Soft background blobs for liquid glass feel */}
      <div
        className="lg-glow-blob"
        style={{ top: "-120px", left: "-100px", width: "520px", height: "520px", background: "var(--lg-glow-blue-a)", opacity: 0.35 }}
      />
      <div
        className="lg-glow-blob"
        style={{ bottom: "-160px", right: "-120px", width: "560px", height: "560px", background: "var(--lg-glow-blue-b)", opacity: 0.3 }}
      />
      <header className="relative z-10 flex h-14 items-center justify-between border-b border-[color:var(--border)] bg-white/60 px-4 backdrop-blur-xl md:px-6">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon">
            <Link href="/" aria-label="Back to landing">
              <ChevronLeft className="h-4 w-4" />
            </Link>
          </Button>
          <Logo />
          <span className="hidden md:inline text-xs text-[color:var(--foreground-subtle)]">
            / Demo · SVOD
          </span>
        </div>
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <Button variant="ghost" size="sm" onClick={reset}>
              <Trash2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Clear</span>
            </Button>
          )}
          <HealthPill />
        </div>
      </header>

      {/* Mobile tabs */}
      <div className="border-b border-[color:var(--border)] px-4 py-2 md:hidden">
        <Tabs
          value={mobileTab}
          onValueChange={(v) => setMobileTab(v as "chat" | "analysis")}
        >
          <TabsList>
            <TabsTrigger value="chat">Chat</TabsTrigger>
            <TabsTrigger value="analysis">Analysis</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="relative z-10 flex min-h-0 flex-1">
        {/* Chat thread */}
        <div
          className={
            "flex min-h-0 flex-1 flex-col border-r border-[color:var(--border)] md:max-w-[58%] " +
            (mobileTab === "chat" ? "" : "hidden md:flex")
          }
        >
          <div className="min-h-0 flex-1 overflow-auto px-4 py-6 md:px-8">
            {empty ? (
              <div className="mx-auto max-w-xl space-y-6 pt-10">
                <div className="text-center space-y-2">
                  <h1 className="font-display text-3xl font-bold tracking-tight text-black">
                    Ask the graph anything
                  </h1>
                  <p className="text-sm text-[color:var(--foreground-muted)]">
                    Natural language → Cypher → executive-ready answer.
                    Confidence-rated.
                  </p>
                </div>
                <ExampleChips onPick={send} disabled={sending} />
              </div>
            ) : (
              <MessageList
                messages={messages}
                onClarify={send}
                onFollowup={send}
                onRetryDeep={(q) => send(q, undefined, "deep")}
              />
            )}
          </div>
          <div className="border-t border-[color:var(--border)] bg-white/60 px-4 py-3 backdrop-blur-xl md:px-8">
            <Composer
              onSend={send}
              sending={sending}
              deepMode={deepMode}
              onToggleDeep={setDeepMode}
            />
          </div>
        </div>

        {/* Analysis */}
        <aside
          className={
            "min-h-0 flex-1 md:max-w-[42%] " +
            (mobileTab === "analysis" ? "" : "hidden md:block")
          }
        >
          <AnalysisPanel data={lastAnswer} />
        </aside>
      </div>
    </div>
  );
}
