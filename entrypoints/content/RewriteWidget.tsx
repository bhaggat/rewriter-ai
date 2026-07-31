import { useCallback, useEffect, useRef, useState } from 'react';
import { presetsStorage, settingsStorage, type Settings } from '@/lib/storage';
import type { RewritePreset } from '@/lib/presets';
import { clamp, getFieldSelection, getFieldText, insertText, isEditableField, type FieldSelection } from './field-utils';
import type { BackgroundResponse, RewriteRequest, TriggerRewriteShortcutMessage } from '@/lib/messaging';
import { LogoIcon } from '@/components/icons';

const MIN_TEXT_LENGTH = 8;
const TYPING_DEBOUNCE_MS = 500;
const ICON_SIZE = 28;
const ICON_GAP = 6;
const POPOVER_WIDTH = 260;
const POPOVER_MAX_HEIGHT = 280;

interface Props {
  hostElement: HTMLElement;
}

type Stage = 'idle' | 'presets' | 'loading' | 'result' | 'error';

export default function RewriteWidget({ hostElement }: Props) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [presets, setPresets] = useState<RewritePreset[]>([]);
  const [showIcon, setShowIcon] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [stage, setStage] = useState<Stage>('idle');
  const [resultText, setResultText] = useState('');
  const [errorText, setErrorText] = useState('');
  const [customInstruction, setCustomInstruction] = useState('');
  const [copied, setCopied] = useState(false);

  const activeFieldRef = useRef<HTMLElement | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const selectionRangeRef = useRef<FieldSelection | null>(null);

  const resetWidget = useCallback(() => {
    setShowIcon(false);
    setStage('idle');
    setResultText('');
    setErrorText('');
    setCustomInstruction('');
    setCopied(false);
    setRect(null);
    selectionRangeRef.current = null;
  }, []);

  const clearActiveField = useCallback(() => {
    activeFieldRef.current = null;
    resetWidget();
  }, [resetWidget]);

  useEffect(() => {
    function onSettingsChange(next: Settings | null) {
      setSettings(next);
      const nowEnabled = Boolean(
        next?.autoDetectEnabled && !next.siteDenylist.includes(location.hostname),
      );
      if (!nowEnabled) clearActiveField();
    }
    settingsStorage.getValue().then(onSettingsChange);
    return settingsStorage.watch(onSettingsChange);
  }, [clearActiveField]);

  useEffect(() => {
    presetsStorage.getValue().then(setPresets);
    return presetsStorage.watch(setPresets);
  }, []);

  const enabled = Boolean(
    settings?.autoDetectEnabled && !settings.siteDenylist.includes(location.hostname),
  );

  useEffect(() => {
    if (!enabled) return;

    function handleFocusIn(event: FocusEvent) {
      if (!isEditableField(event.target)) return;
      const target = event.target;

      if (stage !== 'idle') {
        // A rewrite is in progress or its result/error is on screen for a
        // different field. Retargeting activeFieldRef here would make
        // "Replace" splice that rewrite into whatever the user focuses next —
        // abandon it instead of silently retargeting.
        if (target !== activeFieldRef.current) clearActiveField();
        return;
      }

      if (target !== activeFieldRef.current) selectionRangeRef.current = null;
      activeFieldRef.current = target;

      // A field can already hold text when it's focused (an existing draft, a
      // pre-filled title), so check right away instead of waiting for the next
      // keystroke to fire the debounced `input` handler below.
      if (debounceRef.current) clearTimeout(debounceRef.current);
      const text = getFieldText(target);
      if (text.trim().length >= MIN_TEXT_LENGTH) {
        setRect(target.getBoundingClientRect());
        setShowIcon(true);
      } else {
        setShowIcon(false);
      }
    }

    function handleFocusOut() {
      // Defer so document.activeElement reflects where focus actually landed. Only clear
      // if focus left for something that isn't our widget AND isn't another valid field —
      // otherwise this would race the new field's own focusin and wipe out its ref.
      setTimeout(() => {
        const next = document.activeElement;
        if (next !== hostElement && !isEditableField(next)) clearActiveField();
      }, 0);
    }

    function handleInput(event: Event) {
      const target = event.target;
      if (stage !== 'idle' || !isEditableField(target) || target !== activeFieldRef.current) return;

      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        const text = getFieldText(target);
        if (text.trim().length >= MIN_TEXT_LENGTH) {
          setRect(target.getBoundingClientRect());
          setShowIcon(true);
        } else {
          setShowIcon(false);
        }
      }, TYPING_DEBOUNCE_MS);
    }

    function handleReposition() {
      if (activeFieldRef.current && (showIcon || stage !== 'idle')) {
        setRect(activeFieldRef.current.getBoundingClientRect());
      }
    }

    document.addEventListener('focusin', handleFocusIn, true);
    document.addEventListener('focusout', handleFocusOut, true);
    document.addEventListener('input', handleInput, true);
    window.addEventListener('scroll', handleReposition, true);
    window.addEventListener('resize', handleReposition);

    return () => {
      document.removeEventListener('focusin', handleFocusIn, true);
      document.removeEventListener('focusout', handleFocusOut, true);
      document.removeEventListener('input', handleInput, true);
      window.removeEventListener('scroll', handleReposition, true);
      window.removeEventListener('resize', handleReposition);
    };
  }, [enabled, showIcon, stage, hostElement, clearActiveField]);

  useEffect(() => {
    function handleMessage(message: TriggerRewriteShortcutMessage) {
      if (message.type !== 'TRIGGER_REWRITE_SHORTCUT' || !enabled) return;
      const field = activeFieldRef.current;
      if (!field || !getFieldText(field).trim()) return;
      selectionRangeRef.current = getFieldSelection(field);
      setRect(field.getBoundingClientRect());
      setShowIcon(true);
      setStage('presets');
    }
    browser.runtime.onMessage.addListener(handleMessage);
    return () => browser.runtime.onMessage.removeListener(handleMessage);
  }, [enabled]);

  async function runRewrite(instruction: string) {
    const field = activeFieldRef.current;
    if (!field || !settings) return;

    const text = selectionRangeRef.current?.text || getFieldText(field);
    if (!text.trim()) return;

    setStage('loading');

    const provider = settings.defaultProvider;
    const model = settings.defaultModel[provider];
    const request: RewriteRequest = { type: 'REWRITE_REQUEST', provider, model, text, instruction };

    try {
      const response: BackgroundResponse = await browser.runtime.sendMessage(request);
      if (response.ok) {
        setResultText(response.result);
        setStage('result');
      } else {
        setErrorText(response.error);
        setStage('error');
      }
    } catch (err) {
      setErrorText(err instanceof Error ? err.message : 'Something went wrong.');
      setStage('error');
    }
  }

  function handleReplace() {
    if (activeFieldRef.current) insertText(activeFieldRef.current, resultText, selectionRangeRef.current);
    resetWidget();
  }

  async function handleDisableSite() {
    if (!settings) return;
    const hostname = location.hostname;
    if (!settings.siteDenylist.includes(hostname)) {
      try {
        await settingsStorage.setValue({
          ...settings,
          siteDenylist: [...settings.siteDenylist, hostname],
        });
      } catch {
        // Best-effort: the widget is closing regardless, and settings still watch/retry on next load.
      }
    }
    clearActiveField();
  }

  if (!enabled || !showIcon || !rect) return null;

  const openUpward = rect.top > POPOVER_MAX_HEIGHT && window.innerHeight - rect.bottom < POPOVER_MAX_HEIGHT;
  const anchorTop = openUpward ? rect.top - ICON_GAP : rect.bottom + ICON_GAP;

  const iconTop = openUpward ? anchorTop - ICON_SIZE : anchorTop;
  const iconLeft = clamp(rect.right - ICON_SIZE, 0, window.innerWidth - ICON_SIZE);

  const panelTop = openUpward ? anchorTop - POPOVER_MAX_HEIGHT : anchorTop;
  const panelLeft = clamp(rect.right - POPOVER_WIDTH, 0, window.innerWidth - POPOVER_WIDTH);

  return (
    <div className="rw-root">
      {stage === 'idle' ? (
        <button
          type="button"
          className="rw-icon"
          style={{ top: `${iconTop}px`, left: `${iconLeft}px` }}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            selectionRangeRef.current = activeFieldRef.current ? getFieldSelection(activeFieldRef.current) : null;
            setStage('presets');
          }}
          aria-label="Rewrite with AI"
          title="Rewrite with AI"
        >
          <LogoIcon size={16} />
        </button>
      ) : (
        <div
          className="rw-popover"
          style={{ top: `${panelTop}px`, left: `${panelLeft}px`, width: `${POPOVER_WIDTH}px` }}
        >
          <button
            type="button"
            className="rw-popover__close"
            onMouseDown={(e) => e.preventDefault()}
            onClick={resetWidget}
            aria-label="Close"
          >
            ✕
          </button>

          {stage === 'presets' && (
            <>
              <div className="rw-popover__presets">
                {presets
                  .filter((preset) => preset.label.trim() && preset.instruction.trim())
                  .map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => runRewrite(preset.instruction)}
                    >
                      {preset.label}
                    </button>
                  ))}
              </div>
              <form
                className="rw-popover__custom"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (customInstruction.trim()) runRewrite(customInstruction.trim());
                }}
              >
                <input
                  type="text"
                  value={customInstruction}
                  onChange={(e) => setCustomInstruction(e.target.value)}
                  placeholder="Or describe how to rewrite it…"
                />
                <button type="submit" onMouseDown={(e) => e.preventDefault()}>
                  Go
                </button>
              </form>
            </>
          )}

          {stage === 'loading' && <div className="rw-popover__loading">Rewriting…</div>}

          {stage === 'result' && (
            <>
              <div className="rw-popover__result">{resultText}</div>
              <div className="rw-popover__actions">
                <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={handleReplace}>
                  Replace
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    navigator.clipboard
                      .writeText(resultText)
                      .then(() => {
                        setCopied(true);
                        setTimeout(() => setCopied(false), 1200);
                      })
                      .catch(() => {
                        setErrorText('Could not copy to clipboard.');
                        setStage('error');
                      });
                  }}
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setCopied(false);
                    setStage('presets');
                  }}
                >
                  Try another
                </button>
              </div>
            </>
          )}

          {stage === 'error' && (
            <>
              <div className="rw-popover__error">{errorText}</div>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setStage('presets')}
              >
                Back
              </button>
            </>
          )}

          <button
            type="button"
            className="rw-popover__disable-site"
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleDisableSite}
          >
            Turn off on this site
          </button>
        </div>
      )}
    </div>
  );
}
