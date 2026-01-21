import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Configuración de proxy para evitar CORS en local
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:10000'
    }
  }
});
