import { StrictMode, Component, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import App from "./App";
import "./index.css";

class ErrorBoundary extends Component<{ children: ReactNode }, { error: string | null }> {
  state = { error: null as string | null };
  static getDerivedStateFromError(e: unknown) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0b0e1a", color: "#fff", fontFamily: "system-ui", padding: 24 }}>
          <div style={{ maxWidth: 500, textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
            <h2 style={{ fontSize: 20, marginBottom: 8 }}>Something went wrong</h2>
            <p style={{ color: "#94a3b8", fontSize: 14, marginBottom: 16 }}>{this.state.error}</p>
            <button onClick={() => { this.setState({ error: null }); window.location.reload(); }} style={{ padding: "8px 24px", borderRadius: 12, background: "#46178f", color: "#fff", border: "none", cursor: "pointer", fontSize: 14 }}>
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <HashRouter>
        <App />
      </HashRouter>
    </ErrorBoundary>
  </StrictMode>
);
