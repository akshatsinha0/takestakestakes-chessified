import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  root: '.', // Root directory containing index.html
  publicDir: './client/public', // Directory for static assets
  build: {
    outDir: 'dist', // Output directory within the client folder
    sourcemap: true, // Enable source maps for debugging production builds
    emptyOutDir: true // Clear output directory before building
  },
  optimizeDeps: {
    include: ['three'] // Pre-bundle Three.js for faster builds
  }
});
