"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  BuildPhase,
  ChatMessage,
  ChatMode,
  ClarifyingQuestion,
  DbFile,
  DbProject,
  DebugProposal,
  FileRoundEvent,
  ProjectClarifications,
  ProjectPlan,
  VisualPlanArtifacts,
} from "@/app/lib/agentTypes";
import { fetchStream } from "@/app/lib/streamClient";
import ToastStack, { useToastStack } from "./shell/ToastStack";
import { isFileTrulyComplete } from "@/app/lib/fileScoring";
import { getStoredMode, setStoredMode, isValidChatMode } from "@/app/lib/chatModes";
import { startBuild, runQualityPass, type OrchestratorControls } from "@/app/lib/buildOrchestrator";
import { partitionBuildQueue } from "@/app/lib/buildSpeed";
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
  getPlanSummaryMessage,
  getRevisionIntro,
} from "@/app/lib/planPresentation";
import { generateClarifyingQuestions } from "@/app/lib/visualPlanEngine";
import {
  normalizeLoadedPlan,
  safePlanIntro,
  safePlanSummary,
} from "@/app/lib/normalizePlan";
import { completionMessage, fileCompleteMessage, USER_MESSAGES } from "@/app/lib/userMessages";
import type { PreviewLogLine, PreviewStatus } from "@/app/lib/previewTypes";
import {
  buildSandpackFiles,
  canUseSandpackPreview,
  type SandpackTemplate,
} from "@/app/lib/previewSandpack";
import {
  deriveLoopEngineeringState,
  recordLoopIterationFromRound,
  resetLoopEngineeringState,
} from "@/app/lib/loopEngineeringState";
import type { PlanPhase } from "./PlanView";
import type { LoopIteration } from "@/app/lib/loopEngineeringTypes";
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
import PreviewOverlay from "./mobile/PreviewOverlay";
import CodeViewer from "./CodeViewer";
import LoopEngineeringPanel from "./loop/LoopEngineeringPanel";
import SidebarNav from "./shell/SidebarNav";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useVisualViewport, useIsMobile, useIsTablet } from "@/app/lib/useVisualViewport";
import {
  clearStoredActiveProjectId,
  getStoredActiveProjectId,
  setStoredActiveProjectId,
} from "@/app/lib/workspaceSession";

let msgCounter = 0;
function newId() {
  msgCounter += 1;
  return `msg-${msgCounter}-${Date.now()}`;
}

export default function AgentApp({
  initialProjectId,
  startFresh = false,
  initialIdea,
}: {
  initialProjectId?: string | null;
  startFresh?: boolean;
  initialIdea?: string | null;
} = {}) {
  const router = useRouter();
  const [projects, setProjects] = useState<DbProject[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatPanelOpen, setChatPanelOpen] = useState(false);
  const [chatPanelCollapsed, setChatPanelCollapsed] = useState(false);
  const [fileSheetOpen, setFileSheetOpen] = useState(false);
  const [codeModalOpen, setCodeModalOpen] = useState(false);
  const [navDrawerOpen, setNavDrawerOpen] = useState(false);
  const [buildSheetOpen, setBuildSheetOpen] = useState(false);
  const [previewOverlayOpen, setPreviewOverlayOpen] = useState(false);
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
  const [buildStarting, setBuildStarting] = useState(false);
  const [planIntro, setPlanIntro] = useState<string | null>(null);
  const [planMarkdown, setPlanMarkdown] = useState<string | null>(null);
  const [chatMode, setChatMode] = useState<ChatMode>("agent");
  const [awaitingPlanChanges, setAwaitingPlanChanges] = useState(false);
  const [planPhase, setPlanPhase] = useState<PlanPhase>("idle");
  const [clarifyingQuestions, setClarifyingQuestions] = useState<ClarifyingQuestion[]>([]);
  const [clarifications, setClarifications] = useState<ProjectClarifications>({});
  const [visualPlan, setVisualPlan] = useState<VisualPlanArtifacts | null>(null);
  const clarificationsRef = useRef<ProjectClarifications>({});
  const [appliedDebugMessageIds, setAppliedDebugMessageIds] = useState<Set<string>>(
    new Set()
  );

  useEffect(() => {
    setChatMode(getStoredMode());
    fetch("/api/settings")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.settings?.developer_mode) setDeveloperMode(true);
      })
      .catch(() => {});
  }, []);

  const handleModeChange = useCallback((mode: ChatMode) => {
    setChatMode(mode);
    setStoredMode(mode);
  }, []);

  const inputDisabled = useMemo(() => {
    if (isLoading || buildStarting) return true;
    if (chatMode === "ask") return false;
    if (chatMode === "debug") return !projectId;
    if (chatMode === "plan") return phase === "building" || phase === "complete";
    return phase === "complete" || (phase === "planning" && isLoading);
  }, [chatMode, isLoading, buildStarting, phase, projectId]);

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
  const [previewMode, setPreviewMode] = useState<"localhost" | "sandpack">("localhost");
  const [sandpackFiles, setSandpackFiles] = useState<Record<string, string | false> | null>(null);
  const [sandpackTemplate, setSandpackTemplate] = useState<SandpackTemplate>("react");
  const [sandpackEntry, setSandpackEntry] = useState("/index.js");
  const [sandpackDependencies, setSandpackDependencies] = useState<Record<string, string>>({
    react: "^18.2.0",
    "react-dom": "^18.2.0",
  });
  const [previewLogs, setPreviewLogs] = useState<PreviewLogLine[]>([]);
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [previewViewport, setPreviewViewport] = useState<"desktop" | "mobile">("desktop");
  const [previewLastUpdated, setPreviewLastUpdated] = useState<string | null>(null);
  const [previewIframeKey, setPreviewIframeKey] = useState(0);
  const [isPreviewStarting, setIsPreviewStarting] = useState(false);
  const wasPreviewRunningRef = useRef(false);

  const [loopIterations, setLoopIterations] = useState<LoopIteration[]>([]);
  const [buildStartedAt, setBuildStartedAt] = useState<number | null>(null);
  const [buildEndedAt, setBuildEndedAt] = useState<number | null>(null);
  const [goalMetFlash, setGoalMetFlash] = useState(false);
  const [goalMetScore, setGoalMetScore] = useState(0);
  const [reviewAccepted, setReviewAccepted] = useState(false);
  const [isComposerActive, setIsComposerActive] = useState(false);
  const [previewVerified, setPreviewVerified] = useState(false);
  const [buildTrainingExamples, setBuildTrainingExamples] = useState(0);
  const [developerMode, setDeveloperMode] = useState(false);
  const [showResumeBuild, setShowResumeBuild] = useState(false);
  const [memoryRounds, setMemoryRounds] = useState<
    Array<Pick<FileRoundEvent, "round" | "memoryContext">>
  >([]);
  const [latestMemory, setLatestMemory] = useState<string | null>(null);
  const { toasts, pushToast, dismissToast } = useToastStack();

  const showBuild = useMemo(() => {
    if (!plan || phase !== "awaiting_confirm") return false;
    if (showResumeBuild || buildStarting) return false;
    if (chatMode === "agent" && showConfirm) return true;
    if (chatMode === "plan") {
      const hasActions = messages.some((m) => m.metadata?.showPlanActions);
      const clarificationsDone =
        planPhase === "ready" ||
        messages.some((m) => m.metadata?.clarificationsComplete);
      return hasActions && clarificationsDone;
    }
    return false;
  }, [
    chatMode,
    showConfirm,
    phase,
    plan,
    messages,
    showResumeBuild,
    buildStarting,
    planPhase,
  ]);

  const buildAbortRef = useRef<AbortController | null>(null);
  const controlsRef = useRef<OrchestratorControls | null>(null);
  const activeFileIdRef = useRef<string | null>(null);
  const activeFilePathRef = useRef<string>("");
  const planRef = useRef<ProjectPlan | null>(null);
  const pendingAutoResumeRef = useRef(false);
  const resumeInFlightRef = useRef(false);
  const buildInFlightRef = useRef(false);

  const hidePlanActions =
    showResumeBuild ||
    buildStarting ||
    phase === "building" ||
    phase === "testing";

  useEffect(() => {
    planRef.current = plan;
  }, [plan]);

  const mergedFiles = useMemo(
    () => mergeProjectFiles(plan, files, projectId),
    [plan, files, projectId]
  );

  const originalPrompt = useMemo(() => {
    const firstUser = messages.find((m) => m.role === "user");
    if (firstUser?.content?.trim()) return firstUser.content.trim();
    if (plan?.description?.trim()) return plan.description.trim();
    return "";
  }, [messages, plan]);

  const loopAvgScore = useMemo(() => {
    const done = files.filter((f) => f.status === "done");
    if (done.length === 0) return 0;
    return Math.round(done.reduce((s, f) => s + f.score, 0) / done.length);
  }, [files]);

  const loopSnapshot = useMemo(
    () =>
      deriveLoopEngineeringState({
        phase,
        chatMode,
        isComposerActive,
        currentRound,
        loopIterations,
        buildStartedAt,
        buildEndedAt,
        goalMetFlash,
        reviewAccepted,
        avgScore: loopAvgScore,
      }),
    [
      phase,
      chatMode,
      isComposerActive,
      currentRound,
      loopIterations,
      buildStartedAt,
      buildEndedAt,
      goalMetFlash,
      reviewAccepted,
      loopAvgScore,
    ]
  );

  useEffect(() => {
    if (!goalMetFlash) return;
    const t = window.setTimeout(() => setGoalMetFlash(false), 2500);
    return () => window.clearTimeout(t);
  }, [goalMetFlash]);

  const trackLoopRound = useCallback((fileId: string, round: FileRoundEvent) => {
    if (round.task !== "review") return;
    const filePath =
      files.find((f) => f.id === fileId)?.file_path ?? activeFilePathRef.current;
    setLoopIterations((prev) => {
      const { iterations, goalMetFlash: flash } = recordLoopIterationFromRound(
        prev,
        filePath,
        round
      );
      if (flash) {
        setGoalMetFlash(true);
        setGoalMetScore(round.score);
      }
      return iterations;
    });
  }, [files]);

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

  const startSandpackPreview = useCallback(
    async (projectFiles: DbFile[]) => {
      if (projectId) {
        try {
          await fetch("/api/projects/wire-app", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ projectId }),
          });
          projectFiles = (await refreshFiles(projectId)) ?? projectFiles;
        } catch {
          // best-effort wiring before preview
        }
      }

      const bundle = buildSandpackFiles(projectFiles);
      if (!bundle) {
        setPreviewStatus("error");
        setCenterTab("preview");
        appendBuildMessage(USER_MESSAGES.previewError);
        pushToast("Preview failed — no buildable files found", false);
        return false;
      }

      setPreviewMode("sandpack");
      setSandpackFiles(bundle.files);
      setSandpackTemplate(bundle.template);
      setSandpackEntry(bundle.entry);
      setSandpackDependencies(bundle.dependencies);
      setPreviewStatus("running");
      setPreviewLastUpdated(new Date().toISOString());
      setPreviewIframeKey((k) => k + 1);
      wasPreviewRunningRef.current = true;
      appendBuildMessage(USER_MESSAGES.previewReady);
      setCenterTab("preview");
      setTerminalOpen(false);
      pushToast("Preview is live — check the Preview tab", false);
      return true;
    },
    [appendBuildMessage, projectId, refreshFiles, pushToast]
  );

  const handleRunApp = useCallback(async () => {
    if (!projectId) return;
    setIsPreviewStarting(true);
    setPreviewStatus("installing");
    setPreviewLogs([]);
    setCenterTab("preview");
    appendBuildMessage(USER_MESSAGES.startingApp);

    try {
      const projectFiles = await refreshFiles(projectId);

      // Prefer Sandpack on hosted deploys; also fallback when localhost preview is unavailable
      if (canUseSandpackPreview()) {
        await startSandpackPreview(projectFiles ?? files);
        return;
      }

      const response = await fetch("/api/preview/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });

      if (response.status === 403) {
        await startSandpackPreview(projectFiles ?? files);
        return;
      }

      if (!response.ok || !response.body) {
        if (await startSandpackPreview(projectFiles ?? files)) return;
        setPreviewStatus("error");
        pushToast("Could not start preview", false);
        return;
      }

      setPreviewMode("localhost");
      setTerminalOpen(true);

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
                pushToast("Preview failed to start", false);
              }
            }
          } catch {
            // skip malformed
          }
        }
      }
    } catch {
      const fallbackFiles = files.filter((f) => f.status === "done");
      if (await startSandpackPreview(fallbackFiles)) return;
      setPreviewStatus("error");
      appendBuildMessage(USER_MESSAGES.previewError);
      pushToast("Preview failed to start", false);
    } finally {
      setIsPreviewStarting(false);
    }
  }, [projectId, files, refreshFiles, appendBuildMessage, startSandpackPreview, pushToast]);

  const handlePreviewRefresh = useCallback(async () => {
    if (previewMode === "sandpack" && projectId) {
      const updated = await refreshFiles(projectId);
      await startSandpackPreview(updated ?? files);
      return;
    }
    setPreviewIframeKey((k) => k + 1);
    setPreviewLastUpdated(new Date().toISOString());
  }, [previewMode, projectId, refreshFiles, startSandpackPreview, files]);

  const handlePreviewRetry = useCallback(() => {
    handleRunApp();
  }, [handleRunApp]);

  const syncPreviewIfRunning = useCallback(async () => {
    if (!projectId || !wasPreviewRunningRef.current) return;

    if (previewMode === "sandpack" || canUseSandpackPreview()) {
      const updated = await refreshFiles(projectId);
      await startSandpackPreview(updated ?? files);
      return;
    }

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
  }, [projectId, previewMode, files, refreshFiles, startSandpackPreview]);

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
    buildInFlightRef.current = false;
    activeFileIdRef.current = null;
    setIsLoading(true);

    try {
      const res = await fetch(`/api/projects?id=${project.id}`);
      const data = await res.json();
      const loadedPlan = normalizeLoadedPlan(data.project?.plan);
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
          if (m.type === "chat" && mode === "plan") {
            const planMeta = normalizeLoadedPlan(m.metadata?.plan);
            const markdown = m.metadata?.planMarkdown as string | undefined;
            const awaitingBuild =
              project.status !== "complete" &&
              project.status !== "building" &&
              project.status !== "error";
            const hasMidBuildFiles = loadedFiles.some((f) =>
              ["building", "needs_fix"].includes(f.status)
            );
            return {
              id: m.id,
              role: m.role,
              content:
                planMeta && (markdown || m.metadata?.showPlanActions)
                  ? safePlanSummary(planMeta)
                  : m.content,
              type: "chat" as const,
              mode: "plan",
              metadata: {
                ...m.metadata,
                showPlanActions:
                  m.metadata?.showPlanActions === true &&
                  awaitingBuild &&
                  !hasMidBuildFiles,
              },
            };
          }
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
            const metaPlan = normalizeLoadedPlan(m.metadata?.plan);
            return {
              id: m.id,
              role: m.role,
              content: metaPlan
                ? safePlanIntro(metaPlan)
                : loadedPlan
                  ? safePlanIntro(loadedPlan)
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

      const planMdFromChat = loadedMessages.find(
        (m) => m.metadata?.planMarkdown
      )?.metadata?.planMarkdown as string | undefined;
      const planMdFromFile = loadedFiles.find((f) =>
        f.file_path.toLowerCase().endsWith("plan.md")
      )?.content;

      setProjectId(project.id);
      setStoredActiveProjectId(project.id);
      setPlan(loadedPlan);
      setPlanMarkdown(planMdFromChat ?? planMdFromFile ?? null);
      setPlanIntro(
        planMdFromChat || planMdFromFile || !loadedPlan
          ? null
          : safePlanIntro(loadedPlan)
      );
      setFiles(loadedFiles);
      setMessages(loadedMessages);

      const visualMsg = [...loadedMessages]
        .reverse()
        .find((m) => m.metadata?.visualPlan);
      const clarifyingMsg = [...loadedMessages]
        .reverse()
        .find((m) => m.metadata?.clarifyingQuestions);
      if (clarifyingMsg?.metadata?.clarifyingQuestions) {
        setClarifyingQuestions(
          clarifyingMsg.metadata.clarifyingQuestions as ClarifyingQuestion[]
        );
      }
      if (visualMsg?.metadata?.visualPlan) {
        setVisualPlan(visualMsg.metadata.visualPlan as VisualPlanArtifacts);
        setPlanPhase("ready");
        const vp = visualMsg.metadata.visualPlan as VisualPlanArtifacts;
        setClarifications(vp.clarifications);
        clarificationsRef.current = vp.clarifications;
      } else if (clarifyingMsg?.metadata?.clarifyingQuestions) {
        setPlanPhase("clarifying");
      } else {
        setVisualPlan(null);
        setPlanPhase("idle");
      }

      setSelectedFileId(null);
      setViewerCode("");
      setCenterTab("plan");

      if (project.status === "complete") {
        const needsQuality = loadedFiles.some(
          (f) => f.status === "done" && !isFileTrulyComplete(f)
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
                activeFilePathRef.current = file.file_path;
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
                trackLoopRound(fileId, round);
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
        const checkpoint = data.project?.build_checkpoint as
          | { completedFileIds?: string[] }
          | undefined;
        const hasProgress =
          (checkpoint?.completedFileIds?.length ?? 0) > 0 ||
          loadedFiles.some((f) =>
            ["done", "needs_fix", "best_effort", "building"].includes(f.status)
          );
        if (hasProgress) {
          pendingAutoResumeRef.current = true;
          setShowResumeBuild(false);
        } else {
          pendingAutoResumeRef.current = false;
          setShowResumeBuild(false);
        }
      } else {
        setPhase("awaiting_confirm");
        setShowConfirm(true);
      }
    } catch {
      setStatusMessage(USER_MESSAGES.fixing);
    } finally {
      setIsLoading(false);
    }
  }, [refreshFiles, trackLoopRound]);

  useEffect(() => {
    if (!projectId) return;
    setStoredActiveProjectId(projectId);
    if (typeof window === "undefined") return;
    const current = new URLSearchParams(window.location.search).get("projectId");
    if (current !== projectId) {
      router.replace(`/workspace?projectId=${encodeURIComponent(projectId)}`, {
        scroll: false,
      });
    }
  }, [projectId, router]);

  useEffect(() => {
    if (startFresh) {
      clearStoredActiveProjectId();
    }
  }, [startFresh]);

  useEffect(() => {
    if (initialProjectId || startFresh) return;

    const storedId = getStoredActiveProjectId();
    if (!storedId) return;

    router.replace(`/workspace?projectId=${encodeURIComponent(storedId)}`, {
      scroll: false,
    });
  }, [initialProjectId, startFresh, router]);

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

  const composerSeed =
    startFresh && initialIdea?.trim() ? initialIdea.trim() : undefined;

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
    async (text: string, options?: { submitClarifications?: boolean }) => {
      setIsLoading(true);
      setShowConfirm(false);
      setPhase("planning");
      if (!options?.submitClarifications) {
        setMessages((prev) => [
          ...prev,
          { id: newId(), role: "user", content: text, type: "chat", mode: "plan" },
        ]);
      }

      const clarificationAnswers = Object.entries(clarificationsRef.current).map(
        ([id, value]) => ({ id, value })
      );

      await fetchStream(
        "/api/modes/plan",
        {
          message: text,
          projectId: projectId ?? undefined,
          revise: awaitingPlanChanges && Boolean(plan),
          submitClarifications: options?.submitClarifications,
          clarificationAnswers: options?.submitClarifications
            ? clarificationAnswers
            : undefined,
        },
        (event) => {
          if (event.type === "status") {
            setStatusMessage(event.message);
          } else if (event.type === "plan_clarifying") {
            setProjectId(event.projectId);
            setAwaitingPlanChanges(false);
            setPlanPhase("clarifying");
            setClarifyingQuestions(event.questions);
            setClarifications(event.clarifications ?? {});
            clarificationsRef.current = event.clarifications ?? {};
            setPhase("planning");
            setMessages((prev) => [
              ...prev,
              {
                id: newId(),
                role: "assistant",
                content: "Answer a few quick questions so I can tailor your plan.",
                type: "chat",
                mode: "plan",
                metadata: {
                  clarifyingQuestions: event.questions,
                  clarificationsComplete: false,
                },
              },
            ]);
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
                metadata: { planQuestionOptions: event.options },
              },
            ]);
          } else if (event.type === "plan_ready") {
            setProjectId(event.projectId);
            setPlan(event.data.plan);
            setPlanMarkdown(event.data.markdown);
            setVisualPlan(event.data.visual);
            setPlanIntro(null);
            setPlanPhase("ready");
            setPhase("awaiting_confirm");
            setShowConfirm(false);
            setAwaitingPlanChanges(false);
            setCenterTab("plan");
            setMessages((prev) => [
              ...prev,
              {
                id: newId(),
                role: "assistant",
                content: event.data.visual.plainEnglish,
                type: "chat",
                mode: "plan",
                metadata: {
                  plan: event.data.plan,
                  planMarkdown: event.data.markdown,
                  visualPlan: event.data.visual,
                  showPlanActions: true,
                  clarificationsComplete: true,
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
    [projectId, awaitingPlanChanges, plan, refreshFiles, loadProjects]
  );

  const handleClarificationAnswer = useCallback((questionId: string, value: string) => {
    setClarifications((prev) => {
      const next = { ...prev, [questionId]: value };
      clarificationsRef.current = next;
      return next;
    });
  }, []);

  const handleClarificationsSubmit = useCallback(() => {
    handlePlanMode("Submit clarifications", { submitClarifications: true });
  }, [handlePlanMode]);

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
    setPlanPhase("clarifying");
    if (visualPlan?.clarifications) {
      setClarifications(visualPlan.clarifications);
      clarificationsRef.current = visualPlan.clarifications;
    }
    if (clarifyingQuestions.length === 0) {
      const target = originalPrompt || plan?.description || "Project";
      setClarifyingQuestions(generateClarifyingQuestions(target, plan?.niche));
    }
    setCenterTab("plan");
  }, [visualPlan, clarifyingQuestions.length, originalPrompt, plan]);

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
    if (!projectId || !plan || buildInFlightRef.current) return;
    buildInFlightRef.current = true;
    pendingAutoResumeRef.current = false;
    setBuildStarting(true);
    setShowConfirm(false);
    setIsLoading(true);
    setPhase("building");
    setCenterTab("plan");
    setBuildStartedAt(Date.now());
    setBuildEndedAt(null);
    setLoopIterations([]);
    setReviewAccepted(false);
    setGoalMetFlash(false);
    setPreviewVerified(false);
    setBuildTrainingExamples(0);
    setMemoryRounds([]);
    setLatestMemory(null);
    setShowResumeBuild(false);
    setMessages((prev) =>
      prev.map((m) =>
        m.metadata?.showPlanActions
          ? { ...m, metadata: { ...m.metadata, showPlanActions: false } }
          : m
      )
    );

    appendBuildMessage(USER_MESSAGES.building);

    try {
      const confirmRes = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, action: "confirm" }),
      });
      if (!confirmRes.ok) {
        throw new Error("Could not start build");
      }

      let currentFiles = await refreshFiles(projectId);
      const codeFiles = currentFiles.filter(
        (f) => !f.file_path.toLowerCase().endsWith("plan.md")
      );
      if (codeFiles.length === 0 && (plan.files?.length ?? 0) > 0) {
        const approveRes = await fetch("/api/modes/plan/approve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId }),
        });
        if (!approveRes.ok) {
          throw new Error("Could not prepare project files");
        }
        currentFiles = await refreshFiles(projectId);
      }

      const { build: buildQueue } = partitionBuildQueue(currentFiles);
      if (buildQueue.length === 0) {
        pushToast("No files queued to build — try approving the plan again.", false);
        setPhase("awaiting_confirm");
        setShowConfirm(true);
        buildInFlightRef.current = false;
        setBuildStarting(false);
        setIsLoading(false);
        return;
      }

      buildAbortRef.current = new AbortController();

      controlsRef.current = startBuild(
        projectId,
        currentFiles,
        {
          onStatus: setStatusMessage,
          onFileStart: (file) => {
            setBuildStarting(false);
            setIsLoading(false);
            activeFileIdRef.current = file.id;
            activeFilePathRef.current = file.file_path;
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
            trackLoopRound(fileId, round);
            if (round.memoryContext) {
              setLatestMemory(round.memoryContext);
              setMemoryRounds((prev) => [
                ...prev.filter((r) => r.round !== round.round),
                { round: round.round, memoryContext: round.memoryContext },
              ]);
            }
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
          onFileComplete: (fileId, score, trainingExamples, meta) => {
            if (trainingExamples) {
              setBuildTrainingExamples((n) => n + trainingExamples);
            }
            activeFileIdRef.current = null;
            setActiveFile(null);
            setFiles((prev) =>
              updateFileInList(prev, fileId, {
                status: meta?.status ?? "done",
                score,
                ai_score: meta?.aiScore ?? score,
                runtime_verified: meta?.runtimeVerified ?? false,
                runtime_errors: meta?.runtimeErrors,
              })
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
          onRetry: (message) => pushToast(message, true),
          onComplete: (finalPlan) => {
            buildInFlightRef.current = false;
            resumeInFlightRef.current = false;
            setSummaryPlan(finalPlan);
            setPhase("complete");
            setBuildEndedAt(Date.now());
            setBuildStarting(false);
            setIsLoading(false);
            setStatusMessage("");
            setActiveProgress(null);
            setActiveFile(null);
            setCenterTab("preview");
            refreshFiles(projectId).then((updated) => {
              const verified = (updated ?? []).filter((f) => isFileTrulyComplete(f));
              const avgScore =
                verified.length > 0
                  ? Math.round(verified.reduce((s, f) => s + f.score, 0) / verified.length)
                  : 0;
              appendBuildMessage(
                completionMessage(finalPlan.name, verified.length, avgScore)
              );
            });
            loadProjects();
            void handleRunApp();
            void fetch("/api/memory", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ projectId }),
            }).catch(() => {});
          },
          onPreviewVerified: (verified) => {
            setPreviewVerified(verified);
          },
        },
        buildAbortRef.current.signal
      );
    } catch {
      buildInFlightRef.current = false;
      setBuildStarting(false);
      setIsLoading(false);
      setPhase("awaiting_confirm");
      setShowConfirm(true);
      pushToast("Build could not start — try again.", false);
    }
  }, [
    projectId,
    plan,
    refreshFiles,
    loadProjects,
    selectedFileId,
    appendBuildMessage,
    trackLoopRound,
    handleRunApp,
    pushToast,
  ]);

  const handleResumeBuild = useCallback(async () => {
    if (!projectId || !plan || resumeInFlightRef.current || buildInFlightRef.current) {
      return;
    }
    resumeInFlightRef.current = true;
    buildInFlightRef.current = true;
    pendingAutoResumeRef.current = false;
    setBuildStarting(true);
    setIsLoading(true);
    setShowResumeBuild(false);
    setMessages((prev) =>
      prev.map((m) =>
        m.metadata?.showPlanActions
          ? { ...m, metadata: { ...m.metadata, showPlanActions: false } }
          : m
      )
    );

    let buildStarted = false;

    try {
      const res = await fetch("/api/projects/resume-build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });
      if (!res.ok) {
        setShowResumeBuild(true);
        return;
      }
      const data = await res.json();
      const remainingIds = new Set((data.remainingFileIds ?? []) as string[]);
      let currentFiles = await refreshFiles(projectId);
      const codeFiles = currentFiles.filter(
        (f) => !f.file_path.toLowerCase().endsWith("plan.md")
      );
      if (codeFiles.length === 0 && (plan.files?.length ?? 0) > 0) {
        const approveRes = await fetch("/api/modes/plan/approve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId }),
        });
        if (approveRes.ok) {
          currentFiles = await refreshFiles(projectId);
        }
      }

      const filesToBuild =
        remainingIds.size > 0
          ? currentFiles.filter((f) => remainingIds.has(f.id))
          : currentFiles.filter(
              (f) =>
                f.status !== "skipped" &&
                f.status !== "done" &&
                f.status !== "best_effort"
            );
      if (filesToBuild.length === 0) {
        setShowResumeBuild(true);
        return;
      }

      setPhase("building");
      setBuildStartedAt(Date.now());
      buildAbortRef.current = new AbortController();
      controlsRef.current = startBuild(
        projectId,
        filesToBuild,
        {
          onStatus: setStatusMessage,
          onFileStart: (file) => {
            setBuildStarting(false);
            setIsLoading(false);
            activeFileIdRef.current = file.id;
            setActiveFile(file);
            setSelectedFileId(file.id);
            setFiles((prev) =>
              syncFileIntoList(prev, { ...file, status: "building" })
            );
          },
          onRound: (fileId, event) => {
            const round = event.data;
            setCurrentRound(round);
            trackLoopRound(fileId, round);
            if (round.memoryContext) {
              setLatestMemory(round.memoryContext);
            }
          },
          onFileComplete: (fileId, score, trainingExamples, meta) => {
            setFiles((prev) =>
              updateFileInList(prev, fileId, {
                status: meta?.status ?? "done",
                score,
                ai_score: meta?.aiScore ?? score,
                runtime_verified: meta?.runtimeVerified ?? false,
              })
            );
            if (trainingExamples) {
              setBuildTrainingExamples((n) => n + trainingExamples);
            }
          },
          onRetry: (message) => pushToast(message, true),
          onComplete: (finalPlan) => {
            buildInFlightRef.current = false;
            resumeInFlightRef.current = false;
            setSummaryPlan(finalPlan);
            setPhase("complete");
            setBuildEndedAt(Date.now());
            setBuildStarting(false);
            setIsLoading(false);
            setStatusMessage("");
            loadProjects();
          },
          onPreviewVerified: setPreviewVerified,
        },
        buildAbortRef.current.signal
      );
      buildStarted = true;
    } catch {
      setShowResumeBuild(true);
      pushToast("Could not resume build — try again.", false);
    } finally {
      if (!buildStarted) {
        buildInFlightRef.current = false;
        resumeInFlightRef.current = false;
        setBuildStarting(false);
        setIsLoading(false);
      }
    }
  }, [projectId, plan, refreshFiles, trackLoopRound, loadProjects, pushToast]);

  useEffect(() => {
    if (!pendingAutoResumeRef.current) return;
    if (!projectId || !plan || phase !== "building") return;
    if (buildInFlightRef.current || resumeInFlightRef.current || buildStarting) return;
    pendingAutoResumeRef.current = false;
    pushToast("Resuming build...", false);
    void handleResumeBuild();
  }, [
    projectId,
    plan,
    phase,
    buildStarting,
    handleResumeBuild,
    pushToast,
  ]);

  const handlePlanApprove = useCallback(async () => {
    if (!projectId || !plan || buildInFlightRef.current) return;
    setMessages((prev) =>
      prev.map((m) =>
        m.metadata?.showPlanActions
          ? { ...m, metadata: { ...m.metadata, showPlanActions: false } }
          : m
      )
    );

    const approveRes = await fetch("/api/modes/plan/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId }),
    });
    if (!approveRes.ok) {
      pushToast("Could not prepare files — try again.", false);
      return;
    }

    await refreshFiles(projectId);
    await handleConfirm();
  }, [projectId, plan, refreshFiles, handleConfirm, pushToast]);

  const handleBuild = useCallback(() => {
    if (buildInFlightRef.current || buildStarting) return;
    if (showResumeBuild) {
      void handleResumeBuild();
      return;
    }
    if (chatMode === "plan") {
      void handlePlanApprove();
    } else {
      void handleConfirm();
    }
  }, [
    buildStarting,
    showResumeBuild,
    chatMode,
    handlePlanApprove,
    handleConfirm,
    handleResumeBuild,
  ]);

  const handleMakeChanges = useCallback(() => {
    if (chatMode === "plan") {
      handlePlanModify();
      return;
    }
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
  }, [chatMode, handlePlanModify]);

  const handleAcceptAll = useCallback(() => {
    setReviewAccepted(true);
  }, []);

  const handleLoopRequestChanges = useCallback(() => {
    const reset = resetLoopEngineeringState();
    setLoopIterations(reset.loopIterations);
    setBuildStartedAt(reset.buildStartedAt);
    setBuildEndedAt(reset.buildEndedAt);
    setGoalMetFlash(reset.goalMetFlash);
    setReviewAccepted(reset.reviewAccepted);
    setSummaryPlan(null);
    setPhase("idle");
    handleMakeChanges();
  }, [handleMakeChanges]);

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
  const showPreviewChip =
    isMobile &&
    (previewStatus === "running" ||
      previewStatus === "installing" ||
      previewStatus === "starting" ||
      phase === "complete");

  const chatLiveProps = {
    livePlan: plan,
    liveFiles: mergedFiles,
    phase,
    statusMessage,
    currentRound,
    activeFileName: activeFile?.file_name ?? activeProgress?.fileName ?? null,
    onPause: () => controlsRef.current?.pause(),
    onSkip: () => controlsRef.current?.skipCurrent(),
    clarifyingQuestions,
    clarifications,
    planPhase,
    onClarificationAnswer: handleClarificationAnswer,
    onClarificationsSubmit: handleClarificationsSubmit,
  };

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <MobileHeader
        showLogo
        building={isBuilding}
        disableLogoLink={isBuilding}
        onMenuClick={() => setNavDrawerOpen(true)}
        rightSlot={<FilesButton onClick={() => setFileSheetOpen(true)} />}
      />

      {/* Mobile: loop pill when not actively building (PlanChatCard covers progress) */}
      {!isBuilding && (
        <div className="md:hidden">
          <LoopEngineeringPanel
            snapshot={loopSnapshot}
            goalMetScore={goalMetScore}
            compact
          />
        </div>
      )}

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
          {/* Tablet/desktop: center plan+preview panel */}
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
            planMarkdown={planMarkdown}
            planPhase={planPhase}
            visualPlan={visualPlan}
            clarifyingQuestions={clarifyingQuestions}
            clarifications={clarifications}
            onClarificationAnswer={handleClarificationAnswer}
            onClarificationsSubmit={handleClarificationsSubmit}
            previewStatus={previewStatus}
            previewLastUpdated={previewLastUpdated}
            previewIframeKey={previewIframeKey}
            previewViewport={previewViewport}
            previewLogs={previewLogs}
            previewMode={previewMode}
            sandpackFiles={sandpackFiles}
            sandpackTemplate={sandpackTemplate}
            sandpackEntry={sandpackEntry}
            sandpackDependencies={sandpackDependencies}
            terminalOpen={terminalOpen}
            onToggleTerminal={() => setTerminalOpen((v) => !v)}
            onPreviewRefresh={handlePreviewRefresh}
            onPreviewRetry={handlePreviewRetry}
            onPreviewViewportChange={setPreviewViewport}
            chatMode={chatMode}
            loopSnapshot={loopSnapshot}
            goalMetScore={goalMetScore}
            reviewAccepted={reviewAccepted}
            previewVerified={previewVerified}
            onAcceptAll={handleAcceptAll}
            onLoopRequestChanges={handleLoopRequestChanges}
            originalPrompt={originalPrompt}
            projectId={projectId}
            trainingExamplesAdded={buildTrainingExamples}
            developerMode={developerMode}
            latestMemory={latestMemory}
            memoryRounds={memoryRounds}
            showResumeBuild={showResumeBuild}
            onResumeBuild={handleResumeBuild}
          />

          {/* Mobile: full-height chat (Cursor-style) */}
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:hidden">
            {showResumeBuild && (
              <div className="shrink-0 border-b border-amber-500/30 bg-amber-500/10 px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm text-amber-100">
                    Build paused after refresh — resume remaining files?
                  </p>
                  <button
                    type="button"
                    onClick={handleResumeBuild}
                    className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-black"
                  >
                    Resume build
                  </button>
                </div>
              </div>
            )}
            <div className="min-h-0 flex-1 overflow-y-auto">
              <ChatMessages
                messages={messages}
                mobile
                onPlanApprove={handlePlanApprove}
                onPlanModify={handlePlanModify}
                onPlanAnswer={handlePlanMode}
                onDebugApply={handleDebugApply}
                appliedDebugMessageIds={appliedDebugMessageIds}
                actionsDisabled={isLoading || buildStarting}
                hidePlanActions={hidePlanActions}
                {...chatLiveProps}
              />
            </div>
          </div>

          {/* Tablet: compact chat strip under center panel */}
          <div className="hidden min-h-0 max-h-[35vh] shrink-0 overflow-y-auto border-t border-surface-border md:block lg:hidden">
            <ChatMessages
              messages={messages}
              compact
              onPlanApprove={handlePlanApprove}
              onPlanModify={handlePlanModify}
              onPlanAnswer={handlePlanMode}
              onDebugApply={handleDebugApply}
              appliedDebugMessageIds={appliedDebugMessageIds}
              actionsDisabled={isLoading || buildStarting}
              hidePlanActions={hidePlanActions}
              {...chatLiveProps}
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
          onPlanAnswer={handlePlanMode}
          onClarificationAnswer={handleClarificationAnswer}
          onClarificationsSubmit={handleClarificationsSubmit}
          clarifyingQuestions={clarifyingQuestions}
          clarifications={clarifications}
          planPhase={planPhase}
          onDebugApply={handleDebugApply}
          appliedDebugMessageIds={appliedDebugMessageIds}
          showBuild={showBuild}
          onBuild={handleBuild}
          buildDisabled={isLoading || buildStarting}
          onComposerActivity={setIsComposerActive}
          initialValue={composerSeed}
          hidePlanActions={hidePlanActions}
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

      {/* Mobile Preview chip */}
      {showPreviewChip && (
        <button
          type="button"
          onClick={() => setPreviewOverlayOpen(true)}
          className="fixed bottom-[calc(8.5rem+env(safe-area-inset-bottom,0px)+var(--keyboard-offset,0px))] right-4 z-40 touch-press rounded-full border border-indigo-500/40 bg-indigo-600 px-3 py-2 text-xs font-medium text-white shadow-lg md:hidden"
        >
          Preview ▸
        </button>
      )}

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
          onBuild={handleBuild}
          buildDisabled={isLoading || buildStarting}
          onComposerActivity={setIsComposerActive}
          initialValue={composerSeed}
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

      <PreviewOverlay
        open={previewOverlayOpen}
        onClose={() => setPreviewOverlayOpen(false)}
        status={previewStatus}
        lastUpdated={previewLastUpdated}
        iframeKey={previewIframeKey}
        viewport={previewViewport}
        logs={previewLogs}
        terminalOpen={terminalOpen}
        previewMode={previewMode}
        sandpackFiles={sandpackFiles}
        sandpackTemplate={sandpackTemplate}
        sandpackEntry={sandpackEntry}
        sandpackDependencies={sandpackDependencies}
        onToggleTerminal={() => setTerminalOpen((v) => !v)}
        onRefresh={handlePreviewRefresh}
        onRetry={handlePreviewRetry}
        onViewportChange={setPreviewViewport}
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
            href="/workspace?new=1"
            onClick={() => setNavDrawerOpen(false)}
            className="flex min-h-[44px] w-full items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white"
          >
            New Project
          </Link>
        </div>
        </div>
      </SlideDrawer>
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
