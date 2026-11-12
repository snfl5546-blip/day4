import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    // 개발 중에는 /api/* 를 Day4 백엔드(8001)로 넘겨 준다 → 같은 출처라 CORS 설정이 필요 없다
    //   backend 폴더에서: python -m uvicorn main:app --port 8001
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
