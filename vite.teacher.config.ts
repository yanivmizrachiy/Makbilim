import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  publicDir: 'public',
  build: {
    target: 'es2022',
    sourcemap: true,
    outDir: 'dist-teacher',
    emptyOutDir: true,
    rollupOptions: {
      input: 'teacher.html',
    },
  },
});
