import { useEffect, useMemo, useRef, useState } from 'react';
import {
  lastWritingStyleStorage,
  presetsStorage,
  settingsStorage,
  type ApiKeys,
  type Settings,
} from '@/lib/storage';
import { MODELS, PROVIDER_LABELS, PROVIDERS } from '@/lib/models';
import type { Provider } from '@/lib/providers/types';
import type {
  BackgroundResponse,
  GetSelectionMessage,
  HasEditableFieldMessage,
  InsertTextMessage,
  RewriteRequest,
} from '@/lib/messaging';
import type { RewritePreset } from '@/lib/presets';
import { getErrorMessage } from '@/lib/errors';
import {
  CheckIcon,
  CopyIcon,
  LogoIcon,
} from '@/components/icons';

import { useShortcutInfo } from '@/lib/shortcuts';

interface Props {
  apiKeys: ApiKeys;
}

type Stage = 'compose' | 'loading' | 'result' | 'error';

export default function RewriteView({ apiKeys }: Props) {
  const shortcutInfo = useShortcutInfo();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [presets, setPresets] = useState<RewritePreset[]>([]);
  const [provider, setProvider] = useState<Provider>('openai');
  const [model, setModel] = useState('');
  const [original, setOriginal] = useState('');
  const [instruction, setInstruction] = useState('');
  const [result, setResult] = useState('');
  const [stage, setStage] = useState<Stage>('compose');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [canInsert, setCanInsert] = useState(false);
  const [insertDone, setInsertDone] = useState(false);

  const availableProviders = useMemo(
    () => PROVIDERS.filter((p) => Boolean(apiKeys[p])),
    [apiKeys],
  );

  const originalRef = useRef<HTMLTextAreaElement>(null);

  // ── Load settings + presets + last style ──────────────────────────────────
  useEffect(() => {
    Promise.all([
      settingsStorage.getValue(),
      presetsStorage.getValue(),
      lastWritingStyleStorage.getValue(),
    ]).then(([loaded, loadedPresets, savedLastStyle]) => {
      setSettings(loaded);
      setPresets(loadedPresets);

      const initialProvider = availableProviders.includes(loaded.defaultProvider)
        ? loaded.defaultProvider
        : (availableProviders[0] ?? loaded.defaultProvider);
      setProvider(initialProvider);
      setModel(loaded.defaultModel[initialProvider] || MODELS[initialProvider][0]!.id);

      const styleToUse = savedLastStyle || resolveInstruction(loaded, loadedPresets) || '';
      if (styleToUse) {
        setInstruction(styleToUse);
      }
    });

    const unwatchSettings = settingsStorage.watch((loaded) => {
      setSettings(loaded);
      if (loaded.defaultProvider && availableProviders.includes(loaded.defaultProvider)) {
        setProvider(loaded.defaultProvider);
        if (loaded.defaultModel?.[loaded.defaultProvider]) {
          setModel(loaded.defaultModel[loaded.defaultProvider]);
        }
      }
    });
    const unwatchPresets = presetsStorage.watch(setPresets);
    const unwatchLastStyle = lastWritingStyleStorage.watch((val) => {
      if (val) {
        setInstruction(val);
      }
    });

    return () => {
      unwatchSettings();
      unwatchPresets();
      unwatchLastStyle();
    };
  }, [availableProviders]);

  // ── Prefill from page selection & auto-rewrite if text is selected ──────
  useEffect(() => {
    (async () => {
      try {
        const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
        if (!tab?.id) return;

        // Get selected text to prefill
        const message: GetSelectionMessage = { type: 'GET_SELECTION' };
        const selected = await browser.tabs.sendMessage(tab.id, message);
        if (typeof selected === 'string' && selected.trim()) {
          const selectedText = selected.trim();
          setOriginal(selectedText);

          // Get remembered last writing style or default writing style
          const savedLastStyle = await lastWritingStyleStorage.getValue();
          const loadedSettings = await settingsStorage.getValue();
          const loadedPresets = await presetsStorage.getValue();
          const styleToRun = savedLastStyle || resolveInstruction(loadedSettings, loadedPresets) || '';

          if (styleToRun) {
            setInstruction(styleToRun);
            handleRewrite(styleToRun, selectedText);
          }
        }

        // Check if a page field is available for "Replace on page"
        const hasFieldMsg: HasEditableFieldMessage = { type: 'HAS_EDITABLE_FIELD' };
        const hasField = await browser.tabs.sendMessage(tab.id, hasFieldMsg).catch(() => false);
        setCanInsert(Boolean(hasField));
      } catch {
        // Non-injectable tab (chrome://, file://) — ignore
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Provider/model change ─────────────────────────────────────────────────
  function handleProviderChange(next: Provider) {
    setProvider(next);
    setModel(settings?.defaultModel?.[next] ?? MODELS[next][0]!.id);
  }

  // ── Rewrite ───────────────────────────────────────────────────────────────
  async function handleRewrite(chosenInstruction: string, textOverride?: string) {
    const targetText = (textOverride ?? original).trim();
    const targetInstruction = chosenInstruction.trim();
    if (!targetText || !targetInstruction) return;

    // Remember last selected rewrite style
    await lastWritingStyleStorage.setValue(targetInstruction);
    setInstruction(targetInstruction);

    setStage('loading');
    setError(null);

    const loadedSettings = settings ?? (await settingsStorage.getValue());
    const targetProvider = availableProviders.includes(provider)
      ? provider
      : availableProviders.includes(loadedSettings.defaultProvider)
        ? loadedSettings.defaultProvider
        : (availableProviders[0] ?? loadedSettings.defaultProvider);
    const targetModel = model || loadedSettings.defaultModel[targetProvider] || MODELS[targetProvider]?.[0]?.id || '';

    const request: RewriteRequest = {
      type: 'REWRITE_REQUEST',
      provider: targetProvider,
      model: targetModel,
      text: targetText,
      instruction: targetInstruction,
    };

    try {
      const response: BackgroundResponse = await browser.runtime.sendMessage(request);
      if (response.ok) {
        setResult(response.result);
        setStage('result');
      } else {
        setError(response.error);
        setStage('error');
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to reach the background service.'));
      setStage('error');
    }
  }

  // ── Copy ──────────────────────────────────────────────────────────────────
  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      setError('Could not copy to clipboard.');
    }
  }

  // ── Replace on page ───────────────────────────────────────────────────────
  async function handleInsert() {
    try {
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) return;
      const msg: InsertTextMessage = { type: 'INSERT_TEXT', text: result };
      await browser.tabs.sendMessage(tab.id, msg);
      setInsertDone(true);
      setTimeout(() => setInsertDone(false), 1500);
    } catch {
      setError('Could not insert text. Make sure the page is focused.');
    }
  }

  // ── Default style label ───────────────────────────────────────────────────
  const defaultStyleLabel = useMemo(() => {
    if (!settings?.defaultWritingStyle) return null;
    if (settings.defaultWritingStyleIsPreset) {
      return presets.find((p) => p.id === settings.defaultWritingStyle)?.label ?? null;
    }
    const s = settings.defaultWritingStyle;
    return s.length > 28 ? `${s.slice(0, 28)}…` : s;
  }, [settings, presets]);

  const validPresets = presets.filter((p) => p.label.trim() && p.instruction.trim());

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="rewrite">
      {/* Toolbar */}
      <div className="rewrite__toolbar">
        <div className="rewrite__model-selects">
          <select
            className="rewrite__select rewrite__select--provider"
            value={provider}
            onChange={(e) => handleProviderChange(e.target.value as Provider)}
            aria-label="Provider"
          >
            {availableProviders.map((p) => (
              <option key={p} value={p}>
                {PROVIDER_LABELS[p]}
              </option>
            ))}
          </select>
          <select
            className="rewrite__select rewrite__select--model"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            aria-label="Model"
          >
            {MODELS[provider].map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Default style indicator */}
      {defaultStyleLabel && stage === 'compose' && (
        <div className="rewrite__default-style">
          <span className="rewrite__default-style-pill">
            ✦ Default style: {defaultStyleLabel}
          </span>
          <button
            type="button"
            className="rewrite__default-style-apply"
            disabled={!original.trim()}
            onClick={() => {
              if (settings) {
                const inst = resolveInstruction(settings, presets);
                if (inst) handleRewrite(inst);
              }
            }}
          >
            Apply
          </button>
          <button
            type="button"
            className="rewrite__default-style-change"
            onClick={() => browser.runtime.openOptionsPage()}
          >
            Change
          </button>
        </div>
      )}

      {/* Original input */}
      <div className="rewrite__section">
        <label className="rewrite__label" htmlFor="rw-original">
          Your text
        </label>
        <textarea
          id="rw-original"
          ref={originalRef}
          className="rewrite__original"
          value={original}
          onChange={(e) => setOriginal(e.target.value)}
          placeholder="Paste or type the text you want to rewrite…"
          rows={4}
          disabled={stage === 'loading'}
        />
      </div>

      {/* Preset chips */}
      {stage === 'compose' && (
        <div className="rewrite__section">
          <label className="rewrite__label">Rewrite style</label>
          <div className="rewrite__presets">
            {validPresets.map((preset) => {
              const isActive = instruction.trim() === preset.instruction.trim();
              return (
                <button
                  key={preset.id}
                  type="button"
                  className={`rewrite__preset-chip ${isActive ? 'rewrite__preset-chip--active' : ''}`}
                  disabled={!original.trim()}
                  onClick={() => {
                    setInstruction(preset.instruction);
                    handleRewrite(preset.instruction);
                  }}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>

          {/* Custom instruction */}
          <div className="rewrite__custom-row">
            <input
              type="text"
              className="rewrite__custom-input"
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && instruction.trim() && original.trim()) {
                  e.preventDefault();
                  handleRewrite(instruction);
                }
              }}
              placeholder="Or describe how to rewrite it…"
              disabled={!original.trim()}
            />
            <button
              type="button"
              className="rewrite__go-btn"
              disabled={!original.trim() || !instruction.trim()}
              onClick={() => handleRewrite(instruction)}
            >
              Go
            </button>
          </div>
        </div>
      )}

      {/* Loading */}
      {stage === 'loading' && (
        <div className="rewrite__loading">
          <span className="rewrite__loading-dot" />
          <span className="rewrite__loading-dot" />
          <span className="rewrite__loading-dot" />
          <span>Rewriting…</span>
        </div>
      )}

      {/* Result */}
      {stage === 'result' && (
        <div className="rewrite__result-section">
          <div className="rewrite__result-header">
            <span className="rewrite__label">Result</span>
            <button
              type="button"
              className="rewrite__result-copy-icon"
              onClick={handleCopy}
              title={copied ? 'Copied!' : 'Copy result'}
              aria-label={copied ? 'Copied!' : 'Copy result'}
            >
              {copied ? <CheckIcon size={13} /> : <CopyIcon size={13} />}
            </button>
          </div>
          <div className="rewrite__result-box">{result}</div>

          {/* Preset chips in result view for quick style switching */}
          <div className="rewrite__presets" style={{ marginTop: '4px' }}>
            {validPresets.map((preset) => {
              const isActive = instruction.trim() === preset.instruction.trim();
              return (
                <button
                  key={preset.id}
                  type="button"
                  className={`rewrite__preset-chip ${isActive ? 'rewrite__preset-chip--active' : ''}`}
                  onClick={() => {
                    setInstruction(preset.instruction);
                    handleRewrite(preset.instruction);
                  }}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>

          <div className="rewrite__result-actions">
            {canInsert && (
              <button
                type="button"
                className="rewrite__action-replace"
                onClick={handleInsert}
              >
                {insertDone ? '✓ Replaced!' : 'Replace on page'}
              </button>
            )}
            <button type="button" className="rewrite__action-copy" onClick={handleCopy}>
              {copied ? '✓ Copied!' : 'Copy'}
            </button>
            <button
              type="button"
              className="rewrite__action-retry"
              onClick={() => {
                setStage('compose');
                setResult('');
                setError(null);
              }}
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {stage === 'error' && (
        <div className="rewrite__error-section">
          <div className="rewrite__error-text">{error}</div>
          <button
            type="button"
            className="rewrite__action-retry"
            onClick={() => {
              setStage('compose');
              setError(null);
            }}
          >
            ← Back
          </button>
        </div>
      )}

      {/* Keyboard shortcut hint */}
      <div className="rewrite__shortcut-hint">
        <LogoIcon size={11} />
        <span>
          Tip: Press{' '}
          {shortcutInfo.shortcut ? (
            <kbd>{shortcutInfo.formatted}</kbd>
          ) : (
            'a shortcut'
          )}{' '}
          on any text field
        </span>
        <button
          type="button"
          className="rewrite__shortcut-hint-change"
          onClick={shortcutInfo.openShortcutsPage}
          title="Change keyboard shortcut in browser settings"
        >
          Change
        </button>
      </div>
    </div>
  );
}

function resolveInstruction(settings: Settings, presets: RewritePreset[]): string | null {
  const { defaultWritingStyle, defaultWritingStyleIsPreset } = settings;
  if (!defaultWritingStyle) return null;
  if (defaultWritingStyleIsPreset) {
    const preset = presets.find((p) => p.id === defaultWritingStyle);
    return preset?.instruction ?? null;
  }
  return defaultWritingStyle;
}
