import { Component, type ReactNode } from "react";

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
            <div className="card-glass rounded-3xl p-12 text-center max-w-md">
              <div className="text-5xl mb-4">⚠️</div>
              <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
              <p className="text-white/50 text-sm mb-4">
                The backend service isn't available yet. This page requires a
                connected Convex project to function.
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
