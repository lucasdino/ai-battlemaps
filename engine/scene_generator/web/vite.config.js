import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
    host: true,
    cors: true,
    fs: {
      // Allow serving files from one level up to the project root
      allow: ['..']
    }
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true
  }
}); 