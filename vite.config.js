import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Força o Vite a procurar os arquivos .env na pasta raiz do projeto.
  envDir: './',
})
