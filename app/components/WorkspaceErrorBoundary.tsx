"use client";

import type { ReactNode } from "react";
import { Component } from "react";

type Props = { children: ReactNode; fallbackTitle?: string };
type State = { error: Error | null };

export default class WorkspaceErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-[#0d0d0d] px-6 text-center">
          <h1 className="text-lg font-semibold text-white">
            {this.props.fallbackTitle ?? "Something went wrong"}
          </h1>
          <p className="mt-2 max-w-md text-sm text-gray-400">
            The workspace hit an error. Refresh the page or start a new project.
          </p>
          <button
            type="button"
            onClick={() => {
              this.setState({ error: null });
              window.location.href = "/workspace?new=1";
            }}
            className="mt-6 rounded-xl bg-accent px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-600"
          >
            Start fresh
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
