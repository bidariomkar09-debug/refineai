"use client";

import type { ReactNode } from "react";
import type { BuildPhase, ChatMode, DbFile, ProjectPlan } from "@/app/lib/agentTypes";
import type { ExplorerFile } from "@/app/lib/mergeProjectFiles";
import type { PreviewLogLine, PreviewStatus } from "@/app/lib/previewTypes";
import PlanView from "./PlanView";
import PreviewPanel from "./PreviewPanel";
import type { SandpackTemplate } from "@/app/lib/previewSandpack";
import type { LoopEngineeringSnapshot } from "@/app/lib/loopEngineeringTypes";
import LoopEngineeringPanel from "./loop/LoopEngineeringPanel";

export type CenterTab = "plan" | "preview";

type CenterPanelProps = {
  centerTab: CenterTab;
  onTabChange: (tab: CenterTab) => void;
  plan: ProjectPlan | null;
  phase: BuildPhase;
  statusMessage: string;
  showConfirm: boolean;
  summaryPlan: ProjectPlan | null;
  files: DbFile[];
  mergedFiles: ExplorerFile[];
  onConfirm: () => void;
  onMakeChanges: () => void;
  onDownload: () => void;
  onRunApp: () => void;
  isRunDisabled: boolean;
  isPreviewRunning: boolean;
  confirmDisabled: boolean;
  isLoading: boolean;
  planIntro: string | null;
  planMarkdown?: string | null;
  previewStatus: PreviewStatus;
  previewLastUpdated: string | null;
  previewIframeKey: number;
  previewViewport: "desktop" | "mobile";
  previewLogs: PreviewLogLine[];
  previewMode?: "localhost" | "sandpack";
  sandpackFiles?: Record<string, string | false> | null;
  sandpackTemplate?: SandpackTemplate;
  sandpackEntry?: string;
  sandpackDependencies?: Record<string, string>;
  terminalOpen: boolean;
  onToggleTerminal: () => void;
  onPreviewRefresh: () => void;
  onPreviewRetry: () => void;
  onPreviewViewportChange: (v: "desktop" | "mobile") => void;
  chatMode?: ChatMode;
  loopSnapshot: LoopEngineeringSnapshot;
  goalMetScore: number;
  reviewAccepted: boolean;
  onAcceptAll: () => void;
  onLoopRequestChanges: () => void;
};

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative min-h-[44px] shrink-0 px-4 py-2.5 text-sm font-medium transition-colors ${
        active ? "text-white" : "text-gray-500 hover:text-gray-300"
      }`}
    >
      {children}
      {active && (
        <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-accent" />
      )}
    </button>
  );
}

export default function CenterPanel({
  centerTab,
  onTabChange,
  plan,
  phase,
  statusMessage,
  showConfirm,
  summaryPlan,
  files,
  mergedFiles,
  onConfirm,
  onMakeChanges,
  onDownload,
  onRunApp,
  isRunDisabled,
  isPreviewRunning,
  confirmDisabled,
  isLoading,
  planIntro,
  planMarkdown,
  previewStatus,
  previewLastUpdated,
  previewIframeKey,
  previewViewport,
  previewLogs,
  previewMode = "localhost",
  sandpackFiles,
  sandpackTemplate = "react",
  sandpackEntry = "/index.js",
  sandpackDependencies,
  terminalOpen,
  onToggleTerminal,
  onPreviewRefresh,
  onPreviewRetry,
  onPreviewViewportChange,
  chatMode = "agent",
  loopSnapshot,
  goalMetScore,
  reviewAccepted,
  onAcceptAll,
  onLoopRequestChanges,
}: CenterPanelProps) {
  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <LoopEngineeringPanel snapshot={loopSnapshot} goalMetScore={goalMetScore} />

      <div className="flex shrink-0 overflow-x-auto border-b border-surface-border bg-surface-raised/50 px-2">
        <TabButton active={centerTab === "plan"} onClick={() => onTabChange("plan")}>
          Plan
        </TabButton>
        <TabButton active={centerTab === "preview"} onClick={() => onTabChange("preview")}>
          Preview
        </TabButton>
      </div>

      <div className="relative min-h-0 flex-1">
        <div
          className={`absolute inset-0 motion-safe:transition-opacity duration-200 ${
            centerTab === "plan" ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
        >
          <PlanView
            plan={plan}
            summaryPlan={summaryPlan}
            phase={phase}
            statusMessage={statusMessage}
            showConfirm={showConfirm && chatMode === "agent"}
            mergedFiles={mergedFiles}
            files={files}
            isLoading={isLoading}
            planIntro={planIntro}
            planMarkdown={planMarkdown}
            onConfirm={onConfirm}
            onMakeChanges={onMakeChanges}
            onDownload={onDownload}
            onRunApp={onRunApp}
            isRunDisabled={isRunDisabled}
            isPreviewRunning={isPreviewRunning}
            confirmDisabled={confirmDisabled}
            reviewAccepted={reviewAccepted}
            loopSnapshot={loopSnapshot}
            onAcceptAll={onAcceptAll}
            onLoopRequestChanges={onLoopRequestChanges}
          />
        </div>

        <div
          className={`absolute inset-0 motion-safe:transition-opacity duration-200 ${
            centerTab === "preview" ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
        >
          <PreviewPanel
            status={previewStatus}
            lastUpdated={previewLastUpdated}
            iframeKey={previewIframeKey}
            viewport={previewViewport}
            logs={previewLogs}
            previewMode={previewMode}
            sandpackFiles={sandpackFiles}
            sandpackTemplate={sandpackTemplate}
            sandpackEntry={sandpackEntry}
            sandpackDependencies={sandpackDependencies}
            terminalOpen={terminalOpen}
            onToggleTerminal={onToggleTerminal}
            onRefresh={onPreviewRefresh}
            onRetry={onPreviewRetry}
            onViewportChange={onPreviewViewportChange}
          />
        </div>
      </div>
    </div>
  );
}
