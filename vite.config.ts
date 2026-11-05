import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
export default defineConfig({
  plugins: [react(), tailwindcss()],
  clearScreen: false,
  server: { port: 1420, host: "127.0.0.1", strictPort: true },
  envPrefix: ["VITE_", "TAURI_ENV_*"],
  build: { target: ["es2022", "safari15"], sourcemap: true },
  test: { include: ["tests/**/*.test.ts"] },
});
