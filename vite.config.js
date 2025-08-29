// filepath: /workspaces/UAICODE/uaidecants.github.io/vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  root: '.', // Garante que a raiz é o diretório atual
  server: {
    host:  true,
    port: 5173,
    watch: {
      usePolling: true,
    },
  },
});