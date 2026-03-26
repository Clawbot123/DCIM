import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tempSensorApi, dataCenterApi, roomApi, rackApi } from '../api';
import type { DataCenter, Room, TemperatureSensor } from '../types/index';
import { Thermometer, RefreshCw, Plus, X, Pencil, Trash2 } from 'lucide-react';
import clsx from 'clsx';

function SensorModal({ onClose, editing }: { onClose: () => void; editing?: TemperatureSensor }) {
  const qc = useQueryClient();
  const [selectedDC, setSelectedDC] = useState<number | ''>('');
  const [locationType, setLocationType] = useState<'room' | 'rack'>(
    editing?.rack ? 'rack' : 'room'
  );
  const [form, setForm] = useState({
    name: editing?.name ?? '',
    room: editing?.room ?? ('' as number | ''),
    rack: editing?.rack ?? ('' as number | ''),
    current_temp_c: editing?.current_temp_c ?? 22,
    threshold_low_c: editing?.threshold_low_c ?? 15,
    threshold_high_c: editing?.threshold_high_c ?? 27,
    threshold_critical_c: editing?.threshold_critical_c ?? 35,
  });

  const { data: dcs } = useQuery({ queryKey: ['datacenters-all'], queryFn: () => dataCenterApi.listAll() });
  const { data: roomsData } = useQuery({
    queryKey: ['rooms', selectedDC],
    queryFn: () => roomApi.list({ datacenter: selectedDC }),
    enabled: !!selectedDC,
  });
  const { data: racksData } = useQuery({
    queryKey: ['racks-all'],
    queryFn: () => rackApi.list({ page_size: 200 }),
  });

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        name: form.name,
        current_temp_c: form.current_temp_c,
        threshold_low_c: form.threshold_low_c,
        threshold_high_c: form.threshold_high_c,
        threshold_critical_c: form.threshold_critical_c,
        room: locationType === 'room' ? form.room || null : null,
        rack: locationType === 'rack' ? form.rack || null : null,
      };
      return editing ? tempSensorApi.update(editing.id, payload) : tempSensorApi.create(payload);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['temp-sensors'] }); onClose(); },
  });

  const dcList = (dcs as DataCenter[]) || [];
  const roomList = (roomsData?.results as Room[]) || [];
  const rackList = (racksData?.results as { id: number; name: string }[]) || [];
  const f = (k: string, v: string | number) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <div className="modal-header">
          <h2 className="modal-title">{editing ? 'Edit Sensor' : 'Add Temperature Sensor'}</h2>
          <button onClick={onClose} className="modal-close-btn"><X className="w-4 h-4" /></button>
        </div>
        <div className="modal-body">
          <div>
            <label className="field-label">Sensor Name *</label>
            <input className="field-input"
              value={form.name} onChange={e => f('name', e.target.value)} placeholder="e.g. Temp-Rack-A01" />
          </div>
          <div>
            <label className="field-label">Location Type</label>
            <div className="flex gap-2">
              {(['room', 'rack'] as const).map(t => (
                <button key={t} onClick={() => setLocationType(t)}
                  className={clsx('flex-1 py-1.5 text-xs rounded border capitalize transition-colors',
                    locationType === t ? 'bg-[#1e293b] text-white border-[#1e293b]' : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                  )}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          {locationType === 'room' && (
            <>
              <div>
                <label className="field-label">Data Center</label>
                <select className="field-input"
                  value={selectedDC} onChange={e => setSelectedDC(Number(e.target.value))}>
                  <option value="">Select Data Center</option>
                  {dcList.map(dc => <option key={dc.id} value={dc.id}>{dc.name}</option>)}
                </select>
              </div>
              <div>
                <label className="field-label">Room *</label>
                <select className="field-input"
                  value={form.room} onChange={e => f('room', Number(e.target.value))} disabled={!selectedDC}>
                  <option value="">Select Room</option>
                  {roomList.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
            </>
          )}
          {locationType === 'rack' && (
            <div>
              <label className="field-label">Rack *</label>
              <select className="field-input"
                value={form.rack} onChange={e => f('rack', Number(e.target.value))}>
                <option value="">Select Rack</option>
                {rackList.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="field-label">Current Temp (°C)</label>
            <input type="number" step="0.1" className="field-input"
              value={form.current_temp_c} onChange={e => f('current_temp_c', Number(e.target.value))} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="field-label">Low (°C)</label>
              <input type="number" step="0.1" className="field-input"
                value={form.threshold_low_c} onChange={e => f('threshold_low_c', Number(e.target.value))} />
            </div>
            <div>
              <label className="field-label">High (°C)</label>
              <input type="number" step="0.1" className="field-input"
                value={form.threshold_high_c} onChange={e => f('threshold_high_c', Number(e.target.value))} />
            </div>
            <div>
              <label className="field-label">Critical (°C)</label>
              <input type="number" step="0.1" className="field-input"
                value={form.threshold_critical_c} onChange={e => f('threshold_critical_c', Number(e.target.value))} />
            </div>
          </div>
          {mutation.isError && (
            <div className="modal-error">Failed to save sensor.</div>
          )}
        </div>
        <div className="modal-footer">
          <button onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
          <button
            className="btn-primary flex-1 justify-center disabled:opacity-50"
            disabled={!form.name || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? 'Saving…' : editing ? 'Save Changes' : 'Create Sensor'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SensorsPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingSensor, setEditingSensor] = useState<TemperatureSensor | null>(null);

  const { data, refetch, isLoading } = useQuery({
    queryKey: ['temp-sensors'],
    queryFn: () => tempSensorApi.list({ page_size: 200 }),
    refetchInterval: 30000,
  });

  const sensors: TemperatureSensor[] = (data?.results as TemperatureSensor[]) || [];

  const deleteMutation = useMutation({
    mutationFn: (id: number) => tempSensorApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['temp-sensors'] }),
  });

  const criticalCount = sensors.filter(s => s.status === 'critical').length;
  const warningCount = sensors.filter(s => s.status === 'warning').length;
  const okCount = sensors.filter(s => s.status === 'ok').length;

  return (
    <div>
      {(showModal || editingSensor) && (
        <SensorModal
          editing={editingSensor ?? undefined}
          onClose={() => { setShowModal(false); setEditingSensor(null); }}
        />
      )}

      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Thermometer className="w-6 h-6 text-cyan-400" />
            Temperature Sensors
          </h1>
          <p className="page-subtitle">{sensors.length} sensors monitored</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => refetch()} className="btn-secondary flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Sensor
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card text-center">
          <div className="text-3xl font-bold text-red-400">{criticalCount}</div>
          <div className="text-dark-400 text-sm mt-1">Critical</div>
        </div>
        <div className="card text-center">
          <div className="text-3xl font-bold text-amber-400">{warningCount}</div>
          <div className="text-dark-400 text-sm mt-1">Warning</div>
        </div>
        <div className="card text-center">
          <div className="text-3xl font-bold text-emerald-400">{okCount}</div>
          <div className="text-dark-400 text-sm mt-1">Normal</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {sensors.map((sensor) => {
          const pct = Math.min(100, (sensor.current_temp_c / sensor.threshold_critical_c) * 100);
          return (
            <div key={sensor.id}
              className={clsx('card group relative', {
                'border-red-700/50 bg-red-900/10': sensor.status === 'critical',
                'border-amber-700/50 bg-amber-900/10': sensor.status === 'warning',
                'border-emerald-900/50': sensor.status === 'ok',
              })}
            >
              {/* Action buttons */}
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => setEditingSensor(sensor)}
                  className="p-1 rounded bg-dark-800/80 hover:bg-dark-700 text-dark-400 hover:text-dark-200" title="Edit">
                  <Pencil className="w-3 h-3" />
                </button>
                <button
                  onClick={() => { if (confirm(`Delete sensor "${sensor.name}"?`)) deleteMutation.mutate(sensor.id); }}
                  className="p-1 rounded bg-dark-800/80 hover:bg-red-900/50 text-dark-400 hover:text-red-400" title="Delete">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>

              <div className="flex items-start justify-between mb-3">
                <div className="pr-10">
                  <div className="text-sm font-medium text-dark-200">{sensor.name}</div>
                  <div className="text-xs text-dark-500 mt-0.5">{sensor.rack_name || sensor.room_name}</div>
                  <div className="text-xs text-dark-600">{sensor.location_type}</div>
                </div>
                <Thermometer className={clsx('w-5 h-5 flex-shrink-0',
                  sensor.status === 'critical' ? 'text-red-400' :
                  sensor.status === 'warning' ? 'text-amber-400' : 'text-emerald-400'
                )} />
              </div>

              <div className={clsx('text-3xl font-bold mb-2',
                sensor.status === 'critical' ? 'text-red-400' :
                sensor.status === 'warning' ? 'text-amber-400' : 'text-emerald-400'
              )}>
                {sensor.current_temp_c}°C
              </div>

              <div className="bg-dark-800 rounded-full h-2 mb-2">
                <div
                  className="h-2 rounded-full transition-all"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: sensor.status === 'critical' ? '#ef4444' :
                      sensor.status === 'warning' ? '#f59e0b' : '#10b981',
                  }}
                />
              </div>
              <div className="flex justify-between text-xs text-dark-600">
                <span>Low: {sensor.threshold_low_c}°C</span>
                <span>High: {sensor.threshold_high_c}°C</span>
                <span>Crit: {sensor.threshold_critical_c}°C</span>
              </div>
            </div>
          );
        })}
        {!isLoading && sensors.length === 0 && (
          <div className="col-span-full text-center py-12 text-dark-500">No temperature sensors found</div>
        )}
      </div>
    </div>
  );
}
