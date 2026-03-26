import { Bell, Search, ChevronDown, LogOut, User } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';

export function Navbar() {
  const { user, logout } = useAuthStore();
  const { sidebarCollapsed } = useUIStore();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <header
      className="fixed top-0 right-0 h-16 bg-dark-900 border-b border-dark-700 flex items-center justify-between px-6 z-30"
      style={{ left: sidebarCollapsed ? 64 : 240 }}
    >
      {/* Search */}
      <div className="flex items-center gap-3 flex-1 max-w-md">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
          <input
            type="text"
            placeholder="Search racks, devices, assets..."
            className="input w-full pl-9 text-sm"
          />
        </div>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-4">
        {/* Alerts badge */}
        <button className="relative text-dark-400 hover:text-dark-100 transition-colors" onClick={() => navigate('/monitoring')}>
          <Bell className="w-5 h-5" />
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] flex items-center justify-center text-white">
            3
          </span>
        </button>

        {/* User dropdown */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 text-dark-300 hover:text-dark-100 transition-colors"
          >
            <div className="w-8 h-8 bg-primary-700 rounded-full flex items-center justify-center">
              <span className="text-xs font-bold text-white">
                {user?.username?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
            <div className="text-left hidden sm:block">
              <div className="text-sm font-medium text-dark-200">{user?.username}</div>
              <div className="text-xs text-dark-500 capitalize">{user?.role}</div>
            </div>
            <ChevronDown className="w-4 h-4 text-dark-500" />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 top-12 w-48 bg-dark-800 border border-dark-700 rounded-xl shadow-xl py-1 z-50">
              <div className="px-3 py-2 border-b border-dark-700 mb-1">
                <div className="text-sm font-medium text-dark-200">{user?.username}</div>
                <div className="text-xs text-dark-500">{user?.email}</div>
              </div>
              <button
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-dark-300 hover:bg-dark-700 hover:text-dark-100 transition-colors"
                onClick={() => { setDropdownOpen(false); navigate('/settings'); }}
              >
                <User className="w-4 h-4" />
                Profile
              </button>
              <button
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-400 hover:bg-dark-700 transition-colors"
                onClick={() => { logout(); setDropdownOpen(false); }}
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
