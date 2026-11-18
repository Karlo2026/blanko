import '@fontsource/zilla-slab/latin-500.css';
import '@fontsource/zilla-slab/latin-600.css';
import '@fontsource/zilla-slab/latin-700.css';
import '@fontsource/kalam/latin-400.css';
import '@fontsource/kalam/latin-700.css';
import './styles.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.tsx';

const container = document.getElementById('root');
if (!container) {
  throw new Error('Element #root fehlt in index.html');
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
