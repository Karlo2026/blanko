import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  // Relative Pfade, damit die App auch unter einem Unterpfad (z. B. GitHub Pages) läuft.
  base: './',
  plugins: [react()],
});
