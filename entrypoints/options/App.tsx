import { useEffect, useState } from 'react';
import {
  apiKeysStorage,
  presetsStorage,
  settingsStorage,
  toggleSiteDenylist,
  type ApiKeys,
  type Settings,
} from '@/lib/storage';
import { MODELS, PROVIDERS } from '@/lib/models';
import { DEFAULT_PRESETS, type RewritePreset } from '@/lib/presets';
import type { Provider } from '@/lib/providers/types';
import ApiKeyLabel from '@/components/ApiKeyLabel';
import ValidateKeyButton from '@/components/ValidateKeyButton';

export default function App() {
  const [apiKeys, setApiKeys] = useState<ApiKeys | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [presets, setPresets] = useState<RewritePreset[] | null>(null);
  const [newSite, setNewSite] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    apiKeysStorage.getValue().then(setApiKeys);
    settingsStorage.getValue().then(setSettings);
    presetsStorage.getValue().then(setPresets);
  }, []);

  function flashSaved() {
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  function editApiKey(provider: Provider, value: string) {
    if (!apiKeys) return;
    setApiKeys({ ...apiKeys, [provider]: value });
  }

  async function saveApiKey(provider: Provider) {
    if (!apiKeys) return;
    const trimmed = (apiKeys[provider] ?? '').trim();
    const next: ApiKeys = { ...apiKeys };
    if (trimmed) next[provider] = trimmed;
    else delete next[provider];
    setApiKeys(next);
    await apiKeysStorage.setValue(next);
    flashSaved();
  }

  async function updateDefaultModel(provider: Provider, model: string) {
    if (!settings) return;
    const next = { ...settings, defaultModel: { ...settings.defaultModel, [provider]: model } };
    setSettings(next);
    await settingsStorage.setValue(next);
    flashSaved();
  }

  async function toggleAutoDetect(enabled: boolean) {
    if (!settings) return;
    const next = { ...settings, autoDetectEnabled: enabled };
    setSettings(next);
    await settingsStorage.setValue(next);
    flashSaved();
  }

  async function addSite() {
    const hostname = normalizeHostname(newSite);
    if (!hostname || !settings || settings.siteDenylist.includes(hostname)) {
      setNewSite('');
      return;
    }
    const next = { ...settings, siteDenylist: toggleSiteDenylist(settings.siteDenylist, hostname) };
    setSettings(next);
    await settingsStorage.setValue(next);
    setNewSite('');
    flashSaved();
  }

  async function removeSite(hostname: string) {
    if (!settings) return;
    const next = { ...settings, siteDenylist: toggleSiteDenylist(settings.siteDenylist, hostname) };
    setSettings(next);
    await settingsStorage.setValue(next);
    flashSaved();
  }

  function editPreset(index: number, field: 'label' | 'instruction', value: string) {
    if (!presets) return;
    setPresets(presets.map((p, i) => (i === index ? { ...p, [field]: value } : p)));
  }

  async function savePresets() {
    if (!presets) return;
    await presetsStorage.setValue(presets);
    flashSaved();
  }

  async function addPreset() {
    if (!presets) return;
    const next = [...presets, { id: crypto.randomUUID(), label: '', instruction: '' }];
    setPresets(next);
    await presetsStorage.setValue(next);
  }

  async function deletePreset(id: string) {
    if (!presets) return;
    const next = presets.filter((p) => p.id !== id);
    setPresets(next);
    await presetsStorage.setValue(next);
    flashSaved();
  }

  async function movePreset(index: number, direction: -1 | 1) {
    if (!presets) return;
    const target = index + direction;
    if (target < 0 || target >= presets.length) return;
    const next = [...presets];
    [next[index], next[target]] = [next[target]!, next[index]!];
    setPresets(next);
    await presetsStorage.setValue(next);
    flashSaved();
  }

  async function restorePresetDefaults() {
    if (!window.confirm('Restore the default presets? This replaces your current list.')) return;
    setPresets(DEFAULT_PRESETS);
    await presetsStorage.setValue(DEFAULT_PRESETS);
    flashSaved();
  }

  if (!apiKeys || !settings || !presets) {
    return <div className="options">Loading…</div>;
  }

  return (
    <div className="options">
      <div className="options__header">
        <img src="/icon/32.png" alt="" className="options__logo" />
        <h1>Rewriter AI Settings</h1>
      </div>
      {saved && <div className="options__saved">Saved</div>}

      <section>
        <h2>API keys</h2>
        {PROVIDERS.map((provider) => (
          <div className="options__provider" key={provider}>
            <ApiKeyLabel provider={provider} htmlFor={`key-${provider}`} />
            <div className="options__row">
              <input
                id={`key-${provider}`}
                type="password"
                autoComplete="off"
                placeholder="API key"
                value={apiKeys[provider] ?? ''}
                onChange={(e) => editApiKey(provider, e.target.value)}
                onBlur={() => saveApiKey(provider)}
              />
              <ValidateKeyButton provider={provider} apiKey={apiKeys[provider] ?? ''} />
            </div>
            <div className="options__row">
              <select
                value={settings.defaultModel[provider]}
                onChange={(e) => updateDefaultModel(provider, e.target.value)}
              >
                {MODELS[provider].map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ))}
      </section>

      <section>
        <h2>Inline rewrite</h2>
        <label className="switch">
          <input
            type="checkbox"
            checked={settings.autoDetectEnabled}
            onChange={(e) => toggleAutoDetect(e.target.checked)}
          />
          <span className="switch__track">
            <span className="switch__thumb" />
          </span>
          <span>Show a rewrite icon and shortcut on text fields across the web</span>
        </label>

        <h3>Excluded sites</h3>
        <div className="options__row">
          <input
            type="text"
            placeholder="example.com"
            value={newSite}
            onChange={(e) => setNewSite(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addSite()}
          />
          <button type="button" onClick={addSite}>
            Add
          </button>
        </div>
        {settings.siteDenylist.length === 0 && (
          <p className="options__empty">No sites excluded.</p>
        )}
        <ul className="options__site-list">
          {settings.siteDenylist.map((hostname) => (
            <li key={hostname}>
              <span>{hostname}</span>
              <button type="button" onClick={() => removeSite(hostname)}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2>Presets</h2>
        <p className="options__hint">
          These quick-rewrite presets appear in the in-page rewrite popover. Edit, delete,
          reorder, or add your own.
        </p>
        {presets.length === 0 && <p className="options__empty">No presets yet.</p>}
        {presets.map((preset, index) => (
          <div className="options__preset" key={preset.id}>
            <div className="options__row">
              <input
                type="text"
                placeholder="Label"
                value={preset.label}
                onChange={(e) => editPreset(index, 'label', e.target.value)}
                onBlur={savePresets}
              />
              <div className="options__preset-actions">
                <button
                  type="button"
                  onClick={() => movePreset(index, -1)}
                  disabled={index === 0}
                  aria-label="Move preset up"
                  title="Move up"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => movePreset(index, 1)}
                  disabled={index === presets.length - 1}
                  aria-label="Move preset down"
                  title="Move down"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => deletePreset(preset.id)}
                  aria-label="Delete preset"
                  title="Delete preset"
                >
                  Delete
                </button>
              </div>
            </div>
            <textarea
              placeholder="Instruction sent to the model"
              value={preset.instruction}
              onChange={(e) => editPreset(index, 'instruction', e.target.value)}
              onBlur={savePresets}
              rows={2}
            />
          </div>
        ))}
        <div className="options__row">
          <button type="button" onClick={addPreset}>
            Add preset
          </button>
          <button type="button" onClick={restorePresetDefaults}>
            Restore defaults
          </button>
        </div>
      </section>
    </div>
  );
}

function normalizeHostname(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  try {
    const url = trimmed.includes('://') ? new URL(trimmed) : new URL(`https://${trimmed}`);
    return url.hostname;
  } catch {
    return null;
  }
}
