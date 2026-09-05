import { Component, type ReactNode } from "react";
import { AlertIcon } from "./Icons";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="min-h-screen flex items-center justify-center px-4">
            <div className="card max-w-md rounded-2xl p-10 text-center">
              <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-lime/25 bg-lime/10 text-lime"><AlertIcon size={26} /></span>
              <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
              <p className="mb-4 text-sm text-slate-300">
                We couldn't load this page. Check your connection and try
                again — if it keeps happening, the game may no longer exist.
              </p>
              <button
                onClick={() => this.setState({ hasError: false })}
                className="px-6 py-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-sm"
              >
                Try Again
              </button>
            </div>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
