import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { focusExistingPopout } from '@/lib/popout';
import ErrorBoundary from '@/components/ErrorBoundary';
import App from './App';
import './style.css';

const detached = new URLSearchParams(window.location.search).has('detached');

async function bootstrap() {
  if (!detached) {
    try {
      if (await focusExistingPopout()) {
        window.close();
        return;
      }
    } catch {
      // Couldn't check for an existing popout — fall through and open the popup normally.
    }
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ErrorBoundary>
        <App detached={detached} />
      </ErrorBoundary>
    </StrictMode>,
  );
}

bootstrap();
