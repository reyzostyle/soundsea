// One icon set, one set of rules: a 24 grid, 1.6 stroke, round caps and joins, and
// no filled shapes except the transport controls, which read better solid at small
// sizes. Everything is drawn on the same optical weight so a row of icons looks like
// a row of icons and not a collection.

type IconProps = { className?: string };

function Icon({ className = "h-5 w-5", children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

function Solid({ className = "h-5 w-5", children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      {children}
    </svg>
  );
}

export function PlayIcon({ className }: IconProps) {
  return (
    <Solid className={className}>
      <path d="M8 5.2v13.6c0 .9 1 1.5 1.8 1L20.4 13a1.2 1.2 0 0 0 0-2L9.8 4.2A1.2 1.2 0 0 0 8 5.2Z" />
    </Solid>
  );
}

export function PauseIcon({ className }: IconProps) {
  return (
    <Solid className={className}>
      <rect x="6.5" y="5" width="3.6" height="14" rx="1.4" />
      <rect x="13.9" y="5" width="3.6" height="14" rx="1.4" />
    </Solid>
  );
}

export function PrevIcon({ className }: IconProps) {
  return (
    <Solid className={className}>
      <rect x="5" y="5.5" width="2.4" height="13" rx="1.2" />
      <path d="M19 6.6v10.8c0 .9-1 1.5-1.8 1l-8.1-5.4a1.2 1.2 0 0 1 0-2l8.1-5.4c.8-.5 1.8.1 1.8 1Z" />
    </Solid>
  );
}

export function NextIcon({ className }: IconProps) {
  return (
    <Solid className={className}>
      <rect x="16.6" y="5.5" width="2.4" height="13" rx="1.2" />
      <path d="M5 6.6v10.8c0 .9 1 1.5 1.8 1l8.1-5.4a1.2 1.2 0 0 0 0-2L6.8 5.6C6 5.1 5 5.7 5 6.6Z" />
    </Solid>
  );
}

export function RepeatIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M4 9.5A3.5 3.5 0 0 1 7.5 6H18" />
      <path d="m15.5 3.5 2.8 2.5-2.8 2.5" />
      <path d="M20 14.5a3.5 3.5 0 0 1-3.5 3.5H6" />
      <path d="m8.5 20.5-2.8-2.5 2.8-2.5" />
    </Icon>
  );
}

export function RepeatOneIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M4 9.5A3.5 3.5 0 0 1 7.5 6H18" />
      <path d="m15.5 3.5 2.8 2.5-2.8 2.5" />
      <path d="M20 14.5a3.5 3.5 0 0 1-3.5 3.5H6" />
      <path d="m8.5 20.5-2.8-2.5 2.8-2.5" />
      <path d="M11.4 10.6 13 9.6V15" />
    </Icon>
  );
}

export function PlusIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M12 5.5v13M5.5 12h13" />
    </Icon>
  );
}

export function MinusIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M5.5 12h13" />
    </Icon>
  );
}

export function TrashIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M4.5 6.5h15" />
      <path d="M9.5 6.5V5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v1.5" />
      <path d="M6.5 6.5 7.3 19a1 1 0 0 0 1 .9h7.4a1 1 0 0 0 1-.9l.8-12.5" />
      <path d="M10.5 10v6M13.5 10v6" />
    </Icon>
  );
}

export function PencilIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M15.4 4.8a2 2 0 0 1 2.8 0l1 1a2 2 0 0 1 0 2.8L9.4 17.4l-4 1.2 1.2-4Z" />
      <path d="m14.2 6 3.8 3.8" />
    </Icon>
  );
}

export function XIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="m6.5 6.5 11 11M17.5 6.5l-11 11" />
    </Icon>
  );
}

export function MenuIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M4.5 7h15M4.5 12h15M4.5 17h15" />
    </Icon>
  );
}

export function MusicIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M9.5 18V6.6l9-1.8V16" />
      <circle cx="7" cy="18" r="2.5" />
      <circle cx="16" cy="16" r="2.5" />
    </Icon>
  );
}

export function WaveIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M4 11v2M8 8v8M12 5v14M16 8v8M20 11v2" />
    </Icon>
  );
}

export function DownloadIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M12 4v10" />
      <path d="m8 10.5 4 3.5 4-3.5" />
      <path d="M4.5 17.5v1a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-1" />
    </Icon>
  );
}

export function GoogleIcon({ className = "h-5 w-5" }: IconProps) {
  // the one icon that keeps its own colors: it is a brand mark, not part of the set
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="#4285F4"
        d="M21.6 12.23c0-.68-.06-1.36-.18-2.02H12v3.82h5.39a4.6 4.6 0 0 1-2 3.02v2.5h3.23c1.89-1.74 2.98-4.3 2.98-7.32Z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 4.96-.9 6.62-2.44l-3.23-2.5c-.9.6-2.05.95-3.39.95-2.6 0-4.81-1.76-5.6-4.12H3.07v2.58A10 10 0 0 0 12 22Z"
      />
      <path fill="#FBBC05" d="M6.4 13.89a6 6 0 0 1 0-3.78V7.53H3.07a10 10 0 0 0 0 8.94l3.33-2.58Z" />
      <path
        fill="#EA4335"
        d="M12 5.98c1.47 0 2.79.5 3.83 1.5l2.86-2.86C16.96 2.99 14.7 2 12 2a10 10 0 0 0-8.93 5.53L6.4 10.1C7.19 7.75 9.4 5.98 12 5.98Z"
      />
    </svg>
  );
}

export function LogOutIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M14 4.5h3.5a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H14" />
      <path d="M10 8 6 12l4 4" />
      <path d="M6 12h8" />
    </Icon>
  );
}

export function SettingsIcon({ className }: IconProps) {
  // a cog, not a sun: the theme toggle already owns rays around a circle
  return (
    <Icon className={className}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.1 14.2a1.4 1.4 0 0 0 .3 1.5l.1.1a1.7 1.7 0 1 1-2.4 2.4l-.1-.1a1.4 1.4 0 0 0-2.4 1v.3a1.7 1.7 0 0 1-3.4 0v-.2a1.4 1.4 0 0 0-2.4-1l-.1.1a1.7 1.7 0 1 1-2.4-2.4l.1-.1a1.4 1.4 0 0 0-1-2.4h-.3a1.7 1.7 0 0 1 0-3.4h.2a1.4 1.4 0 0 0 1-2.4l-.1-.1a1.7 1.7 0 1 1 2.4-2.4l.1.1a1.4 1.4 0 0 0 1.5.3h.1a1.4 1.4 0 0 0 .9-1.3v-.3a1.7 1.7 0 0 1 3.4 0v.2a1.4 1.4 0 0 0 2.4 1l.1-.1a1.7 1.7 0 1 1 2.4 2.4l-.1.1a1.4 1.4 0 0 0-.3 1.5v.1a1.4 1.4 0 0 0 1.3.9h.3a1.7 1.7 0 0 1 0 3.4h-.2a1.4 1.4 0 0 0-1.3.9Z" />
    </Icon>
  );
}

export function SunIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v2M12 19v2M21 12h-2M5 12H3M18.4 5.6 17 7M7 17l-1.4 1.4M18.4 18.4 17 17M7 7 5.6 5.6" />
    </Icon>
  );
}

export function MoonIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M20 14.2A8 8 0 0 1 9.8 4a8 8 0 1 0 10.2 10.2Z" />
    </Icon>
  );
}

export function MoreIcon({ className }: IconProps) {
  return (
    <Solid className={className}>
      <circle cx="12" cy="5.5" r="1.7" />
      <circle cx="12" cy="12" r="1.7" />
      <circle cx="12" cy="18.5" r="1.7" />
    </Solid>
  );
}

export function ChevronUpIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="m6.5 14.5 5.5-5 5.5 5" />
    </Icon>
  );
}

export function ChevronDownIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="m6.5 9.5 5.5 5 5.5-5" />
    </Icon>
  );
}

export function CheckIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="m5 12.5 4.5 4.5L19 7" />
    </Icon>
  );
}

export function InfoIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5.5" />
      <path d="M12 7.8h.01" />
    </Icon>
  );
}

export function ExternalLinkIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M13.5 5h5.5v5.5" />
      <path d="M19 5l-7.5 7.5" />
      <path d="M18 14.5v3.5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3.5" />
    </Icon>
  );
}

export function GripIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M8 8h.01M8 12h.01M8 16h.01M16 8h.01M16 12h.01M16 16h.01" />
    </Icon>
  );
}

export function VolumeIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M11 5.5 6.8 9H4.5a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1h2.3L11 18.5Z" />
      <path d="M15 9.5a3.5 3.5 0 0 1 0 5" />
      <path d="M17.7 6.8a7 7 0 0 1 0 10.4" />
    </Icon>
  );
}

export function ShareIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M12 15.5V4" />
      <path d="m8.5 7.5 3.5-3.5 3.5 3.5" />
      <path d="M5.5 12.5v6a1.5 1.5 0 0 0 1.5 1.5h10a1.5 1.5 0 0 0 1.5-1.5v-6" />
    </Icon>
  );
}

export function ShuffleIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M4 7h3.2c1 0 2 .5 2.6 1.4l4.4 7.2c.6.9 1.6 1.4 2.6 1.4H20" />
      <path d="m17.5 4.5 2.5 2.5-2.5 2.5" />
      <path d="m17.5 14.5 2.5 2.5-2.5 2.5" />
      <path d="M4 17h3.2c1 0 2-.5 2.6-1.4l.7-1.1" />
      <path d="m13.5 9.6.7-1.2A3 3 0 0 1 16.8 7H20" />
    </Icon>
  );
}

export function Spinner({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={`animate-spin ${className}`} aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.6" className="opacity-25" />
      <path d="M20.5 12A8.5 8.5 0 0 0 12 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function SlidersIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M4.5 7.5h4M13.5 7.5h6" />
      <path d="M4.5 16.5h6M15.5 16.5h4" />
      <circle cx="11" cy="7.5" r="2.2" />
      <circle cx="13" cy="16.5" r="2.2" />
    </Icon>
  );
}

export function SearchIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m20 20-4.2-4.2" />
    </Icon>
  );
}

export function GlobeIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17" />
      <path d="M12 3.5c2.2 2.3 3.4 5.3 3.4 8.5S14.2 18.2 12 20.5c-2.2-2.3-3.4-5.3-3.4-8.5S9.8 5.8 12 3.5Z" />
    </Icon>
  );
}
