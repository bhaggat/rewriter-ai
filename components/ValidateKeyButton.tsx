import { useState } from 'react';
import { providerClients } from '@/lib/providers';
import type { Provider } from '@/lib/providers/types';
import { CheckIcon, CloseIcon } from '@/components/icons';

interface Props {
  provider: Provider;
  apiKey: string;
}

type Status = 'idle' | 'checking' | 'valid' | 'invalid';

export default function ValidateKeyButton({ provider, apiKey }: Props) {
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const [checkedKey, setCheckedKey] = useState(apiKey);

  // A previous validation result no longer applies once the key text changes.
  // Reset during render (not an effect) to avoid an extra render pass.
  if (apiKey !== checkedKey) {
    setCheckedKey(apiKey);
    setStatus('idle');
    setError(null);
  }

  async function handleValidate() {
    const trimmed = apiKey.trim();
    if (!trimmed) return;
    setStatus('checking');
    setError(null);
    try {
      const result = await providerClients[provider].validateKey(trimmed);
      if (result.ok) {
        setStatus('valid');
      } else {
        setStatus('invalid');
        setError(result.error ?? 'Key validation failed.');
      }
    } catch {
      setStatus('invalid');
      setError('Could not validate the key. Please try again.');
    }
  }

  return (
    <div className="validate-key">
      <button
        type="button"
        className="validate-key__button"
        onClick={handleValidate}
        disabled={!apiKey.trim() || status === 'checking'}
      >
        {status === 'checking' ? 'Checking…' : 'Validate'}
      </button>
      {status === 'valid' && (
        <span
          className="validate-key__status validate-key__status--valid"
          aria-label="Key is valid"
          title="Key is valid"
        >
          <CheckIcon size={12} />
        </span>
      )}
      {status === 'invalid' && (
        <span
          className="validate-key__status validate-key__status--invalid"
          tabIndex={0}
          aria-label={error ?? 'Key is invalid'}
        >
          <CloseIcon size={12} />
          <span className="validate-key__tooltip" role="tooltip">
            {error ?? 'Key is invalid.'}
          </span>
        </span>
      )}
    </div>
  );
}
