import { useEffect, useMemo, useRef, useState } from "react";
import {
  lastWritingStyleStorage,
  presetsStorage,
  settingsStorage,
  type ApiKeys,
  type Settings,
} from "@/lib/storage";
import { MODELS, PROVIDER_LABELS, PROVIDERS } from "@/lib/models";
import type { Provider } from "@/lib/providers/types";
import type {
  BackgroundResponse,
  GetSelectionMessage,
  HasEditableFieldMessage,
  InsertTextMessage,
  RewriteRequest,
} from "@/lib/messaging";
import { resolveInstruction, type RewritePreset } from "@/lib/presets";
import { getErrorMessage } from "@/lib/errors";
import {
  ArrowLeftIcon,
  CheckIcon,
  CopyIcon,
  DiffIcon,
  EraserIcon,
  InlineViewIcon,
  KeyboardIcon,
  ListBulletIcon,
  ListNumberIcon,
  LogoIcon,
  RefreshIcon,
  SparklesIcon,
  SplitViewIcon,
  TextCaseIcon,
  WandIcon,
} from "@/components/icons";
import {
  buildCherryPickedText,
  cleanWhitespace,
  computeDiffStats,
  computeTextDiff,
  formatAsBulletList,
  formatAsNumberedList,
  getTextMetrics,
  toTitleCase,
} from "@/lib/textFormatters";

import { useShortcutInfo } from "@/lib/shortcuts";

interface Props {
  apiKeys: ApiKeys;
}

type Stage = "compose" | "loading" | "result" | "error";

export default function RewriteView({ apiKeys }: Props) {
  const shortcutInfo = useShortcutInfo();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [presets, setPresets] = useState<RewritePreset[]>([]);
  const [provider, setProvider] = useState<Provider>("openai");
  const [model, setModel] = useState("");
  const [original, setOriginal] = useState("");
  const [instruction, setInstruction] = useState("");
  const [result, setResult] = useState("");
  const [stage, setStage] = useState<Stage>("compose");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [canInsert, setCanInsert] = useState(false);
  const [insertDone, setInsertDone] = useState(false);
  const [deepPolish, setDeepPolish] = useState(false);
  const [showDiff, setShowDiff] = useState(false);
  const [diffViewMode, setDiffViewMode] = useState<"inline" | "split">(
    "inline",
  );
  const [rejectedDiffIndices, setRejectedDiffIndices] = useState<Set<number>>(
    new Set(),
  );

  const availableProviders = useMemo(
    () => PROVIDERS.filter((p) => Boolean(apiKeys[p])),
    [apiKeys],
  );

  const originalRef = useRef<HTMLTextAreaElement>(null);

  const diffParts = useMemo(
    () => computeTextDiff(original, result),
    [original, result],
  );
  const diffStats = useMemo(() => computeDiffStats(diffParts), [diffParts]);
  const effectiveResult = useMemo(
    () =>
      showDiff ? buildCherryPickedText(diffParts, rejectedDiffIndices) : result,
    [showDiff, diffParts, rejectedDiffIndices, result],
  );

  const originalMetrics = useMemo(() => getTextMetrics(original), [original]);
  const resultMetrics = useMemo(
    () => getTextMetrics(effectiveResult),
    [effectiveResult],
  );

  const toggleRejectedIndex = (index: number) => {
    setRejectedDiffIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  // ── Load settings + presets + last style ──────────────────────────────────
  useEffect(() => {
    Promise.all([
      settingsStorage.getValue(),
      presetsStorage.getValue(),
      lastWritingStyleStorage.getValue(),
    ]).then(([loaded, loadedPresets, savedLastStyle]) => {
      setSettings(loaded);
      setPresets(loadedPresets);

      const initialProvider = availableProviders.includes(
        loaded.defaultProvider,
      )
        ? loaded.defaultProvider
        : (availableProviders[0] ?? loaded.defaultProvider);
      setProvider(initialProvider);
      setModel(
        loaded.defaultModel[initialProvider] || MODELS[initialProvider][0]!.id,
      );

      if (initialProvider !== loaded.defaultProvider) {
        settingsStorage
          .setValue({ ...loaded, defaultProvider: initialProvider })
          .catch(() => {});
      }

      const styleToUse =
        savedLastStyle || resolveInstruction(loaded, loadedPresets) || "";
      if (styleToUse) {
        setInstruction(styleToUse);
      }
    });

    const unwatchSettings = settingsStorage.watch((loaded) => {
      setSettings(loaded);
      if (
        loaded.defaultProvider &&
        availableProviders.includes(loaded.defaultProvider)
      ) {
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
        const [tab] = await browser.tabs.query({
          active: true,
          currentWindow: true,
        });
        if (!tab?.id) return;

        // Get selected text to prefill
        const message: GetSelectionMessage = { type: "GET_SELECTION" };
        const selected = await browser.tabs.sendMessage(tab.id, message);
        if (typeof selected === "string" && selected.trim()) {
          const selectedText = selected.trim();
          setOriginal(selectedText);

          // Get remembered last writing style or default writing style
          const savedLastStyle = await lastWritingStyleStorage.getValue();
          const loadedSettings = await settingsStorage.getValue();
          const loadedPresets = await presetsStorage.getValue();
          const styleToRun =
            savedLastStyle ||
            resolveInstruction(loadedSettings, loadedPresets) ||
            "";

          if (styleToRun) {
            setInstruction(styleToRun);
            handleRewrite(styleToRun, selectedText);
          }
        }

        // Check if a page field is available for "Replace on page"
        const hasFieldMsg: HasEditableFieldMessage = {
          type: "HAS_EDITABLE_FIELD",
        };
        const hasField = await browser.tabs
          .sendMessage(tab.id, hasFieldMsg)
          .catch(() => false);
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
    const nextModel = settings?.defaultModel?.[next] ?? MODELS[next][0]!.id;
    setModel(nextModel);
    if (settings) {
      settingsStorage
        .setValue({
          ...settings,
          defaultProvider: next,
        })
        .catch(() => {});
    }
  }

  // ── Rewrite ───────────────────────────────────────────────────────────────
  async function handleRewrite(
    chosenInstruction: string,
    textOverride?: string,
  ) {
    const targetText = (textOverride ?? original).trim();
    const targetInstruction = chosenInstruction.trim();
    if (!targetText || !targetInstruction) return;

    // Remember last selected rewrite style
    await lastWritingStyleStorage.setValue(targetInstruction);
    setInstruction(targetInstruction);

    setStage("loading");
    setError(null);

    const loadedSettings = settings ?? (await settingsStorage.getValue());
    const targetProvider = availableProviders.includes(provider)
      ? provider
      : availableProviders.includes(loadedSettings.defaultProvider)
        ? loadedSettings.defaultProvider
        : (availableProviders[0] ?? loadedSettings.defaultProvider);
    const targetModel =
      model ||
      loadedSettings.defaultModel[targetProvider] ||
      MODELS[targetProvider]?.[0]?.id ||
      "";

    const request: RewriteRequest = {
      type: "REWRITE_REQUEST",
      provider: targetProvider,
      model: targetModel,
      text: targetText,
      instruction: targetInstruction,
      deepPolish,
    };

    try {
      const response: BackgroundResponse =
        await browser.runtime.sendMessage(request);
      if (response.ok) {
        setResult(response.result);
        setRejectedDiffIndices(new Set());
        setStage("result");
      } else {
        setError(response.error);
        setStage("error");
      }
    } catch (err) {
      setError(getErrorMessage(err, "Failed to reach the background service."));
      setStage("error");
    }
  }

  // ── Copy ──────────────────────────────────────────────────────────────────
  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(effectiveResult);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      setError("Could not copy to clipboard.");
    }
  }

  // ── Replace on page ───────────────────────────────────────────────────────
  async function handleInsert() {
    try {
      const [tab] = await browser.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (!tab?.id) return;
      const msg: InsertTextMessage = {
        type: "INSERT_TEXT",
        text: effectiveResult,
      };
      await browser.tabs.sendMessage(tab.id, msg);
      setInsertDone(true);
      setTimeout(() => setInsertDone(false), 1500);
    } catch {
      setError("Could not insert text. Make sure the page is focused.");
    }
  }

  async function handleDefaultStyleChange(val: string) {
    if (!settings) return;
    const isPreset = val !== "__custom__";
    const nextStyle = val === "__custom__" ? settings.defaultWritingStyle : val;

    const updatedSettings: Settings = {
      ...settings,
      defaultWritingStyle: nextStyle,
      defaultWritingStyleIsPreset: isPreset,
    };

    setSettings(updatedSettings);
    await settingsStorage.setValue(updatedSettings).catch(() => {});

    const newInst = resolveInstruction(updatedSettings, presets);
    if (newInst) {
      setInstruction(newInst);
    }
  }

  const validPresets = presets.filter(
    (p) => p.label.trim() && p.instruction.trim(),
  );
  const activePreset = useMemo(
    () => validPresets.find((p) => p.instruction.trim() === instruction.trim()),
    [validPresets, instruction],
  );

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

        {/* Deep Polish Toggle */}
        <button
          type="button"
          className={`rewrite__polish-toggle ${deepPolish ? "rewrite__polish-toggle--active" : ""}`}
          onClick={() => setDeepPolish(!deepPolish)}
          data-tooltip={
            deepPolish
              ? "Smart Polish enabled (High-precision reasoning)"
              : "Enable Smart Polish for deep reasoning & crisp structure"
          }
          data-tooltip-pos="bottom-left"
          aria-label={
            deepPolish
              ? "Smart Polish enabled (High-precision reasoning)"
              : "Enable Smart Polish for deep reasoning & crisp structure"
          }
        >
          <SparklesIcon size={12} />
        </button>
      </div>

      {/* Default style indicator */}
      {stage === "compose" && settings && (
        <div className="rewrite__default-style">
          <span className="rewrite__default-style-label">
            ✦ Default style:
          </span>
          <select
            className="rewrite__default-style-select"
            value={
              settings.defaultWritingStyle &&
              settings.defaultWritingStyleIsPreset
                ? settings.defaultWritingStyle
                : settings.defaultWritingStyle
                  ? "__custom__"
                  : ""
            }
            onChange={(e) => handleDefaultStyleChange(e.target.value)}
            aria-label="Default style"
            data-tooltip="Change default writing style"
            data-tooltip-pos="bottom"
          >
            <option value="">None (always show picker)</option>
            {validPresets.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
            {settings.defaultWritingStyle &&
              !settings.defaultWritingStyleIsPreset && (
                <option value="__custom__">
                  Custom (
                  {settings.defaultWritingStyle.length > 20
                    ? `${settings.defaultWritingStyle.slice(0, 20)}…`
                    : settings.defaultWritingStyle}
                  )
                </option>
              )}
          </select>
        </div>
      )}

      {/* Original input */}
      <div className="rewrite__section">
        <div className="rewrite__section-header">
          <label className="rewrite__label" htmlFor="rw-original">
            Your text
          </label>

          {/* Instant Format Quick Actions Toolbar */}
          {original.trim() && (
            <div className="rewrite__quick-format">
              <button
                type="button"
                className="rewrite__format-btn"
                onClick={() => setOriginal(toTitleCase(original))}
                data-tooltip="Convert to Title Case"
                aria-label="Convert to Title Case"
              >
                <TextCaseIcon size={12} />
              </button>
              <button
                type="button"
                className="rewrite__format-btn"
                onClick={() => setOriginal(formatAsBulletList(original))}
                data-tooltip="Format as Bullet List"
                aria-label="Format as Bullet List"
              >
                <ListBulletIcon size={12} />
              </button>
              <button
                type="button"
                className="rewrite__format-btn"
                onClick={() => setOriginal(formatAsNumberedList(original))}
                data-tooltip="Format as Numbered List"
                aria-label="Format as Numbered List"
              >
                <ListNumberIcon size={12} />
              </button>
              <button
                type="button"
                className="rewrite__format-btn"
                onClick={() => setOriginal(cleanWhitespace(original))}
                data-tooltip="Clean Spaces & Extra Lines"
                aria-label="Clean Spaces & Extra Lines"
              >
                <EraserIcon size={12} />
              </button>
            </div>
          )}
        </div>

        <textarea
          id="rw-original"
          ref={originalRef}
          className="rewrite__original"
          value={original}
          onChange={(e) => setOriginal(e.target.value)}
          placeholder="Paste or type text to format or rewrite with AI…"
          rows={4}
          disabled={stage === "loading"}
        />

        {/* Live Text Metrics */}
        {originalMetrics.words > 0 && (
          <div className="rewrite__metrics-row">
            <span>{originalMetrics.words} words</span>
            <span>•</span>
            <span>{originalMetrics.characters} chars</span>
            <span>•</span>
            <span>~{originalMetrics.readingTimeSeconds}s read</span>
          </div>
        )}
      </div>

      {/* Preset chips */}
      {stage === "compose" && (
        <div className="rewrite__section">
          <label className="rewrite__label">Rewrite style</label>
          <div className="rewrite__presets">
            {validPresets.map((preset) => {
              const isActive = activePreset?.id === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  className={`rewrite__preset-chip ${isActive ? "rewrite__preset-chip--active" : ""}`}
                  disabled={!original.trim()}
                  onClick={() => {
                    setInstruction(preset.instruction);
                    handleRewrite(preset.instruction);
                  }}
                  data-tooltip={`Apply style: ${preset.label}`}
                  aria-label={`Apply style: ${preset.label}`}
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
              value={activePreset ? "" : instruction}
              onChange={(e) => setInstruction(e.target.value)}
              onKeyDown={(e) => {
                if (
                  e.key === "Enter" &&
                  !e.shiftKey &&
                  instruction.trim() &&
                  original.trim()
                ) {
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
              data-tooltip="Rewrite with custom instruction"
              data-tooltip-pos="top-left"
              aria-label="Rewrite with custom instruction"
            >
              <WandIcon size={12} />
            </button>
          </div>
        </div>
      )}

      {/* Loading */}
      {stage === "loading" && (
        <div className="rewrite__loading">
          <span className="rewrite__loading-dot" />
          <span className="rewrite__loading-dot" />
          <span className="rewrite__loading-dot" />
          <span>{deepPolish ? "Thinking & Polishing…" : "Rewriting…"}</span>
        </div>
      )}

      {/* Result */}
      {stage === "result" && (
        <div className="rewrite__result-section">
          <div className="rewrite__result-header">
            <span className="rewrite__label">Result</span>

            <div className="rewrite__result-header-actions">
              {(diffStats.addedWords > 0 || diffStats.removedWords > 0) && (
                <span
                  className="rewrite__diff-stats"
                  data-tooltip={`Similarity: ${diffStats.similarity}%`}
                >
                  {diffStats.addedWords > 0 && (
                    <span className="rewrite__diff-stats--added">
                      +{diffStats.addedWords}
                    </span>
                  )}
                  {diffStats.removedWords > 0 && (
                    <span className="rewrite__diff-stats--removed">
                      -{diffStats.removedWords}
                    </span>
                  )}
                </span>
              )}

              {showDiff && (
                <button
                  type="button"
                  className="rewrite__action-icon-btn"
                  onClick={() =>
                    setDiffViewMode(
                      diffViewMode === "inline" ? "split" : "inline",
                    )
                  }
                  data-tooltip={`Switch to ${diffViewMode === "inline" ? "Side-by-Side Split" : "Inline"} View`}
                  aria-label={`Switch to ${diffViewMode === "inline" ? "Side-by-Side Split" : "Inline"} View`}
                >
                  {diffViewMode === "inline" ? (
                    <SplitViewIcon size={13} />
                  ) : (
                    <InlineViewIcon size={13} />
                  )}
                </button>
              )}

              <button
                type="button"
                className={`rewrite__action-icon-btn ${showDiff ? "rewrite__action-icon-btn--active" : ""}`}
                onClick={() => setShowDiff(!showDiff)}
                data-tooltip="Toggle Text Diff comparison"
                aria-label="Toggle Text Diff comparison"
              >
                <DiffIcon size={13} />
              </button>
              <button
                type="button"
                className={`rewrite__action-icon-btn ${copied ? "rewrite__action-icon-btn--copied" : ""}`}
                onClick={handleCopy}
                data-tooltip={copied ? "Copied!" : "Copy result"}
                aria-label={copied ? "Copied!" : "Copy result"}
              >
                {copied ? <CheckIcon size={13} /> : <CopyIcon size={13} />}
              </button>
              <button
                type="button"
                className="rewrite__action-icon-btn"
                onClick={() => {
                  setStage("compose");
                  setResult("");
                  setError(null);
                  setShowDiff(false);
                }}
                data-tooltip="Try another writing style"
                data-tooltip-pos="bottom-left"
                aria-label="Try another writing style"
              >
                <RefreshIcon size={13} />
              </button>
            </div>
          </div>

          {/* Result Box or Diff Box */}
          {showDiff ? (
            diffViewMode === "inline" ? (
              <div className="rewrite__diff-box">
                {diffParts.map((part, idx) => {
                  const isRejected = rejectedDiffIndices.has(idx);
                  if (!part.added && !part.removed) {
                    return <span key={idx}>{part.value}</span>;
                  }
                  const className = [
                    part.added
                      ? "rewrite__diff-added"
                      : "rewrite__diff-removed",
                    "rewrite__diff-interactive",
                    isRejected ? "rewrite__diff-rejected" : "",
                  ]
                    .filter(Boolean)
                    .join(" ");

                  const title = part.added
                    ? isRejected
                      ? "Click to accept addition"
                      : "Click to reject addition"
                    : isRejected
                      ? "Click to re-delete"
                      : "Click to restore original";

                  return (
                    <span
                      key={idx}
                      className={className}
                      onClick={() => toggleRejectedIndex(idx)}
                      data-tooltip={title}
                    >
                      {part.value}
                    </span>
                  );
                })}
              </div>
            ) : (
              <div className="rewrite__diff-box rewrite__diff-box--split">
                <div className="rewrite__split-col">
                  <div className="rewrite__split-label">Original</div>
                  <div className="rewrite__split-content">
                    {diffParts.map((part, idx) =>
                      part.added ? null : (
                        <span
                          key={idx}
                          className={
                            part.removed ? "rewrite__diff-removed" : ""
                          }
                        >
                          {part.value}
                        </span>
                      ),
                    )}
                  </div>
                </div>
                <div className="rewrite__split-col">
                  <div className="rewrite__split-label">Rewritten</div>
                  <div className="rewrite__split-content">
                    {diffParts.map((part, idx) =>
                      part.removed ? null : (
                        <span
                          key={idx}
                          className={part.added ? "rewrite__diff-added" : ""}
                        >
                          {part.value}
                        </span>
                      ),
                    )}
                  </div>
                </div>
              </div>
            )
          ) : (
            <div className="rewrite__result-box">{result}</div>
          )}

          {showDiff && rejectedDiffIndices.size > 0 && (
            <div className="rewrite__diff-hint">
              <span>
                {rejectedDiffIndices.size} edit
                {rejectedDiffIndices.size > 1 ? "s" : ""} toggled
              </span>
              <button
                type="button"
                onClick={() => setRejectedDiffIndices(new Set())}
                data-tooltip="Reset diff toggles"
                aria-label="Reset diff toggles"
              >
                <RefreshIcon size={11} />
              </button>
            </div>
          )}

          {/* Live Result Metrics */}
          {resultMetrics.words > 0 && (
            <div className="rewrite__metrics-row">
              <span>{resultMetrics.words} words</span>
              <span>•</span>
              <span>{resultMetrics.characters} chars</span>
              <span>•</span>
              <span>~{resultMetrics.readingTimeSeconds}s read</span>
            </div>
          )}

          {/* Preset chips in result view for quick style switching */}
          <div className="rewrite__presets" style={{ marginTop: "4px" }}>
            {validPresets.map((preset) => {
              const isActive = instruction.trim() === preset.instruction.trim();
              return (
                <button
                  key={preset.id}
                  type="button"
                  className={`rewrite__preset-chip ${isActive ? "rewrite__preset-chip--active" : ""}`}
                  onClick={() => {
                    setInstruction(preset.instruction);
                    handleRewrite(preset.instruction);
                  }}
                  data-tooltip={`Apply style: ${preset.label}`}
                  aria-label={`Apply style: ${preset.label}`}
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
                data-tooltip="Replace selected text on active webpage"
                aria-label="Replace selected text on active webpage"
              >
                {insertDone ? "✓ Replaced!" : "Replace on page"}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Error */}
      {stage === "error" && (
        <div className="rewrite__error-section">
          <div className="rewrite__error-text">{error}</div>
          <button
            type="button"
            className="rewrite__action-retry"
            onClick={() => {
              setStage("compose");
              setError(null);
            }}
            data-tooltip="Try again (back to text composing)"
            aria-label="Try again (back to text composing)"
          >
            <ArrowLeftIcon size={14} />
          </button>
        </div>
      )}

      {/* Keyboard shortcut hint */}
      <div className="rewrite__shortcut-hint">
        <LogoIcon size={11} />
        <span>
          Tip: Press{" "}
          {shortcutInfo.shortcut ? (
            <kbd>{shortcutInfo.formatted}</kbd>
          ) : (
            "a shortcut"
          )}{" "}
          on any text field
        </span>
        <button
          type="button"
          className="rewrite__shortcut-hint-change"
          onClick={shortcutInfo.openShortcutsPage}
          data-tooltip="Change keyboard shortcut in browser settings"
          data-tooltip-pos="top-left"
          aria-label="Change keyboard shortcut in browser settings"
        >
          <KeyboardIcon size={12} />
        </button>
      </div>
    </div>
  );
}
