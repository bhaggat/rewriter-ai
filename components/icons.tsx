interface IconProps {
  size?: number;
  className?: string;
}

const common = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

export function PlusIcon({ size = 16, className }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} className={className} aria-hidden="true">
      <path d="M8 3v10M3 8h10" {...common} />
    </svg>
  );
}

export function HistoryIcon({ size = 16, className }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} className={className} aria-hidden="true">
      <circle cx="8" cy="8.5" r="5.5" {...common} />
      <path d="M8 5.5v3l2 1.5" {...common} />
      <path d="M8 1v2M4.5 2l1 1.5M11.5 2l-1 1.5" {...common} />
    </svg>
  );
}

export function GearIcon({ size = 16, className }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} className={className} aria-hidden="true">
      <circle cx="8" cy="8" r="2.5" {...common} />
      <path
        d="M8 1.5v1.5M8 13v1.5M2.8 4.2l1.3 0.8M11.9 11l1.3 0.8M1.5 8h1.5M13 8h1.5M2.8 11.8l1.3 -0.8M11.9 5l1.3 -0.8"
        {...common}
      />
    </svg>
  );
}

export function ArrowLeftIcon({ size = 16, className }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} className={className} aria-hidden="true">
      <path d="M13 8H3M7 4L3 8l4 4" {...common} />
    </svg>
  );
}

export function TrashIcon({ size = 16, className }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} className={className} aria-hidden="true">
      <path d="M2.5 4h11M5.5 4V2.5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1V4" {...common} />
      <path d="M4 4l0.6 8.5a1 1 0 0 0 1 0.9h4.8a1 1 0 0 0 1-0.9L12 4" {...common} />
      <path d="M6.5 7v4M9.5 7v4" {...common} />
    </svg>
  );
}

export function PowerIcon({ size = 16, className }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} className={className} aria-hidden="true">
      <path d="M8 2.5v4.5" {...common} />
      <path d="M4.5 4.2a5.2 5.2 0 1 0 7 0" {...common} />
    </svg>
  );
}

export function LogoIcon({ size = 16, className }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} className={className} aria-hidden="true">
      <path d="M3 13L11.5 4.5" {...common} />
      <path d="M13 1v3M11.5 2.5h3" {...common} />
    </svg>
  );
}

export function CopyIcon({ size = 14, className }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} className={className} aria-hidden="true">
      <rect x="5.5" y="5.5" width="8" height="8.5" rx="1.2" {...common} />
      <path d="M3.5 9.5H2.5a1 1 0 0 1-1-1V2.5a1 1 0 0 1 1-1H8a1 1 0 0 1 1 1V3.5" {...common} />
    </svg>
  );
}

export function CheckIcon({ size = 14, className }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} className={className} aria-hidden="true">
      <path d="M3 8.5L6.5 12L13 4.5" {...common} />
    </svg>
  );
}

export function InfoIcon({ size = 16, className }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} className={className} aria-hidden="true">
      <circle cx="8" cy="8" r="6" {...common} />
      <path d="M8 7v4.5" {...common} />
      <circle cx="8" cy="4.5" r="0.85" fill="currentColor" />
    </svg>
  );
}

export function HelpIcon({ size = 16, className }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} className={className} aria-hidden="true">
      <circle cx="8" cy="8" r="6" {...common} />
      <path d="M6.2 5.8a2 2 0 0 1 3.4-1 1.8 1.8 0 0 1-0.2 2.5C8.6 7.9 8 8.3 8 9.5" {...common} />
      <circle cx="8" cy="11.8" r="0.85" fill="currentColor" />
    </svg>
  );
}

export function CloseIcon({ size = 16, className }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} className={className} aria-hidden="true">
      <path d="M4 4L12 12M12 4L4 12" {...common} />
    </svg>
  );
}

