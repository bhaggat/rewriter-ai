import { useCallback, useEffect, useState } from 'react';
import {
  apiKeysStorage,
  hasAnyApiKey,
  settingsStorage,
  toggleSiteDenylist,
  type ApiKeys,
  type Settings,
} from '@/lib/storage';
import { getErrorMessage } from '@/lib/errors';
import SetupView from './SetupView';
import ChatView from './ChatView';
import RewriteView from './RewriteView';
import PopoutButton from './PopoutButton';
import { GearIcon, PowerIcon } from '@/components/icons';

interface Props {
  detached?: boolean;
}

type Tab = 'rewrite' | 'chat';

export default function App({ detached = false }: Props) {
  const [apiKeys, setApiKeys] = useState<ApiKeys | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('rewrite');
  const [settings, setSettings] = useState<Settings | null>(null);
  const [hostname, setHostname] = useState<string | null>(null);

  const load = useCallback(() => {
    apiKeysStorage
      .getValue()
      .then(setApiKeys)
      .catch((err) => setLoadError(getErrorMessage(err, 'Could not load your saved settings.')));
  }, []);

  function retry() {
    setLoadError(null);
    load();
  }

  useEffect(() => {
    load();
    const unwatchApiKeys = apiKeysStorage.watch((next) => setApiKeys(next));
    const unwatchSettings = settingsStorage.watch((next) => setSettings(next));
    settingsStorage.getValue().then(setSettings);

    browser.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
      if (!tab?.url) return;
      try {
        setHostname(new URL(tab.url).hostname);
      } catch {
        // Non-http tab (e.g. chrome:// or file://) — no hostname to exclude.
      }
    });

    return () => {
      unwatchApiKeys();
      unwatchSettings();
    };
  }, [load]);

  async function handleToggleSiteExclusion() {
    if (!settings || !hostname) return;
    const next: Settings = {
      ...settings,
      siteDenylist: toggleSiteDenylist(settings.siteDenylist, hostname),
    };
    setSettings(next);
    await settingsStorage.setValue(next);
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
  const siteExcluded = Boolean(hostname && settings?.siteDenylist.includes(hostname));

  return (
    <div className={`popup${detached ? '' : ' popup--with-popout'}`}>
      {hasKeys ? (
        <>
          {/* Header */}
          <div className="popup__header">
            <div className="popup__tabs" role="tablist" aria-label="Rewriter AI modes">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'rewrite'}
                className={`popup__tab${activeTab === 'rewrite' ? ' popup__tab--active' : ''}`}
                onClick={() => setActiveTab('rewrite')}
              >
                ✦ Rewrite
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'chat'}
                className={`popup__tab${activeTab === 'chat' ? ' popup__tab--active' : ''}`}
                onClick={() => setActiveTab('chat')}
              >
                Chat
              </button>
            </div>

            <div className="popup__header-actions">
              {hostname && (
                <button
                  type="button"
                  className={`header-icon-btn${siteExcluded ? ' header-icon-btn--off' : ' header-icon-btn--on'}`}
                  onClick={handleToggleSiteExclusion}
                  title={siteExcluded ? `Enable rewriter on ${hostname}` : `Disable rewriter on ${hostname}`}
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
                className="header-icon-btn"
                title="Settings"
                aria-label="Settings"
                onClick={() => browser.runtime.openOptionsPage()}
              >
                <GearIcon size={14} />
              </button>
              {!detached && <PopoutButton />}
            </div>
          </div>

          {activeTab === 'rewrite' ? (
            <RewriteView apiKeys={apiKeys} />
          ) : (
            <ChatView apiKeys={apiKeys} />
          )}
        </>
      ) : (
        <SetupView onDone={setApiKeys} />
      )}
    </div>
  );
}
