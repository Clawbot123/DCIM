import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { coolingUnitApi, tempSensorApi, dataCenterApi, roomApi, rackApi } from '../api';
import { Wind, Thermometer, Plus, X, Pencil, Trash2 } from 'lucide-react';
import type { CoolingUnit, DataCenter, Room, TemperatureSensor } from '../types/index';
import clsx from 'clsx';

const UNIT_TYPES = ['CRAC', 'CRAH', 'In-Row', 'Chiller'];

// ── Cooling Unit Modal ────────────────────────────────────────────────────────

function CoolingUnitModal({ onClose, editing }: { onClose: () => void; editing?: CoolingUnit }) {
  const qc = useQueryClient();
  const [selectedDC, setSelectedDC] = useState<number | ''>('');
  const [form, setForm] = useState({
    name: editing?.name ?? '',
    room: editing?.room ?? ('' as number | ''),
    unit_type: editing?.unit_type ?? 'CRAC',
    cooling_capacity_kw: editing?.cooling_capacity_kw ?? 20,
    power_draw_kw: editing?.power_draw_kw ?? 5,
    status: editing?.status ?? 'active',
  });

  const { data: dcs } = useQuery({
    queryKey: ['datacenters-all'],
    queryFn: () => dataCenterApi.listAll(),
  });
  const { data: roomsData } = useQuery({
    queryKey: ['rooms', selectedDC],
    queryFn: () => roomApi.list({ datacenter: selectedDC }),
    enabled: !!selectedDC,
  });

  const mutation = useMutation({
    mutationFn: () =>
      editing
        ? coolingUnitApi.update(editing.id, form)
        : coolingUnitApi.create({ ...form, position_x: 0, position_y: 0 }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cooling-units'] }); onClose(); },
  });

  const dcList = (dcs as DataCenter[]) || [];
  const roomList = (roomsData?.results as Room[]) || [];
  const f = (k: string, v: string | number) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <div className="modal-header">
          <h2 className="modal-title">{editing ? 'Edit Cooling Unit' : 'Add Cooling Unit'}</h2>
          <button onClick={onClose} className="modal-close-btn"><X className="w-4 h-4" /></button>
        </div>
        <div className="modal-body">
          <div>
            <label className="field-label">Name *</label>
            <input className="field-input"
              value={form.name} onChange={e => f('name', e.target.value)} placeholder="e.g. CRAC-01" />
          </div>
          {!editing && (
            <div>
              <label className="field-label">Data Center</label>
              <select className="field-input"
                value={selectedDC}
                onChange={e => { setSelectedDC(Number(e.target.value)); setForm(p => ({ ...p, room: '' })); }}>
                <option value="">Select Data Center</option>
                {dcList.map(dc => <option key={dc.id} value={dc.id}>{dc.name}</option>)}
              </select>
            </div>
          )}
          {!editing && (
            <div>
              <label className="field-label">Room *</label>
              <select className="field-input"
                value={form.room} onChange={e => f('room', Number(e.target.value))}
                disabled={!selectedDC}>
                <option value="">Select Room</option>
                {roomList.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="field-label">Unit Type</label>
              <select className="field-input"
                value={form.unit_type} onChange={e => f('unit_type', e.target.value)}>
                {UNIT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label">Status</label>
              <select className="field-input"
                value={form.status} onChange={e => f('status', e.target.value)}>
                {['active', 'planned', 'maintenance', 'offline'].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="field-label">Cooling Capacity (kW)</label>
              <input type="number" className="field-input"
                value={form.cooling_capacity_kw} onChange={e => f('cooling_capacity_kw', Number(e.target.value))} min={0} />
            </div>
            <div>
              <label className="field-label">Power Draw (kW)</label>
              <input type="number" className="field-input"
                value={form.power_draw_kw} onChange={e => f('power_draw_kw', Number(e.target.value))} min={0} />
            </div>
          </div>
          {mutation.isError && (
            <div className="modal-error">Failed to save cooling unit.</div>
          )}
        </div>
        <div className="modal-footer">
          <button onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
          <button
            className="btn-primary flex-1 justify-center disabled:opacity-50"
            disabled={!form.name || (!editing && !form.room) || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? 'Saving…' : editing ? 'Save Changes' : 'Create Unit'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Temperature Sensor Modal ──────────────────────────────────────────────────

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

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CoolingPage() {
  const qc = useQueryClient();
  const [modal, setModal] = useState<'unit' | 'sensor' | null>(null);
  const [editingUnit, setEditingUnit] = useState<CoolingUnit | null>(null);
  const [editingSensor, setEditingSensor] = useState<TemperatureSensor | null>(null);

  const { data: unitsData } = useQuery({ queryKey: ['cooling-units'], queryFn: () => coolingUnitApi.list() });
  const { data: sensorsData } = useQuery({ queryKey: ['temp-sensors'], queryFn: () => tempSensorApi.list() });

  const units: CoolingUnit[] = (unitsData?.results as CoolingUnit[]) || [];
  const sensors: TemperatureSensor[] = (sensorsData?.results as TemperatureSensor[]) || [];

  const criticalSensors = sensors.filter((s: TemperatureSensor) => s.status === 'critical');
  const warningSensors = sensors.filter((s: TemperatureSensor) => s.status === 'warning');

  const deleteUnit = useMutation({
    mutationFn: (id: number) => coolingUnitApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cooling-units'] }),
  });

  const deleteSensor = useMutation({
    mutationFn: (id: number) => tempSensorApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['temp-sensors'] }),
  });

  const closeModal = () => { setModal(null); setEditingUnit(null); setEditingSensor(null); };

  return (
    <div>
      {(modal === 'unit' || editingUnit) && (
        <CoolingUnitModal editing={editingUnit ?? undefined} onClose={closeModal} />
      )}
      {(modal === 'sensor' || editingSensor) && (
        <SensorModal editing={editingSensor ?? undefined} onClose={closeModal} />
      )}

      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Wind className="w-6 h-6 text-cyan-400" />
            Cooling Management
          </h1>
          <p className="page-subtitle">CRAC/CRAH units, temperature sensors and airflow</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary flex items-center gap-2" onClick={() => setModal('sensor')}>
            <Plus className="w-4 h-4" /> Add Sensor
          </button>
          <button className="btn-primary flex items-center gap-2" onClick={() => setModal('unit')}>
            <Plus className="w-4 h-4" /> Add Unit
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="card text-center">
          <div className="text-3xl font-bold text-cyan-400">{units.length}</div>
          <div className="text-dark-400 text-sm mt-1">Cooling Units</div>
        </div>
        <div className="card text-center">
          <div className="text-3xl font-bold text-dark-300">
            {units.reduce((a: number, u: CoolingUnit) => a + u.cooling_capacity_kw, 0).toFixed(0)}
          </div>
          <div className="text-dark-400 text-sm mt-1">Total Capacity (kW)</div>
        </div>
        <div className="card text-center">
          <div className="text-3xl font-bold text-red-400">{criticalSensors.length}</div>
          <div className="text-dark-400 text-sm mt-1">Critical Sensors</div>
        </div>
        <div className="card text-center">
          <div className="text-3xl font-bold text-amber-400">{warningSensors.length}</div>
          <div className="text-dark-400 text-sm mt-1">Warning Sensors</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cooling Units */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-dark-300">Cooling Units</h2>
            <button onClick={() => setModal('unit')} className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1">
              <Plus className="w-3 h-3" /> Add
            </button>
          </div>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Room</th>
                  <th>Capacity</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {units.map((unit: CoolingUnit) => (
                  <tr key={unit.id}>
                    <td className="font-medium text-dark-200">{unit.name}</td>
                    <td>
                      <span className="text-xs bg-cyan-900/50 text-cyan-300 border border-cyan-800/50 px-2 py-0.5 rounded uppercase">
                        {unit.unit_type}
                      </span>
                    </td>
                    <td className="text-dark-400 text-xs">{unit.room_name}</td>
                    <td className="text-dark-300">{unit.cooling_capacity_kw} kW</td>
                    <td><span className={`badge badge-${unit.status}`}>{unit.status}</span></td>
                    <td>
                      <div className="flex items-center gap-1">
                        <button onClick={() => setEditingUnit(unit)} className="p-1 rounded hover:bg-dark-700 text-dark-500 hover:text-dark-200" title="Edit">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => { if (confirm(`Delete unit "${unit.name}"?`)) deleteUnit.mutate(unit.id); }}
                          className="p-1 rounded hover:bg-red-900/30 text-dark-500 hover:text-red-400" title="Delete">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {units.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-8 text-dark-500">No cooling units found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Temperature sensors */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-dark-300">Temperature Sensors</h2>
            <button onClick={() => setModal('sensor')} className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1">
              <Plus className="w-3 h-3" /> Add
            </button>
          </div>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {sensors.map((sensor: TemperatureSensor) => (
              <div key={sensor.id} className={clsx(
                'card flex items-center justify-between py-3',
                sensor.status === 'critical' && 'border-red-800/50 bg-red-900/10',
                sensor.status === 'warning' && 'border-amber-800/50 bg-amber-900/10',
              )}>
                <div className="flex items-center gap-3">
                  <Thermometer className={clsx('w-4 h-4',
                    sensor.status === 'critical' ? 'text-red-400' :
                    sensor.status === 'warning' ? 'text-amber-400' : 'text-emerald-400'
                  )} />
                  <div>
                    <div className="text-sm font-medium text-dark-200">{sensor.name}</div>
                    <div className="text-xs text-dark-500">{sensor.rack_name || sensor.room_name}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <div className={clsx('text-xl font-bold',
                      sensor.status === 'critical' ? 'text-red-400' :
                      sensor.status === 'warning' ? 'text-amber-400' : 'text-emerald-400'
                    )}>
                      {sensor.current_temp_c}°C
                    </div>
                    <div className="text-xs text-dark-500">max {sensor.threshold_high_c}°C</div>
                  </div>
                  <div className="flex flex-col gap-1 ml-1">
                    <button onClick={() => setEditingSensor(sensor)} className="p-1 rounded hover:bg-dark-700 text-dark-500 hover:text-dark-200" title="Edit">
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button onClick={() => { if (confirm(`Delete sensor "${sensor.name}"?`)) deleteSensor.mutate(sensor.id); }}
                      className="p-1 rounded hover:bg-red-900/30 text-dark-500 hover:text-red-400" title="Delete">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {sensors.length === 0 && (
              <div className="text-center py-8 text-dark-500 text-sm">No sensors found</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
