import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

console.log("helllllo", path.resolve(__dirname, "src"));
// https://vite.dev/config/
export default defineConfig({
  base: "./",
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  optimizeDeps: { exclude: ["fsevents"] },
});
