import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '../api';
import { BarChart3 } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';

export default function ReportsPage() {
  const { data: capacityReport } = useQuery({
    queryKey: ['capacity-report'],
    queryFn: () => reportsApi.capacity(),
  });

  const { data: powerReport } = useQuery({
    queryKey: ['power-report'],
    queryFn: () => reportsApi.power(),
  });

  const summary = capacityReport?.summary;
  const racks = capacityReport?.racks || [];

  const chartData = racks
    .sort((a: any, b: any) => b.utilization_pct - a.utilization_pct)
    .slice(0, 20)
    .map((r: any) => ({
      name: r.rack_name,
      used: r.used_u,
      free: r.free_u,
      pct: r.utilization_pct,
    }));

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-primary-400" />
            Reports & Analytics
          </h1>
          <p className="page-subtitle">Capacity, power, and infrastructure analytics</p>
        </div>
      </div>

      {/* Capacity Summary */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          {[
            { label: 'Total Racks', value: summary.total_racks },
            { label: 'Total U Space', value: `${summary.total_u}U` },
            { label: 'Used U', value: `${summary.used_u}U` },
            { label: 'Free U', value: `${summary.free_u}U` },
            { label: 'Avg Utilization', value: `${summary.avg_utilization}%` },
          ].map(({ label, value }) => (
            <div key={label} className="card text-center">
              <div className="text-2xl font-bold text-dark-100">{value}</div>
              <div className="text-dark-400 text-xs mt-1">{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Power Summary */}
      {powerReport && (
        <div className="card mb-6">
          <h3 className="text-sm font-semibold text-dark-300 mb-3">Power Capacity</h3>
          <div className="flex items-center gap-6">
            <div>
              <div className="text-2xl font-bold text-amber-400">{powerReport.total_capacity_kw?.toFixed(1)} kW</div>
              <div className="text-dark-500 text-xs">Total Power Capacity</div>
            </div>
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-2">
              {powerReport.panels?.slice(0, 4).map((panel: any) => (
                <div key={panel.panel_id} className="bg-dark-800 rounded-lg p-3">
                  <div className="text-sm font-medium text-dark-200">{panel.name}</div>
                  <div className="text-xs text-dark-500">{panel.datacenter}</div>
                  <div className="text-amber-400 font-medium mt-1">{panel.total_capacity_kw} kW</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Rack utilization chart */}
      {chartData.length > 0 && (
        <div className="card">
          <h3 className="text-sm font-semibold text-dark-300 mb-4">Rack Utilization (Top 20)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 9 }} angle={-45} textAnchor="end" />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
                labelStyle={{ color: '#94a3b8' }}
              />
              <Bar dataKey="used" name="Used U" stackId="u" radius={[0, 0, 0, 0]}>
                {chartData.map((entry: any, idx: number) => (
                  <Cell key={idx} fill={
                    entry.pct > 90 ? '#ef4444' : entry.pct > 70 ? '#f59e0b' : '#10b981'
                  } />
                ))}
              </Bar>
              <Bar dataKey="free" name="Free U" stackId="u" fill="#1e293b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Rack table */}
      <div className="mt-6 table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Rack</th>
              <th>Data Center</th>
              <th>Room</th>
              <th>Row</th>
              <th>Total U</th>
              <th>Used U</th>
              <th>Free U</th>
              <th>Utilization</th>
            </tr>
          </thead>
          <tbody>
            {racks.slice(0, 50).map((rack: any) => (
              <tr key={rack.rack_id}>
                <td className="font-medium text-dark-200">{rack.rack_name}</td>
                <td className="text-dark-400 text-xs">{rack.datacenter}</td>
                <td className="text-dark-400 text-xs">{rack.room}</td>
                <td className="text-dark-400 text-xs">{rack.row}</td>
                <td className="text-dark-400">{rack.total_u}U</td>
                <td className="text-dark-400">{rack.used_u}U</td>
                <td className="text-dark-400">{rack.free_u}U</td>
                <td>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-dark-800 rounded-full h-1.5 max-w-16">
                      <div className="h-1.5 rounded-full"
                        style={{
                          width: `${Math.min(rack.utilization_pct, 100)}%`,
                          backgroundColor: rack.utilization_pct > 90 ? '#ef4444' : rack.utilization_pct > 70 ? '#f59e0b' : '#10b981',
                        }} />
                    </div>
                    <span className="text-xs text-dark-400">{rack.utilization_pct}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
