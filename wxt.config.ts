import { defineConfig } from 'wxt';

export default defineConfig({
  outDir: 'dist',
  modules: ['@wxt-dev/module-react'],
  vite: () => ({
    build: {
      modulePreload: false,
    },
  }),
  manifest: {
    name: 'Rewriter AI',
    description:
      'Inline AI text assistant to rewrite, refine, or summarize text on any webpage using your own API keys.',
    icons: {
      16: 'icon/16.png',
      32: 'icon/32.png',
      48: 'icon/48.png',
      128: 'icon/128.png',
    },
    permissions: ['storage', 'activeTab', 'contextMenus'],
    host_permissions: [
      'https://api.openai.com/*',
      'https://generativelanguage.googleapis.com/*',
      'https://api.anthropic.com/*',
      'https://api.x.ai/*',
      'https://openrouter.ai/*',
      'https://api.groq.com/*',
      'https://api.mistral.ai/*',
    ],
    commands: {
      'trigger-rewrite': {
        suggested_key: {
          default: 'Alt+Shift+R',
          mac: 'Alt+Shift+R',
        },
        description: 'Open the rewrite popover for the focused text field',
      },
    },
  },
});
