"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  BuildPhase,
  ChatMessage,
  ChatMode,
  DbFile,
  DbProject,
  DebugProposal,
  FileRoundEvent,
  ProjectPlan,
} from "@/app/lib/agentTypes";
import { fetchStream } from "@/app/lib/streamClient";
import { meetsQualityThreshold } from "@/app/lib/agentTypes";
import { getStoredMode, setStoredMode, isValidChatMode } from "@/app/lib/chatModes";
import { startBuild, runQualityPass, type OrchestratorControls } from "@/app/lib/buildOrchestrator";
import {
  mergeProjectFiles,
  syncFileIntoList,
  updateFileInList,
  type ExplorerFile,
} from "@/app/lib/mergeProjectFiles";
import {
  findPlannedFile,
  getFriendlyBuildMessage,
  getPlanIntro,
  getRevisionIntro,
} from "@/app/lib/planPresentation";
import { completionMessage, fileCompleteMessage, USER_MESSAGES } from "@/app/lib/userMessages";
import type { PreviewLogLine, PreviewStatus } from "@/app/lib/previewTypes";
import Sidebar, { FilesButton, SidebarContent } from "./Sidebar";
import CenterPanel, { type CenterTab } from "./CenterPanel";
import ChatPanel from "./ChatPanel";
import ChatMessages from "./ChatMessages";
import InputBox from "./InputBox";
import BottomNav from "./mobile/BottomNav";
import MobileHeader from "./mobile/MobileHeader";
import SlideDrawer from "./mobile/SlideDrawer";
import BottomSheet from "./mobile/BottomSheet";
import CodeViewerModal from "./mobile/CodeViewerModal";
import CodeViewer from "./CodeViewer";
import SidebarNav from "./shell/SidebarNav";
import Link from "next/link";
import { useVisualViewport, useIsMobile, useIsTablet } from "@/app/lib/useVisualViewport";

let msgCounter = 0;
function newId() {
  msgCounter += 1;
  return `msg-${msgCounter}-${Date.now()}`;
}

export default function AgentApp({ initialProjectId }: { initialProjectId?: string | null } = {}) {
  const [projects, setProjects] = useState<DbProject[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatPanelOpen, setChatPanelOpen] = useState(false);
  const [chatPanelCollapsed, setChatPanelCollapsed] = useState(false);
  const [fileSheetOpen, setFileSheetOpen] = useState(false);
  const [codeModalOpen, setCodeModalOpen] = useState(false);
  const [navDrawerOpen, setNavDrawerOpen] = useState(false);
  const [buildSheetOpen, setBuildSheetOpen] = useState(false);
  const [tabletSidebarExpanded, setTabletSidebarExpanded] = useState(false);

  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  useVisualViewport();

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
  const [planIntro, setPlanIntro] = useState<string | null>(null);
  const [chatMode, setChatMode] = useState<ChatMode>("agent");
  const [awaitingPlanChanges, setAwaitingPlanChanges] = useState(false);
  const [appliedDebugMessageIds, setAppliedDebugMessageIds] = useState<Set<string>>(
    new Set()
  );

  useEffect(() => {
    setChatMode(getStoredMode());
  }, []);

  const handleModeChange = useCallback((mode: ChatMode) => {
    setChatMode(mode);
    setStoredMode(mode);
  }, []);

  const inputDisabled = useMemo(() => {
    if (isLoading) return true;
    if (chatMode === "ask") return false;
    if (chatMode === "debug") return !projectId;
    if (chatMode === "plan") return phase === "building" || phase === "complete";
    return phase === "complete" || (phase === "planning" && isLoading);
  }, [chatMode, isLoading, phase, projectId]);

  const showBuild = useMemo(
    () =>
      chatMode === "agent" &&
      showConfirm &&
      phase === "awaiting_confirm" &&
      !!plan &&
      !isLoading,
    [chatMode, showConfirm, phase, plan, isLoading]
  );

  const [centerTab, setCenterTab] = useState<CenterTab>("plan");
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [viewerCode, setViewerCode] = useState("");

  const [activeFile, setActiveFile] = useState<DbFile | null>(null);
  const [currentCode, setCurrentCode] = useState("");
  const [currentRound, setCurrentRound] = useState<FileRoundEvent | null>(null);
  const [activeProgress, setActiveProgress] = useState<{
    fileName: string;
    round: FileRoundEvent | null;
  } | null>(null);

  const [previewStatus, setPreviewStatus] = useState<PreviewStatus>("idle");
  const [previewLogs, setPreviewLogs] = useState<PreviewLogLine[]>([]);
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [previewViewport, setPreviewViewport] = useState<"desktop" | "mobile">("desktop");
  const [previewLastUpdated, setPreviewLastUpdated] = useState<string | null>(null);
  const [previewIframeKey, setPreviewIframeKey] = useState(0);
  const [isPreviewStarting, setIsPreviewStarting] = useState(false);
  const wasPreviewRunningRef = useRef(false);

  const buildAbortRef = useRef<AbortController | null>(null);
  const controlsRef = useRef<OrchestratorControls | null>(null);
  const activeFileIdRef = useRef<string | null>(null);
  const planRef = useRef<ProjectPlan | null>(null);

  useEffect(() => {
    planRef.current = plan;
  }, [plan]);

  const mergedFiles = useMemo(
    () => mergeProjectFiles(plan, files, projectId),
    [plan, files, projectId]
  );

  const selectedFile =
    mergedFiles.find((f) => f.id === selectedFileId) ??
    files.find((f) => f.id === selectedFileId) ??
    null;

  const appendBuildMessage = useCallback((content: string) => {
    setMessages((prev) => [
      ...prev,
      { id: newId(), role: "assistant", content, type: "progress" as const },
    ]);
  }, []);

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

  const handleSelectFile = useCallback(
    (file: ExplorerFile) => {
      setSelectedFileId(file.id);

      if (file.isVirtual) {
        setViewerCode("");
      } else {
        const isLive =
          file.id === activeFileIdRef.current && file.status === "building";
        setViewerCode(isLive ? currentCode : file.content ?? "");
      }

      setCodeModalOpen(true);
      setFileSheetOpen(false);
      setTabletSidebarExpanded(false);
    },
    [currentCode]
  );

  const handleRunApp = useCallback(async () => {
    if (!projectId) return;
    setIsPreviewStarting(true);
    setPreviewStatus("installing");
    setPreviewLogs([]);
    setTerminalOpen(true);
    setCenterTab("preview");
    appendBuildMessage(USER_MESSAGES.startingApp);

    try {
      const response = await fetch("/api/preview/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });

      if (!response.ok || !response.body) {
        setPreviewStatus("error");
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6)) as {
              type: string;
              data: PreviewLogLine | {
                status: PreviewStatus;
                lastUpdated: string | null;
                error: string | null;
              };
            };

            if (event.type === "log") {
              setPreviewLogs((prev) => [...prev, event.data as PreviewLogLine]);
              const log = event.data as PreviewLogLine;
              if (log.type === "status") {
                setPreviewStatus(log.message as PreviewStatus);
              }
            } else if (event.type === "status") {
              const st = event.data as {
                status: PreviewStatus;
                lastUpdated: string | null;
                error: string | null;
              };
              setPreviewStatus(st.status);
              setPreviewLastUpdated(st.lastUpdated);
              if (st.status === "running") {
                wasPreviewRunningRef.current = true;
                setPreviewIframeKey((k) => k + 1);
                appendBuildMessage(USER_MESSAGES.previewReady);
                setCenterTab("preview");
              } else if (st.status === "error") {
                appendBuildMessage(USER_MESSAGES.previewError);
              }
            }
          } catch {
            // skip malformed
          }
        }
      }
    } catch {
      setPreviewStatus("error");
      appendBuildMessage(USER_MESSAGES.previewError);
    } finally {
      setIsPreviewStarting(false);
    }
  }, [projectId, appendBuildMessage]);

  const handlePreviewRefresh = useCallback(() => {
    setPreviewIframeKey((k) => k + 1);
    setPreviewLastUpdated(new Date().toISOString());
  }, []);

  const handlePreviewRetry = useCallback(() => {
    handleRunApp();
  }, [handleRunApp]);

  const syncPreviewIfRunning = useCallback(async () => {
    if (!projectId || !wasPreviewRunningRef.current) return;
    try {
      const res = await fetch("/api/preview/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });
      const data = await res.json();
      setPreviewStatus(data.status ?? "idle");
      setPreviewLastUpdated(data.lastUpdated ?? null);
      if (data.status === "running") {
        setPreviewIframeKey((k) => k + 1);
        setCenterTab("preview");
      }
    } catch {
      // silent
    }
  }, [projectId]);

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

  const loadProject = useCallback(async (project: DbProject) => {
    buildAbortRef.current?.abort();
    activeFileIdRef.current = null;
    setIsLoading(true);

    try {
      const res = await fetch(`/api/projects?id=${project.id}`);
      const data = await res.json();
      const loadedPlan = data.project?.plan as ProjectPlan;
      const loadedFiles = (data.files ?? []) as DbFile[];
      const loadedMessages: ChatMessage[] = (data.messages ?? []).map(
        (m: {
          id: string;
          role: "user" | "assistant";
          content: string;
          type: string;
          mode?: string;
          metadata: Record<string, unknown>;
        }) => {
          const mode = isValidChatMode(m.mode ?? "") ? (m.mode as ChatMode) : undefined;
          if (m.type === "plan" && mode === "plan") {
            const markdown = m.metadata?.planMarkdown as string | undefined;
            return {
              id: m.id,
              role: m.role,
              content: markdown ?? m.content,
              type: "chat" as const,
              mode: "plan",
              metadata: m.metadata,
            };
          }
          if (m.type === "plan") {
            const metaPlan = m.metadata?.plan as ProjectPlan | undefined;
            return {
              id: m.id,
              role: m.role,
              content: metaPlan
                ? getPlanIntro(metaPlan)
                : loadedPlan
                  ? getPlanIntro(loadedPlan)
                  : "Here's your project plan.",
              type: "chat" as const,
              mode: mode ?? "agent",
              metadata: m.metadata,
            };
          }
          return {
            id: m.id,
            role: m.role,
            content: m.content,
            type: m.type as ChatMessage["type"],
            mode,
            metadata: m.metadata,
          };
        }
      );

      setProjectId(project.id);
      setPlan(loadedPlan);
      setPlanIntro(getPlanIntro(loadedPlan));
      setFiles(loadedFiles);
      setMessages(loadedMessages);
      setSelectedFileId(null);
      setViewerCode("");
      setCenterTab("plan");

      if (project.status === "complete") {
        const needsQuality = loadedFiles.some(
          (f) => f.status === "done" && !meetsQualityThreshold(f.score)
        );

        if (needsQuality) {
          setPhase("building");
          setShowConfirm(false);
          setSummaryPlan(null);
          setStatusMessage(USER_MESSAGES.fixing);
          setIsLoading(false);

          buildAbortRef.current = new AbortController();
          await runQualityPass(
            project.id,
            {
              onStatus: setStatusMessage,
              onFileStart: (file) => {
                activeFileIdRef.current = file.id;
                setActiveFile(file);
                setSelectedFileId(file.id);
                setCurrentCode("");
                setCurrentRound(null);
                setActiveProgress({ fileName: file.file_name, round: null });
                setFiles((prev) =>
                  syncFileIntoList(prev, { ...file, status: "building" })
                );
              },
              onRound: (fileId, event) => {
                const round = event.data;
                setCurrentRound(round);
                if (round.code) {
                  setCurrentCode(round.code);
                  setViewerCode(round.code);
                }
                setActiveProgress((prev) =>
                  prev ? { ...prev, round } : null
                );
              },
              onFileComplete: (fileId, score) => {
                activeFileIdRef.current = null;
                setFiles((prev) =>
                  updateFileInList(prev, fileId, { status: "done", score })
                );
              },
            },
            buildAbortRef.current.signal
          );

          await refreshFiles(project.id);
          setPhase("complete");
          setSummaryPlan(loadedPlan);
          setStatusMessage("");
          setActiveProgress(null);
          setActiveFile(null);
          setCenterTab("plan");
        } else {
          setPhase("complete");
          setSummaryPlan(loadedPlan);
          setShowConfirm(false);
        }
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
  }, [refreshFiles]);

  useEffect(() => {
    if (!initialProjectId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/projects?id=${initialProjectId}`);
        const data = await res.json();
        if (!cancelled && data.project) {
          await loadProject(data.project);
        }
      } catch {
        // silent
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initialProjectId, loadProject]);

  const handlePlanIdea = useCallback(
    async (idea: string) => {
      setIsLoading(true);
      setPhase("planning");
      setCenterTab("plan");
      setPlanIntro(null);
      setStatusMessage(USER_MESSAGES.planning);
      setMessages((prev) => [
        ...prev,
        { id: newId(), role: "user", content: idea, type: "chat", mode: "agent" },
      ]);

      let gotPlan = false;

      await fetchStream("/api/plan", { idea }, (event) => {
        if (event.type === "status") {
          setStatusMessage(event.message);
        } else if (event.type === "error") {
          gotPlan = false;
          setPhase("idle");
          setMessages((prev) => [
            ...prev,
            {
              id: newId(),
              role: "assistant",
              content: event.message,
              type: "chat",
            },
          ]);
        } else if (event.type === "plan") {
          gotPlan = true;
          const intro = getPlanIntro(event.data);
          setProjectId(event.projectId);
          setPlan(event.data);
          setPlanIntro(intro);
          setPhase("awaiting_confirm");
          setShowConfirm(true);
          setCenterTab("plan");
          setMessages((prev) => [
            ...prev,
            {
              id: newId(),
              role: "assistant",
              content: intro,
              type: "chat",
              mode: "agent",
            },
          ]);
          refreshFiles(event.projectId);
          loadProjects();
        }
      });

      if (!gotPlan) {
        setPhase((current) => (current === "planning" ? "idle" : current));
      }

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
          const intro = getRevisionIntro(event.data);
          setPlan(event.data);
          setPlanIntro(intro);
          setPhase("awaiting_confirm");
          setShowConfirm(true);
          setCenterTab("plan");
          setMessages((prev) => [
            ...prev,
            {
              id: newId(),
              role: "assistant",
              content: intro,
              type: "chat",
              mode: "agent",
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

  const handleAsk = useCallback(
    async (text: string) => {
      setIsLoading(true);
      setMessages((prev) => [
        ...prev,
        { id: newId(), role: "user", content: text, type: "chat", mode: "ask" },
      ]);

      await fetchStream(
        "/api/ask",
        { message: text, projectId: projectId ?? undefined },
        (event) => {
          if (event.type === "status") {
            setStatusMessage(event.message);
          } else if (event.type === "message") {
            setMessages((prev) => [
              ...prev,
              {
                id: newId(),
                role: "assistant",
                content: event.content,
                type: "chat",
                mode: "ask",
              },
            ]);
          } else if (event.type === "error") {
            setMessages((prev) => [
              ...prev,
              {
                id: newId(),
                role: "assistant",
                content: event.message,
                type: "chat",
                mode: "ask",
              },
            ]);
          }
        }
      );

      setIsLoading(false);
      setStatusMessage("");
    },
    [projectId]
  );

  const handlePlanMode = useCallback(
    async (text: string) => {
      setIsLoading(true);
      setShowConfirm(false);
      setMessages((prev) => [
        ...prev,
        { id: newId(), role: "user", content: text, type: "chat", mode: "plan" },
      ]);

      await fetchStream(
        "/api/modes/plan",
        {
          message: text,
          projectId: projectId ?? undefined,
          revise: awaitingPlanChanges,
        },
        (event) => {
          if (event.type === "status") {
            setStatusMessage(event.message);
          } else if (event.type === "plan_question") {
            setProjectId(event.projectId);
            setAwaitingPlanChanges(false);
            setMessages((prev) => [
              ...prev,
              {
                id: newId(),
                role: "assistant",
                content: event.content,
                type: "chat",
                mode: "plan",
              },
            ]);
          } else if (event.type === "plan_ready") {
            setProjectId(event.projectId);
            setPlan(event.data.plan);
            setPlanIntro(event.data.markdown);
            setPhase("awaiting_confirm");
            setAwaitingPlanChanges(false);
            setCenterTab("plan");
            setMessages((prev) => [
              ...prev,
              {
                id: newId(),
                role: "assistant",
                content: event.data.markdown,
                type: "chat",
                mode: "plan",
                metadata: {
                  plan: event.data.plan,
                  planMarkdown: event.data.markdown,
                  showPlanActions: true,
                },
              },
            ]);
            refreshFiles(event.projectId);
            loadProjects();
          } else if (event.type === "error") {
            setMessages((prev) => [
              ...prev,
              {
                id: newId(),
                role: "assistant",
                content: event.message,
                type: "chat",
                mode: "plan",
              },
            ]);
          }
        }
      );

      setIsLoading(false);
      setStatusMessage("");
    },
    [projectId, awaitingPlanChanges, refreshFiles, loadProjects]
  );

  const handleDebug = useCallback(
    async (text: string) => {
      if (!projectId) {
        setMessages((prev) => [
          ...prev,
          {
            id: newId(),
            role: "assistant",
            content: "Open a built project to use Debug mode.",
            type: "chat",
            mode: "debug",
          },
        ]);
        return;
      }

      setIsLoading(true);
      setMessages((prev) => [
        ...prev,
        { id: newId(), role: "user", content: text, type: "chat", mode: "debug" },
      ]);

      await fetchStream("/api/debug", { projectId, message: text }, (event) => {
        if (event.type === "status") {
          setStatusMessage(event.message);
        } else if (event.type === "message") {
          setMessages((prev) => [
            ...prev,
            {
              id: newId(),
              role: "assistant",
              content: event.content,
              type: "chat",
              mode: "debug",
            },
          ]);
        } else if (event.type === "debug") {
          setMessages((prev) => [
            ...prev,
            {
              id: newId(),
              role: "assistant",
              content: event.content,
              type: "chat",
              mode: "debug",
              metadata: {
                debugProposal: event.data,
                showDebugActions: true,
              },
            },
          ]);
        } else if (event.type === "error") {
          setMessages((prev) => [
            ...prev,
            {
              id: newId(),
              role: "assistant",
              content: event.message,
              type: "chat",
              mode: "debug",
            },
          ]);
        }
      });

      setIsLoading(false);
      setStatusMessage("");
    },
    [projectId]
  );

  const handlePlanModify = useCallback(() => {
    setAwaitingPlanChanges(true);
    setMessages((prev) => [
      ...prev,
      {
        id: newId(),
        role: "assistant",
        content: "What would you like to change in the plan?",
        type: "chat",
        mode: "plan",
      },
    ]);
  }, []);

  const handleDebugApply = useCallback(
    async (proposal: DebugProposal, messageId: string) => {
      setIsLoading(true);
      try {
        const res = await fetch("/api/debug/apply", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileId: proposal.fileId,
            fixedContent: proposal.fixedContent,
          }),
        });
        if (res.ok && projectId) {
          await refreshFiles(projectId);
          setAppliedDebugMessageIds((prev) => new Set(prev).add(messageId));
          setMessages((prev) =>
            prev.map((m) =>
              m.id === messageId
                ? { ...m, metadata: { ...m.metadata, showDebugActions: false } }
                : m
            )
          );
          setMessages((prev) => [
            ...prev,
            {
              id: newId(),
              role: "assistant",
              content: `Applied fix to \`${proposal.filePath}\`.`,
              type: "chat",
              mode: "debug",
            },
          ]);
          if (selectedFileId === proposal.fileId) {
            setViewerCode(proposal.fixedContent);
          }
        }
      } finally {
        setIsLoading(false);
      }
    },
    [projectId, refreshFiles, selectedFileId]
  );

  const handleSubmit = useCallback(
    (text: string) => {
      if (chatMode === "ask") {
        handleAsk(text);
        return;
      }
      if (chatMode === "plan") {
        handlePlanMode(text);
        return;
      }
      if (chatMode === "debug") {
        handleDebug(text);
        return;
      }

      if (phase === "idle" || phase === "planning") {
        handlePlanIdea(text);
      } else if (
        awaitingChanges ||
        phase === "awaiting_confirm" ||
        phase === "building" ||
        phase === "testing"
      ) {
        handleRevision(text);
      }
    },
    [
      chatMode,
      phase,
      awaitingChanges,
      handlePlanIdea,
      handleRevision,
      handleAsk,
      handlePlanMode,
      handleDebug,
    ]
  );

  const handleConfirm = useCallback(async () => {
    if (!projectId || !plan) return;
    setShowConfirm(false);
    setIsLoading(true);
    setPhase("building");
    setCenterTab("plan");

    appendBuildMessage(USER_MESSAGES.building);

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
          activeFileIdRef.current = file.id;
          setActiveFile(file);
          setSelectedFileId(file.id);
          setCurrentCode("");
          setViewerCode("");
          setCurrentRound(null);
          setActiveProgress({ fileName: file.file_name, round: null });
          setFiles((prev) =>
            syncFileIntoList(prev, { ...file, status: "building" })
          );
          const planned = findPlannedFile(planRef.current, file.file_path);
          const friendlyMsg = planned
            ? getFriendlyBuildMessage(planned)
            : getFriendlyBuildMessage(file);
          setStatusMessage(friendlyMsg);
          appendBuildMessage(friendlyMsg);
        },
        onRound: (fileId, event) => {
          const round = event.data;
          setCurrentRound(round);
          if (round.code) {
            setCurrentCode(round.code);
            if (
              fileId === selectedFileId ||
              fileId === activeFileIdRef.current
            ) {
              setViewerCode(round.code);
            }
          }
          setActiveProgress((prev) =>
            prev ? { ...prev, round } : null
          );
        },
        onFileComplete: (fileId, score) => {
          activeFileIdRef.current = null;
          setActiveFile(null);
          setFiles((prev) =>
            updateFileInList(prev, fileId, { status: "done", score })
          );
          refreshFiles(projectId).then((updated) => {
            const completed = updated?.find((f) => f.id === fileId);
            if (completed) {
              const planned = findPlannedFile(planRef.current, completed.file_path);
              const friendlyName = planned?.purpose ?? completed.file_name;
              appendBuildMessage(fileCompleteMessage(friendlyName, score));
              if (selectedFileId === fileId) {
                setViewerCode(completed.content ?? "");
              }
            }
          });
        },
        onComplete: (finalPlan) => {
          setSummaryPlan(finalPlan);
          setPhase("complete");
          setIsLoading(false);
          setStatusMessage("");
          setActiveProgress(null);
          setActiveFile(null);
          setCenterTab("plan");
          refreshFiles(projectId).then((updated) => {
            const done = (updated ?? []).filter((f) => f.status === "done");
            const avgScore =
              done.length > 0
                ? Math.round(done.reduce((s, f) => s + f.score, 0) / done.length)
                : 0;
            appendBuildMessage(
              completionMessage(finalPlan.name, done.length, avgScore)
            );
          });
          loadProjects();
          syncPreviewIfRunning();
        },
      },
      buildAbortRef.current.signal
    );

    setIsLoading(false);
  }, [
    projectId,
    plan,
    refreshFiles,
    loadProjects,
    selectedFileId,
    appendBuildMessage,
    syncPreviewIfRunning,
  ]);

  const handlePlanApprove = useCallback(async () => {
    if (!projectId || !plan) return;
    setIsLoading(true);
    setMessages((prev) =>
      prev.map((m) =>
        m.metadata?.showPlanActions
          ? { ...m, metadata: { ...m.metadata, showPlanActions: false } }
          : m
      )
    );

    await fetch("/api/modes/plan/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId }),
    });

    await refreshFiles(projectId);
    setIsLoading(false);
    await handleConfirm();
  }, [projectId, plan, refreshFiles, handleConfirm]);

  const handleMakeChanges = useCallback(() => {
    setAwaitingChanges(true);
    setShowConfirm(false);
    setCenterTab("plan");
    setMessages((prev) => [
      ...prev,
      {
        id: newId(),
        role: "assistant",
        content: USER_MESSAGES.makeChangesPrompt,
        type: "chat",
      },
    ]);
  }, []);

  useEffect(() => {
    if (
      selectedFileId &&
      selectedFileId === activeFileIdRef.current &&
      currentCode
    ) {
      setViewerCode(currentCode);
    }
  }, [selectedFileId, currentCode]);

  const isBuilding = phase === "building" || phase === "testing";

  useEffect(() => {
    if (isTablet && isBuilding) {
      setBuildSheetOpen(true);
    }
  }, [isTablet, isBuilding]);

  const codeFile = activeFile ?? selectedFile;

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <MobileHeader
        showLogo
        onMenuClick={() => setNavDrawerOpen(true)}
        rightSlot={
          <div className="flex items-center gap-2">
            <FilesButton onClick={() => setFileSheetOpen(true)} />
            {isBuilding && (
              <>
                <button
                  type="button"
                  onClick={() => controlsRef.current?.pause()}
                  className="touch-target rounded-lg border border-surface-border px-3 py-1.5 text-xs text-gray-300 hover:text-white"
                >
                  Pause
                </button>
                <button
                  type="button"
                  onClick={() => controlsRef.current?.skipCurrent()}
                  className="touch-target rounded-lg border border-surface-border px-3 py-1.5 text-xs text-gray-300 hover:text-white"
                >
                  Skip
                </button>
              </>
            )}
          </div>
        }
      />

      <header className="hidden shrink-0 items-center justify-between border-b border-surface-border bg-surface-raised px-4 py-2.5 lg:flex">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-bold text-white">RefineAI Workspace</h1>
          <a
            href="/dashboard"
            className="text-xs text-gray-400 transition hover:text-indigo-400"
          >
            ← Dashboard
          </a>
        </div>
        <div className="flex items-center gap-2">
          {isBuilding && (
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
        </div>
      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <Sidebar
          mergedFiles={mergedFiles}
          selectedFileId={selectedFileId}
          activeFileId={activeFile?.id ?? null}
          isOpen={sidebarOpen}
          onClose={() => setTabletSidebarExpanded(false)}
          onSelectFile={handleSelectFile}
          tabletExpanded={tabletSidebarExpanded}
          onTabletExpand={() => setTabletSidebarExpanded(true)}
        />

        <div className="flex min-h-0 min-w-0 flex-1 flex-col pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0 lg:pb-0">
          <CenterPanel
            centerTab={centerTab}
            onTabChange={setCenterTab}
            plan={plan}
            phase={phase}
            statusMessage={statusMessage}
            showConfirm={showConfirm}
            summaryPlan={summaryPlan}
            files={files}
            mergedFiles={mergedFiles}
            onConfirm={handleConfirm}
            onMakeChanges={handleMakeChanges}
            onDownload={handleDownload}
            onRunApp={handleRunApp}
            isRunDisabled={phase !== "complete" || !projectId}
            isPreviewRunning={
              isPreviewStarting ||
              previewStatus === "installing" ||
              previewStatus === "starting"
            }
            confirmDisabled={isLoading}
            isLoading={isLoading}
            planIntro={planIntro}
            previewStatus={previewStatus}
            previewLastUpdated={previewLastUpdated}
            previewIframeKey={previewIframeKey}
            previewViewport={previewViewport}
            previewLogs={previewLogs}
            terminalOpen={terminalOpen}
            onToggleTerminal={() => setTerminalOpen((v) => !v)}
            onPreviewRefresh={handlePreviewRefresh}
            onPreviewRetry={handlePreviewRetry}
            onPreviewViewportChange={setPreviewViewport}
            chatMode={chatMode}
          />

          <div className="min-h-0 max-h-[35vh] shrink-0 overflow-y-auto border-t border-surface-border lg:hidden">
            <ChatMessages
              messages={messages}
              compact
              onPlanApprove={handlePlanApprove}
              onPlanModify={handlePlanModify}
              onDebugApply={handleDebugApply}
              appliedDebugMessageIds={appliedDebugMessageIds}
              actionsDisabled={isLoading}
            />
          </div>
        </div>

        <ChatPanel
          messages={messages}
          plan={plan}
          phase={phase}
          mergedFiles={mergedFiles}
          isLoading={isLoading}
          awaitingChanges={awaitingChanges}
          chatMode={chatMode}
          onModeChange={handleModeChange}
          inputDisabled={inputDisabled}
          isOpen={chatPanelOpen}
          collapsed={chatPanelCollapsed}
          onClose={() => setChatPanelOpen(false)}
          onToggleCollapse={() => setChatPanelCollapsed((v) => !v)}
          onSubmit={handleSubmit}
          onPlanApprove={handlePlanApprove}
          onPlanModify={handlePlanModify}
          onDebugApply={handleDebugApply}
          appliedDebugMessageIds={appliedDebugMessageIds}
          showBuild={showBuild}
          onBuild={handleConfirm}
          buildDisabled={isLoading}
        />
      </div>

      <div className="pointer-events-none fixed bottom-24 right-4 z-30 hidden md:block lg:hidden">
        <button
          type="button"
          onClick={() => setChatPanelOpen(true)}
          className="pointer-events-auto touch-target touch-press flex h-12 w-12 items-center justify-center rounded-full bg-accent text-white shadow-lg"
          aria-label="Open chat"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
          </svg>
        </button>
      </div>

      <div className="fixed inset-x-0 z-40 bottom-[calc(4rem+env(safe-area-inset-bottom,0px)+var(--keyboard-offset,0px))] md:hidden">
        <InputBox
          variant="panel"
          mobile
          onSubmit={handleSubmit}
          disabled={inputDisabled}
          isLoading={isLoading}
          phase={phase}
          awaitingChanges={awaitingChanges}
          chatMode={chatMode}
          onModeChange={handleModeChange}
          showBuild={showBuild}
          onBuild={handleConfirm}
          buildDisabled={isLoading}
        />
      </div>

      <BottomNav />

      <BottomSheet
        open={fileSheetOpen}
        onClose={() => setFileSheetOpen(false)}
        title="Files"
      >
        <SidebarContent
          mergedFiles={mergedFiles}
          selectedFileId={selectedFileId}
          activeFileId={activeFile?.id ?? null}
          onSelectFile={handleSelectFile}
        />
      </BottomSheet>

      <BottomSheet
        open={buildSheetOpen && isBuilding}
        onClose={() => setBuildSheetOpen(false)}
        title="Building"
        defaultSnap="half"
      >
        {codeFile && (
          <div className="h-full min-h-[200px]">
            <CodeViewer
              file={codeFile}
              code={viewerCode}
              activeFileId={activeFile?.id ?? null}
              currentRound={currentRound}
              statusMessage={statusMessage}
            />
          </div>
        )}
      </BottomSheet>

      <CodeViewerModal
        open={codeModalOpen}
        onClose={() => setCodeModalOpen(false)}
        file={codeFile}
        code={viewerCode}
        activeFileId={activeFile?.id ?? null}
        currentRound={currentRound}
        statusMessage={statusMessage}
      />

      <SlideDrawer open={navDrawerOpen} onClose={() => setNavDrawerOpen(false)} widthClass="w-64">
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-5">
          <Link href="/dashboard" className="flex items-center gap-2" onClick={() => setNavDrawerOpen(false)}>
            <span className="text-2xl font-light text-indigo-500">∞</span>
            <span className="text-lg font-semibold tracking-tight text-white">
              Refine<span className="text-indigo-500">AI</span>
            </span>
          </Link>
          <button
            type="button"
            className="touch-target rounded-lg p-1.5 text-gray-400"
            onClick={() => setNavDrawerOpen(false)}
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <SidebarNav activePath="/workspace" onNavigate={() => setNavDrawerOpen(false)} />
        <div className="mt-auto border-t border-white/10 p-4">
          <Link
            href="/workspace"
            onClick={() => setNavDrawerOpen(false)}
            className="flex min-h-[44px] w-full items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white"
          >
            New Project
          </Link>
        </div>
        </div>
      </SlideDrawer>
    </div>
  );
}
