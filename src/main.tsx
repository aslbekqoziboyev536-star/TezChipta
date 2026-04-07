import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Register PWA service worker
registerSW({ immediate: true });

// Suppress benign Vite/WebSocket errors in the AI Studio environment
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    if (event.reason && (
      event.reason.message?.includes('WebSocket') || 
      event.reason.message?.includes('vite') ||
      event.reason.toString().includes('WebSocket')
    )) {
      event.preventDefault();
      console.warn('Suppressed benign Vite/WebSocket error:', event.reason);
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
