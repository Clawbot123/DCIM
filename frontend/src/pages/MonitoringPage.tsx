import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { alertApi } from '../api';
import type { Alert } from '../types';
import { Bell, CheckCircle, XCircle, AlertTriangle, Info, RefreshCw } from 'lucide-react';
import clsx from 'clsx';

const SEVERITY_ICON = {
  critical: <XCircle className="w-4 h-4 text-red-400" />,
  warning: <AlertTriangle className="w-4 h-4 text-amber-400" />,
  info: <Info className="w-4 h-4 text-blue-400" />,
};

export default function MonitoringPage() {
  const [severityFilter, setSeverityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const qc = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['alerts', severityFilter, statusFilter],
    queryFn: () => alertApi.list({
      severity: severityFilter || undefined,
      status: statusFilter || undefined,
      ordering: '-created_at',
    }),
    refetchInterval: 15000,
  });

  const { data: summary } = useQuery({
    queryKey: ['alert-summary'],
    queryFn: alertApi.summary,
    refetchInterval: 10000,
  });

  const acknowledgeMutation = useMutation({
    mutationFn: alertApi.acknowledge,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alerts'] }),
  });

  const resolveMutation = useMutation({
    mutationFn: alertApi.resolve,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alerts'] }),
  });

  const alerts = data?.results || [];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Bell className="w-6 h-6 text-red-400" />
            Monitoring & Alerts
          </h1>
          <p className="page-subtitle">Real-time alerts and monitoring</p>
        </div>
        <button onClick={() => refetch()} className="btn-secondary flex items-center gap-2">
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Active', key: 'active', color: 'text-dark-100' },
          { label: 'Critical', key: 'critical', color: 'text-red-400' },
          { label: 'Warning', key: 'warning', color: 'text-amber-400' },
          { label: 'Acknowledged', key: 'acknowledged', color: 'text-blue-400' },
        ].map(({ label, key, color }) => (
          <div key={key} className="card text-center cursor-pointer hover:border-dark-600 transition-colors"
            onClick={() => {
              if (key === 'critical' || key === 'warning') setSeverityFilter(key === severityFilter ? '' : key);
              else if (key === 'acknowledged') setStatusFilter(statusFilter === 'acknowledged' ? 'active' : 'acknowledged');
            }}>
            <div className={clsx('text-3xl font-bold', color)}>{(summary as any)?.[key] ?? 0}</div>
            <div className="text-dark-400 text-sm mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <select className="select text-sm" value={severityFilter} onChange={e => setSeverityFilter(e.target.value)}>
          <option value="">All Severities</option>
          <option value="critical">Critical</option>
          <option value="warning">Warning</option>
          <option value="info">Info</option>
        </select>
        <select className="select text-sm" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="acknowledged">Acknowledged</option>
          <option value="resolved">Resolved</option>
        </select>
      </div>

      {/* Alert list */}
      <div className="space-y-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
          </div>
        ) : alerts.length === 0 ? (
          <div className="card text-center py-12">
            <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-3 opacity-50" />
            <p className="text-dark-400">No alerts found</p>
          </div>
        ) : (alerts as Alert[]).map((alert: Alert) => (
          <div key={alert.id}
            className={clsx('card flex items-start gap-4 py-3', {
              'border-red-800/50 bg-red-900/10': alert.severity === 'critical' && alert.status === 'active',
              'border-amber-800/30 bg-amber-900/5': alert.severity === 'warning' && alert.status === 'active',
            })}
          >
            <div className="mt-0.5 flex-shrink-0">
              {SEVERITY_ICON[alert.severity]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-dark-200">{alert.title}</span>
                <span className={`badge badge-${alert.severity}`}>{alert.severity}</span>
                <span className={`badge badge-${alert.status}`}>{alert.status}</span>
              </div>
              <p className="text-sm text-dark-400 mt-1">{alert.message}</p>
              <div className="flex items-center gap-4 mt-2 text-xs text-dark-500">
                <span>{new Date(alert.created_at).toLocaleString()}</span>
                {alert.device_name && <span>Device: {alert.device_name}</span>}
                {alert.rack_name && <span>Rack: {alert.rack_name}</span>}
                {alert.acknowledged_by_name && (
                  <span>Acked by: {alert.acknowledged_by_name}</span>
                )}
              </div>
            </div>
            {alert.status === 'active' && (
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => acknowledgeMutation.mutate(alert.id)}
                  className="btn-secondary text-xs py-1 px-2"
                  disabled={acknowledgeMutation.isPending}
                >
                  Acknowledge
                </button>
                <button
                  onClick={() => resolveMutation.mutate(alert.id)}
                  className="btn-primary text-xs py-1 px-2"
                  disabled={resolveMutation.isPending}
                >
                  Resolve
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
