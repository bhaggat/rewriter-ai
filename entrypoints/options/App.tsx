import { useCallback, useEffect, useState } from 'react';
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
import { getErrorMessage } from '@/lib/errors';
import ApiKeyLabel from '@/components/ApiKeyLabel';
import ValidateKeyButton from '@/components/ValidateKeyButton';
import ErrorBanner from '@/components/ErrorBanner';
import { HelpIcon, InfoIcon } from '@/components/icons';
import AboutModal from '@/components/AboutModal';
import { useShortcutInfo } from '@/lib/shortcuts';

export default function App() {
  const shortcutInfo = useShortcutInfo();
  const [apiKeys, setApiKeys] = useState<ApiKeys | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [presets, setPresets] = useState<RewritePreset[] | null>(null);
  const [newSite, setNewSite] = useState('');
  const [siteError, setSiteError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showAboutModal, setShowAboutModal] = useState(false);


  const load = useCallback(() => {
    Promise.all([apiKeysStorage.getValue(), settingsStorage.getValue(), presetsStorage.getValue()])
      .then(([keys, loadedSettings, loadedPresets]) => {
        setApiKeys(keys);
        setSettings(loadedSettings);
        setPresets(loadedPresets);
      })
      .catch((err) => setLoadError(getErrorMessage(err, 'Could not load your saved settings.')));
  }, []);

  function retryLoad() {
    setLoadError(null);
    load();
  }

  useEffect(() => {
    load();
  }, [load]);

  function flashSaved() {
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  async function withErrorHandling(action: () => Promise<void>, fallback: string) {
    try {
      await action();
    } catch (err) {
      setError(getErrorMessage(err, fallback));
    }
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
    await withErrorHandling(async () => {
      await apiKeysStorage.setValue(next);
      flashSaved();
    }, 'Could not save the API key. Please try again.');
  }

  async function updateDefaultModel(provider: Provider, model: string) {
    if (!settings) return;
    const next = { ...settings, defaultModel: { ...settings.defaultModel, [provider]: model } };
    setSettings(next);
    await withErrorHandling(async () => {
      await settingsStorage.setValue(next);
      flashSaved();
    }, 'Could not save the default model. Please try again.');
  }

  async function toggleAutoDetect(enabled: boolean) {
    if (!settings) return;
    const next = { ...settings, autoDetectEnabled: enabled };
    setSettings(next);
    await withErrorHandling(async () => {
      await settingsStorage.setValue(next);
      flashSaved();
    }, 'Could not save this setting. Please try again.');
  }

  async function updateDefaultWritingStyle(value: string, isPreset: boolean) {
    if (!settings) return;
    const next = { ...settings, defaultWritingStyle: value, defaultWritingStyleIsPreset: isPreset };
    setSettings(next);
    await withErrorHandling(async () => {
      await settingsStorage.setValue(next);
      flashSaved();
    }, 'Could not save the default writing style. Please try again.');
  }

  async function addSite() {
    setSiteError(null);
    const hostname = normalizeHostname(newSite);
    if (!settings) return;
    if (!hostname) {
      setSiteError('Enter a valid site, e.g. example.com.');
      return;
    }
    if (settings.siteDenylist.includes(hostname)) {
      setSiteError(`${hostname} is already excluded.`);
      return;
    }
    const next = { ...settings, siteDenylist: toggleSiteDenylist(settings.siteDenylist, hostname) };
    setSettings(next);
    await withErrorHandling(async () => {
      await settingsStorage.setValue(next);
      setNewSite('');
      flashSaved();
    }, 'Could not save the excluded site. Please try again.');
  }

  async function removeSite(hostname: string) {
    if (!settings) return;
    const next = { ...settings, siteDenylist: toggleSiteDenylist(settings.siteDenylist, hostname) };
    setSettings(next);
    await withErrorHandling(async () => {
      await settingsStorage.setValue(next);
      flashSaved();
    }, 'Could not remove the site. Please try again.');
  }

  function editPreset(index: number, field: 'label' | 'instruction', value: string) {
    if (!presets) return;
    setPresets(presets.map((p, i) => (i === index ? { ...p, [field]: value } : p)));
  }

  async function savePresets() {
    if (!presets) return;
    await withErrorHandling(async () => {
      await presetsStorage.setValue(presets);
      flashSaved();
    }, 'Could not save your presets. Please try again.');
  }

  async function addPreset() {
    if (!presets) return;
    const next = [...presets, { id: crypto.randomUUID(), label: '', instruction: '' }];
    setPresets(next);
    await withErrorHandling(
      () => presetsStorage.setValue(next),
      'Could not add the preset. Please try again.',
    );
  }

  async function deletePreset(id: string) {
    if (!presets) return;
    const next = presets.filter((p) => p.id !== id);
    setPresets(next);
    await withErrorHandling(async () => {
      await presetsStorage.setValue(next);
      flashSaved();
    }, 'Could not delete the preset. Please try again.');
  }

  async function movePreset(index: number, direction: -1 | 1) {
    if (!presets) return;
    const target = index + direction;
    if (target < 0 || target >= presets.length) return;
    const next = [...presets];
    [next[index], next[target]] = [next[target]!, next[index]!];
    setPresets(next);
    await withErrorHandling(async () => {
      await presetsStorage.setValue(next);
      flashSaved();
    }, 'Could not reorder presets. Please try again.');
  }

  async function restorePresetDefaults() {
    if (!window.confirm('Restore the default presets? This replaces your current list.')) return;
    setPresets(DEFAULT_PRESETS);
    await withErrorHandling(async () => {
      await presetsStorage.setValue(DEFAULT_PRESETS);
      flashSaved();
    }, 'Could not restore default presets. Please try again.');
  }

  if (loadError) {
    return (
      <div className="options">
        <div className="error-boundary">
          <p>{loadError}</p>
          <button type="button" onClick={retryLoad}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!apiKeys || !settings || !presets) {
    return <div className="options">Loading…</div>;
  }

  return (
    <div className="options">
      <div className="options__header">
        <div className="options__header-title">
          <img src="/icon/32.png" alt="" className="options__logo" />
          <h1>Rewriter AI Settings</h1>
        </div>
        <button
          type="button"
          className="options__info-btn"
          onClick={() => setShowAboutModal(true)}
          title="About Rewriter AI & Features"
          aria-label="About Rewriter AI & Features"
        >
          <HelpIcon size={16} />
        </button>
      </div>
      {saved && <div className="options__saved">Saved</div>}
      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

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
        <h2>Default writing style</h2>
        <p className="options__hint">
          Choose a tone to auto-apply when you trigger the keyboard shortcut
          — so you skip the picker and jump straight to the result.
        </p>
        {presets && (
          <>
            <div className="options__row">
              <select
                value={
                  settings.defaultWritingStyle && settings.defaultWritingStyleIsPreset
                    ? settings.defaultWritingStyle
                    : settings.defaultWritingStyle
                    ? '__custom__'
                    : ''
                }
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '') {
                    updateDefaultWritingStyle('', true);
                  } else if (val === '__custom__') {
                    updateDefaultWritingStyle('', false);
                  } else {
                    updateDefaultWritingStyle(val, true);
                  }
                }}
                aria-label="Default writing style"
              >
                <option value="">None (always show picker)</option>
                {presets
                  .filter((p) => p.label.trim() && p.instruction.trim())
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                <option value="__custom__">Custom instruction…</option>
              </select>
            </div>
            {/* Show textarea when custom instruction is selected */}
            {settings.defaultWritingStyle && !settings.defaultWritingStyleIsPreset && (
              <textarea
                className="options__custom-style-input"
                rows={2}
                placeholder="e.g. Rewrite this as a concise PR description in bullet points"
                value={settings.defaultWritingStyle}
                onChange={(e) => updateDefaultWritingStyle(e.target.value, false)}
              />
            )}
          </>
        )}
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

        <div className="options__shortcut-hint">
          <div className="options__shortcut-hint-header">
            <span className="options__shortcut-hint-label">Keyboard shortcut</span>
            <button
              type="button"
              className="options__shortcut-change-btn"
              onClick={shortcutInfo.openShortcutsPage}
            >
              Change Shortcut
            </button>
          </div>
          <div className="options__shortcut-keys">
            {shortcutInfo.keys.map((k, i) => (
              <span key={i} className="options__shortcut-key-item">
                {i > 0 && <span className="options__shortcut-plus">+</span>}
                <kbd>{k}</kbd>
              </span>
            ))}
          </div>
          <p className="options__shortcut-note">
            Focuses the current text field and opens the rewrite picker (or auto-applies your
            default writing style if one is set above).
            Click "Change Shortcut" above to customize this key combination in your browser settings.
          </p>
        </div>

        <h3>Excluded sites</h3>
        <div className="options__row">
          <input
            type="text"
            placeholder="example.com"
            value={newSite}
            onChange={(e) => {
              setNewSite(e.target.value);
              if (siteError) setSiteError(null);
            }}
            onKeyDown={(e) => e.key === 'Enter' && addSite()}
            aria-invalid={siteError ? true : undefined}
          />
          <button type="button" onClick={addSite}>
            Add
          </button>
        </div>
        {siteError && <p className="options__field-hint">{siteError}</p>}
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
            {(preset.label.trim() || preset.instruction.trim()) &&
              !(preset.label.trim() && preset.instruction.trim()) && (
                <p className="options__field-hint">
                  Add both a label and an instruction so this preset appears in the popover.
                </p>
              )}
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

      <section className="options__about-section">
        <div className="options__about-header">
          <h2>About Rewriter AI & Features</h2>
          <button
            type="button"
            className="options__about-btn"
            onClick={() => setShowAboutModal(true)}
          >
            <InfoIcon size={14} /> Open Guide
          </button>
        </div>
        <p className="options__hint">
          Rewriter AI is built to make AI-powered writing, tone rewriting, and text transformation fast and accessible on any site.
        </p>

        <div className="options__about-grid">
          <div className="options__about-card">
            <div className="options__about-card-title">⚡ Inline Rewriter & Shortcut</div>
            <p>
              Select text on any webpage or focus input fields and press <kbd>Option+Shift+R</kbd> (Mac) / <kbd>Alt+Shift+R</kbd> (Win) to trigger instant AI rewrite presets.
            </p>
          </div>
          <div className="options__about-card">
            <div className="options__about-card-title">🤖 Multi-Provider Support</div>
            <p>
              Connect OpenAI, Anthropic Claude, Google Gemini, DeepSeek, or Groq with your own API keys.
            </p>
          </div>
          <div className="options__about-card">
            <div className="options__about-card-title">🎯 Presets & Styles</div>
            <p>
              Customize tone presets and pick default writing styles for automatic 1-click execution.
            </p>
          </div>
          <div className="options__about-card">
            <div className="options__about-card-title">💬 Side-by-Side Chat</div>
            <p>
              Open the extension popup anytime for interactive chat, drafting long content, and Q&A.
            </p>
          </div>
        </div>
      </section>

      <AboutModal isOpen={showAboutModal} onClose={() => setShowAboutModal(false)} />
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
