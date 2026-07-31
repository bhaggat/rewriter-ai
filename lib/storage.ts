import { storage } from 'wxt/utils/storage';
import type { Provider } from './providers/types';
import { DEFAULT_MODEL, PROVIDERS } from './models';
import { DEFAULT_PRESETS, type RewritePreset } from './presets';

export type ApiKeys = Partial<Record<Provider, string>>;

export interface Settings {
  autoDetectEnabled: boolean;
  siteDenylist: string[];
  defaultProvider: Provider;
  defaultModel: Record<Provider, string>;
}

export interface StoredMessage {
  role: 'user' | 'assistant';
  content: string;
  ts: number;
}

export interface Conversation {
  id: string;
  provider: Provider;
  model: string;
  title: string;
  messages: StoredMessage[];
  createdAt: number;
  updatedAt: number;
}

export const apiKeysStorage = storage.defineItem<ApiKeys>('local:apiKeys', {
  fallback: {},
});

export const settingsStorage = storage.defineItem<Settings>('local:settings', {
  fallback: {
    autoDetectEnabled: true,
    siteDenylist: [],
    defaultProvider: 'openai',
    defaultModel: { ...DEFAULT_MODEL },
  },
});

export const conversationsStorage = storage.defineItem<Conversation[]>('local:conversations', {
  fallback: [],
});

export const popoutWindowIdStorage = storage.defineItem<number | null>('local:popoutWindowId', {
  fallback: null,
});

export const presetsStorage = storage.defineItem<RewritePreset[]>('local:presets', {
  fallback: DEFAULT_PRESETS,
});

export function hasAnyApiKey(keys: ApiKeys): boolean {
  return PROVIDERS.some((provider) => Boolean(keys[provider]));
}

export function isSiteExcluded(denylist: string[], hostname: string): boolean {
  return denylist.includes(hostname);
}

export function toggleSiteDenylist(denylist: string[], hostname: string): string[] {
  return denylist.includes(hostname)
    ? denylist.filter((h) => h !== hostname)
    : [...denylist, hostname];
}

export function createConversation(provider: Provider, model: string): Conversation {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    provider,
    model,
    title: 'New chat',
    messages: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function deriveTitle(text: string): string {
  const trimmed = text.trim().replace(/\s+/g, ' ');
  if (!trimmed) return 'New chat';
  return trimmed.length > 40 ? `${trimmed.slice(0, 40)}…` : trimmed;
}

export async function saveConversation(conversation: Conversation): Promise<void> {
  const all = await conversationsStorage.getValue();
  const index = all.findIndex((c) => c.id === conversation.id);
  const next = [...all];
  if (index === -1) {
    next.unshift(conversation);
  } else {
    next[index] = conversation;
  }
  await conversationsStorage.setValue(next);
}

export async function deleteConversation(id: string): Promise<void> {
  const all = await conversationsStorage.getValue();
  await conversationsStorage.setValue(all.filter((c) => c.id !== id));
}
