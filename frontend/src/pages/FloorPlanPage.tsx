import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { dataCenterApi, roomApi, rowApi, rackApi } from '../api';
import { FloorPlan2D, FT_PER_M, calcCableLengthFt } from '../components/FloorPlan/FloorPlan2D';
import type { DrawnCable } from '../components/FloorPlan/FloorPlan2D';
import { FloorPlan3D } from '../components/ThreeD/FloorPlan3D';
import { RackRowView } from '../components/RackView/RackRowView';
import { ChevronDown, X, Plus, Pencil, Trash2 } from 'lucide-react';
import type { DataCenter, DoorDef, FloorPlanRoom, FloorPlanRack, Row } from '../types';
import clsx from 'clsx';

// ── Add Room modal ─────────────────────────────────────────────────────────────

const ROOM_TYPES = [
  { value: 'server',     label: 'Server Room' },
  { value: 'network',    label: 'Network Room' },
  { value: 'idf',        label: 'IDF — Intermediate Distribution Frame' },
  { value: 'mdf',        label: 'MDF — Main Distribution Frame' },
  { value: 'storage',    label: 'Storage Room' },
  { value: 'colocation', label: 'Colocation' },
  { value: 'mixed',      label: 'Mixed' },
];

function AddRoomModal({ dcId, onClose }: { dcId: number; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: '', room_type: 'idf', width: 10, height: 10,
    floor_number: 1, max_power_kw: 50,
  });

  const mutation = useMutation({
    mutationFn: () => roomApi.create({ ...form, datacenter: dcId }),
    onSuccess: async (room: unknown) => {
      const { id: roomId } = room as { id: number };
      const row = await rowApi.create({
        room: roomId, name: 'Row-A',
        position_x: 1, position_y: 1, orientation: 'horizontal',
      }) as { id: number };
      if (form.room_type === 'idf' || form.room_type === 'mdf') {
        await rackApi.create({
          row: row.id, name: `${form.name}-R01`,
          u_height: 12, max_power_kw: 3,
          position_x: 0, position_y: 0, width: 0.6, depth: 0.6,
        });
      }
      qc.invalidateQueries({ queryKey: ['floor-plan'] });
      qc.invalidateQueries({ queryKey: ['rooms'] });
      onClose();
    },
  });

  const f = (k: string, v: string | number) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <div className="modal-header">
          <h2 className="modal-title">Add Room / IDF</h2>
          <button onClick={onClose} className="modal-close-btn"><X className="w-4 h-4" /></button>
        </div>
        <div className="modal-body">
          <div>
            <label className="field-label">Room Name *</label>
            <input className="field-input" placeholder="e.g. IDF-Floor2"
              value={form.name} onChange={e => f('name', e.target.value)} />
          </div>
          <div>
            <label className="field-label">Room Type *</label>
            <select className="field-input"
              value={form.room_type} onChange={e => f('room_type', e.target.value)}>
              {ROOM_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="field-label">Width (grid cols)</label>
              <input type="number" className="field-input"
                value={form.width} onChange={e => f('width', Number(e.target.value))} min={1} max={50} />
            </div>
            <div>
              <label className="field-label">Depth (grid rows)</label>
              <input type="number" className="field-input"
                value={form.height} onChange={e => f('height', Number(e.target.value))} min={1} max={50} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="field-label">Floor</label>
              <input type="number" className="field-input"
                value={form.floor_number} onChange={e => f('floor_number', Number(e.target.value))} min={1} />
            </div>
            <div>
              <label className="field-label">Max Power (kW)</label>
              <input type="number" className="field-input"
                value={form.max_power_kw} onChange={e => f('max_power_kw', Number(e.target.value))} min={0} />
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
          <button
            className="btn-primary flex-1 justify-center disabled:opacity-50"
            disabled={!form.name || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? 'Creating…' : 'Create Room'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Edit Room modal ────────────────────────────────────────────────────────────

function EditRoomModal({ room, onClose }: { room: FloorPlanRoom; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: room.name,
    room_type: room.room_type ?? 'server',
    width: room.width,
    height: room.height,
    max_power_kw: 50,
  });

  const mutation = useMutation({
    mutationFn: () => roomApi.update(room.id, form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['floor-plan'] });
      qc.invalidateQueries({ queryKey: ['rooms'] });
      onClose();
    },
  });

  const f = (k: string, v: string | number) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <div className="modal-header">
          <h2 className="modal-title">Edit Room</h2>
          <button onClick={onClose} className="modal-close-btn"><X className="w-4 h-4" /></button>
        </div>
        <div className="modal-body">
          <div>
            <label className="field-label">Room Name *</label>
            <input className="field-input"
              value={form.name} onChange={e => f('name', e.target.value)} />
          </div>
          <div>
            <label className="field-label">Room Type</label>
            <select className="field-input"
              value={form.room_type} onChange={e => f('room_type', e.target.value)}>
              {ROOM_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="field-label">Width (grid cols)</label>
              <input type="number" className="field-input"
                value={form.width} onChange={e => f('width', Number(e.target.value))} min={1} max={50} />
            </div>
            <div>
              <label className="field-label">Depth (grid rows)</label>
              <input type="number" className="field-input"
                value={form.height} onChange={e => f('height', Number(e.target.value))} min={1} max={50} />
            </div>
          </div>
          {mutation.isError && (
            <div className="modal-error">Failed to update room.</div>
          )}
        </div>
        <div className="modal-footer">
          <button onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
          <button
            className="btn-primary flex-1 justify-center disabled:opacity-50"
            disabled={!form.name || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Place Rack modal (triggered from floor plan click) ─────────────────────────

function PlaceRackModal({
  roomId, posX, posY, onClose,
}: { roomId: number; posX: number; posY: number; onClose: () => void }) {
  const qc = useQueryClient();
  // 3 ft wide × 2 ft deep × 8 ft tall converted to metres
  const [form, setForm] = useState({ name: '', u_height: 42, max_power_kw: 20, status: 'active' });

  const mutation = useMutation({
    mutationFn: async () => {
      // Find or create Row-A for this room
      const rowsData = await rowApi.list({ room: roomId }) as { results: Row[] };
      let rowId: number;
      if (rowsData.results.length > 0) {
        rowId = rowsData.results[0].id;
      } else {
        const row = await rowApi.create({
          room: roomId, name: 'Row-A', position_x: 1, position_y: 1, orientation: 'horizontal',
        }) as { id: number };
        rowId = row.id;
      }
      return rackApi.create({
        ...form, row: rowId,
        position_x: posX, position_y: posY,
        width: 0.9144,   // 3 ft in metres
        depth: 0.6096,   // 2 ft in metres
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['floor-plan'] });
      onClose();
    },
  });

  const f = (k: string, v: string | number) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="modal-overlay">
      <div className="bg-white rounded-xl w-full max-w-sm shadow-2xl border border-gray-200">
        <div className="modal-header">
          <h2 className="modal-title">Place Rack</h2>
          <button onClick={onClose} className="modal-close-btn"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-4 space-y-3">
          <div className="text-xs text-gray-500 bg-gray-50 rounded px-2 py-1">
            Position: {posX.toFixed(1)}m × {posY.toFixed(1)}m
          </div>
          <div>
            <label className="field-label">Rack Name *</label>
            <input className="field-input"
              value={form.name} onChange={e => f('name', e.target.value)} placeholder="e.g. R-NEW-01" autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="field-label">U Height</label>
              <input type="number" className="field-input"
                value={form.u_height} onChange={e => f('u_height', Number(e.target.value))} min={1} />
            </div>
            <div>
              <label className="field-label">Max Power (kW)</label>
              <input type="number" className="field-input"
                value={form.max_power_kw} onChange={e => f('max_power_kw', Number(e.target.value))} min={0} />
            </div>
          </div>
          <div>
            <label className="field-label">Status</label>
            <select className="field-input"
              value={form.status} onChange={e => f('status', e.target.value)}>
              {['active', 'planned', 'reserved'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          {mutation.isError && (
            <div className="text-xs text-red-600 bg-red-50 rounded px-2 py-1">Failed to place rack.</div>
          )}
        </div>
        <div className="flex gap-2 px-4 pb-4">
          <button onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
          <button
            className="btn-primary flex-1 justify-center disabled:opacity-50"
            disabled={!form.name || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? 'Placing…' : 'Place Rack'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Dropdown menu ─────────────────────────────────────────────────────────────

function DropMenu({ label, items }: { label: string; items: { label: string; action?: () => void }[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="flex items-center gap-0.5 px-2 py-1 text-xs text-gray-700 hover:bg-gray-200 rounded"
      >
        {label}
        <ChevronDown className="w-3 h-3" />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-0.5 z-50 bg-white border border-gray-300 rounded shadow-lg min-w-[140px]">
          {items.map((item, i) => (
            <button
              key={i}
              onClick={() => { item.action?.(); setOpen(false); }}
              className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100"
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Cable length calculator (rack-to-rack) ────────────────────────────────────

const CABLE_DROP_FT = 2;    // vertical drop at each rack end (ft) — cable tray height
const CABLE_SLACK   = 1.15; // 15% slack factor

function cableLengthFt(ax: number, ay: number, bx: number, by: number): number {
  // Manhattan routing (horizontal distance in feet)
  const dx_ft = Math.abs(ax - bx) * FT_PER_M;
  const dy_ft = Math.abs(ay - by) * FT_PER_M;
  const horizontal = dx_ft + dy_ft;
  // Add vertical drop at both ends (up to cable tray + down to rack)
  const vertical = CABLE_DROP_FT * 2;
  return (horizontal + vertical) * CABLE_SLACK;
}

// ── Right Properties Panel ────────────────────────────────────────────────────

function RightPanel({
  room, rack, allRacks, activeTab, onTabChange, onLaunchRowView,
}: {
  room: FloorPlanRoom | null;
  rack: FloorPlanRack | null;
  allRacks: FloorPlanRack[];
  activeTab: string;
  onTabChange: (t: string) => void;
  onLaunchRowView: () => void;
}) {
  const navigate = useNavigate();
  const [cableTarget, setCableTarget] = useState<number | ''>('');

  const colToLetter = (n: number) => n < 26 ? String.fromCharCode(65 + n) : '?';
  const gridPos = rack
    ? `[${colToLetter(Math.round(rack.position_x * FT_PER_M))},${Math.round(rack.position_y * FT_PER_M) + 1}]`
    : null;

  const otherRacks = rack ? allRacks.filter(r => r.id !== rack.id) : [];
  const targetRack = otherRacks.find(r => r.id === cableTarget) ?? null;

  const tabs = ['Main', 'Properties', 'Overlays', 'Statistics'];

  return (
    <div className="w-72 flex-shrink-0 border-l border-gray-300 flex flex-col bg-white overflow-y-auto">
      {/* Tab bar */}
      <div className="flex border-b border-gray-300 flex-shrink-0">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
            className={clsx(
              'flex-1 py-2 text-[9px] font-medium transition-colors',
              activeTab === tab
                ? 'text-[#1e293b] border-b-2 border-[#1e293b] bg-white'
                : 'text-gray-400 hover:text-gray-600'
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="flex-1 p-3 text-xs">
        {/* ── Main tab ── */}
        {activeTab === 'Main' && (
          <div className="space-y-4">
            {/* Legend */}
            <div>
              <div className="text-[10px] text-gray-500 uppercase font-semibold mb-2">Legend</div>
              {[
                { color: '#3b82f6', label: '< 50% utilization' },
                { color: '#10b981', label: '50–70%' },
                { color: '#f59e0b', label: '70–90%' },
                { color: '#ef4444', label: '> 90%' },
              ].map(l => (
                <div key={l.label} className="flex items-center gap-2 mb-1">
                  <div className="w-4 h-3 rounded-sm" style={{ backgroundColor: l.color }} />
                  <span className="text-[11px] text-gray-600">{l.label}</span>
                </div>
              ))}
            </div>

            {/* Room info */}
            {room && (
              <div>
                <div className="text-[10px] text-gray-500 uppercase font-semibold mb-1">Room</div>
                <div className="text-[11px] text-gray-700">{room.name}</div>
                {room.room_type && (
                  <div className="text-[10px] text-gray-400 capitalize">{room.room_type.replace('_', ' ')}</div>
                )}
                <div className="text-[10px] text-gray-400">
                  {(room.width * FT_PER_M).toFixed(0)} ft × {(room.height * FT_PER_M).toFixed(0)} ft
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Properties tab ── */}
        {activeTab === 'Properties' && rack && (
          <div className="space-y-3">
            <button
              onClick={onLaunchRowView}
              className="w-full py-1.5 px-2 bg-[#1e293b] text-white rounded text-xs hover:bg-[#334155] flex items-center justify-center gap-1.5"
            >
              🖥 Launch Row View
            </button>
            <div className="grid grid-cols-2 gap-1">
              <button onClick={() => navigate('/assets')} className="py-1 text-[10px] border border-gray-300 rounded hover:bg-gray-50 text-gray-600">View Asset</button>
              <button onClick={() => navigate('/racks')} className="py-1 text-[10px] border border-gray-300 rounded hover:bg-gray-50 text-gray-600">Cabinet Planner</button>
            </div>

            <hr className="border-gray-200" />
            <div className="text-[10px] text-gray-500 uppercase font-semibold">Asset Properties</div>

            <div className="text-[10px] text-gray-500 uppercase font-semibold mt-1">Details</div>
            <table className="w-full text-[11px]">
              <tbody className="divide-y divide-gray-100">
                {[
                  ['Type', 'Cabinet'],
                  ['Name', rack.name],
                  ['Asset Number', rack.id],
                  ['Current Location', room?.name ?? '—'],
                  ['Position on Grid', gridPos ?? '—'],
                ].map(([k, v]) => (
                  <tr key={k}>
                    <td className="py-1 pr-2 text-gray-500 w-1/2">{k}</td>
                    <td className="py-1 text-gray-800">{String(v)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="text-[10px] text-gray-500 uppercase font-semibold mt-2">Heat &amp; Weight</div>
            <table className="w-full text-[11px]">
              <tbody className="divide-y divide-gray-100">
                {[
                  ['Heat Limit (kW)', rack.max_power_kw],
                  ['Heat Threshold (kW)', (rack.max_power_kw * 0.875).toFixed(1)],
                  ['Weight Maximum', 'n/a'],
                  ['Weight Limit', 'n/a'],
                ].map(([k, v]) => (
                  <tr key={k}>
                    <td className="py-1 pr-2 text-gray-500 w-1/2">{k}</td>
                    <td className="py-1 text-gray-800">{String(v)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="text-[10px] text-gray-500 uppercase font-semibold mt-2">Utilization</div>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex-1 bg-gray-200 rounded h-2">
                <div
                  className="h-2 rounded"
                  style={{
                    width: `${rack.utilization_percent ?? 0}%`,
                    backgroundColor: (rack.utilization_percent ?? 0) > 90 ? '#ef4444' :
                      (rack.utilization_percent ?? 0) > 70 ? '#f59e0b' : '#10b981',
                  }}
                />
              </div>
              <span className="text-gray-700 font-medium">{rack.utilization_percent ?? 0}%</span>
            </div>

            {/* ── Cable Length Calculator ── */}
            <hr className="border-gray-200 mt-3" />
            <div className="text-[10px] text-gray-500 uppercase font-semibold mt-2">🔌 Cable Calculator</div>
            <div className="text-[10px] text-gray-400 mb-2">
              Manhattan routing + {CABLE_DROP_FT * 2}ft vertical + 15% slack
            </div>

            {/* Rack position info */}
            <div className="text-[10px] text-gray-500 mb-1">
              <span className="font-medium text-gray-700">{rack.name}</span>
              {' '} @ ({(rack.position_x * FT_PER_M).toFixed(1)}ft, {(rack.position_y * FT_PER_M).toFixed(1)}ft)
            </div>

            {/* Target selector */}
            <select
              className="w-full border border-gray-300 rounded px-2 py-1 text-[10px] text-gray-800 bg-white mb-2"
              value={cableTarget}
              onChange={e => setCableTarget(e.target.value ? Number(e.target.value) : '')}
            >
              <option value="">— select target rack —</option>
              {otherRacks.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>

            {targetRack && (
              <div className="bg-blue-50 border border-blue-200 rounded p-2 space-y-1">
                {(() => {
                  const len = cableLengthFt(rack.position_x, rack.position_y, targetRack.position_x, targetRack.position_y);
                  const dx_ft = Math.abs(rack.position_x - targetRack.position_x) * FT_PER_M;
                  const dy_ft = Math.abs(rack.position_y - targetRack.position_y) * FT_PER_M;
                  return (
                    <>
                      <div className="flex justify-between text-[10px]">
                        <span className="text-gray-500">Horizontal (X)</span>
                        <span className="text-gray-700">{dx_ft.toFixed(1)} ft</span>
                      </div>
                      <div className="flex justify-between text-[10px]">
                        <span className="text-gray-500">Horizontal (Y)</span>
                        <span className="text-gray-700">{dy_ft.toFixed(1)} ft</span>
                      </div>
                      <div className="flex justify-between text-[10px]">
                        <span className="text-gray-500">Vertical overhead</span>
                        <span className="text-gray-700">{CABLE_DROP_FT * 2} ft</span>
                      </div>
                      <div className="flex justify-between text-[10px]">
                        <span className="text-gray-500">+ 15% slack</span>
                        <span className="text-gray-700">{((dx_ft + dy_ft + CABLE_DROP_FT * 2) * 0.15).toFixed(1)} ft</span>
                      </div>
                      <div className="flex justify-between text-[11px] font-semibold border-t border-blue-200 pt-1 mt-1">
                        <span className="text-blue-700">Cable needed</span>
                        <span className="text-blue-800">{len.toFixed(1)} ft</span>
                      </div>
                      <div className="flex justify-between text-[10px]">
                        <span className="text-gray-500">In metres</span>
                        <span className="text-gray-600">{(len / FT_PER_M).toFixed(1)} m</span>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}

            {/* All distances table */}
            {otherRacks.length > 0 && (
              <>
                <div className="text-[10px] text-gray-500 uppercase font-semibold mt-3">All Rack Distances</div>
                <div className="mt-1 max-h-40 overflow-y-auto">
                  <table className="w-full text-[10px]">
                    <thead>
                      <tr className="text-gray-400 border-b border-gray-100">
                        <th className="text-left py-0.5 font-medium">Rack</th>
                        <th className="text-right py-0.5 font-medium">Cable (ft)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {otherRacks
                        .map(r => ({
                          rack: r,
                          len: cableLengthFt(rack.position_x, rack.position_y, r.position_x, r.position_y),
                        }))
                        .sort((a, b) => a.len - b.len)
                        .map(({ rack: r, len }) => (
                          <tr key={r.id}
                            className={clsx('border-b border-gray-50 cursor-pointer hover:bg-gray-50',
                              cableTarget === r.id && 'bg-blue-50')}
                            onClick={() => setCableTarget(r.id)}
                          >
                            <td className="py-0.5 text-gray-700">{r.name}</td>
                            <td className="py-0.5 text-right font-mono text-gray-800">{len.toFixed(1)}</td>
                          </tr>
                        ))
                      }
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'Properties' && !rack && (
          <div className="text-[11px] text-gray-400 italic mt-4 text-center">
            Click a rack on the floor plan to view its properties
          </div>
        )}

        {/* ── Overlays tab ── */}
        {activeTab === 'Overlays' && (
          <div className="space-y-2 mt-1">
            <div className="text-[10px] text-gray-500 uppercase font-semibold mb-2">Color Mode</div>
            {[
              { label: 'Chassis', checked: true },
              { label: 'Servers', checked: true },
              { label: 'PDUs', checked: true },
            ].map(o => (
              <label key={o.label} className="flex items-center gap-2 text-[11px] text-gray-700 cursor-pointer">
                <input type="checkbox" defaultChecked={o.checked} className="rounded" />
                <span className="w-3 h-3 rounded-sm bg-blue-400 inline-block" />
                {o.label}
                <button className="ml-auto text-gray-300 hover:text-gray-500">
                  <svg className="w-3 h-3" viewBox="0 0 16 16" fill="none" stroke="currentColor"><path d="M2 8h12M8 2l6 6-6 6"/></svg>
                </button>
              </label>
            ))}
          </div>
        )}

        {/* ── Statistics tab ── */}
        {activeTab === 'Statistics' && room && (
          <div className="space-y-3 mt-1">
            <div className="text-[10px] text-gray-500 uppercase font-semibold">Room Summary</div>
            {[
              ['Room', room.name],
              ['Type', room.room_type ?? '—'],
              ['Grid Size', `${room.width} × ${room.height}`],
              ['Total Racks', room.rows.reduce((a, r) => a + r.racks.length, 0)],
              ['Rows', room.rows.length],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between text-[11px]">
                <span className="text-gray-500">{k}</span>
                <span className="text-gray-700 font-medium">{String(v)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

type PageMode = 'floorplan' | 'rowview';
type EditTool = 'select' | 'place_rack' | 'door';

export default function FloorPlanPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [selectedDC,   setSelectedDC]   = useState<number | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<number | null>(null);
  const [selectedRack, setSelectedRack] = useState<number | null>(null);
  const [viewMode,     setViewMode]     = useState<'2d' | '3d'>('2d');
  const [pageMode,     setPageMode]     = useState<PageMode>('floorplan');
  const [rightTab,     setRightTab]     = useState('Main');
  const [leftTab,      setLeftTab]      = useState<'navigator' | 'search'>('navigator');
  const [searchQuery,  setSearchQuery]  = useState('');
  const [hoveredCell,  setHoveredCell]  = useState<string | null>(null);
  const [showAddRoom,  setShowAddRoom]  = useState(false);
  const [editingRoom,  setEditingRoom]  = useState<FloorPlanRoom | null>(null);
  const [rowViewRackId, setRowViewRackId] = useState<number | null>(null);

  // Edit mode state
  const [editMode,     setEditMode]     = useState(false);
  const [activeTool,   setActiveTool]   = useState<EditTool>('select');
  const [pendingRackPos, setPendingRackPos] = useState<{ x: number; y: number } | null>(null);

  // Cable draw state
  const [cableTool,    setCableTool]    = useState(false);
  const [cableSource,  setCableSource]  = useState<number | null>(null);
  const [drawnCables,  setDrawnCables]  = useState<DrawnCable[]>([]);
  const [lastCable,    setLastCable]    = useState<DrawnCable | null>(null);

  const { data: dcs } = useQuery({
    queryKey: ['datacenters'],
    queryFn: () => dataCenterApi.listAll(),
  });

  const dcList = dcs as DataCenter[] | undefined;
  const activeDC = selectedDC || (dcList?.[0]?.id ?? null);

  const { data: floorPlan, isLoading } = useQuery<FloorPlanRoom[]>({
    queryKey: ['floor-plan', activeDC, 'with-devices'],
    queryFn: () => dataCenterApi.floorPlan(activeDC!, true),
    enabled: !!activeDC,
  });

  const rooms = floorPlan ?? [];
  const activeRoomId = selectedRoom || rooms[0]?.id || null;
  const activeRoom   = rooms.find(r => r.id === activeRoomId) ?? null;

  const allRacks: FloorPlanRack[] = activeRoom?.rows.flatMap(r => r.racks) ?? [];
  const activeRack = allRacks.find(r => r.id === selectedRack) ?? null;

  const filteredRacks = searchQuery
    ? allRacks.filter(r => r.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : allRacks;

  const { data: elevationData } = useQuery({
    queryKey: ['rack-elevation', rowViewRackId],
    queryFn: () => rackApi.elevation(rowViewRackId!),
    enabled: !!rowViewRackId && pageMode === 'rowview',
  });

  // Mutations for edit mode
  const moveRack = useMutation({
    mutationFn: ({ id, x, y }: { id: number; x: number; y: number }) =>
      rackApi.update(id, { position_x: x, position_y: y }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['floor-plan'] }),
  });

  const saveDoors = useMutation({
    mutationFn: (doors: DoorDef[]) => roomApi.update(activeRoomId!, { doors }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['floor-plan'] }),
  });

  const deleteRack = useMutation({
    mutationFn: (id: number) => rackApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['floor-plan'] }); setSelectedRack(null); },
  });

  const deleteRoom = useMutation({
    mutationFn: (id: number) => roomApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['floor-plan'] });
      setSelectedRoom(null);
      setSelectedRack(null);
    },
  });

  const handleRackSelect = (id: number | null) => {
    setSelectedRack(id);
    if (id) setRightTab('Properties');
  };

  const handleLaunchRowView = () => {
    if (!selectedRack) return;
    setRowViewRackId(selectedRack);
    setPageMode('rowview');
  };

  const handleBackToFloorPlan = () => {
    setPageMode('floorplan');
    setRowViewRackId(null);
  };

  const handleAddDoor = (door: DoorDef) => {
    const newDoors = [...(activeRoom?.doors ?? []), door];
    saveDoors.mutate(newDoors);
  };

  const handleRackCableClick = (rackId: number) => {
    if (!cableSource) {
      setCableSource(rackId);
    } else if (cableSource === rackId) {
      // clicked same rack — cancel
      setCableSource(null);
    } else {
      const srcRack = allRacks.find(r => r.id === cableSource);
      const dstRack = allRacks.find(r => r.id === rackId);
      if (srcRack && dstRack) {
        const len = calcCableLengthFt(srcRack.position_x, srcRack.position_y, dstRack.position_x, dstRack.position_y);
        const cable: DrawnCable = {
          id: `${cableSource}-${rackId}-${Date.now()}`,
          sourceId: cableSource,
          targetId: rackId,
          lengthFt: len,
        };
        setDrawnCables(prev => [...prev, cable]);
        setLastCable(cable);
      }
      setCableSource(null);
    }
  };

  // ── Row View mode ─────────────────────────────────────────────────────────
  if (pageMode === 'rowview' && rowViewRackId && elevationData) {
    return (
      <div className="h-[calc(100vh-7rem)] flex flex-col bg-white">
        <RackRowView
          rack={elevationData.rack}
          units={elevationData.units}
          allRacks={allRacks.map(r => ({ id: r.id, name: r.name }))}
          onSelectRack={(id) => { setRowViewRackId(id); setSelectedRack(id); }}
          onBackToFloorPlan={handleBackToFloorPlan}
        />
      </div>
    );
  }

  if (pageMode === 'rowview' && rowViewRackId && !elevationData) {
    return (
      <div className="h-[calc(100vh-4rem)] flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600" />
      </div>
    );
  }

  // ── Floor Plan mode ───────────────────────────────────────────────────────
  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col bg-[#f0f2f5]">
      {showAddRoom && activeDC && (
        <AddRoomModal dcId={activeDC} onClose={() => setShowAddRoom(false)} />
      )}
      {editingRoom && (
        <EditRoomModal room={editingRoom} onClose={() => setEditingRoom(null)} />
      )}
      {pendingRackPos && activeRoomId && (
        <PlaceRackModal
          roomId={activeRoomId}
          posX={pendingRackPos.x}
          posY={pendingRackPos.y}
          onClose={() => setPendingRackPos(null)}
        />
      )}

      {/* ── Top toolbar ── */}
      <div className={clsx(
        'flex items-center gap-1 px-3 py-1.5 border-b border-gray-300 flex-shrink-0 transition-colors',
        editMode ? 'bg-amber-50 border-amber-300' : 'bg-[#f0f2f5]'
      )}>
        {/* DC selector */}
        <div className="relative mr-2">
          <select
            className="appearance-none pl-2 pr-6 py-1 text-xs border border-gray-300 rounded bg-white text-gray-700"
            value={activeDC || ''}
            onChange={e => { setSelectedDC(Number(e.target.value)); setSelectedRoom(null); setSelectedRack(null); }}
          >
            {dcList?.map((dc: DataCenter) => (
              <option key={dc.id} value={dc.id}>{dc.name}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
        </div>

        {/* Menu items */}
        <DropMenu label="File" items={[
          { label: 'Export PNG', action: () => window.print() },
          { label: 'Export PDF', action: () => window.print() },
          { label: 'Print', action: () => window.print() },
        ]} />
        <DropMenu label="Edit" items={[
          { label: 'Add Room / IDF', action: () => setShowAddRoom(true) },
          ...(activeRoom ? [{ label: `Edit Room "${activeRoom.name}"`, action: () => setEditingRoom(activeRoom) }] : []),
          ...(activeRoom ? [{ label: `Delete Room "${activeRoom.name}"`, action: () => { if (confirm(`Delete room "${activeRoom.name}" and all its racks?`)) deleteRoom.mutate(activeRoom.id); } }] : []),
          { label: 'Select All', action: () => allRacks.length > 0 ? setSelectedRack(allRacks[0].id) : undefined },
          ...(editMode && selectedRack ? [{ label: 'Delete Selected Rack', action: () => { if (confirm('Delete this rack?')) deleteRack.mutate(selectedRack!); } }] : []),
        ]} />
        <DropMenu label="View" items={[
          { label: '2D Plan', action: () => setViewMode('2d') },
          { label: '3D View', action: () => setViewMode('3d') },
          { label: 'Reset Zoom', action: () => { setViewMode('2d'); setTimeout(() => setViewMode('2d'), 50); } },
        ]} />
        <DropMenu label="Properties" items={[
          { label: 'Main', action: () => setRightTab('Main') },
          { label: 'Overlays', action: () => setRightTab('Overlays') },
          { label: 'Statistics', action: () => setRightTab('Statistics') },
        ]} />

        {/* Edit mode toggle */}
        <button
          onClick={() => { setEditMode(e => !e); setActiveTool('select'); }}
          className={clsx(
            'ml-2 flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors border',
            editMode
              ? 'bg-amber-500 text-white border-amber-600'
              : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-100'
          )}
          title="Toggle Edit Mode"
        >
          <Pencil className="w-3 h-3" />
          {editMode ? 'Editing' : 'Edit'}
        </button>

        {/* Cable draw tool */}
        <button
          onClick={() => { setCableTool(t => !t); setCableSource(null); }}
          className={clsx(
            'ml-1 flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors border',
            cableTool
              ? 'bg-cyan-600 text-white border-cyan-700'
              : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-100'
          )}
          title="Draw cable between racks"
        >
          🔌 {cableTool ? 'Cabling' : 'Cable'}
        </button>
        {drawnCables.length > 0 && (
          <button
            onClick={() => { setDrawnCables([]); setLastCable(null); setCableSource(null); }}
            className="px-2 py-1 rounded text-xs border border-gray-300 bg-white text-gray-500 hover:bg-red-50 hover:text-red-500 hover:border-red-300"
            title="Clear all drawn cables"
          >
            ✕ Clear Cables
          </button>
        )}

        {/* Edit tool strip (only when editMode is on) */}
        {editMode && (
          <div className="ml-2 flex items-center gap-1 bg-white border border-amber-300 rounded overflow-hidden">
            {([
              { tool: 'select'     as EditTool, label: '↖ Select' },
              { tool: 'place_rack' as EditTool, label: '+ Rack' },
              { tool: 'door'       as EditTool, label: '🚪 Door' },
            ]).map(({ tool, label }) => (
              <button
                key={tool}
                onClick={() => setActiveTool(tool)}
                className={clsx(
                  'px-2.5 py-1 text-xs transition-colors border-r border-amber-200 last:border-r-0',
                  activeTool === tool
                    ? 'bg-amber-500 text-white'
                    : 'text-gray-600 hover:bg-amber-50'
                )}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {/* Room selector tabs */}
        {rooms.length > 0 && (
          <div className="ml-4 flex gap-0.5 overflow-x-auto">
            {rooms.map(r => (
              <div key={r.id} className={clsx(
                'flex items-center gap-0.5 px-2 py-1 text-xs rounded-t border border-b-0 flex-shrink-0 transition-colors group',
                activeRoomId === r.id
                  ? 'bg-white text-[#1e293b] border-gray-300 font-semibold'
                  : 'bg-[#e0e4ea] text-gray-500 border-[#e0e4ea] hover:bg-gray-200'
              )}>
                <button
                  onClick={() => { setSelectedRoom(r.id); setSelectedRack(null); }}
                  className="flex items-center gap-1"
                >
                  🏢 {r.name}
                </button>
                {activeRoomId === r.id && (
                  <>
                    <button
                      onClick={e => { e.stopPropagation(); setEditingRoom(r); }}
                      className="ml-1 p-0.5 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Edit room"
                    >
                      <Pencil className="w-2.5 h-2.5" />
                    </button>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        if (confirm(`Delete room "${r.name}" and all its racks?`)) deleteRoom.mutate(r.id);
                      }}
                      className="p-0.5 rounded hover:bg-red-100 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Delete room"
                    >
                      <Trash2 className="w-2.5 h-2.5" />
                    </button>
                  </>
                )}
              </div>
            ))}
            <button
              onClick={() => setShowAddRoom(true)}
              className="px-2 py-1 text-xs text-gray-400 hover:text-gray-600 flex-shrink-0"
              title="Add Room"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* ── Main 3-panel body ── */}
      <div className="flex flex-1 min-h-0 border-t border-gray-300">

        {/* ── Left panel: Navigator / Search ── */}
        <div className="w-56 flex-shrink-0 border-r border-gray-300 flex flex-col bg-[#f8fafc]">
          <div className="flex border-b border-gray-300">
            {(['navigator', 'search'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setLeftTab(tab)}
                className={clsx(
                  'flex-1 py-2 text-[10px] capitalize font-medium transition-colors',
                  leftTab === tab
                    ? 'bg-white text-[#1e293b] border-b-2 border-[#1e293b]'
                    : 'text-gray-400 hover:text-gray-600'
                )}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {leftTab === 'search' && (
              <input
                className="w-full border border-gray-300 rounded px-2 py-1 text-xs bg-white mb-2"
                placeholder="Asset Name"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            )}

            {(leftTab === 'navigator' ? allRacks : filteredRacks).map(rack => (
              <button
                key={rack.id}
                onClick={() => handleRackSelect(rack.id === selectedRack ? null : rack.id)}
                className={clsx(
                  'w-full text-left px-2 py-1.5 rounded text-xs flex items-center gap-1.5 mb-0.5 transition-colors',
                  rack.id === selectedRack
                    ? 'bg-[#1e293b] text-white'
                    : 'hover:bg-gray-200 text-gray-700'
                )}
              >
                <span className={clsx('w-2 h-2 rounded-full flex-shrink-0',
                  rack.status === 'active' ? 'bg-green-500' :
                  rack.status === 'planned' ? 'bg-blue-400' : 'bg-gray-400'
                )} />
                <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 16 16" fill="currentColor" opacity={0.7}>
                  <rect x="2" y="1" width="12" height="14" rx="1" fill="none" stroke="currentColor" strokeWidth="1.5"/>
                  <line x1="4" y1="4" x2="12" y2="4" stroke="currentColor" strokeWidth="1"/>
                  <line x1="4" y1="7" x2="12" y2="7" stroke="currentColor" strokeWidth="1"/>
                  <line x1="4" y1="10" x2="12" y2="10" stroke="currentColor" strokeWidth="1"/>
                </svg>
                <span className="truncate">{rack.name}</span>
              </button>
            ))}

            {allRacks.length === 0 && !isLoading && (
              <div className="text-[11px] text-gray-400 italic text-center mt-6">
                No racks in this room
              </div>
            )}
          </div>

          <div className="flex gap-1 p-2 border-t border-gray-300">
            <button onClick={() => navigate('/assets')} className="flex-1 py-1 text-[9px] border border-gray-300 rounded bg-white hover:bg-gray-100 text-gray-600">
              View Asset Summary
            </button>
            <button onClick={() => window.print()} className="py-1 px-2 text-[9px] border border-gray-300 rounded bg-white hover:bg-gray-100 text-gray-600">
              Export
            </button>
          </div>
        </div>

        {/* ── Center: Canvas + tools ── */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex flex-1 min-h-0">
            {/* Vertical tool strip */}
            <div className="w-10 flex-shrink-0 border-r border-gray-300 bg-[#f0f2f5] flex flex-col items-center py-2 gap-1">
              {[
                { icon: '✏', title: 'Draw' },
                { icon: '↖', title: 'Select', active: !editMode },
                { icon: '○', title: 'Circle' },
                { icon: '🔍', title: 'Zoom' },
              ].map(t => (
                <button
                  key={t.icon}
                  title={t.title}
                  className={clsx(
                    'w-7 h-7 rounded text-sm flex items-center justify-center',
                    t.active ? 'bg-[#1e293b] text-white' : 'hover:bg-gray-200 text-gray-600'
                  )}
                >
                  {t.icon}
                </button>
              ))}
              <div className="mt-2 text-[8px] text-gray-400 uppercase font-semibold tracking-wider">Tools</div>
              <div className="mt-auto mb-2 text-[8px] text-gray-400 uppercase tracking-wider">Snap</div>
              <button className="w-7 h-7 border border-gray-300 rounded text-sm text-gray-600 hover:bg-gray-200 flex items-center justify-center">
                ⊞
              </button>
            </div>

            {/* Canvas area */}
            <div className="flex-1 overflow-hidden">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600" />
                </div>
              ) : !activeRoom ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-4">
                  <svg className="w-16 h-16 opacity-20" viewBox="0 0 64 64" fill="none" stroke="currentColor">
                    <rect x="8" y="8" width="48" height="48" rx="3" strokeWidth="2"/>
                    <line x1="8" y1="24" x2="56" y2="24" strokeWidth="1"/>
                    <line x1="24" y1="8" x2="24" y2="56" strokeWidth="1"/>
                  </svg>
                  <p className="text-sm">No rooms yet. Add a room to get started.</p>
                  <button
                    onClick={() => setShowAddRoom(true)}
                    className="px-4 py-2 bg-[#1e293b] text-white text-sm rounded hover:bg-[#334155] flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> Add Room
                  </button>
                </div>
              ) : viewMode === '2d' ? (
                <FloorPlan2D
                  room={activeRoom}
                  selectedRackId={selectedRack}
                  onRackSelect={handleRackSelect}
                  onGridCellHover={setHoveredCell}
                  editMode={editMode}
                  activeTool={activeTool}
                  onRackMove={(id, x, y) => moveRack.mutate({ id, x, y })}
                  onRackPlace={(x, y) => setPendingRackPos({ x, y })}
                  onAddDoor={handleAddDoor}
                  cableMode={cableTool}
                  cableSource={cableSource}
                  drawnCables={drawnCables}
                  onRackCableClick={handleRackCableClick}
                />
              ) : (
                <FloorPlan3D
                  rooms={[activeRoom]}
                  onRackClick={id => handleRackSelect(id === selectedRack ? null : id)}
                />
              )}
            </div>
          </div>

          {/* Status bar */}
          <div className="flex items-center px-3 py-1 bg-[#e8ecf0] border-t border-gray-300 text-[10px] text-gray-500 flex-shrink-0 gap-4">
            {activeRoom && (
              <span className="text-gray-600 font-medium">{activeRoom.name}</span>
            )}
            {activeRack && (
              <span>Selected: <strong className="text-gray-700">{activeRack.name}</strong></span>
            )}
            {editMode && (
              <span className="text-amber-600 font-medium">
                Edit Mode — {activeTool === 'select' ? 'drag racks' : activeTool === 'place_rack' ? 'click to place' : 'click wall for door'}
              </span>
            )}
            {cableTool && (
              <span className="text-cyan-600 font-medium">
                🔌 Cable Mode — {cableSource ? 'click target rack to complete' : 'click a rack to start'}
              </span>
            )}
            {lastCable && !cableTool && (
              <span className="text-emerald-600 font-medium">
                Last cable: {lastCable.lengthFt.toFixed(1)} ft ({(lastCable.lengthFt / FT_PER_M).toFixed(1)} m)
                {' · '}{drawnCables.length} cable{drawnCables.length !== 1 ? 's' : ''} drawn
              </span>
            )}
            <span className="ml-auto">
              Grid Cell {hoveredCell ?? '—'}
            </span>
          </div>
        </div>

        {/* ── Right panel ── */}
        <RightPanel
          room={activeRoom}
          rack={activeRack}
          allRacks={allRacks}
          activeTab={rightTab}
          onTabChange={setRightTab}
          onLaunchRowView={handleLaunchRowView}
        />
      </div>
    </div>
  );
}
