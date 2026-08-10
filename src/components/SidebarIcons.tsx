import type { NavIconName } from '../data/sidebarMenu';

export type { NavIconName } from '../data/sidebarMenu';
const svgProps = {
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

export function NavIcon({ name }: { name: NavIconName }) {
  switch (name) {
    case 'dashboard':
      return (
        <svg {...svgProps} aria-hidden>
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      );
    case 'calendar':
      return (
        <svg {...svgProps} aria-hidden>
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
      );
    case 'sun':
      return (
        <svg {...svgProps} aria-hidden>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      );
    case 'layers':
      return (
        <svg {...svgProps} aria-hidden>
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
          <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
        </svg>
      );
    case 'scan':
      return (
        <svg {...svgProps} aria-hidden>
          <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" />
          <path d="M7 12h10" />
        </svg>
      );
    case 'users':
      return (
        <svg {...svgProps} aria-hidden>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case 'building':
      return (
        <svg {...svgProps} aria-hidden>
          <rect x="4" y="2" width="16" height="20" rx="2" />
          <path d="M9 22v-4h6v4M8 6h.01M12 6h.01M16 6h.01M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01" />
        </svg>
      );
    case 'receipt':
      return (
        <svg {...svgProps} aria-hidden>
          <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1z" />
          <path d="M8 10h8M8 14h5" />
        </svg>
      );
    case 'wallet':
      return (
        <svg {...svgProps} aria-hidden>
          <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H5a2 2 0 0 1-2-2V7" />
          <path d="M3 5v14a2 2 0 0 0 2 2h15v-5" />
          <circle cx="16" cy="12" r="1" />
        </svg>
      );
    case 'key':
      return (
        <svg {...svgProps} aria-hidden>
          <circle cx="8" cy="15" r="4" />
          <path d="m10.5 12.5 7-7M18 6l-1.5 1.5M21 3l-1 1" />
        </svg>
      );
    case 'chart':
      return (
        <svg {...svgProps} aria-hidden>
          <path d="M3 3v18h18" />
          <path d="m7 16 4-6 4 3 5-8" />
        </svg>
      );
    case 'log-out':
      return (
        <svg {...svgProps} aria-hidden>
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
      );
    default:
      return null;
  }
}
