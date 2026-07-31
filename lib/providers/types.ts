export type Provider =
  | 'openai'
  | 'gemini'
  | 'anthropic'
  | 'xai'
  | 'openrouter'
  | 'groq'
  | 'mistral';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ValidateKeyResult {
  ok: boolean;
  error?: string;
}

export interface ProviderClient {
  chat(apiKey: string, model: string, messages: ChatMessage[]): Promise<string>;
  rewrite(
    apiKey: string,
    model: string,
    text: string,
    instruction: string,
  ): Promise<string>;
  validateKey(apiKey: string): Promise<ValidateKeyResult>;
}

export class ProviderError extends Error {
  constructor(
    public provider: Provider,
    message: string,
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}

export function buildRewriteMessages(text: string, instruction: string): ChatMessage[] {
  return [
    {
      role: 'user',
      content: `${instruction}\n\nReturn only the rewritten text, with no preamble, explanation, or quotation marks around it.\n\nText:\n${text}`,
    },
  ];
}
