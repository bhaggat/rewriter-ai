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

export function WandIcon({ size = 14, className }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} className={className} aria-hidden="true">
      <path d="M10 2l1 2 2 1-2 1-1 2-1-2-2-1 2-1zM3 9l1.5 3L6 13.5 4.5 15 3 18 1.5 15 0 13.5 1.5 12z" {...common} />
      <path d="M2.5 13.5l11-11" {...common} />
    </svg>
  );
}

export function SparklesIcon({ size = 14, className }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} className={className} aria-hidden="true">
      <path d="M8 1v4M8 11v4M1 8h4M11 8h4M3 3l2.8 2.8M10.2 10.2L13 13M13 3l-2.8 2.8M5.8 10.2L3 13" {...common} />
    </svg>
  );
}

export function DiffIcon({ size = 14, className }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} className={className} aria-hidden="true">
      <path d="M2 4h12M2 8h8M2 12h12M12 7v4M10 9h4" {...common} />
    </svg>
  );
}

export function ListBulletIcon({ size = 14, className }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} className={className} aria-hidden="true">
      <path d="M6 3.5h7.5M6 8h7.5M6 12.5h7.5" {...common} />
      <circle cx="2.5" cy="3.5" r="1" fill="currentColor" />
      <circle cx="2.5" cy="8" r="1" fill="currentColor" />
      <circle cx="2.5" cy="12.5" r="1" fill="currentColor" />
    </svg>
  );
}

export function ListNumberIcon({ size = 14, className }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} className={className} aria-hidden="true">
      <path d="M7 3.5h6.5M7 8h6.5M7 12.5h6.5M2 2v3M4 5H2M2 8.5h2V10H2v1.5h2" {...common} />
    </svg>
  );
}

export function TextCaseIcon({ size = 14, className }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} className={className} aria-hidden="true">
      <path d="M2 13V4.5L5.5 13M3 10h2M10.5 13v-5M13.5 13V8M10.5 10.5h3" {...common} />
    </svg>
  );
}

export function EraserIcon({ size = 14, className }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} className={className} aria-hidden="true">
      <path d="M12.5 9.5l-6 5h-4l-1-1 3.5-4M5 4.5L11.5 11l-3 2.5L2 7z" {...common} />
    </svg>
  );
}

export function RefreshIcon({ size = 14, className }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} className={className} aria-hidden="true">
      <path d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9L14 6" {...common} />
      <path d="M14 2.5V6h-3.5" {...common} />
    </svg>
  );
}

export function ChevronDownIcon({ size = 16, className }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} className={className} aria-hidden="true">
      <path d="M4 6l4 4 4-4" {...common} />
    </svg>
  );
}

export function ExternalLinkIcon({ size = 14, className }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} className={className} aria-hidden="true">
      <path d="M6 3h7v7M13 3L6 10" {...common} />
      <path d="M10 9v4H3V6h4" {...common} />
    </svg>
  );
}

export function KeyboardIcon({ size = 14, className }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} className={className} aria-hidden="true">
      <rect x="1.5" y="3.5" width="13" height="9" rx="1.5" {...common} />
      <path d="M4 6h.01M7.5 6h.01M11 6h.01M4 8.5h.01M7.5 8.5h.01M11 8.5h.01M5 10.5h6" {...common} strokeWidth={1.75} />
    </svg>
  );
}

export function KeyCheckIcon({ size = 14, className }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} className={className} aria-hidden="true">
      <path d="M9.5 2.5a3.5 3.5 0 0 0-3.4 4.3L1.5 11.5v3h3l1-1h1l1-1v-1l1.2-1.2a3.5 3.5 0 1 0 1.8-6.8z" {...common} />
      <circle cx="11.5" cy="4.5" r="1" fill="currentColor" />
    </svg>
  );
}

export function ArrowUpIcon({ size = 14, className }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} className={className} aria-hidden="true">
      <path d="M8 13V3M4 7l4-4 4 4" {...common} />
    </svg>
  );
}

export function ArrowDownIcon({ size = 14, className }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} className={className} aria-hidden="true">
      <path d="M8 3v10M4 9l4 4 4-4" {...common} />
    </svg>
  );
}

export function SpinnerIcon({ size = 14, className }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} className={`options__spinner ${className || ''}`} aria-hidden="true">
      <path d="M8 2a6 6 0 1 0 6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function SendIcon({ size = 14, className }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} className={className} aria-hidden="true">
      <path d="M14 2L7.5 8.5" {...common} />
      <path d="M14 2L9.5 14L7.5 8.5L2 6.5L14 2Z" {...common} />
    </svg>
  );
}

export function SplitViewIcon({ size = 14, className }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} className={className} aria-hidden="true">
      <rect x="2" y="2.5" width="5.5" height="11" rx="1" {...common} />
      <rect x="8.5" y="2.5" width="5.5" height="11" rx="1" {...common} />
    </svg>
  );
}

export function InlineViewIcon({ size = 14, className }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} className={className} aria-hidden="true">
      <rect x="2" y="2.5" width="12" height="11" rx="1" {...common} />
      <path d="M2 8h12" {...common} />
    </svg>
  );
}

export function GithubIcon({ size = 14, className }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} className={className} aria-hidden="true">
      <path
        d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.28.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z"
        fill="currentColor"
      />
    </svg>
  );
}

export function GlobeIcon({ size = 14, className }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} className={className} aria-hidden="true">
      <circle cx="8" cy="8" r="6" {...common} />
      <path d="M2 8h12M8 2a9 9 0 0 1 2.5 6 9 9 0 0 1-2.5 6 9 9 0 0 1-2.5-6A9 9 0 0 1 8 2z" {...common} />
    </svg>
  );
}

export function ShieldCheckIcon({ size = 14, className }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} className={className} aria-hidden="true">
      <path d="M8 1.5L2.5 4v4.5c0 3.5 2.5 6 5.5 7 3-1 5.5-3.5 5.5-7V4L8 1.5z" {...common} />
      <path d="M5.5 8l2 2 3-3.5" {...common} />
    </svg>
  );
}

export function HeartIcon({ size = 14, className }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} className={className} aria-hidden="true">
      <path
        d="M8 13.5l-5.3-5a3.5 3.5 0 0 1 5-4.9L8 4.3l.3-.7a3.5 3.5 0 0 1 5 4.9L8 13.5z"
        fill="currentColor"
      />
    </svg>
  );
}

export function EyeIcon({ size = 14, className }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} className={className} aria-hidden="true">
      <path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z" {...common} />
      <circle cx="8" cy="8" r="2.2" {...common} />
    </svg>
  );
}

export function EyeOffIcon({ size = 14, className }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} className={className} aria-hidden="true">
      <path d="M2 2l12 12" {...common} />
      <path d="M6.7 6.8a2.2 2.2 0 0 0 2.5 2.5" {...common} />
      <path d="M4.5 4.6C2.8 5.7 1.5 7.5 1.5 8c0 .6 2 4.5 6.5 4.5 1.3 0 2.5-.4 3.5-1" {...common} />
      <path d="M9 3.6c3 .8 5 3.4 5 4.4 0 .4-.5 1.3-1.4 2.2" {...common} />
    </svg>
  );
}





