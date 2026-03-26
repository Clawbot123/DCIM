import { Bell, Search, ChevronDown, LogOut, User, Sun, Moon } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { alertApi } from '../../api';

export function Navbar() {
  const { user, logout } = useAuthStore();
  const { sidebarCollapsed, theme, toggleTheme } = useUIStore();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const navigate = useNavigate();

  const { data: alertSummary } = useQuery({
    queryKey: ['alert-summary-nav'],
    queryFn: alertApi.summary,
    refetchInterval: 15000,
  });

  const activeAlerts = (alertSummary as Record<string, number> | undefined)?.active ?? 0;

  return (
    <header
      className="fixed top-0 right-0 h-16 flex items-center justify-between px-6 z-30 transition-all duration-300"
      style={{
        left: sidebarCollapsed ? 64 : 240,
        backgroundColor: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      {/* Search */}
      <div className="flex items-center gap-3 flex-1 max-w-md">
        <div className="relative w-full">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
            style={{ color: 'var(--text-muted)' }}
          />
          <input
            type="text"
            placeholder="Search racks, devices, assets..."
            className="input w-full pl-9 text-sm"
          />
        </div>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-3">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg transition-all hover:opacity-80"
          style={{
            backgroundColor: 'var(--bg-elevated)',
            color: 'var(--text-secondary)',
            border: '1px solid var(--border)',
          }}
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Alerts badge */}
        <button
          className="relative p-2 rounded-lg transition-all hover:opacity-80"
          style={{
            color: 'var(--text-secondary)',
            backgroundColor: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
          }}
          onClick={() => navigate('/monitoring')}
          title="View Alerts"
        >
          <Bell className="w-4 h-4" />
          {activeAlerts > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 rounded-full text-[10px] flex items-center justify-center text-white font-bold px-1">
              {activeAlerts > 9 ? '9+' : activeAlerts}
            </span>
          )}
        </button>

        {/* Divider */}
        <div className="w-px h-6" style={{ backgroundColor: 'var(--border)' }} />

        {/* User dropdown */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 transition-colors rounded-lg px-2 py-1.5 hover:opacity-80"
            style={{ color: 'var(--text-secondary)' }}
          >
            <div className="w-7 h-7 bg-primary-700 rounded-full flex items-center justify-center shadow-sm">
              <span className="text-xs font-bold text-white">
                {user?.username?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
            <div className="text-left hidden sm:block">
              <div className="text-sm font-medium leading-tight" style={{ color: 'var(--text-primary)' }}>
                {user?.username}
              </div>
              <div className="text-xs capitalize leading-tight" style={{ color: 'var(--text-muted)' }}>
                {user?.role}
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
          </button>

          {dropdownOpen && (
            <div
              className="absolute right-0 top-12 w-52 rounded-xl shadow-2xl py-1 z-50"
              style={{
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border)',
              }}
            >
              <div className="px-4 py-3 mb-1" style={{ borderBottom: '1px solid var(--border)' }}>
                <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {user?.username}
                </div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {user?.email || 'No email set'}
                </div>
              </div>
              <button
                className="flex items-center gap-2 w-full px-4 py-2 text-sm transition-colors hover:opacity-80"
                style={{ color: 'var(--text-secondary)' }}
                onClick={() => {
                  setDropdownOpen(false);
                  navigate('/settings');
                }}
              >
                <User className="w-4 h-4" />
                Profile & Settings
              </button>
              <div className="my-1" style={{ borderTop: '1px solid var(--border)' }} />
              <button
                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-400 transition-colors hover:opacity-80"
                onClick={() => {
                  logout();
                  setDropdownOpen(false);
                }}
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
