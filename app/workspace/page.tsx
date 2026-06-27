"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import LoadingState from "@/app/components/shell/LoadingState";

const AgentApp = dynamic(() => import("@/app/components/AgentApp"), {
  ssr: false,
  loading: () => <LoadingState message="Loading workspace..." />,
});

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
