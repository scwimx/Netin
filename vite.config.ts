import path from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const raiz = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(raiz, "src"),
      "@compartido": path.resolve(raiz, "compartido"),
    },
  },
  build: { chunkSizeWarningLimit: 1500 },
  server: {
    port: Number(process.env.PORT ?? 5173),
    host: process.env.NETIN_HOST ?? "localhost",
    proxy: {
      "/api": `http://127.0.0.1:${process.env.NETIN_PUERTO ?? 4310}`,
    },
  },
});
