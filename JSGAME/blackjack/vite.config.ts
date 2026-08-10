import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // GitHub Pages serves this app from a repository subdirectory.
  base: "./",
  plugins: [
    react(),
    {
      name: "relax-csp-during-local-development",
      transformIndexHtml(html, context) {
        const buildableHtml = html.replace(/\s*<meta http-equiv="refresh"[^>]*\/>/, "");
        // Production keeps the strict CSP from index.html. During Vite development,
        // remove the meta policy so LAN/Radmin Worker addresses can be tested.
        return context.server
          ? buildableHtml.replace(/\s*<meta http-equiv="Content-Security-Policy"[^>]*\/>/, "")
          : buildableHtml;
      },
    },
  ],
  server: {
    host: "0.0.0.0",
    allowedHosts: [".trycloudflare.com"],
  },
});
