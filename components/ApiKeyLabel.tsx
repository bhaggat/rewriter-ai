import { API_KEY_INFO, PROVIDER_LABELS } from '@/lib/models';
import type { Provider } from '@/lib/providers/types';
import { InfoIcon } from '@/components/icons';

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
        <InfoIcon size={14} />
        <span className="api-key-label__tooltip" role="tooltip">
          {info.hint}
        </span>
      </span>
    </div>
  );
}
