import { useCallback, useEffect, useState } from "react";
import {
  apiKeysStorage,
  collapsibleSectionsStorage,
  lastWritingStyleStorage,
  presetsStorage,
  settingsStorage,
  toggleSiteDenylist,
  type ApiKeys,
  type CollapsibleSectionsState,
  type Settings,
} from "@/lib/storage";
import { MODELS, PROVIDERS } from "@/lib/models";
import { resolveInstruction, type RewritePreset } from "@/lib/presets";
import type { Provider } from "@/lib/providers/types";
import { getErrorMessage } from "@/lib/errors";
import ApiKeyLabel from "@/components/ApiKeyLabel";
import ValidateKeyButton from "@/components/ValidateKeyButton";
import ErrorBanner from "@/components/ErrorBanner";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ExternalLinkIcon,
  EyeIcon,
  EyeOffIcon,
  HelpIcon,
  KeyboardIcon,
  PlusIcon,
  RefreshIcon,
  TrashIcon,
} from "@/components/icons";
import AboutModal from "@/components/AboutModal";
import ConfirmModal from "@/components/ConfirmModal";
import { useShortcutInfo } from "@/lib/shortcuts";
import { CollapsibleSection } from "./CollapsibleSection";

interface Props {
  embedded?: boolean;
}

export default function App({ embedded = false }: Props) {
  const shortcutInfo = useShortcutInfo();
  const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({});

  const toggleKeyVisibility = (provider: string) =>
    setVisibleKeys((prev) => ({ ...prev, [provider]: !prev[provider] }));
  const [apiKeys, setApiKeys] = useState<ApiKeys | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [presets, setPresets] = useState<RewritePreset[] | null>(null);
  const [sectionsState, setSectionsState] =
    useState<CollapsibleSectionsState | null>(null);
  const [newSite, setNewSite] = useState("");
  const [siteError, setSiteError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [presetToDelete, setPresetToDelete] = useState<RewritePreset | null>(
    null,
  );
  const [siteToRemove, setSiteToRemove] = useState<string | null>(null);

  const load = useCallback(() => {
    Promise.all([
      apiKeysStorage.getValue(),
      settingsStorage.getValue(),
      presetsStorage.getValue(),
      collapsibleSectionsStorage.getValue(),
    ])
      .then(([keys, loadedSettings, loadedPresets, loadedSectionsState]) => {
        setApiKeys(keys);
        setSettings(loadedSettings);
        setPresets(loadedPresets);
        setSectionsState(loadedSectionsState ?? {});
      })
      .catch((err) =>
        setLoadError(
          getErrorMessage(err, "Could not load your saved settings."),
        ),
      );
  }, []);

  function retryLoad() {
    setLoadError(null);
    load();
  }

  useEffect(() => {
    load();
    const unwatchSections = collapsibleSectionsStorage.watch((next) => {
      setSectionsState(next ?? {});
    });
    return () => {
      unwatchSections();
    };
  }, [load]);

  async function toggleSection(sectionKey: string, defaultOpen = true) {
    const current = sectionsState ?? {};
    const isCurrentlyOpen = current[sectionKey] ?? defaultOpen;
    const next = { ...current, [sectionKey]: !isCurrentlyOpen };
    setSectionsState(next);
    await collapsibleSectionsStorage.setValue(next);
  }

  function flashSaved() {
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  async function withErrorHandling(
    action: () => Promise<void>,
    fallback: string,
  ) {
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
    const trimmed = (apiKeys[provider] ?? "").trim();
    const next: ApiKeys = { ...apiKeys };
    if (trimmed) next[provider] = trimmed;
    else delete next[provider];
    setApiKeys(next);
    await withErrorHandling(async () => {
      await apiKeysStorage.setValue(next);
      if (
        settings &&
        (!next[settings.defaultProvider] ||
          !next[settings.defaultProvider]?.trim())
      ) {
        const available = PROVIDERS.find((p) => Boolean(next[p]?.trim()));
        if (available) {
          const nextSettings = { ...settings, defaultProvider: available };
          setSettings(nextSettings);
          await settingsStorage.setValue(nextSettings);
        }
      }
      flashSaved();
    }, "Could not save the API key. Please try again.");
  }

  async function updateDefaultModel(provider: Provider, model: string) {
    if (!settings) return;
    const next = {
      ...settings,
      defaultModel: { ...settings.defaultModel, [provider]: model },
    };
    setSettings(next);
    await withErrorHandling(async () => {
      await settingsStorage.setValue(next);
      flashSaved();
    }, "Could not save the default model. Please try again.");
  }

  async function toggleAutoDetect(enabled: boolean) {
    if (!settings) return;
    const next = { ...settings, autoDetectEnabled: enabled };
    setSettings(next);
    await withErrorHandling(async () => {
      await settingsStorage.setValue(next);
      flashSaved();
    }, "Could not save this setting. Please try again.");
  }

  async function toggleSideBarWidget(enabled: boolean) {
    if (!settings) return;
    const next = { ...settings, sideBarWidgetEnabled: enabled };
    setSettings(next);
    await withErrorHandling(async () => {
      await settingsStorage.setValue(next);
      flashSaved();
    }, "Could not save this setting. Please try again.");
  }

  async function updateDefaultWritingStyle(value: string, isPreset: boolean) {
    if (!settings) return;
    const next = {
      ...settings,
      defaultWritingStyle: value,
      defaultWritingStyleIsPreset: isPreset,
    };
    setSettings(next);
    await withErrorHandling(async () => {
      await settingsStorage.setValue(next);
      const loadedPresets = presets ?? [];
      const newInstruction = resolveInstruction(next, loadedPresets);
      if (newInstruction) {
        await lastWritingStyleStorage.setValue(newInstruction);
      }
      flashSaved();
    }, "Could not save the default writing style. Please try again.");
  }

  async function addSite() {
    setSiteError(null);
    const hostname = normalizeHostname(newSite);
    if (!settings) return;
    if (!hostname) {
      setSiteError("Enter a valid site, e.g. example.com.");
      return;
    }
    if (
      settings.siteDenylist.some(
        (h) => h.toLowerCase() === hostname.toLowerCase(),
      )
    ) {
      setSiteError(`${hostname} is already excluded.`);
      return;
    }
    const next = {
      ...settings,
      siteDenylist: toggleSiteDenylist(settings.siteDenylist, hostname),
    };
    setSettings(next);
    await withErrorHandling(async () => {
      await settingsStorage.setValue(next);
      setNewSite("");
      flashSaved();
    }, "Could not save the excluded site. Please try again.");
  }

  async function removeSite(hostname: string) {
    if (!settings) return;
    const next = {
      ...settings,
      siteDenylist: toggleSiteDenylist(settings.siteDenylist, hostname),
    };
    setSettings(next);
    await withErrorHandling(async () => {
      await settingsStorage.setValue(next);
      flashSaved();
    }, "Could not remove the site. Please try again.");
  }

  function editPreset(
    index: number,
    field: "label" | "instruction",
    value: string,
  ) {
    if (!presets) return;
    setPresets(
      presets.map((p, i) => (i === index ? { ...p, [field]: value } : p)),
    );
  }

  async function savePresets() {
    if (!presets) return;
    await withErrorHandling(async () => {
      await presetsStorage.setValue(presets);
      flashSaved();
    }, "Could not save your presets. Please try again.");
  }

  async function addPreset() {
    if (!presets) return;
    const next = [
      ...presets,
      { id: crypto.randomUUID(), label: "", instruction: "" },
    ];
    setPresets(next);
    await withErrorHandling(
      () => presetsStorage.setValue(next),
      "Could not add the preset. Please try again.",
    );
  }

  async function deletePreset(id: string) {
    if (!presets) return;
    const next = presets.filter((p) => p.id !== id);
    setPresets(next);
    await withErrorHandling(async () => {
      await presetsStorage.setValue(next);
      flashSaved();
    }, "Could not delete the preset. Please try again.");
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
    }, "Could not reorder presets. Please try again.");
  }

  if (loadError) {
    return (
      <div className="options">
        <div className="error-boundary">
          <p>{loadError}</p>
          <button
            type="button"
            className="options__icon-btn"
            onClick={retryLoad}
            data-tooltip="Retry loading settings"
            aria-label="Retry loading settings"
          >
            <RefreshIcon size={14} />
          </button>
        </div>
      </div>
    );
  }

  if (!apiKeys || !settings || !presets) {
    return <div className="options">Loading…</div>;
  }

  return (
    <div className={`options${embedded ? " options--embedded" : ""}`}>
      <div className="options__header">
        <div className="options__header-title">
          <img src="/icon/32.png" alt="" className="options__logo" />
          <h1>{embedded ? "Settings" : "Rewriter AI Settings"}</h1>
        </div>
        <div className="options__header-actions">
          {embedded && (
            <button
              type="button"
              className="options__info-btn"
              onClick={() => browser.runtime.openOptionsPage()}
              data-tooltip="Open full page settings"
              data-tooltip-pos="bottom-left"
              aria-label="Open full page settings"
            >
              <ExternalLinkIcon size={14} />
            </button>
          )}
          <button
            type="button"
            className="options__info-btn"
            onClick={() => setShowAboutModal(true)}
            data-tooltip="About Rewriter AI & Features"
            data-tooltip-pos="bottom-left"
            aria-label="About Rewriter AI & Features"
          >
            <HelpIcon size={16} />
          </button>
        </div>
      </div>
      {saved && <div className="options__saved">Saved</div>}
      {error && (
        <ErrorBanner message={error} onDismiss={() => setError(null)} />
      )}

      <CollapsibleSection
        title="API keys"
        isOpen={sectionsState ? (sectionsState["api-keys"] ?? true) : true}
        onToggle={() => toggleSection("api-keys")}
      >
        {PROVIDERS.map((provider) => (
          <div className="options__provider" key={provider}>
            <ApiKeyLabel provider={provider} htmlFor={`key-${provider}`} />
            <div className="options__row">
              <div className="options__key-input-wrap">
                <input
                  id={`key-${provider}`}
                  type={visibleKeys[provider] ? "text" : "password"}
                  autoComplete="off"
                  placeholder="API key"
                  value={apiKeys[provider] ?? ""}
                  onChange={(e) => editApiKey(provider, e.target.value)}
                  onBlur={() => saveApiKey(provider)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const btn = e.currentTarget
                        .closest(".options__row")
                        ?.querySelector(
                          ".validate-key__button",
                        ) as HTMLButtonElement | null;
                      btn?.click();
                    }
                  }}
                />
                <button
                  type="button"
                  className="options__eye-btn"
                  aria-label={
                    visibleKeys[provider] ? "Hide API key" : "Show API key"
                  }
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => toggleKeyVisibility(provider)}
                >
                  {visibleKeys[provider] ? (
                    <EyeOffIcon size={14} />
                  ) : (
                    <EyeIcon size={14} />
                  )}
                </button>
              </div>
              <ValidateKeyButton
                provider={provider}
                apiKey={apiKeys[provider] ?? ""}
              />
            </div>
            <div className="options__provider-divider" />
            <div className="options__row options__row--model">
              <label
                htmlFor={`model-${provider}`}
                className="options__model-label"
              >
                Default model
              </label>
              <select
                id={`model-${provider}`}
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
      </CollapsibleSection>

      <CollapsibleSection
        title="Default writing style"
        isOpen={sectionsState ? (sectionsState["writing-style"] ?? true) : true}
        onToggle={() => toggleSection("writing-style")}
      >
        <p className="options__hint">
          Choose a tone to auto-apply when you trigger the keyboard shortcut{" "}
          {shortcutInfo.shortcut && (
            <kbd className="options__inline-shortcut-kbd">
              {shortcutInfo.formatted}
            </kbd>
          )}{" "}
          — so you skip the picker and jump straight to the result.
        </p>
        {presets && (
          <>
            <div className="options__row">
              <select
                value={
                  settings.defaultWritingStyle &&
                  settings.defaultWritingStyleIsPreset
                    ? settings.defaultWritingStyle
                    : settings.defaultWritingStyle
                      ? "__custom__"
                      : ""
                }
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "") {
                    updateDefaultWritingStyle("", true);
                  } else if (val === "__custom__") {
                    updateDefaultWritingStyle("", false);
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
            {settings.defaultWritingStyle &&
              !settings.defaultWritingStyleIsPreset && (
                <textarea
                  className="options__custom-style-input"
                  rows={2}
                  placeholder="e.g. Rewrite this as a concise PR description in bullet points"
                  value={settings.defaultWritingStyle}
                  onChange={(e) =>
                    updateDefaultWritingStyle(e.target.value, false)
                  }
                />
              )}
          </>
        )}
      </CollapsibleSection>

      <CollapsibleSection
        title="Inline rewrite"
        isOpen={
          sectionsState ? (sectionsState["inline-rewrite"] ?? true) : true
        }
        onToggle={() => toggleSection("inline-rewrite")}
      >
        <label className="switch">
          <input
            type="checkbox"
            checked={settings.autoDetectEnabled}
            onChange={(e) => toggleAutoDetect(e.target.checked)}
          />
          <span className="switch__track">
            <span className="switch__thumb" />
          </span>
          <span>
            Enable inline AI rewriting and shortcuts{" "}
            {shortcutInfo.shortcut && (
              <kbd className="options__inline-shortcut-kbd">
                {shortcutInfo.formatted}
              </kbd>
            )}{" "}
            in text fields
          </span>
        </label>

        <label
          className={`switch${!settings.autoDetectEnabled ? " switch--disabled" : ""}`}
          style={{ marginTop: "10px" }}
        >
          <input
            type="checkbox"
            checked={settings.sideBarWidgetEnabled !== false}
            disabled={!settings.autoDetectEnabled}
            onChange={(e) => toggleSideBarWidget(e.target.checked)}
          />
          <span className="switch__track">
            <span className="switch__thumb" />
          </span>
          <span>Show floating trigger button beside active text fields</span>
        </label>

        <div className="options__shortcut-hint">
          <div className="options__shortcut-hint-header">
            <span className="options__shortcut-hint-label">
              Keyboard shortcut
            </span>
            <button
              type="button"
              className="options__shortcut-change-btn"
              data-tooltip-pos="left"
              onClick={shortcutInfo.openShortcutsPage}
              data-tooltip="Change keyboard shortcut in browser settings"
              aria-label="Change keyboard shortcut in browser settings"
            >
              <KeyboardIcon size={14} />
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
            Focuses the current text field and opens the rewrite picker (or
            auto-applies your default writing style if one is set above). You
            can also right-click on any input or text selection to trigger
            rewriting directly from the context menu. Click the keyboard button
            above to customize this key combination in your browser settings.
          </p>
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        title="Presets"
        isOpen={sectionsState ? (sectionsState["presets"] ?? true) : true}
        onToggle={() => toggleSection("presets")}
        headerAction={
          <button
            type="button"
            className="options__icon-btn"
            onClick={() => {
              if (sectionsState && sectionsState["presets"] === false) {
                toggleSection("presets");
              }
              addPreset();
            }}
            data-tooltip="Add new preset"
            data-tooltip-pos="left"
            aria-label="Add new preset"
          >
            <PlusIcon size={14} />
          </button>
        }
      >
        <p className="options__hint">
          These quick-rewrite presets appear in the in-page rewrite popover.
          Edit, delete, reorder, or add your own.
        </p>
        {presets.length === 0 && (
          <p className="options__empty">No presets yet.</p>
        )}
        {presets.map((preset, index) => (
          <div className="options__preset" key={preset.id}>
            <div className="options__row">
              <input
                type="text"
                placeholder="Label"
                value={preset.label}
                onChange={(e) => editPreset(index, "label", e.target.value)}
                onBlur={savePresets}
              />
              <div className="options__preset-actions">
                <button
                  type="button"
                  className="options__icon-btn"
                  onClick={() => movePreset(index, -1)}
                  disabled={index === 0}
                  aria-label="Move preset up"
                  data-tooltip="Move up"
                >
                  <ArrowUpIcon size={14} />
                </button>
                <button
                  type="button"
                  className="options__icon-btn"
                  onClick={() => movePreset(index, 1)}
                  disabled={index === presets.length - 1}
                  aria-label="Move preset down"
                  data-tooltip="Move down"
                >
                  <ArrowDownIcon size={14} />
                </button>
                <button
                  type="button"
                  className="options__icon-btn options__icon-btn--danger"
                  onClick={() => setPresetToDelete(preset)}
                  aria-label="Delete preset"
                  data-tooltip="Delete preset"
                >
                  <TrashIcon size={14} />
                </button>
              </div>
            </div>
            <textarea
              placeholder="Instruction sent to the model"
              value={preset.instruction}
              onChange={(e) => editPreset(index, "instruction", e.target.value)}
              onBlur={savePresets}
              rows={2}
            />
            {(preset.label.trim() || preset.instruction.trim()) &&
              !(preset.label.trim() && preset.instruction.trim()) && (
                <p className="options__field-hint">
                  Add both a label and an instruction so this preset appears in
                  the popover.
                </p>
              )}
          </div>
        ))}
      </CollapsibleSection>

      <CollapsibleSection
        title="Excluded sites"
        defaultOpen={false}
        isOpen={
          sectionsState ? (sectionsState["excluded-sites"] ?? false) : false
        }
        onToggle={() => toggleSection("excluded-sites", false)}
        headerAction={
          <button
            type="button"
            className="options__icon-btn"
            onClick={() => {
              if (sectionsState && sectionsState["excluded-sites"] === false) {
                toggleSection("excluded-sites", false);
              }
              const inputEl = document.getElementById(
                "excluded-site-input",
              ) as HTMLInputElement | null;
              setTimeout(() => inputEl?.focus(), 50);
            }}
            data-tooltip="Add excluded site"
            data-tooltip-pos="left"
            aria-label="Add excluded site"
          >
            <PlusIcon size={14} />
          </button>
        }
      >
        <p className="options__hint">
          Prevent the inline rewrite widget and shortcuts from running on
          specific websites or domain names.
        </p>
        <div className="options__row">
          <input
            id="excluded-site-input"
            type="text"
            placeholder="example.com"
            value={newSite}
            onChange={(e) => {
              setNewSite(e.target.value);
              if (siteError) setSiteError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addSite();
              }
            }}
            aria-invalid={siteError ? true : undefined}
          />
          <button
            type="button"
            className="options__icon-btn"
            onClick={addSite}
            data-tooltip="Add site to exclusion list"
            aria-label="Add site to exclusion list"
            data-tooltip-pos="left"
          >
            <PlusIcon size={14} />
          </button>
        </div>
        {siteError && <p className="options__field-hint">{siteError}</p>}
        {settings.siteDenylist.length === 0 ? (
          <p className="options__empty">No sites excluded.</p>
        ) : (
          <ul className="options__site-list">
            {settings.siteDenylist.map((hostname) => (
              <li key={hostname}>
                <span>{hostname}</span>
                <button
                  type="button"
                  className="options__icon-btn options__icon-btn--danger"
                  onClick={() => setSiteToRemove(hostname)}
                  data-tooltip-pos="left"
                  data-tooltip={`Remove ${hostname}`}
                  aria-label={`Remove ${hostname}`}
                >
                  <TrashIcon size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </CollapsibleSection>

      <footer className="options__app-info">
        <div className="options__app-info-icon-wrapper">
          <img
            src="/icon/32.png"
            alt="Rewriter AI"
            className="options__app-info-icon"
          />
        </div>
        <span className="options__app-info-name">Rewriter AI</span>
        <span className="options__app-info-version">
          v{browser.runtime?.getManifest?.()?.version ?? "1.1.4"}
        </span>
        <span className="options__app-info-built">
          Built by{" "}
          <a
            href="https://www.bhaggat.in"
            target="_blank"
            rel="noopener noreferrer"
            className="options__app-info-link"
          >
            www.bhaggat.in
          </a>
        </span>
      </footer>

      <AboutModal
        isOpen={showAboutModal}
        onClose={() => setShowAboutModal(false)}
      />

      <ConfirmModal
        isOpen={Boolean(presetToDelete)}
        title="Delete Preset"
        message={`Are you sure you want to delete the preset "${presetToDelete?.label || "Untitled"}"? This action cannot be undone.`}
        confirmLabel="Delete Preset"
        onConfirm={() => {
          if (presetToDelete) {
            deletePreset(presetToDelete.id);
            setPresetToDelete(null);
          }
        }}
        onClose={() => setPresetToDelete(null)}
      />

      <ConfirmModal
        isOpen={Boolean(siteToRemove)}
        title="Remove Excluded Site"
        message={`Are you sure you want to remove "${siteToRemove}" from the excluded sites list?`}
        confirmLabel="Remove Site"
        onConfirm={() => {
          if (siteToRemove) {
            removeSite(siteToRemove);
            setSiteToRemove(null);
          }
        }}
        onClose={() => setSiteToRemove(null)}
      />
    </div>
  );
}

function normalizeHostname(input: string): string | null {
  const trimmed = input.trim().toLowerCase();
  if (!trimmed) return null;
  try {
    const url = trimmed.includes("://")
      ? new URL(trimmed)
      : new URL(`https://${trimmed}`);
    return url.hostname.toLowerCase();
  } catch {
    return null;
  }
}
