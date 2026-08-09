import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // GitHub Pages serves this app from a repository subdirectory.
  base: "./",
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    allowedHosts: [".trycloudflare.com"],
  },
});
