import { useEffect, useMemo, useRef, useState } from 'react';
import {
  conversationsStorage,
  createConversation,
  deleteConversation,
  deriveTitle,
  saveConversation,
  settingsStorage,
  type ApiKeys,
  type Conversation,
  type Settings,
} from '@/lib/storage';
import { MODELS, PROVIDER_LABELS, PROVIDERS } from '@/lib/models';
import type { Provider } from '@/lib/providers/types';
import type { BackgroundResponse, ChatRequest } from '@/lib/messaging';
import { getErrorMessage } from '@/lib/errors';
import { CheckIcon, CopyIcon, HistoryIcon, PlusIcon } from '@/components/icons';
import HistoryList from './HistoryList';

interface Props {
  apiKeys: ApiKeys;
}

type View = 'chat' | 'history';

export default function ChatView({ apiKeys }: Props) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [provider, setProvider] = useState<Provider>('openai');
  const [model, setModel] = useState('');
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>('chat');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const messagesRef = useRef<HTMLDivElement>(null);

  const availableProviders = useMemo(
    () => PROVIDERS.filter((p) => Boolean(apiKeys[p])),
    [apiKeys],
  );

  useEffect(() => {
    messagesRef.current?.scrollTo({ top: messagesRef.current.scrollHeight });
  }, [conversation?.id, conversation?.messages.length, sending]);

  // Provider/model are initialised from settings on mount only.
  useEffect(() => {
    settingsStorage.getValue().then((loaded) => {
      setSettings(loaded);
      const initialProvider = availableProviders.includes(loaded.defaultProvider)
        ? loaded.defaultProvider
        : (availableProviders[0] ?? loaded.defaultProvider);
      setProvider(initialProvider);
      setModel(loaded.defaultModel[initialProvider] || MODELS[initialProvider][0]!.id);
      if (initialProvider !== loaded.defaultProvider) {
        settingsStorage.setValue({ ...loaded, defaultProvider: initialProvider }).catch(() => {});
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

    conversationsStorage.getValue().then(setConversations);
    return () => unwatchSettings();
  }, [availableProviders]);

  function handleNewChat() {
    setConversation(null);
    setInput('');
    setError(null);
    setView('chat');
    if (settings) {
      const initialProvider = availableProviders.includes(settings.defaultProvider)
        ? settings.defaultProvider
        : (availableProviders[0] ?? settings.defaultProvider);
      setProvider(initialProvider);
      setModel(settings.defaultModel[initialProvider] || MODELS[initialProvider][0]!.id);
    }
  }

  function handleOpenConversation(target: Conversation) {
    setConversation(target);
    setProvider(target.provider);
    setModel(target.model);
    setView('chat');
  }

  async function handleDeleteConversation(id: string) {
    try {
      await deleteConversation(id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (conversation?.id === id) handleNewChat();
    } catch (err) {
      setError(getErrorMessage(err, 'Could not delete this conversation. Please try again.'));
    }
  }

  async function handleProviderChange(next: Provider) {
    setProvider(next);
    const nextModel = settings?.defaultModel?.[next] ?? MODELS[next][0]!.id;
    setModel(nextModel);

    const currentSettings = settings ?? (await settingsStorage.getValue());
    const updated: Settings = {
      ...currentSettings,
      defaultProvider: next,
      defaultModel: {
        ...currentSettings.defaultModel,
        [next]: nextModel,
      },
    };
    setSettings(updated);
    await settingsStorage.setValue(updated).catch(() => {});
  }

  async function handleModelChange(nextModel: string) {
    setModel(nextModel);
    const currentSettings = settings ?? (await settingsStorage.getValue());
    const updated: Settings = {
      ...currentSettings,
      defaultModel: {
        ...currentSettings.defaultModel,
        [provider]: nextModel,
      },
    };
    setSettings(updated);
    await settingsStorage.setValue(updated).catch(() => {});
  }

  async function handleCopy(index: number, content: string) {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex((current) => (current === index ? null : current)), 1200);
    } catch {
      setError('Could not copy to clipboard. Check the browser’s clipboard permission.');
    }
  }

  async function trySaveConversation(next: Conversation) {
    try {
      await saveConversation(next);
      setConversations((prev) => upsert(prev, next));
    } catch (err) {
      setError(getErrorMessage(err, 'Could not save this conversation to history.'));
    }
  }

  async function handleSend() {
    const text = input.trim();
    if (!text || sending) return;

    setSending(true);
    setError(null);

    const base = conversation ?? createConversation(provider, model);
    const userMessage = { role: 'user' as const, content: text, ts: Date.now() };
    const withUser: Conversation = {
      ...base,
      provider,
      model,
      title: base.messages.length === 0 ? deriveTitle(text) : base.title,
      messages: [...base.messages, userMessage],
      updatedAt: Date.now(),
    };

    setConversation(withUser);
    setInput('');
    await trySaveConversation(withUser);

    const request: ChatRequest = {
      type: 'CHAT_REQUEST',
      provider,
      model,
      messages: withUser.messages.map((m) => ({ role: m.role, content: m.content })),
    };

    try {
      const response: BackgroundResponse = await browser.runtime.sendMessage(request);
      if (!response.ok) {
        setError(response.error);
      } else {
        const withAssistant: Conversation = {
          ...withUser,
          messages: [
            ...withUser.messages,
            { role: 'assistant' as const, content: response.result, ts: Date.now() },
          ],
          updatedAt: Date.now(),
        };
        setConversation(withAssistant);
        await trySaveConversation(withAssistant);
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to reach the background service.'));
    } finally {
      setSending(false);
    }
  }

  if (view === 'history') {
    return (
      <HistoryList
        conversations={conversations}
        onSelect={handleOpenConversation}
        onDelete={handleDeleteConversation}
        onBack={() => setView('chat')}
        error={error}
        onDismissError={() => setError(null)}
      />
    );
  }

  return (
    <div className="chat">
      <div className="chat__toolbar">
        <div className="chat__model-selects">
          <select
            className="chat__select chat__select--provider"
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
            className="chat__select chat__select--model"
            value={model}
            onChange={(e) => handleModelChange(e.target.value)}
            aria-label="Model"
          >
            {MODELS[provider].map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        <div className="chat__toolbar-actions">
          <button
            type="button"
            className="icon-btn"
            onClick={handleNewChat}
            title="New chat"
            aria-label="New chat"
          >
            <PlusIcon size={14} />
          </button>
          <button
            type="button"
            className="icon-btn"
            onClick={() => setView('history')}
            title="History"
            aria-label="History"
          >
            <HistoryIcon size={14} />
          </button>
        </div>
      </div>

      <div className="chat__messages" ref={messagesRef}>
        {(conversation?.messages.length ?? 0) === 0 && (
          <p className="chat__empty">Ask anything, or paste text to rewrite.</p>
        )}
        {conversation?.messages.map((message, index) => (
          <div key={index} className={`chat__bubble chat__bubble--${message.role}`}>
            <span className="chat__bubble-text">{message.content}</span>
            <button
              type="button"
              className="chat__bubble-copy"
              title="Copy message"
              aria-label="Copy message"
              onClick={() => handleCopy(index, message.content)}
            >
              {copiedIndex === index ? <CheckIcon size={12} /> : <CopyIcon size={12} />}
            </button>
          </div>
        ))}
        {sending && (
          <div className="chat__bubble chat__bubble--assistant chat__bubble--pending">
            <span className="chat__typing-dot" />
            <span className="chat__typing-dot" />
            <span className="chat__typing-dot" />
          </div>
        )}
        {error && <div className="chat__error">{error}</div>}
      </div>

      <div className="chat__composer">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Message…"
          rows={2}
        />
        <button type="button" onClick={handleSend} disabled={sending || !input.trim()}>
          Send
        </button>
      </div>
    </div>
  );
}

function upsert(list: Conversation[], updated: Conversation): Conversation[] {
  const index = list.findIndex((c) => c.id === updated.id);
  if (index === -1) return [updated, ...list];
  const next = [...list];
  next[index] = updated;
  return next;
}
