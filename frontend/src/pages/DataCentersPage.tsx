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
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md shadow-2xl border border-gray-200">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
          <h2 className="text-sm font-bold text-gray-800">{editing ? 'Edit Data Center' : 'Add Data Center'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Name *</label>
              <input className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm text-gray-800 bg-white"
                value={form.name} onChange={e => f('name', e.target.value)} placeholder="e.g. Primary DC" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Code *</label>
              <input className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm text-gray-800 bg-white"
                value={form.code} onChange={e => f('code', e.target.value.toUpperCase())} placeholder="e.g. DC1" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-500 mb-1">City</label>
              <input className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm text-gray-800 bg-white"
                value={form.city} onChange={e => f('city', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Country</label>
              <input className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm text-gray-800 bg-white"
                value={form.country} onChange={e => f('country', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Address</label>
            <input className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm text-gray-800 bg-white"
              value={form.address} onChange={e => f('address', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Total Power (kW)</label>
              <input type="number" className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm text-gray-800 bg-white"
                value={form.total_power_kw} onChange={e => f('total_power_kw', Number(e.target.value))} min={0} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">PUE</label>
              <input type="number" step="0.01" className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm text-gray-800 bg-white"
                value={form.pue} onChange={e => f('pue', Number(e.target.value))} min={1} max={3} />
            </div>
          </div>
          {mutation.isError && (
            <div className="text-xs text-red-600 bg-red-50 rounded px-3 py-2">Failed to save. Check required fields.</div>
          )}
        </div>
        <div className="flex gap-2 px-5 pb-5">
          <button onClick={onClose} className="flex-1 border border-gray-300 rounded py-1.5 text-sm hover:bg-gray-50">Cancel</button>
          <button
            className="flex-1 bg-[#1e293b] text-white rounded py-1.5 text-sm hover:bg-[#334155] disabled:opacity-50"
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
        <DCModal
          editing={editingDC ?? undefined}
          onClose={() => { setShowModal(false); setEditingDC(null); }}
        />
      )}

      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Database className="w-6 h-6 text-primary-400" />
            Data Centers
          </h1>
          <p className="page-subtitle">{dcs.length} data center{dcs.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={() => setShowModal(true)}>
          <Plus className="w-4 h-4" /> Add Data Center
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {dcs.map((dc) => (
          <div key={dc.id} className="card hover:border-dark-600 transition-all hover:shadow-xl group cursor-pointer">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono bg-primary-900/50 text-primary-400 border border-primary-800/50 px-2 py-0.5 rounded">
                    {dc.code}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-dark-100 mt-1">{dc.name}</h3>
                {dc.city && (
                  <div className="flex items-center gap-1 text-xs text-dark-500 mt-1">
                    <MapPin className="w-3 h-3" />
                    {dc.city}, {dc.country}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1">
                <div className="text-xs bg-emerald-900/50 text-emerald-400 border border-emerald-800/50 px-2 py-1 rounded">
                  Active
                </div>
                <button
                  onClick={e => { e.stopPropagation(); setEditingDC(dc); }}
                  className="p-1.5 rounded hover:bg-dark-700 text-dark-500 hover:text-dark-200 transition-colors"
                  title="Edit"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={e => { e.stopPropagation(); handleDelete(dc); }}
                  className="p-1.5 rounded hover:bg-red-900/30 text-dark-500 hover:text-red-400 transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-dark-800/50 rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-dark-100">{dc.rooms_count || 0}</div>
                <div className="text-xs text-dark-500 mt-0.5">Rooms</div>
              </div>
              <div className="bg-dark-800/50 rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-dark-100">{dc.total_racks || 0}</div>
                <div className="text-xs text-dark-500 mt-0.5">Racks</div>
              </div>
              <div className="bg-dark-800/50 rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-amber-400">{dc.pue}</div>
                <div className="text-xs text-dark-500 mt-0.5">PUE</div>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-dark-400">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>Power</span>
                </div>
                <span className="text-dark-300">{dc.total_power_kw} kW</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-dark-400">
                  <Wind className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Cooling</span>
                </div>
                <span className="text-dark-300">{dc.total_cooling_tons} tons</span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-dark-800 flex items-center gap-2">
              <Link to="/floor-plan" className="btn-secondary text-xs py-1.5 flex-1 text-center">
                Floor Plan
              </Link>
              <Link to="/racks" className="btn-primary text-xs py-1.5 flex-1 text-center">Manage</Link>
            </div>
          </div>
        ))}

        {/* Add new DC card */}
        <div
          className="card border-dashed hover:border-dark-500 transition-colors cursor-pointer flex flex-col items-center justify-center min-h-48 text-dark-600 hover:text-dark-400"
          onClick={() => setShowModal(true)}
        >
          <Plus className="w-8 h-8 mb-2" />
          <span className="text-sm">Add Data Center</span>
        </div>
      </div>
    </div>
  );
}
