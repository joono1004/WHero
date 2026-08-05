"use client";

import { Component } from "react";
import type { ReactNode } from "react";
import { reportClientError } from "./reportError.ts";

type Props = {
  children: ReactNode;
  // Which Screen was active when this boundary was rendered - passed down
  // from GameEntry so a crash report says where it happened.
  screen: string;
};

type State = {
  hasError: boolean;
};

// Catches render-time errors anywhere in the game tree so a bug shows a
// small recoverable message instead of a blank white screen, while also
// reporting it (see reportError.ts) so it's not just lost in the
// player's own console.
export class GameErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    reportClientError(error, { screen: this.props.screen, action: "render" });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-dvh flex-col items-center justify-center gap-3 bg-[#0b2028] p-4 text-center">
          <p className="text-sm text-[#c0cbc7]">문제가 발생했습니다.</p>
          <button
            type="button"
            className="rounded border border-[#d7b765] px-3 py-1.5 text-xs text-[#d7b765]"
            onClick={() => window.location.reload()}
          >
            새로고침
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
