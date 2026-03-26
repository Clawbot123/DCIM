import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Server, MapPin, Zap, Wind, Cable,
  Bell, BarChart3, Users, Settings, ChevronLeft, Database,
  Thermometer, Network, Cpu,
} from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import clsx from 'clsx';

const navSections = [
  {
    label: 'Overview',
    items: [
      { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/datacenters', icon: Database, label: 'Data Centers' },
    ],
  },
  {
    label: 'Infrastructure',
    items: [
      { to: '/floor-plan', icon: MapPin, label: 'Floor Plan' },
      { to: '/racks', icon: Server, label: 'Racks' },
      { to: '/assets', icon: Cpu, label: 'Assets / Devices' },
    ],
  },
  {
    label: 'Utilities',
    items: [
      { to: '/power', icon: Zap, label: 'Power' },
      { to: '/cooling', icon: Wind, label: 'Cooling' },
      { to: '/cables', icon: Cable, label: 'Cables' },
    ],
  },
  {
    label: 'Monitoring',
    items: [
      { to: '/monitoring', icon: Bell, label: 'Alerts' },
      { to: '/sensors', icon: Thermometer, label: 'Sensors' },
    ],
  },
  {
    label: 'Analytics',
    items: [
      { to: '/reports', icon: BarChart3, label: 'Reports' },
    ],
  },
  {
    label: 'Admin',
    items: [
      { to: '/users', icon: Users, label: 'Users' },
      { to: '/settings', icon: Settings, label: 'Settings' },
    ],
  },
];

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useUIStore();

  return (
    <aside
      className={clsx(
        'fixed left-0 top-0 bottom-0 flex flex-col transition-all duration-300 z-40',
        sidebarCollapsed ? 'w-16' : 'w-60'
      )}
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderRight: '1px solid var(--border)',
      }}
    >
      {/* Logo */}
      <div
        className="h-16 flex items-center justify-between px-4 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        {!sidebarCollapsed && (
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary-900/50">
              <Network className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>DCIM Pro</div>
              <div className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>Infrastructure Manager</div>
            </div>
          </div>
        )}
        {sidebarCollapsed && (
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center mx-auto shadow-lg shadow-primary-900/50">
            <Network className="w-5 h-5 text-white" />
          </div>
        )}
        <button
          onClick={toggleSidebar}
          className="transition-colors ml-auto flex-shrink-0 p-1 rounded hover:opacity-80"
          style={{ color: 'var(--text-muted)' }}
        >
          <ChevronLeft className={clsx('w-4 h-4 transition-transform', sidebarCollapsed && 'rotate-180')} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-4">
        {navSections.map((section) => (
          <div key={section.label}>
            {!sidebarCollapsed && (
              <div
                className="text-xs font-semibold uppercase tracking-wider px-3 mb-1"
                style={{ color: 'var(--text-muted)' }}
              >
                {section.label}
              </div>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    clsx('nav-link', isActive && 'active', sidebarCollapsed && 'justify-center px-2')
                  }
                  title={sidebarCollapsed ? item.label : undefined}
                >
                  <item.icon className="w-4 h-4 flex-shrink-0" />
                  {!sidebarCollapsed && <span>{item.label}</span>}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div className="p-4 flex-shrink-0" style={{ borderTop: '1px solid var(--border)' }}>
        {!sidebarCollapsed && (
          <div className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>DCIM Pro v1.0</div>
        )}
      </div>
    </aside>
  );
}
