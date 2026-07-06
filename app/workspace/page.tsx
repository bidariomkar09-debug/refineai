"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import LoadingState from "@/app/components/shell/LoadingState";
import WorkspaceErrorBoundary from "@/app/components/WorkspaceErrorBoundary";

const AgentApp = dynamic(() => import("@/app/components/AgentApp"), {
  ssr: false,
  loading: () => <LoadingState message="Loading workspace..." />,
});

function WorkspaceContent() {
  const searchParams = useSearchParams();
  const projectId =
    searchParams.get("projectId") ?? searchParams.get("projectid");
  const startFresh = searchParams.get("new") === "1";
  const initialIdea = searchParams.get("idea");
  return (
    <WorkspaceErrorBoundary>
      <AgentApp
        initialProjectId={projectId}
        startFresh={startFresh}
        initialIdea={initialIdea}
      />
    </WorkspaceErrorBoundary>
  );
}

export default function WorkspacePage() {
  return (
    <Suspense fallback={<LoadingState message="Loading workspace..." />}>
      <WorkspaceContent />
    </Suspense>
  );
}
