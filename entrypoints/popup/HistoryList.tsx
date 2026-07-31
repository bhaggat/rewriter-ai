import type { Conversation } from '@/lib/storage';
import { PROVIDER_LABELS } from '@/lib/models';
import { ArrowLeftIcon, TrashIcon } from '@/components/icons';

interface Props {
  conversations: Conversation[];
  onSelect: (conversation: Conversation) => void;
  onDelete: (id: string) => void;
  onBack: () => void;
}

export default function HistoryList({ conversations, onSelect, onDelete, onBack }: Props) {
  const sorted = [...conversations].sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <div className="history">
      <div className="history__toolbar">
        <button type="button" className="icon-btn" onClick={onBack} title="Back" aria-label="Back">
          <ArrowLeftIcon />
        </button>
        <h2>History</h2>
      </div>
      {sorted.length === 0 && <p className="history__empty">No conversations yet.</p>}
      <ul className="history__list">
        {sorted.map((c) => (
          <li key={c.id} className="history__item">
            <button type="button" className="history__open" onClick={() => onSelect(c)}>
              <span className="history__title">{c.title}</span>
              <span className="history__meta">{PROVIDER_LABELS[c.provider]}</span>
            </button>
            <button
              type="button"
              className="history__delete"
              title={`Delete ${c.title}`}
              aria-label={`Delete ${c.title}`}
              onClick={() => onDelete(c.id)}
            >
              <TrashIcon size={14} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
