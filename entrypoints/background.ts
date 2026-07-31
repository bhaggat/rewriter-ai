import { apiKeysStorage, popoutWindowIdStorage } from '@/lib/storage';
import { PROVIDER_LABELS } from '@/lib/models';
import { providerClients, ProviderError } from '@/lib/providers';
import type { BackgroundRequest, BackgroundResponse } from '@/lib/messaging';

async function handleRequest(message: BackgroundRequest): Promise<BackgroundResponse> {
  const apiKeys = await apiKeysStorage.getValue();
  const apiKey = apiKeys[message.provider];

  if (!apiKey) {
    return {
      ok: false,
      error: `No API key configured for ${PROVIDER_LABELS[message.provider]}. Add one in the extension settings.`,
    };
  }

  const client = providerClients[message.provider];

  try {
    const result =
      message.type === 'CHAT_REQUEST'
        ? await client.chat(apiKey, message.model, message.messages)
        : await client.rewrite(apiKey, message.model, message.text, message.instruction);
    return { ok: true, result };
  } catch (error) {
    const errorMessage =
      error instanceof ProviderError ? error.message : 'Something went wrong. Please try again.';
    return { ok: false, error: errorMessage };
  }
}

export default defineBackground(() => {
  browser.runtime.onMessage.addListener((message: BackgroundRequest) => {
    return handleRequest(message);
  });

  browser.commands.onCommand.addListener((command, tab) => {
    if (command === 'trigger-rewrite' && tab?.id != null) {
      browser.tabs.sendMessage(tab.id, { type: 'TRIGGER_REWRITE_SHORTCUT' }).catch(() => {
        // No content script listening on this tab (e.g. a chrome:// page) — ignore.
      });
    }
  });

  browser.windows.onRemoved.addListener(async (windowId) => {
    if ((await popoutWindowIdStorage.getValue()) === windowId) {
      await popoutWindowIdStorage.setValue(null);
    }
  });
});
