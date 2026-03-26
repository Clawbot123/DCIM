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
    <div className="card flex items-start justify-between group hover:border-dark-600 transition-colors">
      <div>
        <p className="text-dark-400 text-xs font-medium uppercase tracking-wider mb-1">{label}</p>
        <p className="text-3xl font-bold text-dark-100">{value}</p>
        {subtitle && <p className="text-dark-500 text-xs mt-1">{subtitle}</p>}
        {trend && (
          <div className={clsx('flex items-center gap-1 text-xs mt-2', trend.value >= 0 ? 'text-green-400' : 'text-red-400')}>
            <span>{trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}%</span>
            <span className="text-dark-500">{trend.label}</span>
          </div>
        )}
      </div>
      <div className={clsx('p-3 rounded-xl bg-dark-800 group-hover:bg-dark-700 transition-colors', color)}>
        <Icon className="w-6 h-6" />
      </div>
    </div>
  );
}
