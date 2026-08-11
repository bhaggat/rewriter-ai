import { useState } from 'react';
import { openPopout } from '@/lib/popout';
import { ExternalLinkIcon } from '@/components/icons';

export default function PopoutButton() {
  const [failed, setFailed] = useState(false);

  async function handleClick() {
    try {
      await openPopout();
      window.close();
    } catch {
      setFailed(true);
    }
  }

  return (
    <button
      type="button"
      className="header-icon-btn popout-button"
      data-tooltip={failed ? 'Could not open a separate window. Try again.' : 'Open in a separate window that stays open'}
      data-tooltip-pos="bottom-left"
      aria-label="Open in popout window"
      onClick={handleClick}
    >
      <ExternalLinkIcon size={14} />
    </button>
  );
}
