import type { ProviderClient } from './types';
import { bearerAuth, createOpenAICompatibleClient } from './openaiCompatible';

export const openrouterClient: ProviderClient = createOpenAICompatibleClient({
  provider: 'openrouter',
  chatUrl: 'https://openrouter.ai/api/v1/chat/completions',
  // /models is public and unauthenticated; /auth/key actually checks the key.
  validateUrl: 'https://openrouter.ai/api/v1/auth/key',
  authHeader: bearerAuth,
});
