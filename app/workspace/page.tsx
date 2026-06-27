"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import AgentApp from "@/app/components/AgentApp";
import LoadingState from "@/app/components/shell/LoadingState";

function WorkspaceContent() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get("projectId");
  return <AgentApp initialProjectId={projectId} />;
}

export default function WorkspacePage() {
  return (
    <Suspense fallback={<LoadingState message="Loading workspace..." />}>
      <WorkspaceContent />
    </Suspense>
  );
}
