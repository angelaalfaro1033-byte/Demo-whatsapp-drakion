import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// El proxy evita problemas de CORS: el frontend llama a /api y Vite lo reenvía al backend.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { "/api": "http://localhost:3001" },
  },
});
