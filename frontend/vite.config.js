import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages: set VITE_BASE_PATH='/repo-name/' in env
const basePath = process.env.VITE_BASE_PATH || '/';

export default defineConfig({
  base: basePath,
  plugins: [react()],
  server: {
    port: 8080,
    open: true,
    // Docker Desktop on Windows doesn't propagate native fs-change events
    // across the bind mount, so chokidar's default watcher silently misses
    // edits and keeps serving a stale bundle. Poll instead.
    watch: { usePolling: true, interval: 300 },
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
    },
    // Proxy API calls to the FastAPI backend during local dev so relative
    // '/api/...' fetches (e.g. /api/auth/ldap-login) reach it.
    proxy: {
      '/api': {
        target: process.env.VITE_API_TARGET || 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    // ═══ Content-Hash Filenames for Cache Busting ═══
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
    // Split DuckDB wasm into its own chunk (large, rarely changes)
    chunkSizeWarningLimit: 1500,
    sourcemap: false,
    target: 'esnext',
    minify: 'esbuild',
  },
});
