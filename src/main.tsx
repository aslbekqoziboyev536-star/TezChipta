import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';
// registerSW({ immediate: true });
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
  document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
  });
  document.addEventListener('keydown', (e) => {
    if (
      e.key === 'F12' ||
      (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c')) ||
      (e.ctrlKey && (e.key === 'U' || e.key === 'u'))
    ) {
      e.preventDefault();
    }
  });
}
// import { Analytics } from '@vercel/analytics/react';
// import { SpeedInsights } from '@vercel/speed-insights/react';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    {/* <Analytics /> */}
    {/* <SpeedInsights /> */}
  </StrictMode>,
);
