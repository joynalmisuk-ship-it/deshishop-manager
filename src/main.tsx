import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

const appBase = import.meta.env.BASE_URL.replace(/\/$/, '');

if (appBase) {
  const originalFetch = window.fetch.bind(window);

  window.fetch = (input, init) => {
    if (typeof input === 'string' && input.startsWith('/api/')) {
      return originalFetch(`${appBase}${input}`, init);
    }

    if (input instanceof Request) {
      const url = new URL(input.url);
      if (url.origin === window.location.origin && url.pathname.startsWith('/api/')) {
        const rewritten = new Request(`${appBase}${url.pathname}${url.search}`, input);
        return originalFetch(rewritten, init);
      }
    }

    return originalFetch(input, init);
  };
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
