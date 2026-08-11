import { storage } from 'wxt/utils/storage';
import type { Provider } from './providers/types';
import { DEFAULT_MODEL, PROVIDERS } from './models';
import { DEFAULT_PRESETS, type RewritePreset } from './presets';

export type ApiKeys = Partial<Record<Provider, string>>;

export interface Settings {
  autoDetectEnabled: boolean;
  sideBarWidgetEnabled: boolean;
  siteDenylist: string[];
  defaultProvider: Provider;
  defaultModel: Record<Provider, string>;
  /** Preset ID or free-text instruction applied automatically when the shortcut fires.
   *  Empty string means "show preset picker". */
  defaultWritingStyle: string;
  /** Whether defaultWritingStyle is a preset ID (true) or a raw instruction string (false). */
  defaultWritingStyleIsPreset: boolean;
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
    sideBarWidgetEnabled: true,
    siteDenylist: [],
    defaultProvider: 'openai',
    defaultModel: { ...DEFAULT_MODEL },
    defaultWritingStyle: 'fix-grammar',
    defaultWritingStyleIsPreset: true,
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

export const lastWritingStyleStorage = storage.defineItem<string>('local:lastWritingStyle', {
  fallback: '',
});

export type CollapsibleSectionsState = Record<string, boolean>;

export const collapsibleSectionsStorage = storage.defineItem<CollapsibleSectionsState>(
  'local:collapsibleSectionsState',
  {
    fallback: {},
  },
);

export function hasAnyApiKey(keys: ApiKeys): boolean {
  return PROVIDERS.some((provider) => Boolean(keys[provider]));
}

export function getEffectiveProvider(
  settings: Settings | null,
  apiKeys: ApiKeys | null,
): Provider {
  const available = PROVIDERS.filter((p) => Boolean(apiKeys?.[p]?.trim()));
  const preferred = settings?.defaultProvider ?? 'openai';
  if (available.length === 0) return preferred;
  return available.includes(preferred) ? preferred : available[0]!;
}

export function isSiteExcluded(
  denylist: string[] | undefined | null,
  hostname: string | undefined | null,
): boolean {
  if (!denylist || !hostname) return false;
  const lowerHost = hostname.toLowerCase();
  return denylist.some((item) => {
    const lowerItem = item.toLowerCase();
    return lowerHost === lowerItem || lowerHost.endsWith(`.${lowerItem}`);
  });
}

export function toggleSiteDenylist(denylist: string[], hostname: string): string[] {
  const lowerHost = hostname.toLowerCase();
  const exists = denylist.some((h) => h.toLowerCase() === lowerHost);
  return exists
    ? denylist.filter((h) => h.toLowerCase() !== lowerHost)
    : [...denylist, hostname.toLowerCase()];
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
