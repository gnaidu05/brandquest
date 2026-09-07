import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  // Relative, so the build works at whatever path it is served from. Baking in
  // "/<repo>/" meant renaming the repository broke every asset URL until a
  // fresh deploy caught up; with "./" the same bundle serves from any prefix.
  base: "./",
  plugins: [react(), tailwindcss()],
  server: { host: "0.0.0.0", hmr: false },
  build: { outDir: "dist", assetsDir: "assets" },
});
