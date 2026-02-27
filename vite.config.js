// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react({
      // Enable fast refresh
      fastRefresh: true,
      // Exclude problematic dependencies
      exclude: /\.stories\.(t|j)sx?$/,
    })
  ],
  server: {
    port: 5173,
    strictPort: true,
    host: true, // Listen on all addresses
    hmr: {
      protocol: 'ws',
      host: 'localhost',
      port: 5173,
      // Increase timeout for slower machines
      timeout: 5000,
      // Force HMR to work
      overlay: true,
    },
    watch: {
      // Use polling for better compatibility
      usePolling: true,
      interval: 1000,
      // Ignore node_modules
      ignored: ['**/node_modules/**', '**/dist/**'],
    },
    // Force cache clear
    force: true,
  },
  optimizeDeps: {
    // Force include these dependencies
    include: [
      'react', 
      'react-dom', 
      'react-router-dom',
      'lucide-react',
      '@supabase/supabase-js'
    ],
    // Force exclude problematic packages
    exclude: [],
    // Enable esbuild optimizations
    esbuildOptions: {
      target: 'es2020',
    },
  },
  build: {
    // Enable source maps for better debugging
    sourcemap: true,
    // Rollup optimizations
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
  // Clear cache on start
  clearScreen: false,
})