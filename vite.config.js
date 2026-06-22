import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base: './' so the built site works from any sub-path (e.g. GitHub Pages)
export default defineConfig({
  plugins: [react()],
  base: './',
})
