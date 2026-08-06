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
    deepPolish?: boolean,
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

export function buildRewriteMessages(
  text: string,
  instruction: string,
  deepPolish?: boolean,
): ChatMessage[] {
  const thinkingPrompt = deepPolish
    ? `[Smart Thinking & High-Precision Polish Mode Enabled]\nInstructions: First think step-by-step to analyze context, tone, and core meaning. Remove redundancy, refine sentence structures, and ensure flawless clarity and impact.\n\n`
    : '';

  return [
    {
      role: 'user',
      content: `${thinkingPrompt}${instruction}\n\nReturn ONLY the rewritten text result, with no introductory text, surrounding quotation marks, or meta explanations.\n\nOriginal Text:\n${text}`,
    },
  ];
}
