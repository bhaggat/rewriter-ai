import type { ProviderClient } from './types';
import { bearerAuth, createOpenAICompatibleClient } from './openaiCompatible';

export const groqClient: ProviderClient = createOpenAICompatibleClient({
  provider: 'groq',
  chatUrl: 'https://api.groq.com/openai/v1/chat/completions',
  validateUrl: 'https://api.groq.com/openai/v1/models',
  authHeader: bearerAuth,
});
