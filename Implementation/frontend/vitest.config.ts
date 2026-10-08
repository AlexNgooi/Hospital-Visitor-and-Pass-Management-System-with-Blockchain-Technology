import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Component tests inject auth/fetch explicitly; no real backend or production credentials.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
  },
});
