"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { runLoop, LoopApiError } from "@/app/lib/loopEngine";
import {
  completeSession,
  createSession,
  dbRoundToIteration,
  DbError,
  getSessionRounds,
  getSessions,
  saveRound,
  stopSession,
  testConnection,
  type DbSession,
} from "@/app/lib/db";
import type { Iteration, LoopStatus, ViewMode } from "@/app/lib/types";
import { TARGET_SCORE } from "@/app/lib/types";
import Sidebar, { SidebarToggle } from "./Sidebar";
import ChatArea from "./ChatArea";
import InputBox from "./InputBox";
import StatusBar from "./StatusBar";

function getFinalOutputRound(iterations: Iteration[]): number | null {
  const lastOutputRound = [...iterations]
    .reverse()
    .find((i) => i.task === "generate" || i.task === "refine");
  return lastOutputRound?.round ?? iterations.at(-1)?.round ?? null;
}

export default function LoopApp() {
  const [iterations, setIterations] = useState<Iteration[]>([]);
  const [status, setStatus] = useState<LoopStatus>("idle");
  const [score, setScore] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dbWarning, setDbWarning] = useState<string | null>(null);
  const [targetDescription, setTargetDescription] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeRound, setActiveRound] = useState<number | null>(null);
  const [finalRound, setFinalRound] = useState<number | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("live");
  const [sessions, setSessions] = useState<DbSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const abortRef = useRef<AbortController | null>(null);

  const isLoading = viewMode === "live" && ["generating", "critiquing", "refining"].includes(status);

  const refreshSessions = useCallback(async () => {
    try {
      const data = await getSessions();
      setSessions(data);
    } catch (err) {
      console.error("Failed to load sessions:", err);
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSessions();
  }, [refreshSessions]);

  const handleStop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const handleSelectRound = useCallback((round: number) => {
    setActiveRound(round);
    document
      .getElementById(`round-${round}`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const handleNewSession = useCallback(() => {
    abortRef.current?.abort();
    setViewMode("live");
    setCurrentSessionId(null);
    setIterations([]);
    setScore(0);
    setStatus("idle");
    setTargetDescription("");
    setFinalRound(null);
    setActiveRound(null);
    setError(null);
    setDbWarning(null);
  }, []);

  const handleSelectSession = useCallback(async (session: DbSession) => {
    abortRef.current?.abort();
    setViewMode("history");
    setCurrentSessionId(session.id);
    setTargetDescription(session.target);
    setStatus("idle");
    setError(null);
    setDbWarning(null);

    try {
      const rounds = await getSessionRounds(session.id);
      const loadedIterations = rounds.map(dbRoundToIteration);
      setIterations(loadedIterations);

      const lastScore = loadedIterations.at(-1)?.score ?? 0;
      setScore(lastScore);

      if (session.status === "completed" && lastScore >= TARGET_SCORE) {
        setFinalRound(getFinalOutputRound(loadedIterations));
      } else if (session.final_output) {
        setFinalRound(getFinalOutputRound(loadedIterations));
      } else {
        setFinalRound(null);
      }

      setActiveRound(loadedIterations.at(-1)?.round ?? null);
    } catch (err) {
      setError(err instanceof DbError ? err.message : "Failed to load session");
    }
  }, []);

  const handleSubmit = useCallback(async (target: string) => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setViewMode("live");
    setIterations([]);
    setScore(0);
    setError(null);
    setDbWarning(null);
    setTargetDescription(target);
    setFinalRound(null);
    setActiveRound(null);
    setCurrentSessionId(null);
    setStatus("generating");

    let sessionId: string | null = null;

    try {
      await testConnection();
      const session = await createSession(target);
      sessionId = session.id;
      setCurrentSessionId(session.id);
      await refreshSessions();

      const result = await runLoop(
        target,
        {
          onStatus: setStatus,
          onIteration: (iteration) => {
            setIterations((prev) => [...prev, iteration]);
            setActiveRound(iteration.round);

            if (sessionId) {
              saveRound(sessionId, iteration).catch((err) => {
                console.error("Failed to save round:", err);
                setDbWarning("Some rounds may not have been saved to the database.");
              });
            }
          },
          onScore: setScore,
        },
        abortRef.current.signal
      );

      if (sessionId) {
        if (result.reason === "stopped") {
          await stopSession(sessionId, result.finalOutput);
        } else {
          await completeSession(sessionId, result.finalOutput);
        }
        await refreshSessions();
      }

      if (result.reason === "target_met" && result.score >= TARGET_SCORE) {
        setFinalRound(getFinalOutputRound(result.iterations));
      } else if (result.reason === "max_rounds") {
        setFinalRound(getFinalOutputRound(result.iterations));
      }
    } catch (err) {
      if (err instanceof LoopApiError) {
        setError(err.message);
      } else if (err instanceof DbError) {
        setError(err.message);
        setStatus("error");
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred");
      }
    }
  }, [refreshSessions]);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-surface">
      <header className="flex items-center justify-between border-b border-surface-border px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <SidebarToggle
            onClick={() => setSidebarOpen(true)}
            sessionCount={sessions.length}
          />
          <div>
            <h1 className="text-lg font-bold text-white">RefineAI</h1>
            <p className="text-xs text-gray-500">
              Generate → Critique → Refine until perfect
            </p>
          </div>
        </div>
        <div className="hidden text-xs text-gray-500 md:block">
          Target: {TARGET_SCORE}%+ quality
        </div>
      </header>

      {error && (
        <div className="border-b border-red-500/30 bg-red-500/10 px-4 py-3 sm:px-6">
          <div className="mx-auto flex max-w-3xl items-start gap-2">
            <svg
              className="mt-0.5 h-4 w-4 shrink-0 text-red-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <p className="text-sm font-medium text-red-400">{error}</p>
              <p className="mt-0.5 text-xs text-red-400/70">
                Check your API keys and Supabase setup in .env.local.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setError(null)}
              className="ml-auto shrink-0 text-red-400 hover:text-red-300"
              aria-label="Dismiss error"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {dbWarning && (
        <div className="border-b border-yellow-500/30 bg-yellow-500/10 px-4 py-2 text-center text-sm text-yellow-400 sm:px-6">
          {dbWarning}
          <button
            type="button"
            onClick={() => setDbWarning(null)}
            className="ml-2 underline hover:text-yellow-300"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          iterations={iterations}
          sessions={sessions}
          activeSessionId={currentSessionId}
          sessionsLoading={sessionsLoading}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onSelectRound={handleSelectRound}
          onSelectSession={handleSelectSession}
          onNewSession={handleNewSession}
          activeRound={activeRound}
        />

        <main className="flex flex-1 flex-col overflow-hidden">
          <StatusBar
            status={viewMode === "history" ? "idle" : status}
            score={score}
            onStop={handleStop}
          />
          <ChatArea
            iterations={iterations}
            status={status}
            finalRound={finalRound}
            targetDescription={targetDescription}
            viewMode={viewMode}
          />
          <InputBox
            onSubmit={handleSubmit}
            disabled={isLoading || viewMode === "history"}
            isLoading={isLoading}
          />
        </main>
      </div>
    </div>
  );
}
