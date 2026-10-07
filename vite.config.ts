import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => ({
  base: mode === "production" ? "/bella-card-game/" : "/",
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: "index.html",
        gacha: "gacha/index.html",
      },
    },
  },
}));
