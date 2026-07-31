import { useState } from 'react';
import { apiKeysStorage, settingsStorage, type ApiKeys } from '@/lib/storage';
import { MODELS, PROVIDERS, DEFAULT_MODEL } from '@/lib/models';
import type { Provider } from '@/lib/providers/types';
import ApiKeyLabel from '@/components/ApiKeyLabel';
import ValidateKeyButton from '@/components/ValidateKeyButton';

interface Props {
  onDone: (keys: ApiKeys) => void;
}

export default function SetupView({ onDone }: Props) {
  const [keys, setKeys] = useState<ApiKeys>({});
  const [models, setModels] = useState<Record<Provider, string>>({ ...DEFAULT_MODEL });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSave = PROVIDERS.some((provider) => keys[provider]?.trim());

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      const trimmed: ApiKeys = {};
      for (const provider of PROVIDERS) {
        const value = keys[provider]?.trim();
        if (value) trimmed[provider] = value;
      }

      const settings = await settingsStorage.getValue();
      const defaultProvider: Provider = PROVIDERS.find((provider) => trimmed[provider]) ?? 'openai';
      await settingsStorage.setValue({
        ...settings,
        defaultProvider,
        defaultModel: { ...settings.defaultModel, ...models },
      });
      await apiKeysStorage.setValue(trimmed);

      onDone(trimmed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="setup">
      <div className="setup__header">
        <img src="/icon/32.png" alt="" className="setup__logo" />
        <h1>Welcome to Rewriter AI</h1>
      </div>
      <p>Add at least one API key to get started. Keys are stored only on this device.</p>

      {PROVIDERS.map((provider) => (
        <div className="setup__provider" key={provider}>
          <ApiKeyLabel provider={provider} htmlFor={`key-${provider}`} />
          <div className="setup__key-row">
            <input
              id={`key-${provider}`}
              type="password"
              autoComplete="off"
              placeholder="Paste API key (optional)"
              value={keys[provider] ?? ''}
              onChange={(e) => setKeys((prev) => ({ ...prev, [provider]: e.target.value }))}
            />
            <ValidateKeyButton provider={provider} apiKey={keys[provider] ?? ''} />
          </div>
          <label htmlFor={`model-${provider}`}>Default model</label>
          <select
            id={`model-${provider}`}
            value={models[provider]}
            onChange={(e) => setModels((prev) => ({ ...prev, [provider]: e.target.value }))}
          >
            {MODELS[provider].map((model) => (
              <option key={model.id} value={model.id}>
                {model.label}
              </option>
            ))}
          </select>
        </div>
      ))}

      {error && <p className="setup__error">{error}</p>}

      <button type="button" disabled={!canSave || saving} onClick={handleSave}>
        {saving ? 'Saving…' : 'Save and start chatting'}
      </button>
    </div>
  );
}
