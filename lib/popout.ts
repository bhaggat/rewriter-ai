import { popoutWindowIdStorage } from '@/lib/storage';

const POPOUT_WIDTH = 420;
const POPOUT_HEIGHT = 640;

export async function focusExistingPopout(): Promise<boolean> {
  const id = await popoutWindowIdStorage.getValue();
  if (id == null) return false;

  try {
    await browser.windows.update(id, { focused: true });
    return true;
  } catch {
    await popoutWindowIdStorage.setValue(null);
    return false;
  }
}

export async function openPopout(): Promise<void> {
  const win = await browser.windows.create({
    url: browser.runtime.getURL('/popup.html?detached=1'),
    type: 'popup',
    width: POPOUT_WIDTH,
    height: POPOUT_HEIGHT,
  });
  if (win?.id != null) {
    await popoutWindowIdStorage.setValue(win.id);
  }
}
