import { useState } from 'react';
import { Settings, User, Bell, Shield, Database, Moon, Sun, Save } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useUIStore } from '../store/uiStore';

export default function SettingsPage() {
  const { user } = useAuthStore();
  const { theme, toggleTheme } = useUIStore();
  const [activeTab, setActiveTab] = useState('profile');

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'appearance', label: 'Appearance', icon: theme === 'dark' ? Moon : Sun },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'system', label: 'System', icon: Database },
  ];

  const systemInfo = [
    { label: 'Application', value: 'DCIM Pro v1.0' },
    { label: 'Environment', value: import.meta.env.MODE === 'production' ? 'Production' : 'Development' },
    { label: 'Database', value: 'PostgreSQL' },
    { label: 'API Version', value: 'v1' },
    { label: 'Session Timeout', value: '8 hours' },
    { label: 'Token Refresh', value: '7 days' },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Settings className="w-6 h-6 text-primary-400" />
            Settings
          </h1>
          <p className="page-subtitle">Configure your preferences and account settings</p>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Sidebar tabs */}
        <div className="w-48 flex-shrink-0">
          <div className="card p-2 space-y-0.5">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-primary-900/50 text-primary-400 border border-primary-800/50'
                    : ''
                }`}
                style={activeTab !== tab.id ? { color: 'var(--text-muted)' } : {}}
              >
                <tab.icon className="w-4 h-4 flex-shrink-0" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content area */}
        <div className="flex-1 min-w-0">

          {/* Profile */}
          {activeTab === 'profile' && (
            <div className="card">
              <h2 className="text-base font-semibold mb-5" style={{ color: 'var(--text-primary)' }}>
                Profile Information
              </h2>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-primary-700 rounded-full flex items-center justify-center shadow-lg">
                  <span className="text-2xl font-bold text-white">
                    {user?.username?.charAt(0).toUpperCase() ?? 'U'}
                  </span>
                </div>
                <div>
                  <div className="font-semibold text-lg" style={{ color: 'var(--text-primary)' }}>
                    {user?.username}
                  </div>
                  <span
                    className="text-xs inline-flex px-2 py-0.5 rounded mt-1 capitalize"
                    style={{
                      backgroundColor: 'rgba(59,130,246,0.15)',
                      color: '#60a5fa',
                      border: '1px solid rgba(59,130,246,0.3)',
                    }}
                  >
                    {user?.role}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Username', value: user?.username ?? '', placeholder: 'Username' },
                  { label: 'Email', value: user?.email ?? '', placeholder: 'Email address' },
                  { label: 'First Name', value: user?.first_name ?? '', placeholder: 'First name' },
                  { label: 'Last Name', value: user?.last_name ?? '', placeholder: 'Last name' },
                  { label: 'Department', value: user?.department ?? '', placeholder: 'Department' },
                  { label: 'Phone', value: user?.phone ?? '', placeholder: 'Phone number' },
                ].map(({ label, value, placeholder }) => (
                  <div key={label}>
                    <label className="field-label">{label}</label>
                    <input className="field-input" defaultValue={value} placeholder={placeholder} />
                  </div>
                ))}
              </div>
              <div className="mt-5 flex justify-end">
                <button className="btn-primary gap-2">
                  <Save className="w-4 h-4" />
                  Save Changes
                </button>
              </div>
            </div>
          )}

          {/* Appearance */}
          {activeTab === 'appearance' && (
            <div className="card">
              <h2 className="text-base font-semibold mb-5" style={{ color: 'var(--text-primary)' }}>
                Appearance
              </h2>
              <div>
                <label className="field-label mb-3">Theme</label>
                <div className="flex gap-3">
                  {[
                    {
                      id: 'dark',
                      label: 'Dark Mode',
                      desc: 'Easy on the eyes',
                      icon: Moon,
                    },
                    {
                      id: 'light',
                      label: 'Light Mode',
                      desc: 'Clean and bright',
                      icon: Sun,
                    },
                  ].map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => { if (theme !== opt.id) toggleTheme(); }}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl border transition-all flex-1"
                      style={
                        theme === opt.id
                          ? {
                              borderColor: '#3b82f6',
                              backgroundColor: 'rgba(59,130,246,0.1)',
                              color: '#60a5fa',
                            }
                          : {
                              borderColor: 'var(--border)',
                              color: 'var(--text-secondary)',
                            }
                      }
                    >
                      <opt.icon className="w-5 h-5 flex-shrink-0" />
                      <div className="text-left">
                        <div className="text-sm font-medium">{opt.label}</div>
                        <div className="text-xs opacity-70 mt-0.5">{opt.desc}</div>
                      </div>
                      {theme === opt.id && (
                        <div className="ml-auto w-2 h-2 rounded-full bg-primary-400" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Notifications */}
          {activeTab === 'notifications' && (
            <div className="card">
              <h2 className="text-base font-semibold mb-5" style={{ color: 'var(--text-primary)' }}>
                Notification Preferences
              </h2>
              <div className="space-y-1">
                {[
                  { label: 'Critical Alerts', desc: 'Get notified for critical severity alerts', def: true },
                  { label: 'Warning Alerts', desc: 'Get notified for warning severity alerts', def: true },
                  { label: 'Temperature Threshold', desc: 'Alert when temp sensors exceed thresholds', def: true },
                  { label: 'Power Capacity', desc: 'Alert when power usage exceeds 80%', def: false },
                  { label: 'New Device Added', desc: 'Notify when devices are added to racks', def: false },
                  { label: 'Rack Utilization', desc: 'Alert when rack utilization exceeds 90%', def: false },
                ].map(({ label, desc, def }) => (
                  <div
                    key={label}
                    className="flex items-center justify-between py-3 px-1"
                    style={{ borderBottom: '1px solid var(--border-subtle)' }}
                  >
                    <div>
                      <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                        {label}
                      </div>
                      <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {desc}
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer ml-4">
                      <input type="checkbox" className="sr-only peer" defaultChecked={def} />
                      <div className="w-9 h-5 rounded-full peer transition-colors bg-gray-700 peer-checked:bg-primary-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full" />
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Security */}
          {activeTab === 'security' && (
            <div className="card">
              <h2 className="text-base font-semibold mb-5" style={{ color: 'var(--text-primary)' }}>
                Security Settings
              </h2>
              <div className="max-w-sm space-y-4">
                <h3 className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                  Change Password
                </h3>
                {[
                  { label: 'Current Password', placeholder: '••••••••' },
                  { label: 'New Password', placeholder: '••••••••' },
                  { label: 'Confirm New Password', placeholder: '••••••••' },
                ].map(({ label, placeholder }) => (
                  <div key={label}>
                    <label className="field-label">{label}</label>
                    <input type="password" className="field-input" placeholder={placeholder} />
                  </div>
                ))}
                <button className="btn-primary mt-2">Update Password</button>
              </div>
            </div>
          )}

          {/* System */}
          {activeTab === 'system' && (
            <div className="space-y-4">
              <div className="card">
                <h2 className="text-base font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
                  System Information
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  {systemInfo.map(({ label, value }) => (
                    <div
                      key={label}
                      className="p-3 rounded-xl"
                      style={{ backgroundColor: 'var(--bg-elevated)' }}
                    >
                      <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{label}</div>
                      <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{value}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="card">
                <h2 className="text-base font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
                  API Configuration
                </h2>
                <div className="p-3 rounded-xl font-mono text-xs" style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
                  <div>API Base: <span style={{ color: 'var(--text-primary)' }}>/api/</span></div>
                  <div className="mt-1">Docs: <span style={{ color: '#60a5fa' }}>/api/docs/</span></div>
                  <div className="mt-1">Auth: <span style={{ color: 'var(--text-primary)' }}>JWT Bearer</span></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
