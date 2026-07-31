import { openPopout } from '@/lib/popout';

export default function PopoutButton() {
  async function handleClick() {
    await openPopout();
    window.close();
  }

  return (
    <button
      type="button"
      className="popout-button"
      title="Open in a separate window that stays open"
      onClick={handleClick}
    >
      ↗
    </button>
  );
}
