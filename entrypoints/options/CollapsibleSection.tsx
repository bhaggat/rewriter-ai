import { useState, useId, type ReactNode, type MouseEvent, type KeyboardEvent } from 'react';
import { ChevronDownIcon } from '@/components/icons';

interface CollapsibleSectionProps {
  title: string;
  headerAction?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  isOpen?: boolean;
  onToggle?: () => void;
  className?: string;
}

export function CollapsibleSection({
  title,
  headerAction,
  children,
  defaultOpen = true,
  isOpen: externalIsOpen,
  onToggle: externalOnToggle,
  className = '',
}: CollapsibleSectionProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(defaultOpen);
  const contentId = useId();

  const isExpanded = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;

  const handleToggle = () => {
    if (externalOnToggle) {
      externalOnToggle();
    } else {
      setInternalIsOpen((prev) => !prev);
    }
  };

  const handleHeaderActionClick = (e: MouseEvent) => {
    e.stopPropagation();
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleToggle();
    }
  };

  return (
    <section className={`options__section ${className}`.trim()}>
      <div
        className="options__section-header"
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        aria-controls={contentId}
      >
        <h2 className="options__section-title">{title}</h2>
        <div className="options__section-header-right">
          {headerAction && (
            <div onClick={handleHeaderActionClick} onKeyDown={(e) => e.stopPropagation()}>
              {headerAction}
            </div>
          )}
          <span
            className={`options__section-chevron ${
              isExpanded ? 'options__section-chevron--expanded' : 'options__section-chevron--collapsed'
            }`}
          >
            <ChevronDownIcon size={16} />
          </span>
        </div>
      </div>

      <div
        id={contentId}
        className={`options__section-body-wrapper ${
          isExpanded ? 'options__section-body-wrapper--expanded' : ''
        }`}
      >
        <div className="options__section-body">
          <div className="options__section-content">{children}</div>
        </div>
      </div>
    </section>
  );
}

