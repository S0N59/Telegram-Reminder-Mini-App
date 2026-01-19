import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Слушаем на всех интерфейсах
    port: 5173,
    strictPort: false,
    // Разрешаем хосты для туннелей (ngrok, cloudflare, localtunnel и т.д.)
    allowedHosts: [
      '.ngrok.io',
      '.ngrok-free.app',
      '.ngrok.app',
      '.trycloudflare.com',
      '.loca.lt',
      '.serveo.net',
      'localhost',
      '127.0.0.1'
    ],
    // Настройки HMR для работы через туннели
    hmr: {
      clientPort: 443, // Для HTTPS туннелей
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false
  }
})
