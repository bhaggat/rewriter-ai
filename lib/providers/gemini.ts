import type { ChatMessage, ProviderClient, ValidateKeyResult } from './types';
import { ProviderError, buildRewriteMessages } from './types';

const MODELS_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

function endpointFor(model: string): string {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
}

async function chat(apiKey: string, model: string, messages: ChatMessage[]): Promise<string> {
  const response = await fetch(endpointFor(model), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify({
      contents: messages.map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })),
    }),
  });

  if (!response.ok) {
    throw new ProviderError('gemini', await extractErrorMessage(response));
  }

  const data = await response.json();
  const content: string = (data.candidates?.[0]?.content?.parts ?? [])
    .map((part: { text?: string }) => part.text ?? '')
    .join('');
  if (!content) {
    throw new ProviderError('gemini', 'Gemini returned an empty response.');
  }
  return content.trim();
}

async function extractErrorMessage(response: Response): Promise<string> {
  try {
    const data = await response.json();
    return data?.error?.message ?? `Gemini request failed (${response.status}).`;
  } catch {
    return `Gemini request failed (${response.status}).`;
  }
}

async function validateKey(apiKey: string): Promise<ValidateKeyResult> {
  try {
    const response = await fetch(MODELS_URL, {
      headers: { 'x-goog-api-key': apiKey },
    });
    if (response.ok) return { ok: true };
    return { ok: false, error: await extractErrorMessage(response) };
  } catch {
    return { ok: false, error: 'Could not reach the API. Check your connection.' };
  }
}

export const geminiClient: ProviderClient = {
  chat,
  rewrite: (apiKey, model, text, instruction) =>
    chat(apiKey, model, buildRewriteMessages(text, instruction)),
  validateKey,
};
