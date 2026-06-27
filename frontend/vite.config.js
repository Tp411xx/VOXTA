import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const apiProxyTarget =
  process.env.VITE_API_PROXY_TARGET || "http://localhost:5001";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    proxy: {
      "/api": {
        target: apiProxyTarget,
        changeOrigin: true,
      },
      "/socket.io": {
        target: apiProxyTarget,
        ws: true,
      },
    },
  },
});
