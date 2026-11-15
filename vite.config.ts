import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Fonts are loaded from Google Fonts (index.html) — CJK fonts are subset on demand there.
// GitHub Pages serves this repo at https://znxuyz.github.io/S.H.O.W.-Case/
export default defineConfig({
  base: '/S.H.O.W.-Case/',
  plugins: [react(), tailwindcss()],
  build: {
    chunkSizeWarningLimit: 1000,
  },
});
