import { useCallback, useEffect, useState } from 'react';
import { apiKeysStorage, hasAnyApiKey, type ApiKeys } from '@/lib/storage';
import { getErrorMessage } from '@/lib/errors';
import SetupView from './SetupView';
import ChatView from './ChatView';
import PopoutButton from './PopoutButton';

interface Props {
  detached?: boolean;
}

export default function App({ detached = false }: Props) {
  const [apiKeys, setApiKeys] = useState<ApiKeys | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

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
    return apiKeysStorage.watch((next) => setApiKeys(next));
  }, [load]);

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

  return (
    <div className={`popup${detached ? '' : ' popup--with-popout'}`}>
      {!detached && <PopoutButton />}
      {hasAnyApiKey(apiKeys) ? (
        <ChatView apiKeys={apiKeys} />
      ) : (
        <SetupView onDone={setApiKeys} />
      )}
    </div>
  );
}
