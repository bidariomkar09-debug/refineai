"use client";

import type { ReactNode } from "react";
import type { BuildPhase, DbFile, FileRoundEvent, ProjectPlan } from "@/app/lib/agentTypes";
import type { ExplorerFile } from "@/app/lib/mergeProjectFiles";
import type { PreviewLogLine, PreviewStatus } from "@/app/lib/previewTypes";
import PlanView from "./PlanView";
import CodeViewer from "./CodeViewer";
import PreviewPanel from "./PreviewPanel";

export type CenterTab = "plan" | "code" | "preview";

type CenterPanelProps = {
  centerTab: CenterTab;
  onTabChange: (tab: CenterTab) => void;
  selectedFile: DbFile | null;
  viewerCode: string;
  activeFileId: string | null;
  activeFile: DbFile | null;
  currentRound: FileRoundEvent | null;
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
  previewStatus: PreviewStatus;
  previewLastUpdated: string | null;
  previewIframeKey: number;
  previewViewport: "desktop" | "mobile";
  previewLogs: PreviewLogLine[];
  terminalOpen: boolean;
  onToggleTerminal: () => void;
  onPreviewRefresh: () => void;
  onPreviewRetry: () => void;
  onPreviewViewportChange: (v: "desktop" | "mobile") => void;
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
      className={`relative px-4 py-2.5 text-sm font-medium transition-colors ${
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
  selectedFile,
  viewerCode,
  activeFileId,
  activeFile,
  currentRound,
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
  previewStatus,
  previewLastUpdated,
  previewIframeKey,
  previewViewport,
  previewLogs,
  terminalOpen,
  onToggleTerminal,
  onPreviewRefresh,
  onPreviewRetry,
  onPreviewViewportChange,
}: CenterPanelProps) {
  const codeFile = activeFile ?? selectedFile;

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <div className="flex shrink-0 border-b border-surface-border bg-surface-raised/50 px-2">
        <TabButton active={centerTab === "plan"} onClick={() => onTabChange("plan")}>
          Plan
        </TabButton>
        <TabButton active={centerTab === "code"} onClick={() => onTabChange("code")}>
          Code
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
            showConfirm={showConfirm}
            mergedFiles={mergedFiles}
            activeFileId={activeFileId}
            files={files}
            isLoading={isLoading}
            onConfirm={onConfirm}
            onMakeChanges={onMakeChanges}
            onDownload={onDownload}
            onRunApp={onRunApp}
            isRunDisabled={isRunDisabled}
            isPreviewRunning={isPreviewRunning}
            confirmDisabled={confirmDisabled}
          />
        </div>

        <div
          className={`absolute inset-0 motion-safe:transition-opacity duration-200 ${
            centerTab === "code" ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
        >
          <CodeViewer
            file={codeFile}
            code={viewerCode}
            activeFileId={activeFileId}
            currentRound={currentRound}
            statusMessage={statusMessage}
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
