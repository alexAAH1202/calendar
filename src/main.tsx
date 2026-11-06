import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { startPwa } from './wall/pwa';
import '@fontsource-variable/nunito';
import './styles.css';

// No long-press context menu anywhere on the wall screen.
window.addEventListener('contextmenu', (e) => e.preventDefault());

startPwa();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
