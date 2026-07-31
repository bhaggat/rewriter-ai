import type { ProviderClient } from './types';
import { bearerAuth, createOpenAICompatibleClient } from './openaiCompatible';

export const xaiClient: ProviderClient = createOpenAICompatibleClient({
  provider: 'xai',
  chatUrl: 'https://api.x.ai/v1/chat/completions',
  validateUrl: 'https://api.x.ai/v1/models',
  authHeader: bearerAuth,
});
