import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { focusExistingPopout } from '@/lib/popout';
import App from './App';
import './style.css';

const detached = new URLSearchParams(window.location.search).has('detached');

async function bootstrap() {
  if (!detached && (await focusExistingPopout())) {
    window.close();
    return;
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App detached={detached} />
    </StrictMode>,
  );
}

bootstrap();
