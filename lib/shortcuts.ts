import { useEffect, useState } from 'react';

export function isMacPlatform(): boolean {
  if (typeof navigator !== 'undefined') {
    const platform =
      (navigator as any).userAgentData?.platform || navigator.platform || navigator.userAgent || '';
    return /mac/i.test(platform);
  }
  return false;
}

export interface ShortcutDetails {
  shortcut: string;
  formatted: string;
  keys: string[];
  isMac: boolean;
}

export function parseShortcutKeys(shortcut: string, isMac: boolean): { formatted: string; keys: string[] } {
  if (!shortcut || !shortcut.trim()) {
    return { formatted: 'Not set', keys: ['Not set'] };
  }

  const parts = shortcut.split('+').map((p) => p.trim());
  if (isMac) {
    const macKeys = parts.map((part) => {
      if (part === 'Alt' || part === 'Option') return '⌥ Option';
      if (part === 'Shift') return '⇧ Shift';
      if (part === 'Command' || part === 'Cmd') return '⌘ Command';
      if (part === 'MacCtrl' || part === 'Ctrl') return '⌃ Control';
      return part;
    });

    const compact = parts
      .map((part) => {
        if (part === 'Alt' || part === 'Option') return '⌥';
        if (part === 'Shift') return '⇧';
        if (part === 'Command' || part === 'Cmd') return '⌘';
        if (part === 'MacCtrl' || part === 'Ctrl') return '⌃';
        return part;
      })
      .join('');

    return { formatted: compact, keys: macKeys };
  } else {
    const winKeys = parts.map((part) => {
      if (part === 'MacCtrl') return 'Ctrl';
      if (part === 'Command') return 'Ctrl';
      return part;
    });
    return { formatted: winKeys.join('+'), keys: winKeys };
  }
}

export function openExtensionShortcuts(): void {
  try {
    if (typeof browser !== 'undefined' && browser.tabs?.create) {
      browser.tabs.create({ url: 'chrome://extensions/shortcuts' });
    } else {
      window.open('chrome://extensions/shortcuts', '_blank');
    }
  } catch {
    window.open('chrome://extensions/shortcuts', '_blank');
  }
}

export function useShortcutInfo(): ShortcutDetails & { openShortcutsPage: () => void } {
  const [details, setDetails] = useState<ShortcutDetails>(() => {
    const isMac = isMacPlatform();
    const defaultShortcut = 'Alt+Shift+R';
    const parsed = parseShortcutKeys(defaultShortcut, isMac);
    return {
      shortcut: defaultShortcut,
      formatted: parsed.formatted,
      keys: parsed.keys,
      isMac,
    };
  });

  useEffect(() => {
    const isMac = isMacPlatform();
    if (typeof browser !== 'undefined' && browser.commands?.getAll) {
      browser.commands
        .getAll()
        .then((commands) => {
          const cmd = commands.find((c) => c.name === 'trigger-rewrite');
          if (cmd) {
            const raw = cmd.shortcut || '';
            const parsed = parseShortcutKeys(raw, isMac);
            setDetails({
              shortcut: raw,
              formatted: parsed.formatted,
              keys: parsed.keys,
              isMac,
            });
          }
        })
        .catch(() => {
          // Keep default fallback
        });
    }
  }, []);

  return { ...details, openShortcutsPage: openExtensionShortcuts };
}
