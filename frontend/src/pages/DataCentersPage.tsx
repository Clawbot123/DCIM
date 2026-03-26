import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dataCenterApi } from '../api';
import type { DataCenter } from '../types/index';
import { Database, Plus, MapPin, Zap, Wind, X, Pencil, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';

function DCModal({ onClose, editing }: { onClose: () => void; editing?: DataCenter }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: editing?.name ?? '',
    code: editing?.code ?? '',
    city: editing?.city ?? '',
    country: editing?.country ?? '',
    address: editing?.address ?? '',
    total_power_kw: editing?.total_power_kw ?? 0,
    pue: editing?.pue ?? 1.5,
  });

  const mutation = useMutation({
    mutationFn: () =>
      editing ? dataCenterApi.update(editing.id, form) : dataCenterApi.create(form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['datacenters'] }); onClose(); },
  });

  const f = (k: string, v: string | number) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <div className="modal-header">
          <h2 className="modal-title">{editing ? 'Edit Data Center' : 'Add Data Center'}</h2>
          <button onClick={onClose} className="modal-close-btn"><X className="w-4 h-4" /></button>
        </div>
        <div className="modal-body">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="field-label">Name *</label>
              <input className="field-input" value={form.name} onChange={e => f('name', e.target.value)} placeholder="e.g. Primary DC" />
            </div>
            <div>
              <label className="field-label">Code *</label>
              <input className="field-input" value={form.code} onChange={e => f('code', e.target.value.toUpperCase())} placeholder="e.g. DC1" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="field-label">City</label>
              <input className="field-input" value={form.city} onChange={e => f('city', e.target.value)} />
            </div>
            <div>
              <label className="field-label">Country</label>
              <input className="field-input" value={form.country} onChange={e => f('country', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="field-label">Address</label>
            <input className="field-input" value={form.address} onChange={e => f('address', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="field-label">Total Power (kW)</label>
              <input type="number" className="field-input" value={form.total_power_kw} onChange={e => f('total_power_kw', Number(e.target.value))} min={0} />
            </div>
            <div>
              <label className="field-label">PUE</label>
              <input type="number" step="0.01" className="field-input" value={form.pue} onChange={e => f('pue', Number(e.target.value))} min={1} max={3} />
            </div>
          </div>
          {mutation.isError && <div className="modal-error">Failed to save. Check required fields.</div>}
        </div>
        <div className="modal-footer">
          <button onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
          <button
            className="btn-primary flex-1 justify-center"
            disabled={!form.name || !form.code || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? 'Saving…' : editing ? 'Save Changes' : 'Create Data Center'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DataCentersPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingDC, setEditingDC] = useState<DataCenter | null>(null);

  const { data } = useQuery({
    queryKey: ['datacenters'],
    queryFn: () => dataCenterApi.listAll(),
  });

  const dcs: DataCenter[] = (data as DataCenter[]) || [];

  const deleteMutation = useMutation({
    mutationFn: (id: number) => dataCenterApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['datacenters'] }),
  });

  const handleDelete = (dc: DataCenter) => {
    if (confirm(`Delete "${dc.name}"? This cannot be undone.`)) {
      deleteMutation.mutate(dc.id);
    }
  };

  return (
    <div>
      {(showModal || editingDC) && (
        <DCModal editing={editingDC ?? undefined} onClose={() => { setShowModal(false); setEditingDC(null); }} />
      )}

      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Database className="w-6 h-6 text-primary-400" />
            Data Centers
          </h1>
          <p className="page-subtitle">{dcs.length} data center{dcs.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="btn-primary gap-2" onClick={() => setShowModal(true)}>
          <Plus className="w-4 h-4" /> Add Data Center
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {dcs.map((dc) => (
          <div
            key={dc.id}
            className="card transition-all hover:shadow-xl group cursor-pointer"
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--bg-hover)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono bg-primary-900/50 text-primary-400 border border-primary-800/50 px-2 py-0.5 rounded">
                    {dc.code}
                  </span>
                </div>
                <h3 className="text-lg font-bold mt-1" style={{ color: 'var(--text-primary)' }}>{dc.name}</h3>
                {dc.city && (
                  <div className="flex items-center gap-1 text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                    <MapPin className="w-3 h-3" />
                    {dc.city}{dc.country ? `, ${dc.country}` : ''}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1">
                <div className="text-xs bg-emerald-900/50 text-emerald-400 border border-emerald-800/50 px-2 py-1 rounded">
                  Active
                </div>
                <button
                  onClick={e => { e.stopPropagation(); setEditingDC(dc); }}
                  className="p-1.5 rounded transition-colors hover:opacity-80"
                  style={{ color: 'var(--text-muted)' }}
                  title="Edit"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={e => { e.stopPropagation(); handleDelete(dc); }}
                  className="p-1.5 rounded transition-colors text-red-400 hover:opacity-80"
                  title="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-4">
              {[
                { label: 'Rooms', value: dc.rooms_count || 0, color: 'var(--text-primary)' },
                { label: 'Racks', value: dc.total_racks || 0, color: 'var(--text-primary)' },
                { label: 'PUE', value: dc.pue, color: '#f59e0b' },
              ].map(({ label, value, color }) => (
                <div
                  key={label}
                  className="rounded-lg p-3 text-center"
                  style={{ backgroundColor: 'var(--bg-elevated)' }}
                >
                  <div className="text-xl font-bold" style={{ color }}>{value}</div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{label}</div>
                </div>
              ))}
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>Power</span>
                </div>
                <span style={{ color: 'var(--text-primary)' }}>{dc.total_power_kw} kW</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                  <Wind className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Cooling</span>
                </div>
                <span style={{ color: 'var(--text-primary)' }}>{dc.total_cooling_tons} tons</span>
              </div>
            </div>

            <div className="mt-4 pt-4 flex items-center gap-2" style={{ borderTop: '1px solid var(--border)' }}>
              <Link to="/floor-plan" className="btn-secondary text-xs py-1.5 flex-1 justify-center">
                Floor Plan
              </Link>
              <Link to="/racks" className="btn-primary text-xs py-1.5 flex-1 justify-center">Manage</Link>
            </div>
          </div>
        ))}

        {/* Add new DC card */}
        <div
          className="card border-dashed transition-colors cursor-pointer flex flex-col items-center justify-center min-h-48 hover:opacity-80"
          style={{ color: 'var(--text-muted)' }}
          onClick={() => setShowModal(true)}
          onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--text-muted)')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
        >
          <Plus className="w-8 h-8 mb-2" />
          <span className="text-sm">Add Data Center</span>
        </div>
      </div>
    </div>
  );
}
