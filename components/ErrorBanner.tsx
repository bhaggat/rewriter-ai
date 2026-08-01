import { CloseIcon } from './icons';

interface Props {
  message: string;
  onDismiss?: () => void;
}

export default function ErrorBanner({ message, onDismiss }: Props) {
  return (
    <div className="error-banner" role="alert">
      <span className="error-banner__text">{message}</span>
      {onDismiss && (
        <button
          type="button"
          className="error-banner__dismiss"
          onClick={onDismiss}
          aria-label="Dismiss error"
        >
          <CloseIcon size={12} />
        </button>
      )}
    </div>
  );
}
