import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './core/system.css';
import { registerWebPushServiceWorker } from './core/push/webPush';
import { initializeSystemScheduler } from './core/systemScheduler';
import { initializeBuiltInWidgets } from './core/widgets';

if (typeof window !== 'undefined') {
  const win = window as Window & { __BAOBAOBAIPHONE_RO_WARN_FILTER__?: boolean };
  if (!win.__BAOBAOBAIPHONE_RO_WARN_FILTER__) {
    win.__BAOBAOBAIPHONE_RO_WARN_FILTER__ = true;
    window.addEventListener('error', (event) => {
      if (
        typeof event.message === 'string' &&
        event.message.includes('ResizeObserver loop completed with undelivered notifications.')
      ) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    });
  }
}

initializeBuiltInWidgets();
initializeSystemScheduler();
void registerWebPushServiceWorker();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
