import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rackApi, rowApi, roomApi, dataCenterApi } from '../api';
import { RackElevation } from '../components/RackView/RackElevation';
import type { DataCenter, Rack, Room, Row } from '../types/index';
import { Layers, Plus, Search, X, Pencil, Trash2 } from 'lucide-react';
import clsx from 'clsx';

function AddRackModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [selectedDC, setSelectedDC] = useState<number | ''>('');
  const [selectedRoom, setSelectedRoom] = useState<number | ''>('');
  const [selectedRow, setSelectedRow] = useState<number | ''>('');
  const [form, setForm] = useState({
    name: '', u_height: 42, status: 'active', max_power_kw: 20, width: 0.9144, depth: 0.6096,
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
  const { data: rowsData } = useQuery({
    queryKey: ['rows', selectedRoom],
    queryFn: () => rowApi.list({ room: selectedRoom }),
    enabled: !!selectedRoom,
  });

  const mutation = useMutation({
    mutationFn: async () => {
      let rowId: number | '' = selectedRow;
      if (!rowId && selectedRoom) {
        const row = await rowApi.create({
          room: selectedRoom, name: 'Row-A',
          position_x: 1, position_y: 1, orientation: 'horizontal',
        }) as { id: number };
        rowId = row.id;
      }
      return rackApi.create({ ...form, row: rowId, position_x: 0, position_y: 0 });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['racks'] }); onClose(); },
  });

  const dcList = (dcs as DataCenter[]) || [];
  const roomList = (roomsData?.results as Room[]) || [];
  const rowList = (rowsData?.results as Row[]) || [];
  const f = (k: string, v: string | number) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <div className="modal-header">
          <h2 className="modal-title">Add Rack</h2>
          <button onClick={onClose} className="modal-close-btn"><X className="w-4 h-4" /></button>
        </div>
        <div className="modal-body">
          <div>
            <label className="field-label">Data Center *</label>
            <select className="field-input"
              value={selectedDC}
              onChange={e => { setSelectedDC(Number(e.target.value)); setSelectedRoom(''); setSelectedRow(''); }}>
              <option value="">Select Data Center</option>
              {dcList.map(dc => <option key={dc.id} value={dc.id}>{dc.name}</option>)}
            </select>
          </div>
          <div>
            <label className="field-label">Room *</label>
            <select className="field-input"
              value={selectedRoom}
              onChange={e => { setSelectedRoom(Number(e.target.value)); setSelectedRow(''); }}
              disabled={!selectedDC}>
              <option value="">Select Room</option>
              {roomList.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <div>
            <label className="field-label">Row (auto-creates Row-A if none)</label>
            <select className="field-input"
              value={selectedRow}
              onChange={e => setSelectedRow(Number(e.target.value))}
              disabled={!selectedRoom}>
              <option value="">Auto (Row-A)</option>
              {rowList.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <div>
            <label className="field-label">Rack Name *</label>
            <input className="field-input"
              value={form.name} onChange={e => f('name', e.target.value)} placeholder="e.g. R01" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="field-label">U Height</label>
              <input type="number" className="field-input"
                value={form.u_height} onChange={e => f('u_height', Number(e.target.value))} min={1} />
            </div>
            <div>
              <label className="field-label">Status</label>
              <select className="field-input"
                value={form.status} onChange={e => f('status', e.target.value)}>
                {['active', 'planned', 'reserved', 'decommissioned'].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="field-label">Max Power (kW)</label>
              <input type="number" className="field-input"
                value={form.max_power_kw} onChange={e => f('max_power_kw', Number(e.target.value))} min={0} />
            </div>
            <div>
              <label className="field-label">Width (m)</label>
              <input type="number" step="0.1" className="field-input"
                value={form.width} onChange={e => f('width', Number(e.target.value))} min={0.1} />
            </div>
          </div>
          {mutation.isError && (
            <div className="modal-error">Failed to create rack.</div>
          )}
        </div>
        <div className="modal-footer">
          <button onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
          <button
            className="btn-primary flex-1 justify-center disabled:opacity-50"
            disabled={!form.name || !selectedRoom || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? 'Creating…' : 'Create Rack'}
          </button>
        </div>
      </div>
    </div>
  );
}

function EditRackModal({ rack, onClose }: { rack: Rack; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: rack.name,
    u_height: rack.u_height,
    status: rack.status,
    max_power_kw: rack.max_power_kw,
  });

  const mutation = useMutation({
    mutationFn: () => rackApi.update(rack.id, form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['racks'] }); onClose(); },
  });

  const f = (k: string, v: string | number) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="modal-overlay">
      <div className="bg-white rounded-xl w-full max-w-sm shadow-2xl border border-gray-200">
        <div className="modal-header">
          <h2 className="modal-title">Edit Rack</h2>
          <button onClick={onClose} className="modal-close-btn"><X className="w-4 h-4" /></button>
        </div>
        <div className="modal-body">
          <div>
            <label className="field-label">Name *</label>
            <input className="field-input"
              value={form.name} onChange={e => f('name', e.target.value)} />
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
              {['active', 'planned', 'reserved', 'decommissioned'].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          {mutation.isError && (
            <div className="modal-error">Failed to update rack.</div>
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

export default function RacksPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedRack, setSelectedRack] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingRack, setEditingRack] = useState<Rack | null>(null);

  const { data } = useQuery({
    queryKey: ['racks', search, statusFilter],
    queryFn: () => rackApi.list({ search: search || undefined, status: statusFilter || undefined }),
  });

  const racks: Rack[] = (data?.results as Rack[]) || [];

  const deleteMutation = useMutation({
    mutationFn: (id: number) => rackApi.delete(id),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ['racks'] });
      if (selectedRack === id) setSelectedRack(null);
    },
  });

  const handleDelete = (rack: Rack) => {
    if (confirm(`Delete rack "${rack.name}"? This will also remove all devices in it.`)) {
      deleteMutation.mutate(rack.id);
    }
  };

  return (
    <div>
      {showAddModal && <AddRackModal onClose={() => setShowAddModal(false)} />}
      {editingRack && <EditRackModal rack={editingRack} onClose={() => setEditingRack(null)} />}

      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Layers className="w-6 h-6 text-primary-400" />
            Rack Management
          </h1>
          <p className="page-subtitle">{data?.count || 0} racks</p>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={() => setShowAddModal(true)}>
          <Plus className="w-4 h-4" />
          Add Rack
        </button>
      </div>

      <div className="flex gap-4 min-h-[600px]">
        {/* Rack list */}
        <div className={clsx('flex flex-col gap-3', selectedRack ? 'w-80 flex-shrink-0' : 'flex-1')}>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
              <input placeholder="Search racks..." value={search} onChange={e => setSearch(e.target.value)}
                className="input w-full pl-9 text-sm" />
            </div>
            <select className="select text-sm" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="">All</option>
              {['active', 'planned', 'reserved', 'decommissioned'].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Location</th>
                  <th>Height</th>
                  <th>Utilization</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {racks.map((rack: Rack) => (
                  <tr key={rack.id}
                    className={clsx('cursor-pointer', selectedRack === rack.id && 'bg-primary-900/20')}
                    onClick={() => setSelectedRack(rack.id === selectedRack ? null : rack.id)}
                  >
                    <td>
                      <div className="font-medium text-dark-200">{rack.name}</div>
                      {rack.manufacturer && <div className="text-xs text-dark-500">{rack.manufacturer} {rack.model}</div>}
                    </td>
                    <td>
                      <div className="text-xs text-dark-400">{rack.datacenter_name}</div>
                      <div className="text-xs text-dark-500">{rack.room_name} / {rack.row_name}</div>
                    </td>
                    <td className="text-dark-400 text-sm">{rack.u_height}U</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-dark-800 rounded-full h-1.5 max-w-20">
                          <div
                            className="h-1.5 rounded-full"
                            style={{
                              width: `${Math.min(rack.utilization_percent || 0, 100)}%`,
                              backgroundColor: (rack.utilization_percent || 0) > 90 ? '#ef4444' :
                                (rack.utilization_percent || 0) > 70 ? '#f59e0b' : '#10b981',
                            }}
                          />
                        </div>
                        <span className="text-xs text-dark-400">{rack.utilization_percent || 0}%</span>
                      </div>
                    </td>
                    <td><span className={`badge badge-${rack.status}`}>{rack.status}</span></td>
                    <td onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setEditingRack(rack)}
                          className="p-1 rounded hover:bg-dark-700 text-dark-500 hover:text-dark-200"
                          title="Edit"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(rack)}
                          className="p-1 rounded hover:bg-red-900/30 text-dark-500 hover:text-red-400"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Rack elevation */}
        {selectedRack && (
          <div className="flex-1 min-h-0">
            <RackElevation rackId={selectedRack} onClose={() => setSelectedRack(null)} />
          </div>
        )}
      </div>
    </div>
  );
}
