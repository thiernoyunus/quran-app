import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // GitHub Pages serves the site from thiernoyunus.github.io/quran-app/
  base: '/quran-app/',
  // quran-text finds its bundled text and font next to itself, so it must not be pre-bundled.
  optimizeDeps: { exclude: ['@quran.ws/text'] },
})
