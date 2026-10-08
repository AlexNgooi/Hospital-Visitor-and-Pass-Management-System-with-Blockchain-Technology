import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Preserve /api path, status, body and Set-Cookie; do not turn backend errors into SPA HTML.
export default defineConfig({
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    headers: { "Referrer-Policy": "no-referrer", "Cache-Control": "no-store" },
    proxy: {
      "^/api(?:/|$)": {
        target: process.env.HSAAS_BACKEND_ORIGIN ?? "http://127.0.0.1:8080",
        changeOrigin: false,
      },
    },
  },
  preview: {
    host: "127.0.0.1",
    headers: { "Referrer-Policy": "no-referrer", "Cache-Control": "no-store" },
    proxy: {
      "^/api(?:/|$)": {
        target: process.env.HSAAS_BACKEND_ORIGIN ?? "http://127.0.0.1:8080",
        changeOrigin: false,
      },
    },
  },
});
