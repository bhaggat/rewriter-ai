import { useEffect, useMemo, useRef, useState } from 'react';
import {
  conversationsStorage,
  createConversation,
  deleteConversation,
  deriveTitle,
  saveConversation,
  settingsStorage,
  toggleSiteDenylist,
  type ApiKeys,
  type Conversation,
  type Settings,
} from '@/lib/storage';
import { MODELS, PROVIDER_LABELS, PROVIDERS } from '@/lib/models';
import type { Provider } from '@/lib/providers/types';
import type { BackgroundResponse, ChatRequest, GetSelectionMessage } from '@/lib/messaging';
import { CheckIcon, CopyIcon, GearIcon, HistoryIcon, PlusIcon, PowerIcon } from '@/components/icons';
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
  const [hostname, setHostname] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const messagesRef = useRef<HTMLDivElement>(null);

  const availableProviders = useMemo(
    () => PROVIDERS.filter((p) => Boolean(apiKeys[p])),
    [apiKeys],
  );

  const siteExcluded = Boolean(hostname && settings?.siteDenylist.includes(hostname));

  useEffect(() => {
    messagesRef.current?.scrollTo({ top: messagesRef.current.scrollHeight });
  }, [conversation?.id, conversation?.messages.length, sending]);

  useEffect(() => {
    browser.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
      if (!tab?.url) return;
      try {
        setHostname(new URL(tab.url).hostname);
      } catch {
        // Non-http tab (e.g. chrome:// or file://) — no hostname to exclude.
      }
    });
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
        if (!tab?.id) return;
        const message: GetSelectionMessage = { type: 'GET_SELECTION' };
        const selected = await browser.tabs.sendMessage(tab.id, message);
        if (typeof selected === 'string' && selected.trim()) {
          setInput((current) => (current ? current : selected));
        }
      } catch {
        // No content script on this tab (e.g. chrome:// or file://) — leave composer as-is.
      }
    })();
    // One-shot prefill on mount only — not a live sync while the popup stays open.
  }, []);

  useEffect(() => {
    settingsStorage.getValue().then((loaded) => {
      setSettings(loaded);
      const initialProvider = availableProviders.includes(loaded.defaultProvider)
        ? loaded.defaultProvider
        : (availableProviders[0] ?? loaded.defaultProvider);
      setProvider(initialProvider);
      setModel(loaded.defaultModel[initialProvider]);
    });
    conversationsStorage.getValue().then(setConversations);
    // Only run once on mount; availableProviders is derived from a stable initial apiKeys prop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      setModel(settings.defaultModel[initialProvider]);
    }
  }

  function handleOpenConversation(target: Conversation) {
    setConversation(target);
    setProvider(target.provider);
    setModel(target.model);
    setView('chat');
  }

  async function handleDeleteConversation(id: string) {
    await deleteConversation(id);
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (conversation?.id === id) handleNewChat();
  }

  function handleProviderChange(next: Provider) {
    setProvider(next);
    setModel(settings?.defaultModel?.[next] ?? MODELS[next][0]!.id);
  }

  async function handleToggleSiteExclusion() {
    if (!settings || !hostname) return;
    const next: Settings = {
      ...settings,
      siteDenylist: toggleSiteDenylist(settings.siteDenylist, hostname),
    };
    setSettings(next);
    await settingsStorage.setValue(next);
  }

  async function handleCopy(index: number, content: string) {
    await navigator.clipboard.writeText(content);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex((current) => (current === index ? null : current)), 1200);
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
    await saveConversation(withUser);
    setConversations((prev) => upsert(prev, withUser));

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
        await saveConversation(withAssistant);
        setConversations((prev) => upsert(prev, withAssistant));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reach the background service.');
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
      />
    );
  }

  return (
    <div className="chat">
      <div className="chat__toolbar">
        <select
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
        <select value={model} onChange={(e) => setModel(e.target.value)} aria-label="Model">
          {MODELS[provider].map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="icon-btn"
          onClick={handleNewChat}
          title="New chat"
          aria-label="New chat"
        >
          <PlusIcon />
        </button>
        <button
          type="button"
          className="icon-btn"
          onClick={() => setView('history')}
          title="History"
          aria-label="History"
        >
          <HistoryIcon />
        </button>
        {hostname && (
          <button
            type="button"
            className={`icon-btn${siteExcluded ? ' icon-btn--muted' : ' icon-btn--active'}`}
            onClick={handleToggleSiteExclusion}
            title={siteExcluded ? `Enable on ${hostname}` : `Disable on ${hostname}`}
            aria-label={
              siteExcluded
                ? `Enable rewriter on ${hostname}`
                : `Disable rewriter on ${hostname}`
            }
          >
            <PowerIcon />
          </button>
        )}
        <button
          type="button"
          className="icon-btn"
          title="Settings"
          aria-label="Settings"
          onClick={() => browser.runtime.openOptionsPage()}
        >
          <GearIcon />
        </button>
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
