import type { Provider } from './providers/types';

export interface ModelOption {
  id: string;
  label: string;
}

export const MODELS: Record<Provider, ModelOption[]> = {
  openai: [
    { id: 'gpt-5.6-luna', label: 'GPT-5.6 Luna (fast, cheap)' },
    { id: 'gpt-5.6-terra', label: 'GPT-5.6 Terra' },
    { id: 'gpt-5.6-sol', label: 'GPT-5.6 Sol' },
  ],
  gemini: [
    { id: 'gemini-3.5-flash-lite', label: 'Gemini 3.5 Flash-Lite (fast, cheap)' },
    { id: 'gemini-3.6-flash', label: 'Gemini 3.6 Flash' },
    { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
  ],
  anthropic: [
    { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5 (fast, cheap)' },
    { id: 'claude-sonnet-5', label: 'Claude Sonnet 5' },
    { id: 'claude-opus-5', label: 'Claude Opus 5' },
  ],
  xai: [
    { id: 'grok-4.3', label: 'Grok 4.3 (fast, cheap)' },
    { id: 'grok-4.5', label: 'Grok 4.5' },
    { id: 'grok-4.20-0309-non-reasoning', label: 'Grok 4.20 (non-reasoning, lightweight)' },
  ],
  openrouter: [
    { id: 'openai/gpt-5.6-luna', label: 'GPT-5.6 Luna (via OpenRouter)' },
    { id: 'anthropic/claude-sonnet-5', label: 'Claude Sonnet 5 (via OpenRouter)' },
    { id: 'meta-llama/llama-4-maverick', label: 'Llama 4 Maverick (via OpenRouter)' },
    { id: 'google/gemini-3.6-flash', label: 'Gemini 3.6 Flash (via OpenRouter)' },
  ],
  groq: [
    { id: 'openai/gpt-oss-20b', label: 'GPT-OSS 20B (fast, cheap)' },
    { id: 'openai/gpt-oss-120b', label: 'GPT-OSS 120B' },
    { id: 'qwen/qwen3.6-27b', label: 'Qwen 3.6 27B' },
  ],
  mistral: [
    { id: 'mistral-small-latest', label: 'Mistral Small (fast, cheap)' },
    { id: 'mistral-medium-latest', label: 'Mistral Medium' },
    { id: 'mistral-large-latest', label: 'Mistral Large' },
  ],
};

export const DEFAULT_MODEL: Record<Provider, string> = {
  openai: 'gpt-5.6-luna',
  gemini: 'gemini-3.5-flash-lite',
  anthropic: 'claude-haiku-4-5',
  xai: 'grok-4.3',
  openrouter: 'openai/gpt-5.6-luna',
  groq: 'openai/gpt-oss-20b',
  mistral: 'mistral-small-latest',
};

export const PROVIDER_LABELS: Record<Provider, string> = {
  openai: 'ChatGPT (OpenAI)',
  gemini: 'Gemini (Google)',
  anthropic: 'Claude (Anthropic)',
  xai: 'Grok (xAI)',
  openrouter: 'OpenRouter',
  groq: 'Groq',
  mistral: 'Mistral',
};

export const PROVIDERS: Provider[] = [
  'openai',
  'gemini',
  'anthropic',
  'xai',
  'openrouter',
  'groq',
  'mistral',
];

export interface ApiKeyInfo {
  url: string;
  linkLabel: string;
  hint: string;
}

export const API_KEY_INFO: Record<Provider, ApiKeyInfo> = {
  openai: {
    url: 'https://platform.openai.com/api-keys',
    linkLabel: 'Get a key',
    hint: 'Sign in to your OpenAI account, click "Create new secret key", then copy and paste it here. Keep it secret — anyone with this key can use your OpenAI credits.',
  },
  gemini: {
    url: 'https://aistudio.google.com/apikey',
    linkLabel: 'Get a key',
    hint: 'Sign in with your Google account, click "Create API key", then copy and paste it here. A free tier is available.',
  },
  anthropic: {
    url: 'https://console.anthropic.com/settings/keys',
    linkLabel: 'Get a key',
    hint: 'Sign in to your Anthropic account, click "Create Key", then copy and paste it here. Keep it secret — anyone with this key can use your Anthropic credits.',
  },
  xai: {
    url: 'https://console.x.ai',
    linkLabel: 'Get a key',
    hint: 'Sign in to the xAI console, create an API key under your team, then copy and paste it here.',
  },
  openrouter: {
    url: 'https://openrouter.ai/keys',
    linkLabel: 'Get a key',
    hint: 'Sign in to OpenRouter, create a new key, then copy and paste it here. One key gives you access to many providers’ models through OpenRouter.',
  },
  groq: {
    url: 'https://console.groq.com/keys',
    linkLabel: 'Get a key',
    hint: 'Sign in to GroqCloud, create an API key, then copy and paste it here. A free tier is available.',
  },
  mistral: {
    url: 'https://console.mistral.ai/api-keys',
    linkLabel: 'Get a key',
    hint: 'Sign in to La Plateforme, create a new API key, then copy and paste it here.',
  },
};
