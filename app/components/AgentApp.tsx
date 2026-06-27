"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  BuildPhase,
  ChatMessage,
  DbFile,
  DbProject,
  FileRoundEvent,
  ProjectPlan,
} from "@/app/lib/agentTypes";
import { fetchStream } from "@/app/lib/streamClient";
import { startBuild, type OrchestratorControls } from "@/app/lib/buildOrchestrator";
import { USER_MESSAGES } from "@/app/lib/userMessages";
import Sidebar, { SidebarToggle, FileBuilderToggle } from "./Sidebar";
import ChatArea from "./ChatArea";
import InputBox from "./InputBox";
import FileBuilder from "./FileBuilder";

let msgCounter = 0;
function newId() {
  msgCounter += 1;
  return `msg-${msgCounter}-${Date.now()}`;
}

export default function AgentApp() {
  const [projects, setProjects] = useState<DbProject[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [fileBuilderOpen, setFileBuilderOpen] = useState(false);

  const [projectId, setProjectId] = useState<string | null>(null);
  const [plan, setPlan] = useState<ProjectPlan | null>(null);
  const [summaryPlan, setSummaryPlan] = useState<ProjectPlan | null>(null);
  const [files, setFiles] = useState<DbFile[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [phase, setPhase] = useState<BuildPhase>("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [awaitingChanges, setAwaitingChanges] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [activeFile, setActiveFile] = useState<DbFile | null>(null);
  const [currentCode, setCurrentCode] = useState("");
  const [currentRound, setCurrentRound] = useState<FileRoundEvent | null>(null);
  const [activeProgress, setActiveProgress] = useState<{
    fileName: string;
    round: FileRoundEvent | null;
  } | null>(null);

  const buildAbortRef = useRef<AbortController | null>(null);
  const controlsRef = useRef<OrchestratorControls | null>(null);

  const loadProjects = useCallback(async () => {
    try {
      const res = await fetch("/api/projects");
      const data = await res.json();
      setProjects(data.projects ?? []);
    } catch {
      // silent
    } finally {
      setProjectsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const refreshFiles = useCallback(async (id: string) => {
    const res = await fetch(`/api/projects?id=${id}`);
    const data = await res.json();
    if (data.files) setFiles(data.files);
    return data.files as DbFile[];
  }, []);

  const handleDownload = useCallback(() => {
    const doneFiles = files.filter((f) => f.content);
    if (doneFiles.length === 0) return;

    const bundle = doneFiles
      .map((f) => `=== ${f.file_path} ===\n${f.content}\n`)
      .join("\n");

    const blob = new Blob([bundle], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${plan?.name ?? "project"}-files.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [files, plan]);

  const handleNewProject = useCallback(() => {
    buildAbortRef.current?.abort();
    setProjectId(null);
    setPlan(null);
    setSummaryPlan(null);
    setFiles([]);
    setMessages([]);
    setPhase("idle");
    setStatusMessage("");
    setShowConfirm(false);
    setAwaitingChanges(false);
    setActiveFile(null);
    setCurrentCode("");
    setCurrentRound(null);
    setActiveProgress(null);
  }, []);

  const loadProject = useCallback(async (project: DbProject) => {
    buildAbortRef.current?.abort();
    setIsLoading(true);

    try {
      const res = await fetch(`/api/projects?id=${project.id}`);
      const data = await res.json();
      const loadedPlan = data.project?.plan as ProjectPlan;
      const loadedMessages: ChatMessage[] = (data.messages ?? []).map(
        (m: { id: string; role: "user" | "assistant"; content: string; type: string; metadata: Record<string, unknown> }) => ({
          id: m.id,
          role: m.role,
          content: m.type === "plan" ? "Here's your project plan:" : m.content,
          type: m.type as ChatMessage["type"],
          metadata: m.metadata,
        })
      );

      setProjectId(project.id);
      setPlan(loadedPlan);
      setFiles(data.files ?? []);
      setMessages(loadedMessages);

      if (project.status === "complete") {
        setPhase("complete");
        setSummaryPlan(loadedPlan);
        setShowConfirm(false);
      } else if (project.status === "building") {
        setPhase("building");
        setShowConfirm(false);
      } else {
        setPhase("awaiting_confirm");
        setShowConfirm(true);
      }
    } catch {
      setStatusMessage(USER_MESSAGES.fixing);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handlePlanIdea = useCallback(
    async (idea: string) => {
      setIsLoading(true);
      setPhase("planning");
      setStatusMessage(USER_MESSAGES.planning);
      setMessages((prev) => [
        ...prev,
        { id: newId(), role: "user", content: idea, type: "chat" },
      ]);

      await fetchStream("/api/plan", { idea }, (event) => {
        if (event.type === "status") {
          setStatusMessage(event.message);
        } else if (event.type === "plan") {
          setProjectId(event.projectId);
          setPlan(event.data);
          setPhase("awaiting_confirm");
          setShowConfirm(true);
          setMessages((prev) => [
            ...prev,
            {
              id: newId(),
              role: "assistant",
              content: "Here's your project plan:",
              type: "plan",
              metadata: { plan: event.data },
            },
          ]);
          refreshFiles(event.projectId);
          loadProjects();
        }
      });

      setIsLoading(false);
      setStatusMessage("");
    },
    [loadProjects, refreshFiles]
  );

  const handleRevision = useCallback(
    async (message: string) => {
      if (!projectId) return;
      setIsLoading(true);
      setShowConfirm(false);
      setAwaitingChanges(false);
      setMessages((prev) => [
        ...prev,
        { id: newId(), role: "user", content: message, type: "chat" },
      ]);

      const endpoint =
        phase === "building" || phase === "testing"
          ? "/api/chat"
          : "/api/projects";

      await fetchStream(endpoint, { projectId, message }, (event) => {
        if (event.type === "status") {
          setStatusMessage(event.message);
        } else if (event.type === "plan") {
          setPlan(event.data);
          setPhase("awaiting_confirm");
          setShowConfirm(true);
          setMessages((prev) => [
            ...prev,
            {
              id: newId(),
              role: "assistant",
              content: "Here's your updated plan:",
              type: "plan",
              metadata: { plan: event.data },
            },
          ]);
          refreshFiles(event.projectId);
        }
      });

      setIsLoading(false);
      setStatusMessage("");
    },
    [projectId, phase, refreshFiles]
  );

  const handleSubmit = useCallback(
    (text: string) => {
      if (phase === "idle" || phase === "planning") {
        handlePlanIdea(text);
      } else if (awaitingChanges || phase === "awaiting_confirm" || phase === "building" || phase === "testing") {
        handleRevision(text);
      }
    },
    [phase, awaitingChanges, handlePlanIdea, handleRevision]
  );

  const handleConfirm = useCallback(async () => {
    if (!projectId || !plan) return;
    setShowConfirm(false);
    setIsLoading(true);
    setPhase("building");
    setFileBuilderOpen(true);

    await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, action: "confirm" }),
    });

    const currentFiles = await refreshFiles(projectId);
    buildAbortRef.current = new AbortController();

    controlsRef.current = startBuild(
      projectId,
      currentFiles,
      {
        onStatus: setStatusMessage,
        onFileStart: (file) => {
          setActiveFile(file);
          setCurrentCode("");
          setCurrentRound(null);
          setActiveProgress({ fileName: file.file_name, round: null });
          setFiles((prev) =>
            prev.map((f) =>
              f.id === file.id ? { ...f, status: "building" as const } : f
            )
          );
        },
        onRound: (_fileId, event) => {
          const round = event.data;
          setCurrentRound(round);
          if (round.code) setCurrentCode(round.code);
          setActiveProgress((prev) =>
            prev ? { ...prev, round } : null
          );
        },
        onFileComplete: (fileId, score) => {
          setFiles((prev) =>
            prev.map((f) =>
              f.id === fileId
                ? { ...f, status: "done" as const, score }
                : f
            )
          );
          refreshFiles(projectId);
        },
        onComplete: (finalPlan) => {
          setSummaryPlan(finalPlan);
          setPhase("complete");
          setIsLoading(false);
          setStatusMessage("");
          setActiveProgress(null);
          loadProjects();
          refreshFiles(projectId);
        },
      },
      buildAbortRef.current.signal
    );

    setIsLoading(false);
  }, [projectId, plan, refreshFiles, loadProjects]);

  const handleMakeChanges = useCallback(() => {
    setAwaitingChanges(true);
    setShowConfirm(false);
  }, []);

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <header className="flex shrink-0 items-center justify-between border-b border-surface-border bg-surface-raised px-4 py-3">
        <div className="flex items-center gap-3">
          <SidebarToggle onClick={() => setSidebarOpen(true)} />
          <div className="md:hidden">
            <h1 className="text-sm font-bold text-white">RefineAI</h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {(phase === "building" || phase === "testing") && (
            <>
              <button
                type="button"
                onClick={() => controlsRef.current?.pause()}
                className="rounded-lg border border-surface-border px-3 py-1.5 text-xs text-gray-300 hover:text-white"
              >
                Pause
              </button>
              <button
                type="button"
                onClick={() => controlsRef.current?.skipCurrent()}
                className="rounded-lg border border-surface-border px-3 py-1.5 text-xs text-gray-300 hover:text-white"
              >
                Skip File
              </button>
            </>
          )}
          <FileBuilderToggle onClick={() => setFileBuilderOpen(true)} />
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <Sidebar
          projects={projects}
          activeProjectId={projectId}
          isLoading={projectsLoading}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onSelectProject={loadProject}
          onNewProject={handleNewProject}
        />

        <main className="flex min-w-0 flex-1 flex-col">
          <ChatArea
            messages={messages}
            plan={plan}
            phase={phase}
            statusMessage={statusMessage}
            showConfirm={showConfirm}
            activeProgress={activeProgress}
            summaryPlan={summaryPlan}
            files={files}
            onConfirm={handleConfirm}
            onMakeChanges={handleMakeChanges}
            onDownload={handleDownload}
            confirmDisabled={isLoading}
            isLoading={isLoading}
          />

          <InputBox
            onSubmit={handleSubmit}
            disabled={
              isLoading ||
              phase === "complete" ||
              (phase === "planning" && isLoading)
            }
            isLoading={isLoading}
            phase={phase}
            awaitingChanges={awaitingChanges}
          />
        </main>

        <FileBuilder
          files={files}
          activeFile={activeFile}
          currentCode={currentCode}
          currentRound={currentRound}
          statusMessage={statusMessage}
          isOpen={fileBuilderOpen}
          onClose={() => setFileBuilderOpen(false)}
          onSelectFile={(file) => {
            setActiveFile(file);
            setCurrentCode(file.content ?? "");
          }}
        />
      </div>
    </div>
  );
}
