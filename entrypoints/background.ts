import { apiKeysStorage, popoutWindowIdStorage, presetsStorage } from '@/lib/storage';
import { PROVIDER_LABELS } from '@/lib/models';
import { providerClients, ProviderError } from '@/lib/providers';
import { DEFAULT_PRESETS } from '@/lib/presets';
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
        : await client.rewrite(apiKey, message.model, message.text, message.instruction, message.deepPolish);
    return { ok: true, result };
  } catch (error) {
    const errorMessage =
      error instanceof ProviderError ? error.message : 'Something went wrong. Please try again.';
    return { ok: false, error: errorMessage };
  }
}

async function setupContextMenus() {
  if (typeof browser === 'undefined' || !browser.contextMenus) return;
  try {
    await browser.contextMenus.removeAll();
    await browser.contextMenus.create({
      id: 'rewrite-root',
      title: 'Rewrite with AI',
      contexts: ['editable', 'selection'],
    });
    await browser.contextMenus.create({
      id: 'rewrite-open-widget',
      parentId: 'rewrite-root',
      title: 'Open Rewriter Widget…',
      contexts: ['editable', 'selection'],
    });
    await browser.contextMenus.create({
      id: 'rewrite-separator',
      parentId: 'rewrite-root',
      type: 'separator',
      contexts: ['editable', 'selection'],
    });

    const presets = await presetsStorage.getValue().catch(() => DEFAULT_PRESETS);
    for (const preset of presets) {
      if (preset.label.trim() && preset.instruction.trim()) {
        await browser.contextMenus.create({
          id: `rewrite-preset-${preset.id}`,
          parentId: 'rewrite-root',
          title: preset.label,
          contexts: ['editable', 'selection'],
        });
      }
    }
  } catch {
    // Ignore error if contextMenus permission is not available or supported
  }
}

export default defineBackground(() => {
  browser.runtime.onMessage.addListener((message: BackgroundRequest) => {
    return handleRequest(message);
  });

  browser.runtime.onInstalled?.addListener(() => {
    setupContextMenus();
  });
  setupContextMenus();

  presetsStorage.watch(() => {
    setupContextMenus();
  });

  browser.contextMenus?.onClicked.addListener(async (info, tab) => {
    let targetTabId = tab?.id;
    if (targetTabId == null) {
      try {
        const [activeTab] = await browser.tabs.query({ active: true, currentWindow: true });
        targetTabId = activeTab?.id;
      } catch {
        // ignore tab query error
      }
    }
    if (targetTabId == null) return;

    if (info.menuItemId === 'rewrite-root' || info.menuItemId === 'rewrite-open-widget') {
      browser.tabs.sendMessage(targetTabId, { type: 'TRIGGER_REWRITE_CONTEXT_MENU' }).catch(() => {});
    } else if (typeof info.menuItemId === 'string' && info.menuItemId.startsWith('rewrite-preset-')) {
      const presetId = info.menuItemId.replace('rewrite-preset-', '');
      const presets = await presetsStorage.getValue().catch(() => DEFAULT_PRESETS);
      const preset = presets.find((p) => p.id === presetId);
      if (preset) {
        browser.tabs.sendMessage(targetTabId, {
          type: 'TRIGGER_REWRITE_CONTEXT_MENU',
          instruction: preset.instruction,
        }).catch(() => {});
      }
    }
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
