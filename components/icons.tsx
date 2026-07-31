interface IconProps {
  size?: number;
}

const common = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

export function PlusIcon({ size = 16 }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} aria-hidden="true">
      <path d="M8 2.5v11M2.5 8h11" {...common} />
    </svg>
  );
}

export function HistoryIcon({ size = 16 }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} aria-hidden="true">
      <circle cx="8" cy="8.5" r="5.8" {...common} />
      <path d="M8 5.4v3.1l2.2 1.3" {...common} />
      <path d="M8 1v1.6M5.2 1.7l.55 1.5M10.8 1.7l-.55 1.5" {...common} />
    </svg>
  );
}

export function GearIcon({ size = 16 }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} aria-hidden="true">
      <circle cx="8" cy="8" r="2.4" {...common} />
      <path
        d="M8 1.6v1.5M8 12.9v1.5M2.9 4.4l1.2.9M11.9 10.7l1.2.9M1.6 8h1.5M12.9 8h1.5M2.9 11.6l1.2-.9M11.9 5.3l1.2-.9"
        {...common}
      />
    </svg>
  );
}

export function ArrowLeftIcon({ size = 16 }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} aria-hidden="true">
      <path d="M12.5 8h-9M6.5 3.5 3 8l3.5 4.5" {...common} />
    </svg>
  );
}

export function TrashIcon({ size = 16 }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} aria-hidden="true">
      <path d="M3 4.6h10M6 4.6V3.2a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1.4" {...common} />
      <path d="M4.3 4.6 4.9 13a1 1 0 0 0 1 .9h4.2a1 1 0 0 0 1-.9l.6-8.4" {...common} />
      <path d="M6.6 7.3v4M9.4 7.3v4" {...common} />
    </svg>
  );
}

export function PowerIcon({ size = 16 }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} aria-hidden="true">
      <path d="M8 2.6v4.4" {...common} />
      <path d="M4.8 4.1a5.2 5.2 0 1 0 6.4 0" {...common} />
    </svg>
  );
}

export function LogoIcon({ size = 16 }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} aria-hidden="true">
      <path d="M3 13 L11.5 4.5" {...common} />
      <path d="M13 1v3M11.5 2.5h3" {...common} />
    </svg>
  );
}

export function CopyIcon({ size = 14 }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} aria-hidden="true">
      <rect x="6" y="6" width="8" height="8.5" rx="1.2" {...common} />
      <path d="M4 9.5H2.8a1 1 0 0 1-1-1V2.7a1 1 0 0 1 1-1H8a1 1 0 0 1 1 1V4" {...common} />
    </svg>
  );
}

export function CheckIcon({ size = 14 }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} aria-hidden="true">
      <path d="M3 8.5 6.5 12 13 4.5" {...common} />
    </svg>
  );
}
