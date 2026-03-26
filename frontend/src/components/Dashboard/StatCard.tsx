import type { LucideIcon } from 'lucide-react';
import clsx from 'clsx';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  color?: string;
  trend?: { value: number; label: string };
  subtitle?: string;
}

export function StatCard({ label, value, icon: Icon, color = 'text-primary-400', trend, subtitle }: StatCardProps) {
  return (
    <div
      className="card flex items-start justify-between group transition-all hover:shadow-lg cursor-default"
      style={{ '--hover-border': 'var(--bg-hover)' } as React.CSSProperties}
      onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--bg-hover)')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>
          {label}
        </p>
        <p className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
          {value}
        </p>
        {subtitle && (
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            {subtitle}
          </p>
        )}
        {trend && (
          <div className={clsx('flex items-center gap-1 text-xs mt-2', trend.value >= 0 ? 'text-green-400' : 'text-red-400')}>
            <span>{trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}%</span>
            <span style={{ color: 'var(--text-muted)' }}>{trend.label}</span>
          </div>
        )}
      </div>
      <div
        className={clsx('p-3 rounded-xl transition-colors', color)}
        style={{ backgroundColor: 'var(--bg-elevated)' }}
      >
        <Icon className="w-6 h-6" />
      </div>
    </div>
  );
}
