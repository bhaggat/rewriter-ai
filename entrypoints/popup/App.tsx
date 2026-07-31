import { useEffect, useState } from 'react';
import { apiKeysStorage, hasAnyApiKey, type ApiKeys } from '@/lib/storage';
import SetupView from './SetupView';
import ChatView from './ChatView';
import PopoutButton from './PopoutButton';

interface Props {
  detached?: boolean;
}

export default function App({ detached = false }: Props) {
  const [apiKeys, setApiKeys] = useState<ApiKeys | null>(null);

  useEffect(() => {
    apiKeysStorage.getValue().then(setApiKeys);
    return apiKeysStorage.watch((next) => setApiKeys(next));
  }, []);

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
