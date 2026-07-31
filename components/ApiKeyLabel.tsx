import { API_KEY_INFO, PROVIDER_LABELS } from '@/lib/models';
import type { Provider } from '@/lib/providers/types';

interface Props {
  provider: Provider;
  htmlFor: string;
}

export default function ApiKeyLabel({ provider, htmlFor }: Props) {
  const info = API_KEY_INFO[provider];

  return (
    <div className="api-key-label">
      <label htmlFor={htmlFor}>{PROVIDER_LABELS[provider]} API key</label>
      <a
        className="api-key-label__link"
        href={info.url}
        target="_blank"
        rel="noopener noreferrer"
      >
        {info.linkLabel} ↗
      </a>
      <span className="api-key-label__info" tabIndex={0}>
        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
          <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="1.4" />
          <circle cx="8" cy="4.6" r="0.9" fill="currentColor" />
          <path d="M8 7.2v4.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
        <span className="api-key-label__tooltip" role="tooltip">
          {info.hint}
        </span>
      </span>
    </div>
  );
}
