import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    sourcemap: true,
    outDir: '../dist',
    emptyOutDir: true,
    commonjsOptions: {
    transformMixedEsModules: true,
    }
  },
  root: './client',
  publicDir: './client/public',
  optimizeDeps: {
    include: ['three']
  }
})
