import { useEffect } from 'react';
import { CloseIcon, TrashIcon } from './icons';

interface Props {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDanger?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  isDanger = true,
  onConfirm,
  onClose,
}: Props) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        onConfirm();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, onConfirm]);

  if (!isOpen) return null;

  return (
    <div
      className="confirm-modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      <div className="confirm-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="confirm-modal-header">
          <div className="confirm-modal-title-group">
            <div className={`confirm-modal-icon ${isDanger ? 'confirm-modal-icon--danger' : ''}`}>
              <TrashIcon size={18} />
            </div>
            <h3 id="confirm-modal-title">{title}</h3>
          </div>
          <button
            type="button"
            className="confirm-modal-close"
            onClick={onClose}
            aria-label="Close"
            data-tooltip="Close"
          >
            <CloseIcon size={16} />
          </button>
        </div>

        <p className="confirm-modal-message">{message}</p>

        <div className="confirm-modal-footer">
          <button
            type="button"
            className="confirm-modal-btn confirm-modal-btn--secondary"
            onClick={onClose}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`confirm-modal-btn ${
              isDanger ? 'confirm-modal-btn--danger' : 'confirm-modal-btn--primary'
            }`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
