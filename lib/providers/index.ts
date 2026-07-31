import type { Provider, ProviderClient } from './types';
import { openaiClient } from './openai';
import { geminiClient } from './gemini';
import { anthropicClient } from './anthropic';
import { xaiClient } from './xai';
import { openrouterClient } from './openrouter';
import { groqClient } from './groq';
import { mistralClient } from './mistral';

export const providerClients: Record<Provider, ProviderClient> = {
  openai: openaiClient,
  gemini: geminiClient,
  anthropic: anthropicClient,
  xai: xaiClient,
  openrouter: openrouterClient,
  groq: groqClient,
  mistral: mistralClient,
};

export * from './types';
