import type { ChatMessage, ProviderClient, ValidateKeyResult } from './types';
import { ProviderError, buildRewriteMessages } from './types';
import { friendlyStatusMessage } from '@/lib/errors';

const MESSAGES_URL = 'https://api.anthropic.com/v1/messages';
const MODELS_URL = 'https://api.anthropic.com/v1/models';
const ANTHROPIC_VERSION = '2023-06-01';
const MAX_TOKENS = 4096;

function authHeaders(apiKey: string): Record<string, string> {
  return {
    'x-api-key': apiKey,
    'anthropic-version': ANTHROPIC_VERSION,
    // Required for calling the Anthropic API directly from a browser context.
    'anthropic-dangerous-direct-browser-access': 'true',
  };
}

async function chat(apiKey: string, model: string, messages: ChatMessage[]): Promise<string> {
  const response = await fetch(MESSAGES_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(apiKey),
    },
    body: JSON.stringify({
      model,
      max_tokens: MAX_TOKENS,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    }),
  });

  if (!response.ok) {
    throw new ProviderError('anthropic', await extractErrorMessage(response));
  }

  const data = await response.json();
  const content: string = (data.content ?? [])
    .filter((block: { type?: string }) => block.type === 'text')
    .map((block: { text?: string }) => block.text ?? '')
    .join('');
  if (!content) {
    throw new ProviderError('anthropic', 'Claude returned an empty response.');
  }
  return content.trim();
}

async function extractErrorMessage(response: Response): Promise<string> {
  try {
    const data = await response.json();
    return data?.error?.message ?? friendlyStatusMessage(response.status, 'Claude');
  } catch {
    return friendlyStatusMessage(response.status, 'Claude');
  }
}

async function validateKey(apiKey: string): Promise<ValidateKeyResult> {
  try {
    const response = await fetch(MODELS_URL, { headers: authHeaders(apiKey) });
    if (response.ok) return { ok: true };
    return { ok: false, error: await extractErrorMessage(response) };
  } catch {
    return { ok: false, error: 'Could not reach the API. Check your connection.' };
  }
}

export const anthropicClient: ProviderClient = {
  chat,
  rewrite: (apiKey, model, text, instruction, deepPolish) =>
    chat(apiKey, model, buildRewriteMessages(text, instruction, deepPolish)),
  validateKey,
};
