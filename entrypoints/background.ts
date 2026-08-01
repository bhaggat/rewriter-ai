import { apiKeysStorage, popoutWindowIdStorage } from '@/lib/storage';
import { PROVIDER_LABELS } from '@/lib/models';
import { providerClients, ProviderError } from '@/lib/providers';
import type { BackgroundRequest, BackgroundResponse } from '@/lib/messaging';

async function handleRequest(message: BackgroundRequest): Promise<BackgroundResponse> {
  let apiKeys;
  try {
    apiKeys = await apiKeysStorage.getValue();
  } catch {
    return { ok: false, error: 'Could not read the extension’s saved settings. Try reloading the extension.' };
  }

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

  browser.commands.onCommand.addListener(async (command, tab) => {
    if (command === 'trigger-rewrite') {
      let targetTabId = tab?.id;
      if (targetTabId == null) {
        try {
          const [activeTab] = await browser.tabs.query({ active: true, currentWindow: true });
          targetTabId = activeTab?.id;
        } catch {
          // ignore tab query error
        }
      }
      if (targetTabId != null) {
        browser.tabs.sendMessage(targetTabId, { type: 'TRIGGER_REWRITE_SHORTCUT' }).catch(() => {
          // No content script listening on this tab (e.g. a chrome:// page) — ignore.
        });
      }
    }
  });

  browser.windows.onRemoved.addListener(async (windowId) => {
    if ((await popoutWindowIdStorage.getValue()) === windowId) {
      await popoutWindowIdStorage.setValue(null);
    }
  });
});
