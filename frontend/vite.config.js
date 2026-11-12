import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // 백엔드 CORS(FRONT_ORIGINS)에 등록한 주소와 같게 5173 고정
  server: { port: 5173, strictPort: true },
})
