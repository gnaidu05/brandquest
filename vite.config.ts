import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  base: "/brandquest/",
  plugins: [react(), tailwindcss()],
  server: { host: "0.0.0.0", hmr: false },
  build: { outDir: "dist", assetsDir: "assets" },
});
