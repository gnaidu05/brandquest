import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ConvexProvider } from "convex/react";
import { HashRouter } from "react-router-dom";
import { convex } from "./lib/convex";
import App from "./App";
import "./index.css";

function Root() {
  const content = (
    <HashRouter>
      <App />
    </HashRouter>
  );
  if (convex) {
    return <ConvexProvider client={convex}>{content}</ConvexProvider>;
  }
  return <>{content}</>;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Root />
  </StrictMode>
);
