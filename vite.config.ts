import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom", "react-router-dom"],
          map: ["leaflet", "react-leaflet"],
          ui: ["radix-ui", "vaul", "sonner", "i18next", "react-i18next"],
        },
      },
    },
  },
  server: {
    proxy: {
      "/api": "http://localhost:5050",
      "/uploads": "http://localhost:5050",
    },
  },
});
