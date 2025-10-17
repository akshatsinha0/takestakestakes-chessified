import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  root: '.', // Root directory containing index.html
  publicDir: './public', // Directory for static assets
  build: {
    outDir: 'dist', // Output directory
    sourcemap: true, // Enable source maps for debugging production builds
    emptyOutDir: true, // Clear output directory before building
    chunkSizeWarningLimit: 1000, // Increase limit to 1000 KB
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'mui-vendor': ['@mui/material', '@mui/icons-material', '@emotion/react', '@emotion/styled'],
          'chess-vendor': ['chess.js', 'react-chessboard'],
          'three-vendor': ['three'],
          'supabase-vendor': ['@supabase/supabase-js'],
          'utils': ['react-toastify']
        }
      }
    }
  },
  optimizeDeps: {
    include: ['three', 'chess.js', '@supabase/supabase-js'] // Pre-bundle for faster builds
  }
});
