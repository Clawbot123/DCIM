import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cableApi } from '../api';
import { Cable, Plus, Search, X, RefreshCw, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';

const CABLE_TYPES = ['cat5e', 'cat6', 'cat6a', 'cat8', 'mmf', 'smf', 'dac', 'power-c13-c14', 'power-c19-c20', 'console'];

const CABLE_COLORS: Record<string, string> = {
  cat5e: '#6b7280', cat6: '#3b82f6', cat6a: '#8b5cf6', cat8: '#06b6d4',
  mmf: '#f59e0b', smf: '#10b981', dac: '#ef4444',
  'power-c13-c14': '#d97706', 'power-c19-c20': '#b45309', console: '#64748b',
};

const sel = 'w-full border border-gray-300 rounded px-3 py-1.5 text-sm text-gray-800 bg-white';
const inp = 'w-full border border-gray-300 rounded px-3 py-1.5 text-sm text-gray-800 bg-white';

interface CableForm {
  label: string;
  cable_type: string;
  status: string;
  length: number | '';
  termination_a_type: string;
  termination_a_id: number | '';
  termination_b_type: string;
  termination_b_id: number | '';
  color: string;
}

function CableModal({ onClose, editing }: { onClose: () => void; editing?: any }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<CableForm>({
    label: editing?.label ?? '',
    cable_type: editing?.cable_type ?? 'cat6',
    status: editing?.status ?? 'connected',
    length: editing?.length ?? '',
    termination_a_type: editing?.termination_a_type ?? 'interface',
    termination_a_id: editing?.termination_a_id ?? '',
    termination_b_type: editing?.termination_b_type ?? 'interface',
    termination_b_id: editing?.termination_b_id ?? '',
    color: editing?.color ?? '',
  });

  const f = (k: string, v: string | number | '') => setForm(p => ({ ...p, [k]: v }));

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        label: form.label || undefined,
        cable_type: form.cable_type,
        status: form.status,
        length: form.length || undefined,
        termination_a_type: form.termination_a_type,
        termination_a_id: form.termination_a_id || undefined,
        termination_b_type: form.termination_b_type,
        termination_b_id: form.termination_b_id || undefined,
        color: form.color || CABLE_COLORS[form.cable_type] || undefined,
      };
      return editing ? cableApi.update(editing.id, payload) : cableApi.create(payload);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cables'] }); onClose(); },
  });

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md shadow-2xl border border-gray-200 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-sm font-bold text-gray-800">{editing ? 'Edit Cable' : 'Add Cable'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-3 overflow-y-auto flex-1">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Label</label>
              <input className={inp} value={form.label} onChange={e => f('label', e.target.value)} placeholder="e.g. CAB-001" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Type *</label>
              <select className={sel} value={form.cable_type} onChange={e => f('cable_type', e.target.value)}>
                {CABLE_TYPES.map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Status</label>
              <select className={sel} value={form.status} onChange={e => f('status', e.target.value)}>
                {['connected', 'planned', 'decommissioning'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Length (m)</label>
              <input type="number" min={0} step={0.1} className={inp}
                value={form.length} onChange={e => f('length', e.target.value ? Number(e.target.value) : '')} placeholder="e.g. 2.5" />
            </div>
          </div>
          <div className="pt-1 border-t border-gray-100">
            <div className="text-xs text-gray-400 mb-2 font-medium uppercase tracking-wide">Side A</div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Type</label>
                <select className={sel} value={form.termination_a_type} onChange={e => f('termination_a_type', e.target.value)}>
                  {['interface', 'power-outlet', 'console-port', 'front-port', 'rear-port'].map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">ID</label>
                <input type="number" min={1} className={inp}
                  value={form.termination_a_id}
                  onChange={e => f('termination_a_id', e.target.value ? Number(e.target.value) : '')} placeholder="e.g. 1" />
              </div>
            </div>
          </div>
          <div className="pt-1 border-t border-gray-100">
            <div className="text-xs text-gray-400 mb-2 font-medium uppercase tracking-wide">Side B</div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Type</label>
                <select className={sel} value={form.termination_b_type} onChange={e => f('termination_b_type', e.target.value)}>
                  {['interface', 'power-outlet', 'console-port', 'front-port', 'rear-port'].map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">ID</label>
                <input type="number" min={1} className={inp}
                  value={form.termination_b_id}
                  onChange={e => f('termination_b_id', e.target.value ? Number(e.target.value) : '')} placeholder="e.g. 2" />
              </div>
            </div>
          </div>
          {mutation.isError && (
            <div className="text-xs text-red-600 bg-red-50 rounded px-3 py-2">Failed to save cable.</div>
          )}
        </div>
        <div className="flex gap-2 px-5 pb-5 pt-3 border-t border-gray-100 flex-shrink-0">
          <button onClick={onClose} className="flex-1 border border-gray-300 rounded py-1.5 text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
          <button
            className="flex-1 bg-[#1e293b] text-white rounded py-1.5 text-sm hover:bg-[#334155] disabled:opacity-50"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? 'Saving…' : editing ? 'Save Changes' : 'Create Cable'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CablesPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingCable, setEditingCable] = useState<any>(null);

  const { data, refetch } = useQuery({
    queryKey: ['cables', search, typeFilter],
    queryFn: () => cableApi.list({ search: search || undefined, cable_type: typeFilter || undefined }),
  });

  const cables = data?.results || [];

  const deleteMutation = useMutation({
    mutationFn: (id: number) => cableApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cables'] }),
  });

  return (
    <div>
      {(showModal || editingCable) && (
        <CableModal
          editing={editingCable ?? undefined}
          onClose={() => { setShowModal(false); setEditingCable(null); }}
        />
      )}

      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Cable className="w-6 h-6 text-emerald-400" />
            Cable Management
          </h1>
          <p className="page-subtitle">{data?.count || 0} cables tracked</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => refetch()} className="btn-secondary flex items-center gap-2">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          <button className="btn-primary flex items-center gap-2" onClick={() => setShowModal(true)}>
            <Plus className="w-4 h-4" /> Add Cable
          </button>
        </div>
      </div>

      <div className="flex gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
          <input placeholder="Search cables..." value={search} onChange={e => setSearch(e.target.value)}
            className="input w-full pl-9 text-sm" />
        </div>
        <select className="select text-sm" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
          <option value="">All Types</option>
          {CABLE_TYPES.map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
        </select>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Label</th><th>Type</th><th>From</th><th>To</th><th>Length</th><th>Status</th><th></th>
            </tr>
          </thead>
          <tbody>
            {cables.map((cable: any) => (
              <tr key={cable.id}>
                <td>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cable.color || CABLE_COLORS[cable.cable_type] || '#6b7280' }} />
                    <span className="font-medium text-dark-200">{cable.label || `Cable #${cable.id}`}</span>
                  </div>
                </td>
                <td><span className="text-xs font-mono bg-dark-800 px-2 py-0.5 rounded">{cable.cable_type.toUpperCase()}</span></td>
                <td className="text-dark-400 text-xs">{cable.termination_a_type_name} #{cable.termination_a_id}</td>
                <td className="text-dark-400 text-xs">{cable.termination_b_type_name} #{cable.termination_b_id}</td>
                <td className="text-dark-400">{cable.length ? `${cable.length}m` : '—'}</td>
                <td><span className={`badge badge-${cable.status}`}>{cable.status}</span></td>
                <td>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setEditingCable(cable)} className="p-1 rounded hover:bg-dark-700 text-dark-500 hover:text-dark-200" title="Edit">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => { if (confirm(`Delete cable "${cable.label || `#${cable.id}`}"?`)) deleteMutation.mutate(cable.id); }}
                      className="p-1 rounded hover:bg-red-900/30 text-dark-500 hover:text-red-400" title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {cables.length === 0 && (
              <tr><td colSpan={7} className="text-center py-12 text-dark-500">No cables found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
