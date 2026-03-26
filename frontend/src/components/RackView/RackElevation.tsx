import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rackApi, deviceApi, deviceTypeApi } from '../../api';
import { X, Plus, Trash2 } from 'lucide-react';
import clsx from 'clsx';
import type { DeviceType } from '../../types';

interface Unit {
  u: number;
  device_id: number | null;
  device_name: string | null;
  device_type?: string;
  role?: string;
  status?: string;
  u_height?: number;
  start_u?: number;
  color?: string;
  width_mm?: number;
  depth_mm?: number;
  is_full_depth?: boolean;
  face?: 'front' | 'rear';
}

interface Props {
  rackId: number;
  onClose?: () => void;
}

const ROLE_COLORS: Record<string, string> = {
  server: '#1d4ed8',
  switch: '#059669',
  router: '#7c3aed',
  firewall: '#dc2626',
  pdu: '#d97706',
  ups: '#0891b2',
  storage: '#4338ca',
  patch_panel: '#475569',
  other: '#374151',
};

// ── Add Device Modal ───────────────────────────────────────────────────────────

function AddDeviceModal({
  rackId,
  initialU,
  rackHeight,
  onClose,
}: {
  rackId: number;
  initialU: number | null;
  rackHeight: number;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const { data: dtData } = useQuery({
    queryKey: ['device-types'],
    queryFn: () => deviceTypeApi.listAll(),
  });
  const deviceTypes: DeviceType[] = (dtData as DeviceType[]) || [];

  const [form, setForm] = useState({
    name: '',
    device_type: '',
    position_u: initialU ?? 1,
    face: 'front' as string,
    status: 'active' as string,
    serial_number: '',
    hostname: '',
  });

  const mutation = useMutation({
    mutationFn: () => deviceApi.create({
      ...form,
      device_type: Number(form.device_type),
      rack: rackId,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rack-elevation', rackId] });
      qc.invalidateQueries({ queryKey: ['devices'] });
      onClose();
    },
  });

  const f = (k: string, v: string | number) => setForm(p => ({ ...p, [k]: v }));
  const selectedDt = deviceTypes.find(dt => String(dt.id) === String(form.device_type)) ?? null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md shadow-2xl border border-gray-200">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
          <h2 className="text-sm font-bold text-gray-800">Add Device to Rack</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Device Type *</label>
            <select
              className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm text-gray-800 bg-white"
              value={form.device_type}
              onChange={e => f('device_type', e.target.value)}
            >
              <option value="">— select device type —</option>
              {deviceTypes.map(dt => (
                <option key={dt.id} value={dt.id}>
                  {dt.manufacturer_name ? `${dt.manufacturer_name} ` : ''}{dt.model} ({dt.u_height}U)
                </option>
              ))}
            </select>
          </div>

          {selectedDt && (
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Height', value: `${selectedDt.u_height}U`,       sub: `${(selectedDt.u_height * 44.45).toFixed(0)} mm` },
                { label: 'Width',  value: `${selectedDt.width_mm} mm`,     sub: `${(selectedDt.width_mm / 25.4).toFixed(1)}"` },
                { label: 'Depth',  value: `${selectedDt.depth_mm} mm`,     sub: selectedDt.is_full_depth ? 'Full depth' : 'Half depth' },
              ].map(({ label, value, sub }) => (
                <div key={label} className="bg-blue-50 border border-blue-200 rounded-lg p-2 text-center">
                  <div className="text-[9px] text-blue-400 uppercase font-semibold mb-0.5">{label}</div>
                  <div className="text-[11px] font-bold text-[#1e293b]">{value}</div>
                  <div className="text-[9px] text-gray-400">{sub}</div>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Name *</label>
              <input
                className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm text-gray-800 bg-white"
                value={form.name}
                onChange={e => f('name', e.target.value)}
                placeholder="e.g. web-srv-01"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Hostname</label>
              <input
                className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm text-gray-800 bg-white"
                value={form.hostname}
                onChange={e => f('hostname', e.target.value)}
                placeholder="optional"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Position U</label>
              <input
                type="number"
                className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm text-gray-800 bg-white"
                value={form.position_u}
                onChange={e => f('position_u', Number(e.target.value))}
                min={1}
                max={rackHeight}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Face</label>
              <select
                className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm text-gray-800 bg-white"
                value={form.face}
                onChange={e => f('face', e.target.value)}
              >
                <option value="front">Front</option>
                <option value="rear">Rear</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Status</label>
              <select
                className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm text-gray-800 bg-white"
                value={form.status}
                onChange={e => f('status', e.target.value)}
              >
                <option value="active">Active</option>
                <option value="planned">Planned</option>
                <option value="staged">Staged</option>
                <option value="failed">Failed</option>
                <option value="offline">Offline</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Serial Number</label>
            <input
              className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm text-gray-800 bg-white"
              value={form.serial_number}
              onChange={e => f('serial_number', e.target.value)}
              placeholder="optional"
            />
          </div>
          {mutation.isError && (
            <div className="text-xs text-red-600 bg-red-50 rounded px-3 py-2">
              Failed to add device. Check that the U slot isn't occupied.
            </div>
          )}
        </div>
        <div className="flex gap-2 px-5 pb-5">
          <button onClick={onClose} className="flex-1 border border-gray-300 rounded py-1.5 text-sm hover:bg-gray-50">
            Cancel
          </button>
          <button
            className="flex-1 bg-[#1e293b] text-white rounded py-1.5 text-sm hover:bg-[#334155] disabled:opacity-50"
            disabled={!form.name || !form.device_type || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? 'Adding…' : 'Add Device'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Unit row ───────────────────────────────────────────────────────────────────

function UnitRow({
  unit, totalU, onAddClick, onDeviceClick, selected,
}: {
  unit: Unit; totalU: number;
  onAddClick: (u: number) => void;
  onDeviceClick: (u: Unit) => void;
  selected: boolean;
}) {
  const uLabel = (totalU - unit.u + 1).toString().padStart(2, '0');
  const isOccupied = !!unit.device_id;
  const isStart = unit.start_u === unit.u;

  if (isOccupied && !isStart) return null;

  const height = isOccupied ? (unit.u_height || 1) * 20 : 20;
  const color = unit.color || ROLE_COLORS[unit.role || ''] || '#374151';

  return (
    <div className="flex items-stretch border-b border-dark-800/50 group" style={{ height }}>
      <div className="w-10 flex items-center justify-center text-xs text-dark-600 border-r border-dark-800 flex-shrink-0 bg-dark-900">
        {uLabel}
      </div>
      <div
        className={clsx(
          'flex-1 flex items-center px-2 gap-2 transition-all cursor-pointer',
          isOccupied ? 'hover:brightness-110' : 'bg-dark-950 hover:bg-primary-900/20',
          selected && 'ring-2 ring-inset ring-blue-400'
        )}
        style={isOccupied ? { backgroundColor: selected ? color + '55' : color + '33', borderLeft: `3px solid ${color}` } : {}}
        onClick={() => isOccupied ? onDeviceClick(unit) : onAddClick(unit.u)}
      >
        {isOccupied ? (
          <>
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
            <div className="min-w-0">
              <div className="text-xs font-medium text-dark-200 truncate">{unit.device_name}</div>
              {unit.device_type && <div className="text-xs text-dark-500">{unit.device_type}</div>}
            </div>
            <div className="ml-auto flex items-center gap-2">
              {unit.u_height && unit.u_height > 1 && <span className="text-xs text-dark-500">{unit.u_height}U</span>}
              {unit.status && <span className={`badge badge-${unit.status} hidden group-hover:flex`}>{unit.status}</span>}
            </div>
          </>
        ) : (
          <div className="flex items-center gap-1 text-xs text-dark-700 italic group-hover:text-primary-400 group-hover:not-italic">
            <Plus className="w-3 h-3 opacity-0 group-hover:opacity-100" />
            <span className="group-hover:hidden">— empty —</span>
            <span className="hidden group-hover:inline">add device</span>
          </div>
        )}
      </div>
      <div className="w-10 flex items-center justify-center text-xs text-dark-600 border-l border-dark-800 flex-shrink-0 bg-dark-900">
        {uLabel}
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function RackElevation({ rackId, onClose }: Props) {
  const [face, setFace] = useState<'front' | 'rear'>('front');
  const [addDeviceU, setAddDeviceU] = useState<number | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const qc = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['rack-elevation', rackId],
    queryFn: () => rackApi.elevation(rackId),
    enabled: !!rackId,
  });

  const { data: fullDevice } = useQuery({
    queryKey: ['device', selectedUnit?.device_id],
    queryFn: () => deviceApi.get(selectedUnit!.device_id!),
    enabled: !!selectedUnit?.device_id,
  });

  useEffect(() => {
    if (fullDevice) {
      const d = fullDevice as Record<string, unknown>;
      setEditForm({
        name: String(d.name ?? ''), status: String(d.status ?? 'active'),
        face: String(d.face ?? 'front'), position_u: String(d.position_u ?? ''),
        serial_number: String(d.serial_number ?? ''), asset_tag: String(d.asset_tag ?? ''),
        hostname: String(d.hostname ?? ''), ip_address: String(d.ip_address ?? ''),
        management_ip: String(d.management_ip ?? ''), os: String(d.os ?? ''),
        cpu_cores: String(d.cpu_cores ?? ''), ram_gb: String(d.ram_gb ?? ''),
        storage_tb: String(d.storage_tb ?? ''), comments: String(d.comments ?? ''),
      });
    }
  }, [fullDevice]);

  const updateDeviceMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) => deviceApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['rack-elevation', rackId] }); },
  });

  const deleteDeviceMutation = useMutation({
    mutationFn: (id: number) => deviceApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['rack-elevation', rackId] }); setSelectedUnit(null); },
  });

  const openAddDevice = (u: number | null = null) => { setAddDeviceU(u); setShowAddModal(true); };

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500" />
    </div>
  );
  if (isError) return <div className="p-4 text-red-400 text-sm">Failed to load rack elevation.</div>;
  if (!data) return null;

  const { rack, units } = data;
  // Count unique occupied U positions (front+rear at same slot = 1U)
  const occupiedSet = new Set<number>();
  (units as Unit[]).forEach(u => { if (u.device_id && u.start_u === u.u) { for (let i = u.u; i < u.u + (u.u_height ?? 1); i++) occupiedSet.add(i); } });
  const usedU = occupiedSet.size;
  const utilPct = Math.min(Math.round((usedU / rack.u_height) * 100), 100);

  const deviceFace = face === 'front' ? 'front' : 'rear';
  const faceFiltered = units.filter((u: Unit) => !u.device_id || u.face === deviceFace);
  const mergedUnits: Unit[] = [];
  const skipUntil: Record<number, boolean> = {};
  for (const u of faceFiltered) {
    if (skipUntil[u.u]) continue;
    mergedUnits.push(u);
    if (u.device_id && (u.u_height ?? 1) > 1) {
      for (let i = u.u + 1; i < u.u + (u.u_height ?? 1); i++) skipUntil[i] = true;
    }
  }

  const inp = 'w-full border border-gray-600 rounded px-2 py-1 text-[11px] text-gray-200 bg-dark-800 focus:outline-none focus:border-blue-400';
  const ef = (k: string, v: string) => setEditForm(p => ({ ...p, [k]: v }));

  return (
    <div className="bg-dark-900 border border-dark-700 rounded-xl overflow-hidden flex h-full">
      {showAddModal && (
        <AddDeviceModal
          rackId={rackId}
          initialU={addDeviceU}
          rackHeight={rack.u_height}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-dark-700 bg-dark-800 flex-shrink-0">
        <div>
          <h3 className="text-sm font-bold text-dark-100">Rack: {rack.name}</h3>
          <div className="text-xs text-dark-500 mt-0.5">
            {rack.u_height}U | {rack.status} | {utilPct}% utilization
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Add Device button */}
          <button
            onClick={() => openAddDevice(null)}
            className="flex items-center gap-1.5 px-3 py-1 text-xs bg-primary-600 hover:bg-primary-500 text-white rounded-lg transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Device
          </button>

          {/* Face toggle */}
          <div className="flex items-center bg-dark-900 rounded-lg p-0.5 border border-dark-700">
            <button
              onClick={() => setFace('front')}
              className={clsx('px-3 py-1 text-xs rounded-md transition-colors', face === 'front' ? 'bg-primary-600 text-white' : 'text-dark-400 hover:text-dark-200')}
            >
              Front
            </button>
            <button
              onClick={() => setFace('rear')}
              className={clsx('px-3 py-1 text-xs rounded-md transition-colors', face === 'rear' ? 'bg-primary-600 text-white' : 'text-dark-400 hover:text-dark-200')}
            >
              Rear
            </button>
          </div>
          {onClose && (
            <button onClick={onClose} className="text-dark-500 hover:text-dark-200 text-lg leading-none">✕</button>
          )}
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-4 px-4 py-2 bg-dark-800/50 border-b border-dark-700 text-xs flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded bg-primary-500" />
          <span className="text-dark-400">Used: {usedU}U</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded bg-dark-700" />
          <span className="text-dark-400">Free: {rack.u_height - usedU}U</span>
        </div>
        <div className="flex-1">
          <div className="bg-dark-700 rounded-full h-1.5">
            <div
              className="h-1.5 rounded-full transition-all"
              style={{
                width: `${utilPct}%`,
                backgroundColor: utilPct > 90 ? '#ef4444' : utilPct > 70 ? '#f59e0b' : '#10b981',
              }}
            />
          </div>
        </div>
        <span className="text-dark-300 font-medium">{utilPct}%</span>
      </div>

      {/* Rack visualization */}
      <div className="flex-1 overflow-y-auto">
        <div className="bg-dark-950 border border-dark-800 mx-3 my-3 rounded-lg overflow-hidden">
          {/* Rack header */}
          <div className="flex text-xs text-dark-600 bg-dark-900 border-b border-dark-800 py-1">
            <div className="w-10 text-center">U#</div>
            <div className="flex-1 text-center">{face === 'front' ? 'Front' : 'Rear'} View</div>
            <div className="w-10 text-center">U#</div>
          </div>

          {/* Units */}
          <div>
            {mergedUnits.map((unit: Unit) => (
              <UnitRow
                key={unit.u}
                unit={unit}
                totalU={rack.u_height}
                onAddClick={u => openAddDevice(u)}
                onDeviceClick={u => { setSelectedUnit(u); setEditForm({}); }}
                selected={selectedUnit?.u === unit.u && selectedUnit?.face === unit.face}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ── Device detail / edit panel ── */}
      {selectedUnit && (
        <div className="w-64 flex-shrink-0 border-l border-dark-700 flex flex-col bg-dark-800 overflow-y-auto text-xs">
          <div className="flex items-center justify-between px-3 py-2 border-b border-dark-700">
            <span className="font-semibold text-dark-100 text-[11px]">Device</span>
            <button onClick={() => setSelectedUnit(null)} className="text-dark-500 hover:text-dark-200 text-xs">✕</button>
          </div>
          <div className="px-3 py-2 border-b border-dark-700">
            <div className="text-[11px] font-medium text-dark-100 truncate">{selectedUnit.device_name}</div>
            <div className="text-[10px] text-dark-500">{selectedUnit.device_type} · {selectedUnit.role}</div>
          </div>

          {!fullDevice ? (
            <div className="p-3 text-dark-500 text-center text-[10px]">Loading…</div>
          ) : (
            <div className="p-3 space-y-2 flex-1">
              {[
                { k: 'name', label: 'Name', type: 'text' },
                { k: 'status', label: 'Status', type: 'select', opts: ['active','planned','staged','failed','offline','decommissioning'] },
                { k: 'face', label: 'Face', type: 'select', opts: ['front','rear'] },
                { k: 'position_u', label: 'Position U', type: 'number' },
                { k: 'serial_number', label: 'Serial #', type: 'text' },
                { k: 'hostname', label: 'Hostname', type: 'text' },
                { k: 'ip_address', label: 'IP Address', type: 'text' },
                { k: 'management_ip', label: 'Mgmt IP', type: 'text' },
                { k: 'os', label: 'OS', type: 'text' },
                { k: 'cpu_cores', label: 'CPU Cores', type: 'number' },
                { k: 'ram_gb', label: 'RAM (GB)', type: 'number' },
                { k: 'storage_tb', label: 'Storage (TB)', type: 'number' },
              ].map(({ k, label, type, opts }) => (
                <div key={k}>
                  <label className="block text-[9px] text-dark-400 mb-0.5">{label}</label>
                  {type === 'select' ? (
                    <select className={inp} value={editForm[k] ?? ''} onChange={e => ef(k, e.target.value)}>
                      {(opts as string[]).map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : (
                    <input type={type} className={inp} value={editForm[k] ?? ''} onChange={e => ef(k, e.target.value)} />
                  )}
                </div>
              ))}

              {updateDeviceMutation.isError && <div className="text-[10px] text-red-400">Failed to save.</div>}
              <button
                className="w-full py-1.5 text-[11px] bg-primary-600 hover:bg-primary-500 text-white rounded disabled:opacity-50"
                disabled={!editForm.name || updateDeviceMutation.isPending}
                onClick={() => {
                  if (!selectedUnit.device_id) return;
                  const payload: Record<string, unknown> = { ...editForm };
                  ['position_u','cpu_cores','ram_gb','storage_tb'].forEach(k => { payload[k] = editForm[k] ? Number(editForm[k]) : null; });
                  ['ip_address','management_ip','asset_tag'].forEach(k => { if (!editForm[k]) payload[k] = null; });
                  updateDeviceMutation.mutate({ id: selectedUnit.device_id, data: payload });
                }}
              >
                {updateDeviceMutation.isPending ? 'Saving…' : 'Save Changes'}
              </button>
              <button
                className="w-full flex items-center justify-center gap-1 py-1.5 text-[11px] text-red-400 border border-red-800 rounded hover:bg-red-900/30 disabled:opacity-50"
                disabled={deleteDeviceMutation.isPending}
                onClick={() => { if (selectedUnit.device_id && confirm(`Remove "${selectedUnit.device_name}"?`)) deleteDeviceMutation.mutate(selectedUnit.device_id); }}
              >
                <Trash2 className="w-3 h-3" />
                {deleteDeviceMutation.isPending ? 'Removing…' : 'Remove from Rack'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
