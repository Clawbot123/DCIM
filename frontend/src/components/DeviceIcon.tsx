interface DeviceIconProps {
  role: string;
  size?: number;
  className?: string;
}

export function DeviceIcon({ role, size = 16, className = '' }: DeviceIconProps) {
  const p = { width: size, height: size, viewBox: '0 0 16 16', className, fill: 'none' };
  switch (role) {
    case 'server':
      return (
        <svg {...p}>
          <rect x="1" y="2"   width="14" height="3"   rx="0.5" fill="currentColor" opacity="0.4"/>
          <rect x="1" y="6.5" width="14" height="3"   rx="0.5" fill="currentColor" opacity="0.4"/>
          <rect x="1" y="11"  width="14" height="3"   rx="0.5" fill="currentColor" opacity="0.4"/>
          <circle cx="13" cy="3.5"  r="0.75" fill="currentColor"/>
          <circle cx="13" cy="8"    r="0.75" fill="currentColor"/>
          <circle cx="13" cy="12.5" r="0.75" fill="currentColor"/>
        </svg>
      );
    case 'switch':
      return (
        <svg {...p}>
          {[2, 5.5, 9, 12.5].map(x => [3, 7, 11].map(y => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r="1" fill="currentColor" opacity="0.6"/>
          )))}
          <line x1="1" y1="13.5" x2="15" y2="13.5" stroke="currentColor" strokeWidth="1"/>
        </svg>
      );
    case 'router':
      return (
        <svg {...p} stroke="currentColor" strokeWidth="1.5">
          <circle cx="8" cy="8" r="5"/>
          <line x1="8" y1="3" x2="8" y2="1"/>
          <line x1="8" y1="13" x2="8" y2="15"/>
          <line x1="3" y1="8" x2="1" y2="8"/>
          <line x1="13" y1="8" x2="15" y2="8"/>
          <circle cx="8" cy="8" r="2" fill="currentColor" opacity="0.3"/>
        </svg>
      );
    case 'firewall':
      return (
        <svg {...p} stroke="currentColor" strokeWidth="1.5">
          <path d="M8 1.5 L14 4.5 L14 9 C14 12.5 8 14.5 8 14.5 C8 14.5 2 12.5 2 9 L2 4.5 Z"/>
          <line x1="8" y1="5" x2="8" y2="11" strokeWidth="1"/>
          <line x1="5" y1="7" x2="11" y2="7" strokeWidth="1"/>
        </svg>
      );
    case 'pdu':
      return (
        <svg {...p} stroke="currentColor" strokeWidth="1.5">
          <rect x="4" y="1" width="8" height="12" rx="1"/>
          <line x1="8" y1="1" x2="8" y2="3"/>
          <circle cx="8" cy="6.5" r="1.5" fill="currentColor" opacity="0.4"/>
          <circle cx="8" cy="10" r="1.5" fill="currentColor" opacity="0.4"/>
          <line x1="5" y1="14" x2="11" y2="14" strokeWidth="2"/>
        </svg>
      );
    case 'ups':
      return (
        <svg {...p} stroke="currentColor" strokeWidth="1.5">
          <rect x="2" y="3" width="12" height="10" rx="1"/>
          <rect x="4" y="5" width="4" height="6" rx="0.5" fill="currentColor" opacity="0.3"/>
          <path d="M10.5 6 L9 9 L10.5 9 L9.5 12" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      );
    case 'storage':
      return (
        <svg {...p} stroke="currentColor" strokeWidth="1.5">
          <ellipse cx="8" cy="4"  rx="5" ry="2"/>
          <ellipse cx="8" cy="8"  rx="5" ry="2"/>
          <ellipse cx="8" cy="12" rx="5" ry="2"/>
          <line x1="3" y1="4"  x2="3"  y2="12"/>
          <line x1="13" y1="4" x2="13" y2="12"/>
        </svg>
      );
    case 'patch_panel':
      return (
        <svg {...p} fill="currentColor">
          <rect x="1" y="5" width="14" height="6" rx="0.5" fill="none" stroke="currentColor" strokeWidth="1.5"/>
          {[3, 5.5, 8, 10.5, 13].map(x => (
            <circle key={x} cx={x} cy="8" r="1" opacity="0.7"/>
          ))}
        </svg>
      );
    case 'kvm':
      return (
        <svg {...p} stroke="currentColor" strokeWidth="1.5">
          <rect x="2" y="2" width="12" height="8" rx="1"/>
          <line x1="8" y1="10" x2="8" y2="12"/>
          <rect x="4" y="12" width="8" height="2.5" rx="0.5"/>
        </svg>
      );
    default: // other
      return (
        <svg {...p} stroke="currentColor" strokeWidth="1.5">
          <rect x="2" y="2" width="12" height="12" rx="1"/>
          <line x1="5" y1="8" x2="11" y2="8"/>
          <line x1="8" y1="5" x2="8" y2="11"/>
        </svg>
      );
  }
}
