import type { ChatMessage, Provider } from './providers/types';

export interface ChatRequest {
  type: 'CHAT_REQUEST';
  provider: Provider;
  model: string;
  messages: ChatMessage[];
}

export interface RewriteRequest {
  type: 'REWRITE_REQUEST';
  provider: Provider;
  model: string;
  text: string;
  instruction: string;
}

export type BackgroundRequest = ChatRequest | RewriteRequest;

export type BackgroundResponse = { ok: true; result: string } | { ok: false; error: string };

export interface TriggerRewriteShortcutMessage {
  type: 'TRIGGER_REWRITE_SHORTCUT';
}

export interface GetSelectionMessage {
  type: 'GET_SELECTION';
}
