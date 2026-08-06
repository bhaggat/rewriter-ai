import type { ChatMessage, Provider, ProviderClient, ValidateKeyResult } from './types';
import { ProviderError, buildRewriteMessages } from './types';
import { friendlyStatusMessage } from '@/lib/errors';
import { PROVIDER_LABELS } from '@/lib/models';

export interface OpenAICompatibleConfig {
  provider: Provider;
  chatUrl: string;
  validateUrl: string;
  authHeader: (apiKey: string) => Record<string, string>;
}

/**
 * Factory for providers that expose an OpenAI-shaped chat completions API
 * (OpenAI, xAI, Groq, Mistral, OpenRouter all match this shape).
 */
export function createOpenAICompatibleClient(config: OpenAICompatibleConfig): ProviderClient {
  async function chat(apiKey: string, model: string, messages: ChatMessage[]): Promise<string> {
    const response = await fetch(config.chatUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...config.authHeader(apiKey),
      },
      body: JSON.stringify({
        model,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
      }),
    });

    if (!response.ok) {
      throw new ProviderError(config.provider, await extractErrorMessage(response));
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || content.length === 0) {
      throw new ProviderError(config.provider, 'The provider returned an empty response.');
    }
    return content.trim();
  }

  async function extractErrorMessage(response: Response): Promise<string> {
    try {
      const data = await response.json();
      return data?.error?.message ?? friendlyStatusMessage(response.status, PROVIDER_LABELS[config.provider]);
    } catch {
      return friendlyStatusMessage(response.status, PROVIDER_LABELS[config.provider]);
    }
  }

  async function validateKey(apiKey: string): Promise<ValidateKeyResult> {
    try {
      const response = await fetch(config.validateUrl, {
        headers: config.authHeader(apiKey),
      });
      if (response.ok) return { ok: true };
      return { ok: false, error: await extractErrorMessage(response) };
    } catch {
      return { ok: false, error: 'Could not reach the API. Check your connection.' };
    }
  }

  return {
    chat,
    rewrite: (apiKey, model, text, instruction, deepPolish) =>
      chat(apiKey, model, buildRewriteMessages(text, instruction, deepPolish)),
    validateKey,
  };
}

export function bearerAuth(apiKey: string): Record<string, string> {
  return { Authorization: `Bearer ${apiKey}` };
}
