import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Server, MapPin, Zap, Wind, Cable,
  Bell, BarChart3, Users, Settings, ChevronLeft, Database,
  Thermometer, Network
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
      { to: '/assets', icon: Server, label: 'Assets / Devices' },
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
        'fixed left-0 top-0 bottom-0 bg-dark-900 border-r border-dark-700 flex flex-col transition-all duration-300 z-40',
        sidebarCollapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-dark-700 flex-shrink-0">
        {!sidebarCollapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <Network className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-sm font-bold text-white">DCIM Pro</div>
              <div className="text-xs text-dark-500">Infrastructure Manager</div>
            </div>
          </div>
        )}
        {sidebarCollapsed && (
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center mx-auto">
            <Network className="w-5 h-5 text-white" />
          </div>
        )}
        <button
          onClick={toggleSidebar}
          className="text-dark-400 hover:text-dark-100 transition-colors ml-auto"
        >
          <ChevronLeft className={clsx('w-4 h-4 transition-transform', sidebarCollapsed && 'rotate-180')} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-4">
        {navSections.map((section) => (
          <div key={section.label}>
            {!sidebarCollapsed && (
              <div className="text-xs font-semibold text-dark-600 uppercase tracking-wider px-3 mb-1">
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
      <div className="p-4 border-t border-dark-700 flex-shrink-0">
        {!sidebarCollapsed && (
          <div className="text-xs text-dark-600 text-center">DCIM Pro v1.0</div>
        )}
      </div>
    </aside>
  );
}
