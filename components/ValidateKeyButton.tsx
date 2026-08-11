import { useState, useEffect, useRef } from 'react';
import { providerClients } from '@/lib/providers';
import type { Provider } from '@/lib/providers/types';
import { CheckIcon, CloseIcon, KeyCheckIcon, SpinnerIcon } from '@/components/icons';

interface Props {
  provider: Provider;
  apiKey: string;
}

type ValidationResult = {
  key: string;
  status: 'checking' | 'valid' | 'invalid';
  error?: string | null;
};

export default function ValidateKeyButton({ provider, apiKey }: Props) {
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const activeValidation = validation?.key === apiKey ? validation : null;
  const status = activeValidation?.status ?? 'idle';
  const error = activeValidation?.error ?? null;

  async function handleValidate() {
    const trimmed = apiKey.trim();
    if (!trimmed) return;
    if (timerRef.current) clearTimeout(timerRef.current);

    setValidation({ key: apiKey, status: 'checking' });
    try {
      const result = await providerClients[provider].validateKey(trimmed);
      if (result.ok) {
        setValidation({ key: apiKey, status: 'valid' });
        timerRef.current = setTimeout(() => {
          setValidation(null);
        }, 3000);
      } else {
        setValidation({
          key: apiKey,
          status: 'invalid',
          error: result.error ?? 'Key validation failed.',
        });
      }
    } catch {
      setValidation({
        key: apiKey,
        status: 'invalid',
        error: 'Could not validate the key. Please try again.',
      });
    }
  }

  const isButtonValid = status === 'valid';

  return (
    <div className="validate-key">
      <button
        type="button"
        className={`validate-key__button ${isButtonValid ? 'validate-key__button--valid' : ''}`}
        onClick={handleValidate}
        disabled={!apiKey.trim() || status === 'checking'}
        data-tooltip={
          status === 'checking'
            ? 'Validating API key…'
            : status === 'valid'
            ? 'Key is valid!'
            : 'Validate API key'
        }
        aria-label={
          status === 'checking'
            ? 'Validating API key…'
            : status === 'valid'
            ? 'Key is valid!'
            : 'Validate API key'
        }
      >
        {status === 'checking' ? (
          <SpinnerIcon size={16} />
        ) : status === 'valid' ? (
          <CheckIcon size={16} />
        ) : (
          <KeyCheckIcon size={16} />
        )}
      </button>
      {status === 'invalid' && (
        <span
          className="validate-key__status validate-key__status--invalid"
          tabIndex={0}
          aria-label={error ?? 'Key is invalid'}
        >
          <CloseIcon size={13} />
          <span className="validate-key__tooltip" role="tooltip">
            {error ?? 'Key is invalid.'}
          </span>
        </span>
      )}
    </div>
  );
}
