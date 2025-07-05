import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        // Critical for CSRF cookies to work with proxy
        cookieDomainRewrite: {
          "*": "", // Remove domain restriction
        },
        cookiePathRewrite: {
          "*": "/", // Ensure path is root
        },
      },
    },
  },
}) 