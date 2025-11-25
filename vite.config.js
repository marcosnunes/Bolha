import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // Agrupa todas as dependências de node_modules em um único chunk 'vendor'
            // Módulos grandes e mais complexos podem ser separados em seus próprios chunks
            if (id.includes('@mui')) {
              return 'vendor_mui';
            }
            if (id.includes('firebase')) {
              return 'vendor_firebase';
            }
            if (id.includes('react-router-dom') || id.includes('react-dom') || id.includes('react')) {
                return 'vendor_react';
            }
            return 'vendor'; // chunk para todas as outras dependências
          }
        },
      },
    },
  },
});
