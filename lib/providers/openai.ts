import type { ProviderClient } from './types';
import { bearerAuth, createOpenAICompatibleClient } from './openaiCompatible';

export const openaiClient: ProviderClient = createOpenAICompatibleClient({
  provider: 'openai',
  chatUrl: 'https://api.openai.com/v1/chat/completions',
  validateUrl: 'https://api.openai.com/v1/models',
  authHeader: bearerAuth,
});
