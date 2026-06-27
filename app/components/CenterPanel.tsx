"use client";

import type { ReactNode } from "react";
import type { BuildPhase, ChatMessage, DbFile, FileRoundEvent, ProjectPlan } from "@/app/lib/agentTypes";
import type { ExplorerFile } from "@/app/lib/mergeProjectFiles";
import ChatArea from "./ChatArea";
import InputBox from "./InputBox";
import CodeViewer from "./CodeViewer";

export type CenterTab = "chat" | "code";

type CenterPanelProps = {
  centerTab: CenterTab;
  onTabChange: (tab: CenterTab) => void;
  selectedFile: DbFile | null;
  viewerCode: string;
  activeFileId: string | null;
  currentRound: FileRoundEvent | null;
  messages: ChatMessage[];
  plan: ProjectPlan | null;
  phase: BuildPhase;
  statusMessage: string;
  showConfirm: boolean;
  activeProgress: { fileName: string; round: FileRoundEvent | null } | null;
  summaryPlan: ProjectPlan | null;
  files: DbFile[];
  mergedFiles: ExplorerFile[];
  onConfirm: () => void;
  onMakeChanges: () => void;
  onDownload: () => void;
  confirmDisabled: boolean;
  isLoading: boolean;
  onSubmit: (text: string) => void;
  awaitingChanges: boolean;
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
  currentRound,
  messages,
  plan,
  phase,
  statusMessage,
  showConfirm,
  activeProgress,
  summaryPlan,
  files,
  mergedFiles,
  onConfirm,
  onMakeChanges,
  onDownload,
  confirmDisabled,
  isLoading,
  onSubmit,
  awaitingChanges,
}: CenterPanelProps) {
  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <div className="flex shrink-0 border-b border-surface-border bg-surface-raised/50 px-2">
        <TabButton active={centerTab === "chat"} onClick={() => onTabChange("chat")}>
          Chat
        </TabButton>
        <TabButton active={centerTab === "code"} onClick={() => onTabChange("code")}>
          Code
        </TabButton>
      </div>

      <div className="relative min-h-0 flex-1">
        <div
          className={`absolute inset-0 flex flex-col motion-safe:transition-opacity duration-200 ${
            centerTab === "chat" ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
        >
          <ChatArea
            messages={messages}
            plan={plan}
            phase={phase}
            statusMessage={statusMessage}
            showConfirm={showConfirm}
            activeProgress={activeProgress}
            summaryPlan={summaryPlan}
            files={files}
            mergedFiles={mergedFiles}
            activeFileId={activeFileId}
            onConfirm={onConfirm}
            onMakeChanges={onMakeChanges}
            onDownload={onDownload}
            confirmDisabled={confirmDisabled}
            isLoading={isLoading}
          />
          <InputBox
            onSubmit={onSubmit}
            disabled={isLoading || phase === "complete" || (phase === "planning" && isLoading)}
            isLoading={isLoading}
            phase={phase}
            awaitingChanges={awaitingChanges}
          />
        </div>

        <div
          className={`absolute inset-0 motion-safe:transition-opacity duration-200 ${
            centerTab === "code" ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
        >
          <CodeViewer
            file={selectedFile}
            code={viewerCode}
            activeFileId={activeFileId}
            currentRound={currentRound}
          />
        </div>
      </div>
    </div>
  );
}
