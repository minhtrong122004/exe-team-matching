import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [tailwindcss(), react()],
  server: {
    proxy: {
      '/api': {
        target: process.env.VITE_GATEWAY_URL || 'http://localhost:5000',
        changeOrigin: true,
        ws: true,
      },
      '/hubs': {
        target: process.env.VITE_GATEWAY_URL || 'http://localhost:5000',
        changeOrigin: true,
        ws: true,
      },
    },
  },
})
