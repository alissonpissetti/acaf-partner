type Props = { kind: string; size?: number };

const instagramGradient =
  'linear-gradient(135deg, #feda75 0%, #fa7e1e 25%, #d62976 50%, #962fbf 75%, #4f5bd5 100%)';

export function MemberAppSocialBrandIcon({ kind, size = 48 }: Props) {
  const radius = Math.round(size * 0.28);
  const iconSize = Math.round(size * 0.5);

  switch (kind) {
    case 'website':
      return (
        <div
          className="member-app-social-glyph"
          style={{
            width: size,
            height: size,
            borderRadius: radius,
            background: 'linear-gradient(135deg, #7579e5 0%, #8254e4 100%)',
            boxShadow: '0 4px 10px rgba(130, 84, 228, 0.22)',
          }}
          aria-hidden
        >
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="9" stroke="#fff" strokeWidth="1.6" />
            <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" stroke="#fff" strokeWidth="1.4" />
          </svg>
        </div>
      );
    case 'instagram':
      return (
        <div
          className="member-app-social-glyph"
          style={{
            width: size,
            height: size,
            borderRadius: radius,
            background: instagramGradient,
            boxShadow: '0 4px 10px rgba(214, 41, 118, 0.35)',
          }}
          aria-hidden
        >
          <svg width={iconSize * 1.15} height={iconSize * 1.15} viewBox="0 0 24 24" fill="none">
            <rect
              x="5"
              y="5"
              width="14"
              height="14"
              rx="4.2"
              stroke="#fff"
              strokeWidth="1.7"
            />
            <circle cx="12" cy="12" r="3.6" stroke="#fff" strokeWidth="1.6" />
            <circle cx="17.2" cy="6.8" r="1.1" fill="#fff" />
          </svg>
        </div>
      );
    case 'facebook':
      return (
        <div
          className="member-app-social-glyph"
          style={{
            width: size,
            height: size,
            borderRadius: radius,
            background: '#1877f2',
            boxShadow: '0 4px 10px rgba(24, 119, 242, 0.35)',
          }}
          aria-hidden
        >
          <svg width={iconSize * 1.05} height={iconSize * 1.05} viewBox="0 0 24 24" fill="#fff">
            <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-1.5c-.83 0-1 .4-1 1V12h2.5l-.5 3H13.5v7.95c5.05-.9 9-5.33 9-10.95z" />
          </svg>
        </div>
      );
    case 'tiktok':
      return (
        <div
          className="member-app-social-glyph member-app-social-glyph--tiktok"
          style={{
            width: size,
            height: size,
            borderRadius: radius,
            background: '#010101',
          }}
          aria-hidden
        >
          <svg width={iconSize * 0.95} height={iconSize * 0.95} viewBox="0 0 24 24" fill="#fff">
            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
          </svg>
        </div>
      );
    case 'youtube':
      return (
        <div
          className="member-app-social-glyph member-app-social-glyph--youtube"
          style={{
            width: size,
            height: size,
            borderRadius: radius,
            background: '#ff0000',
          }}
          aria-hidden
        >
          <svg width={iconSize * 1.1} height={iconSize * 1.1} viewBox="0 0 24 24" fill="#fff">
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
      );
    case 'linkedin':
      return (
        <div
          className="member-app-social-glyph member-app-social-glyph--linkedin"
          style={{
            width: size,
            height: size,
            borderRadius: radius,
            background: '#0a66c2',
            boxShadow: '0 4px 10px rgba(10, 102, 194, 0.35)',
          }}
          aria-hidden
        >
          <svg width={iconSize * 1.18} height={iconSize * 1.18} viewBox="0 0 24 24" fill="#fff">
            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.065 2.065 0 1 1-4.13 0 2.065 2.065 0 0 1 4.13 0zM9.352 20.452H3.555V9h3.564v11.452z" />
          </svg>
        </div>
      );
    default:
      return (
        <div
          className="member-app-social-glyph member-app-social-glyph--muted"
          style={{ width: size, height: size, borderRadius: radius }}
          aria-hidden
        >
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="currentColor">
            <path d="M10.6 14.2L5.9 18.9l-1.4-1.4 4.7-4.7-4.7-4.7 1.4-1.4 4.7 4.7 4.7-4.7 1.4 1.4-4.7 4.7 4.7 4.7-1.4 1.4-4.7-4.7z" />
          </svg>
        </div>
      );
  }
}