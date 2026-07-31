import { useState } from 'react';
import { openPopout } from '@/lib/popout';

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
      className="popout-button"
      title={failed ? 'Could not open a separate window. Try again.' : 'Open in a separate window that stays open'}
      onClick={handleClick}
    >
      ↗
    </button>
  );
}
