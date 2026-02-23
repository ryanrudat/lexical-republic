import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'

// After a deploy, old cached index.html may reference JS chunks that no longer
// exist. The server returns HTML instead, causing a MIME-type error. Detect this
// and auto-reload once to pick up the new index.html.
window.addEventListener('vite:preloadError', () => {
  const key = 'chunk-reload';
  const last = sessionStorage.getItem(key);
  const now = Date.now();
  if (!last || now - parseInt(last, 10) > 10_000) {
    sessionStorage.setItem(key, String(now));
    window.location.reload();
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
