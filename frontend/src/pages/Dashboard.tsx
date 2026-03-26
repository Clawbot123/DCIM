import { useQuery } from '@tanstack/react-query';
import { Database, Server, Layers, Activity, AlertTriangle, TrendingUp } from 'lucide-react';
import { StatCard } from '../components/Dashboard/StatCard';
import { reportsApi, alertApi } from '../api';
import type { DashboardStats, Alert } from '../types';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area
} from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16'];

const ROLE_LABELS: Record<string, string> = {
  server: 'Servers',
  switch: 'Switches',
  router: 'Routers',
  firewall: 'Firewalls',
  pdu: 'PDUs',
  ups: 'UPS',
  storage: 'Storage',
  other: 'Other',
};

const STATUS_COLORS: Record<string, string> = {
  active: '#10b981',
  planned: '#3b82f6',
  staged: '#8b5cf6',
  failed: '#ef4444',
  decommissioning: '#f59e0b',
  offline: '#6b7280',
};

// Mock trend data
const trendData = Array.from({ length: 12 }, (_, i) => ({
  month: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][i],
  devices: Math.floor(80 + i * 8 + Math.random() * 15),
  racks: Math.floor(20 + i * 2),
}));

export default function Dashboard() {
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: reportsApi.dashboard,
    refetchInterval: 30000,
  });

  const { data: recentAlerts } = useQuery({
    queryKey: ['recent-alerts'],
    queryFn: () => alertApi.list({ page_size: 5, status: 'active', ordering: '-created_at' }),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    );
  }

  const pieData = stats?.devices_by_role
    .filter(d => d.count > 0)
    .map(d => ({
      name: ROLE_LABELS[d.device_type__device_role] || d.device_type__device_role,
      value: d.count,
    })) || [];

  const statusData = stats?.devices_by_status
    .filter(d => d.count > 0)
    .map(d => ({
      name: d.status,
      value: d.count,
      fill: STATUS_COLORS[d.status] || '#6b7280',
    })) || [];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Data Center Infrastructure Overview</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-dark-500">
          <Activity className="w-4 h-4 text-green-400" />
          <span>Live</span>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Data Centers"
          value={stats?.total_datacenters || 0}
          icon={Database}
          color="text-primary-400"
          subtitle={`${stats?.total_rooms || 0} rooms`}
        />
        <StatCard
          label="Total Racks"
          value={stats?.total_racks || 0}
          icon={Layers}
          color="text-emerald-400"
          subtitle={`${stats?.avg_rack_utilization || 0}% avg utilization`}
        />
        <StatCard
          label="Active Devices"
          value={stats?.active_devices || 0}
          icon={Server}
          color="text-violet-400"
          subtitle={`${stats?.total_devices || 0} total`}
        />
        <StatCard
          label="Active Alerts"
          value={stats?.active_alerts || 0}
          icon={AlertTriangle}
          color={stats?.critical_alerts ? 'text-red-400' : 'text-yellow-400'}
          subtitle={`${stats?.critical_alerts || 0} critical`}
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        {/* Growth Trend */}
        <div className="card lg:col-span-2">
          <h3 className="text-sm font-semibold text-dark-300 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary-400" />
            Infrastructure Growth
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="deviceGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
                labelStyle={{ color: '#94a3b8' }}
              />
              <Area type="monotone" dataKey="devices" stroke="#3b82f6" fill="url(#deviceGrad)" name="Devices" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Device by Role */}
        <div className="card">
          <h3 className="text-sm font-semibold text-dark-300 mb-4 flex items-center gap-2">
            <Server className="w-4 h-4 text-violet-400" />
            Devices by Role
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                {pieData.map((_, idx) => (
                  <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
              />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Top Racks */}
        <div className="card">
          <h3 className="text-sm font-semibold text-dark-300 mb-4 flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-400" />
            Top Racks by Utilization
          </h3>
          {stats?.top_racks_by_utilization && stats.top_racks_by_utilization.length > 0 ? (
            <div className="space-y-2">
              {stats.top_racks_by_utilization.slice(0, 8).map((rack) => (
                <div key={rack.id} className="flex items-center gap-3">
                  <div className="text-xs text-dark-400 w-24 truncate" title={rack.name}>{rack.name}</div>
                  <div className="flex-1 bg-dark-800 rounded-full h-2">
                    <div
                      className="h-2 rounded-full transition-all"
                      style={{
                        width: `${rack.utilization}%`,
                        backgroundColor: rack.utilization > 90 ? '#ef4444' : rack.utilization > 70 ? '#f59e0b' : '#10b981',
                      }}
                    />
                  </div>
                  <div className="text-xs text-dark-400 w-10 text-right">{rack.utilization}%</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-dark-500 text-sm text-center py-8">No rack data available</div>
          )}
        </div>

        {/* Active Alerts */}
        <div className="card">
          <h3 className="text-sm font-semibold text-dark-300 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            Recent Alerts
          </h3>
          {recentAlerts?.results && recentAlerts.results.length > 0 ? (
            <div className="space-y-2">
              {(recentAlerts.results as Alert[]).map((alert: Alert) => (
                <div key={alert.id} className="flex items-start gap-3 p-2 rounded-lg bg-dark-800/50">
                  <div
                    className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                    style={{ backgroundColor: alert.severity === 'critical' ? '#ef4444' : alert.severity === 'warning' ? '#f59e0b' : '#3b82f6' }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-dark-200 truncate">{alert.title}</div>
                    <div className="text-xs text-dark-500">
                      {new Date(alert.created_at).toLocaleString()}
                    </div>
                  </div>
                  <span className={`badge badge-${alert.severity}`}>{alert.severity}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-32 text-dark-500 text-sm">
              No active alerts
            </div>
          )}
        </div>
      </div>

      {/* Status breakdown */}
      <div className="card">
        <h3 className="text-sm font-semibold text-dark-300 mb-4 flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary-400" />
          Device Status Distribution
        </h3>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={statusData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} />
            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
            <Tooltip
              contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
              labelStyle={{ color: '#94a3b8' }}
            />
            <Bar dataKey="value" name="Devices" radius={[4, 4, 0, 0]}>
              {statusData.map((entry, idx) => (
                <Cell key={idx} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
