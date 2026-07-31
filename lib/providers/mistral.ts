import type { ProviderClient } from './types';
import { bearerAuth, createOpenAICompatibleClient } from './openaiCompatible';

export const mistralClient: ProviderClient = createOpenAICompatibleClient({
  provider: 'mistral',
  chatUrl: 'https://api.mistral.ai/v1/chat/completions',
  validateUrl: 'https://api.mistral.ai/v1/models',
  authHeader: bearerAuth,
});
