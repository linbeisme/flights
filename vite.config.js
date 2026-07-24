import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // During local development, proxy /api/* to a locally running
  // `wrangler pages dev` instance so the Cloudflare Functions work.
  server: {
    proxy: {
      "/api": "http://127.0.0.1:8788",
    },
  },
});
