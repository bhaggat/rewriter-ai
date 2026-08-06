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
  deepPolish?: boolean;
}

export type BackgroundRequest = ChatRequest | RewriteRequest;

export type BackgroundResponse = { ok: true; result: string } | { ok: false; error: string };

export interface TriggerRewriteShortcutMessage {
  type: 'TRIGGER_REWRITE_SHORTCUT';
}

export interface TriggerRewriteContextMenuMessage {
  type: 'TRIGGER_REWRITE_CONTEXT_MENU';
  instruction?: string;
}

export interface GetSelectionMessage {
  type: 'GET_SELECTION';
}

/** Sent from popup → content script to insert text into the last focused editable field. */
export interface InsertTextMessage {
  type: 'INSERT_TEXT';
  text: string;
}

/** Sent from popup → content script to check if a field is available for insertion. */
export interface HasEditableFieldMessage {
  type: 'HAS_EDITABLE_FIELD';
}
