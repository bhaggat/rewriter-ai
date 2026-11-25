import { useCallback, useEffect, useState } from "react";
import {
  apiKeysStorage,
  hasAnyApiKey,
  isSiteExcluded,
  settingsStorage,
  toggleSiteDenylist,
  type ApiKeys,
  type Settings,
} from "@/lib/storage";
import { getErrorMessage } from "@/lib/errors";
import SetupView from "./SetupView";
import ChatView from "./ChatView";
import RewriteView from "./RewriteView";
import OptionsView from "@/entrypoints/options/App";
import PopoutButton from "./PopoutButton";
import ReviewPrompt from "./ReviewPrompt";
import { GearIcon, PowerIcon } from "@/components/icons";

interface Props {
  detached?: boolean;
}

type Tab = "rewrite" | "chat" | "settings";

export default function App({ detached = false }: Props) {
  const [apiKeys, setApiKeys] = useState<ApiKeys | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("rewrite");
  const [previousTab, setPreviousTab] = useState<Tab>("rewrite");
  const [hostname, setHostname] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(() => {
    Promise.all([apiKeysStorage.getValue(), settingsStorage.getValue()])
      .then(([keys, loadedSettings]) => {
        setApiKeys(keys);
        setSettings(loadedSettings);
      })
      .catch((err) =>
        setLoadError(
          getErrorMessage(err, "Could not load settings. Please try again."),
        ),
      );
  }, []);

  function retry() {
    setLoadError(null);
    load();
  }

  useEffect(() => {
    load();
    return settingsStorage.watch(setSettings);
  }, [load]);

  useEffect(() => {
    browser.tabs
      .query({ active: true, currentWindow: true })
      .then(([tab]) => {
        if (!tab?.url) return;
        try {
          const u = new URL(tab.url);
          if (u.protocol === "http:" || u.protocol === "https:") {
            setHostname(u.hostname);
          }
        } catch {
          setHostname(null);
        }
      })
      .catch(() => setHostname(null));
  }, []);

  async function toggleSiteExclusion() {
    if (!settings || !hostname) return;
    const next: Settings = {
      ...settings,
      siteDenylist: toggleSiteDenylist(settings.siteDenylist, hostname),
    };
    setSettings(next);
    await settingsStorage.setValue(next);
  }

  function handleTabChange(tab: Tab) {
    if (tab !== "settings") {
      setPreviousTab(tab);
    }
    setActiveTab(tab);
  }

  function toggleSettings() {
    if (activeTab === "settings") {
      setActiveTab(previousTab);
    } else {
      setPreviousTab(activeTab);
      setActiveTab("settings");
    }
  }

  if (loadError) {
    return (
      <div className="popup popup--loading">
        <span>{loadError}</span>
        <button type="button" onClick={retry}>
          Retry
        </button>
      </div>
    );
  }

  if (apiKeys === null) {
    return <div className="popup popup--loading">Loading…</div>;
  }

  const hasKeys = hasAnyApiKey(apiKeys);
  const siteExcluded = isSiteExcluded(settings?.siteDenylist, hostname);

  return (
    <div className={`popup${detached ? "" : " popup--with-popout"}`}>
      {hasKeys ? (
        <>
          {/* Header */}
          <div className="popup__header">
            <div
              className="popup__tabs"
              role="tablist"
              aria-label="Rewriter AI modes"
            >
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "rewrite"}
                className={`popup__tab${activeTab === "rewrite" ? " popup__tab--active" : ""}`}
                onClick={() => handleTabChange("rewrite")}
                data-tooltip="Switch to inline rewriter mode"
                data-tooltip-pos="bottom-right"
              >
                ✦ Rewrite
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "chat"}
                className={`popup__tab${activeTab === "chat" ? " popup__tab--active" : ""}`}
                onClick={() => handleTabChange("chat")}
                data-tooltip="Switch to AI chat mode"
                data-tooltip-pos="bottom-right"
              >
                Chat
              </button>
            </div>

            <div className="popup__header-actions">
              {hostname && (
                <button
                  type="button"
                  className={`header-icon-btn${siteExcluded ? " header-icon-btn--off" : " header-icon-btn--on"}`}
                  onClick={toggleSiteExclusion}
                  data-tooltip={
                    siteExcluded
                      ? `Enable rewriter on ${hostname}`
                      : `Disable rewriter on ${hostname}`
                  }
                  data-tooltip-pos="bottom-left"
                  aria-label={
                    siteExcluded
                      ? `Enable rewriter on ${hostname}`
                      : `Disable rewriter on ${hostname}`
                  }
                >
                  <PowerIcon size={14} />
                </button>
              )}
              <button
                type="button"
                className={`header-icon-btn${activeTab === "settings" ? " header-icon-btn--on" : ""}`}
                data-tooltip="Extension settings & preferences"
                data-tooltip-pos="bottom-left"
                aria-label="Extension settings & preferences"
                onClick={toggleSettings}
              >
                <GearIcon size={14} />
              </button>
              {!detached && <PopoutButton />}
            </div>
          </div>

          {activeTab === "rewrite" ? (
            <RewriteView apiKeys={apiKeys} />
          ) : activeTab === "chat" ? (
            <ChatView apiKeys={apiKeys} />
          ) : (
            <div className="popup__options-wrapper">
              <OptionsView embedded />
            </div>
          )}
          {activeTab !== "settings" && <ReviewPrompt />}
        </>
      ) : (
        <SetupView onDone={setApiKeys} />
      )}
    </div>
  );
}
