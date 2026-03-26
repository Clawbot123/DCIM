import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Users, Shield, UserCheck, UserX, Mail } from 'lucide-react';
import apiClient from '../api/client';

const ROLE_BADGE: Record<string, string> = {
  admin: 'bg-red-900/60 text-red-300 border border-red-800/50',
  engineer: 'bg-blue-900/60 text-blue-300 border border-blue-800/50',
  operator: 'bg-purple-900/60 text-purple-300 border border-purple-800/50',
  viewer: 'bg-gray-800/80 text-gray-400',
};

interface UserRecord {
  id: number;
  username: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  role: string;
  department?: string;
  is_active: boolean;
  date_joined: string;
  last_login?: string;
}

export default function UsersPage() {
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => apiClient.get('/users/?page_size=100').then(r => r.data),
  });

  const allUsers: UserRecord[] = data?.results || [];
  const users = allUsers.filter(
    u =>
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(search.toLowerCase()) ||
      (u.department || '').toLowerCase().includes(search.toLowerCase())
  );

  const stats = [
    { label: 'Total Users', value: allUsers.length, icon: Users, color: 'text-primary-400' },
    { label: 'Admins', value: allUsers.filter(u => u.role === 'admin').length, icon: Shield, color: 'text-red-400' },
    { label: 'Active', value: allUsers.filter(u => u.is_active).length, icon: UserCheck, color: 'text-green-400' },
    { label: 'Inactive', value: allUsers.filter(u => !u.is_active).length, icon: UserX, color: 'text-gray-400' },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Users className="w-6 h-6 text-primary-400" />
            User Management
          </h1>
          <p className="page-subtitle">Manage user accounts and role-based access</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>
                {label}
              </p>
              <p className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>{value}</p>
            </div>
            <div className={`p-3 rounded-xl ${color}`} style={{ backgroundColor: 'var(--bg-elevated)' }}>
              <Icon className="w-6 h-6" />
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="card mb-4">
        <input
          className="input w-full max-w-sm"
          placeholder="Search by username, email, or department..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>User</th>
              <th>Email</th>
              <th>Role</th>
              <th>Department</th>
              <th>Status</th>
              <th>Last Login</th>
              <th>Joined</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} className="text-center py-10" style={{ color: 'var(--text-muted)' }}>
                  Loading users…
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-10" style={{ color: 'var(--text-muted)' }}>
                  No users found
                </td>
              </tr>
            ) : (
              users.map(user => (
                <tr key={user.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary-700 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-white">
                          {user.username.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                          {user.username}
                        </div>
                        {(user.first_name || user.last_name) && (
                          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                            {user.first_name} {user.last_name}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                      <Mail className="w-3 h-3 flex-shrink-0" />
                      <span>{user.email || '—'}</span>
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${ROLE_BADGE[user.role] || 'badge-info'}`}>{user.role}</span>
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>{user.department || '—'}</td>
                  <td>
                    <span className={user.is_active ? 'badge badge-active' : 'badge badge-offline'}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}
                  </td>
                  <td className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {new Date(user.date_joined).toLocaleDateString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
