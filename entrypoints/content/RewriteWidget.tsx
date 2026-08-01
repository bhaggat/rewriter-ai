import {
  lastWritingStyleStorage,
  presetsStorage,
  settingsStorage,
  type Settings,
} from '@/lib/storage';
import type { RewritePreset } from '@/lib/presets';
import {
  clamp,
  findEditableField,
  getDeepActiveElement,
  getFieldSelection,
  getFieldText,
  insertText,
  isEditableField,
  type FieldSelection,
} from './field-utils';
import type {
  BackgroundResponse,
  HasEditableFieldMessage,
  InsertTextMessage,
  RewriteRequest,
  TriggerRewriteShortcutMessage,
} from '@/lib/messaging';
import { CopyIcon, CheckIcon, LogoIcon } from '@/components/icons';

const MIN_TEXT_LENGTH = 8;
const TYPING_DEBOUNCE_MS = 500;
const ICON_SIZE = 28;
const ICON_GAP = 6;
const POPOVER_WIDTH = 280;
const POPOVER_MAX_HEIGHT = 320;

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
  // Tracks the very last field that was ever focused — used by the popup to
  // insert text back even after focus has moved away.
  const lastFieldRef = useRef<HTMLElement | null>(null);
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

  // ─── Settings & presets ───────────────────────────────────────────────────

  useEffect(() => {
    function onSettingsChange(next: Settings | null) {
      setSettings(next);
      const isExcluded = Boolean(next?.siteDenylist.includes(location.hostname));
      if (isExcluded) clearActiveField();
    }
    settingsStorage.getValue().then(onSettingsChange);
    return settingsStorage.watch(onSettingsChange);
  }, [clearActiveField]);

  useEffect(() => {
    presetsStorage.getValue().then(setPresets);
    return presetsStorage.watch(setPresets);
  }, []);

  const isExcluded = Boolean(settings?.siteDenylist.includes(location.hostname));
  const autoDetectEnabled = Boolean(settings?.autoDetectEnabled && !isExcluded);

  // ─── Field tracking (for hover/typing icon and shortcut target) ───────────

  useEffect(() => {
    function handleFocusIn(event: FocusEvent) {
      const target = findEditableField(event.target);
      if (!target) return;

      if (stage !== 'idle') {
        if (target !== activeFieldRef.current) clearActiveField();
        return;
      }

      if (target !== activeFieldRef.current) selectionRangeRef.current = null;
      activeFieldRef.current = target;
      lastFieldRef.current = target;

      if (!autoDetectEnabled) return;

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
      if (stage !== 'idle') return;

      setTimeout(() => {
        const next = getDeepActiveElement();
        if (
          next !== hostElement &&
          !hostElement.contains(next) &&
          !isEditableField(next) &&
          !findEditableField(next)
        ) {
          clearActiveField();
        }
      }, 50);
    }

    function handleInput(event: Event) {
      const target = findEditableField(event.target);
      if (!target) return;
      activeFieldRef.current = target;
      lastFieldRef.current = target;

      if (!autoDetectEnabled || stage !== 'idle') return;

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

    function handleFieldPointerDown(event: PointerEvent) {
      const target = findEditableField(event.target);
      if (target) {
        activeFieldRef.current = target;
        lastFieldRef.current = target;
      }
    }

    function handleSelectionChange() {
      const deepActive = getDeepActiveElement();
      const target = findEditableField(deepActive) || findEditableField(document.activeElement);
      if (target) {
        activeFieldRef.current = target;
        lastFieldRef.current = target;
        const sel = getFieldSelection(target);
        if (sel) selectionRangeRef.current = sel;
      }
    }

    function handleReposition() {
      if (activeFieldRef.current && (showIcon || stage !== 'idle')) {
        setRect(activeFieldRef.current.getBoundingClientRect());
      }
    }

    document.addEventListener('focusin', handleFocusIn, true);
    document.addEventListener('focusout', handleFocusOut, true);
    document.addEventListener('input', handleInput, true);
    document.addEventListener('pointerdown', handleFieldPointerDown, true);
    document.addEventListener('selectionchange', handleSelectionChange, true);
    window.addEventListener('scroll', handleReposition, true);
    window.addEventListener('resize', handleReposition);

    return () => {
      document.removeEventListener('focusin', handleFocusIn, true);
      document.removeEventListener('focusout', handleFocusOut, true);
      document.removeEventListener('input', handleInput, true);
      document.removeEventListener('pointerdown', handleFieldPointerDown, true);
      document.removeEventListener('selectionchange', handleSelectionChange, true);
      window.removeEventListener('scroll', handleReposition, true);
      window.removeEventListener('resize', handleReposition);
    };
  }, [autoDetectEnabled, showIcon, stage, hostElement, clearActiveField]);

  // ─── Dismiss widget on outside click or Escape ──────────────────────────────

  useEffect(() => {
    if (stage === 'idle' && !showIcon) return;

    function handlePointerDown(e: PointerEvent) {
      const target = e.target as Node | null;
      if (!target) return;
      if (
        hostElement.contains(target) ||
        (activeFieldRef.current && activeFieldRef.current.contains(target))
      ) {
        return;
      }
      resetWidget();
    }

    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        resetWidget();
      }
    }

    document.addEventListener('pointerdown', handlePointerDown, true);
    document.addEventListener('keydown', handleEscape, true);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true);
      document.removeEventListener('keydown', handleEscape, true);
    };
  }, [stage, showIcon, hostElement, resetWidget]);

  // ─── Rewrite execution ────────────────────────────────────────────────────

  const runRewrite = useCallback(
    async (instruction: string, overrideText?: string) => {
      if (!settings) return;

      const text =
        overrideText ||
        selectionRangeRef.current?.text ||
        (activeFieldRef.current ? getFieldText(activeFieldRef.current) : '');

      if (!text.trim()) return;

      if (instruction.trim()) {
        lastWritingStyleStorage.setValue(instruction.trim()).catch(() => {});
      }

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
    },
    [settings],
  );

  const [configuredShortcut, setConfiguredShortcut] = useState('Alt+Shift+R');

  useEffect(() => {
    if (typeof browser !== 'undefined' && browser.commands?.getAll) {
      browser.commands
        .getAll()
        .then((commands) => {
          const cmd = commands.find((c) => c.name === 'trigger-rewrite');
          if (cmd?.shortcut) {
            setConfiguredShortcut(cmd.shortcut);
          }
        })
        .catch(() => {});
    }
  }, []);

  // ─── Trigger Shortcut Handler ─────────────────────────────────────────────

  const triggerRewrite = useCallback(() => {
    if (isExcluded) return;

    const deepActive = getDeepActiveElement();
    const targetField =
      findEditableField(deepActive) ||
      findEditableField(document.activeElement) ||
      activeFieldRef.current ||
      lastFieldRef.current;

    if (targetField) {
      activeFieldRef.current = targetField;
      lastFieldRef.current = targetField;
    }

    let selectionText = '';
    let targetRect: DOMRect | null = null;

    if (targetField) {
      const sel = getFieldSelection(targetField);
      if (sel?.text) {
        selectionRangeRef.current = sel;
        selectionText = sel.text;
        targetRect =
          sel.range && sel.range.getBoundingClientRect().height > 0
            ? sel.range.getBoundingClientRect()
            : targetField.getBoundingClientRect();
      } else {
        selectionRangeRef.current = null;
        selectionText = getFieldText(targetField);
        targetRect = targetField.getBoundingClientRect();
      }
    }

    if (!selectionText.trim()) {
      const winSel = window.getSelection();
      if (winSel && !winSel.isCollapsed && winSel.rangeCount > 0) {
        const range = winSel.getRangeAt(0);
        const text = range.toString().trim();
        if (text) {
          selectionText = text;
          selectionRangeRef.current = { text, range: range.cloneRange() };
          targetRect = range.getBoundingClientRect();
        }
      }
    }

    if ((!targetRect || (targetRect.width === 0 && targetRect.height === 0)) && targetField) {
      targetRect = targetField.getBoundingClientRect();
    }

    if (!targetRect || (targetRect.width === 0 && targetRect.height === 0)) {
      const winSel = window.getSelection();
      if (winSel && winSel.rangeCount > 0) {
        const r = winSel.getRangeAt(0).getBoundingClientRect();
        if (r.width > 0 || r.height > 0) targetRect = r;
      }
    }

    if (!targetRect || (targetRect.width === 0 && targetRect.height === 0)) {
      const activeEl = getDeepActiveElement() || document.activeElement;
      if (activeEl && activeEl instanceof HTMLElement) {
        const r = activeEl.getBoundingClientRect();
        if (r.width > 0 || r.height > 0) targetRect = r;
      }
    }

    if (!targetRect || (targetRect.width === 0 && targetRect.height === 0)) {
      const w = POPOVER_WIDTH;
      const h = 40;
      const left = Math.max(10, (window.innerWidth - w) / 2);
      const top = Math.max(10, window.innerHeight / 3);
      targetRect = new DOMRect(left, top, w, h);
    }

    setRect(targetRect);
    setShowIcon(true);

    if (selectionText.trim() && settings?.defaultWritingStyle) {
      const instruction = resolveInstruction(settings, presets);
      if (instruction) {
        runRewrite(instruction, selectionText);
        return;
      }
    }
    setStage('presets');
  }, [isExcluded, settings, presets, runRewrite]);

  // ─── Keyboard shortcut direct listener ────────────────────────────────────

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const matchesCustom = matchesShortcut(e, configuredShortcut);
      const isFallbackR =
        (e.code === 'KeyR' || e.key?.toLowerCase() === 'r' || e.key === '‰' || e.key === '®') &&
        (e.altKey || e.metaKey || e.ctrlKey);

      if (matchesCustom || isFallbackR) {
        const deepActive = getDeepActiveElement();
        const winSel = window.getSelection();
        const hasSelection = Boolean(winSel && !winSel.isCollapsed && winSel.toString().trim().length > 0);
        const editableTarget =
          findEditableField(deepActive) ||
          findEditableField(document.activeElement) ||
          activeFieldRef.current ||
          lastFieldRef.current;

        if (editableTarget || hasSelection || isEditableField(deepActive) || isEditableField(document.activeElement)) {
          e.preventDefault();
          e.stopPropagation();
          triggerRewrite();
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [configuredShortcut, triggerRewrite]);

  // ─── Messaging listener ──────────────────────────────────────────────────

  useEffect(() => {
    function handleMessage(
      message:
        | TriggerRewriteShortcutMessage
        | InsertTextMessage
        | HasEditableFieldMessage,
    ) {
      // ── TRIGGER_REWRITE_SHORTCUT ──────────────────────────────────────
      if (message.type === 'TRIGGER_REWRITE_SHORTCUT') {
        triggerRewrite();
        return;
      }

      // ── INSERT_TEXT ──────────────────────────────────────────────────
      if (message.type === 'INSERT_TEXT') {
        const deepActive = getDeepActiveElement();
        const field =
          lastFieldRef.current ||
          activeFieldRef.current ||
          findEditableField(deepActive) ||
          findEditableField(document.activeElement);
        if (field) {
          insertText(field, (message as InsertTextMessage).text, selectionRangeRef.current);
        } else if (selectionRangeRef.current?.range) {
          const range = selectionRangeRef.current.range;
          if (range.startContainer.isConnected && range.endContainer.isConnected) {
            try {
              range.deleteContents();
              range.insertNode(document.createTextNode((message as InsertTextMessage).text));
            } catch {
              // Ignore if non-editable
            }
          }
        }
        return true as unknown as void; // signal success
      }

      // ── HAS_EDITABLE_FIELD ───────────────────────────────────────────
      if (message.type === 'HAS_EDITABLE_FIELD') {
        const deepActive = getDeepActiveElement();
        const field =
          lastFieldRef.current ||
          activeFieldRef.current ||
          findEditableField(deepActive) ||
          findEditableField(document.activeElement);
        return Boolean(field) as unknown as void;
      }
    }

    browser.runtime.onMessage.addListener(handleMessage);
    return () => browser.runtime.onMessage.removeListener(handleMessage);
  }, [triggerRewrite]);

  function handleReplace() {
    if (activeFieldRef.current) {
      insertText(activeFieldRef.current, resultText, selectionRangeRef.current);
    } else if (selectionRangeRef.current?.range) {
      const range = selectionRangeRef.current.range;
      if (range.startContainer.isConnected && range.endContainer.isConnected) {
        try {
          range.deleteContents();
          range.insertNode(document.createTextNode(resultText));
        } catch {
          navigator.clipboard.writeText(resultText).catch(() => {});
        }
      }
    } else {
      navigator.clipboard.writeText(resultText).catch(() => {});
    }
    resetWidget();
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(resultText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      setErrorText('Could not copy to clipboard.');
      setStage('error');
    }
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
        // Best-effort
      }
    }
    clearActiveField();
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  if (isExcluded || !showIcon || !rect) return null;

  const viewWidth = window.innerWidth;
  const viewHeight = window.innerHeight;
  const padding = 10;

  const spaceBelow = viewHeight - rect.bottom;
  const spaceAbove = rect.top;

  let targetPanelTop: number;
  if (spaceBelow >= POPOVER_MAX_HEIGHT + ICON_GAP || spaceBelow >= spaceAbove) {
    targetPanelTop = rect.bottom + ICON_GAP;
  } else {
    targetPanelTop = rect.top - POPOVER_MAX_HEIGHT - ICON_GAP;
  }

  const panelTop = clamp(targetPanelTop, padding, Math.max(padding, viewHeight - POPOVER_MAX_HEIGHT - padding));
  const panelLeft = clamp(rect.right - POPOVER_WIDTH, padding, Math.max(padding, viewWidth - POPOVER_WIDTH - padding));

  const openUpward = targetPanelTop < rect.top;
  const targetIconTop = openUpward ? rect.top - ICON_SIZE - ICON_GAP : rect.bottom + ICON_GAP;
  const iconTop = clamp(targetIconTop, padding, Math.max(padding, viewHeight - ICON_SIZE - padding));
  const iconLeft = clamp(rect.right - ICON_SIZE, padding, Math.max(padding, viewWidth - ICON_SIZE - padding));

  return (
    <div className="rw-root">
      {stage === 'idle' ? (
        <button
          type="button"
          className="rw-icon"
          style={{ top: `${iconTop}px`, left: `${iconLeft}px` }}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            selectionRangeRef.current = activeFieldRef.current
              ? getFieldSelection(activeFieldRef.current)
              : null;
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
          {/* Header bar */}
          <div className="rw-popover__header">
            <LogoIcon size={13} />
            <span className="rw-popover__header-title">Rewriter AI</span>
            <button
              type="button"
              className="rw-popover__close"
              onMouseDown={(e) => e.preventDefault()}
              onClick={resetWidget}
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          {/* Preset picker */}
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

          {/* Loading */}
          {stage === 'loading' && (
            <div className="rw-popover__loading">
              <span className="rw-popover__loading-dot" />
              <span className="rw-popover__loading-dot" />
              <span className="rw-popover__loading-dot" />
              <span className="rw-popover__loading-label">Rewriting…</span>
            </div>
          )}

          {/* Result */}
          {stage === 'result' && (
            <>
              <div className="rw-popover__result-wrapper">
                <div className="rw-popover__result">{resultText}</div>
                {/* Copy icon overlaid on result box */}
                <button
                  type="button"
                  className="rw-popover__result-copy"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={handleCopy}
                  aria-label={copied ? 'Copied!' : 'Copy result'}
                  title={copied ? 'Copied!' : 'Copy result'}
                >
                  {copied ? <CheckIcon size={12} /> : <CopyIcon size={12} />}
                </button>
              </div>
              <div className="rw-popover__actions">
                <button
                  type="button"
                  className="rw-popover__actions-replace"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={handleReplace}
                >
                  Replace
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

          {/* Error */}
          {stage === 'error' && (
            <>
              <div className="rw-popover__error">{errorText}</div>
              <button
                type="button"
                className="rw-popover__back"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setStage('presets')}
              >
                ← Back
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Resolve the instruction string from settings + available presets. */
function resolveInstruction(settings: Settings, presets: RewritePreset[]): string | null {
  const { defaultWritingStyle, defaultWritingStyleIsPreset } = settings;
  if (!defaultWritingStyle) return null;

  if (defaultWritingStyleIsPreset) {
    const preset = presets.find((p) => p.id === defaultWritingStyle);
    return preset?.instruction ?? null;
  }

  return defaultWritingStyle; // raw instruction string
}

function matchesShortcut(e: KeyboardEvent, shortcutStr: string): boolean {
  if (!shortcutStr) return false;
  const parts = shortcutStr.split('+').map((p) => p.trim().toLowerCase());
  if (parts.length === 0) return false;

  const requiresAlt = parts.includes('alt') || parts.includes('option');
  const requiresShift = parts.includes('shift');
  const requiresCtrl = parts.includes('ctrl') || parts.includes('macctrl');
  const requiresCmd = parts.includes('command') || parts.includes('cmd') || parts.includes('meta');

  if (e.altKey !== requiresAlt) return false;
  if (e.shiftKey !== requiresShift) return false;
  if (e.ctrlKey !== requiresCtrl) return false;
  if (e.metaKey !== requiresCmd) return false;

  const targetKey = parts[parts.length - 1];
  if (!targetKey) return false;

  const keyLower = e.key ? e.key.toLowerCase() : '';
  const codeLower = e.code ? e.code.toLowerCase() : '';

  if (codeLower === `key${targetKey}` || codeLower === targetKey || keyLower === targetKey) {
    return true;
  }
  if (targetKey === 'r' && (e.key === '‰' || e.key === '®')) return true;

  return false;
}

