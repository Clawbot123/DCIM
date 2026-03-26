import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { powerPanelApi, powerFeedApi, dataCenterApi } from '../api';
import { Zap, Plus, X, Pencil, Trash2 } from 'lucide-react';
import type { DataCenter, PowerPanel, PowerFeed } from '../types/index';

// ── Panel Modal ────────────────────────────────────────────────────────────────

function PanelModal({ onClose, editing }: { onClose: () => void; editing?: PowerPanel }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: editing?.name ?? '',
    datacenter: editing?.datacenter ?? ('' as number | ''),
    location: editing?.location ?? '',
    incoming_power_kw: editing?.incoming_power_kw ?? 100,
  });

  const { data: dcs } = useQuery({
    queryKey: ['datacenters-all'],
    queryFn: () => dataCenterApi.listAll(),
  });

  const mutation = useMutation({
    mutationFn: () =>
      editing ? powerPanelApi.update(editing.id, form) : powerPanelApi.create(form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['power-panels'] }); onClose(); },
  });

  const dcList = (dcs as DataCenter[]) || [];
  const f = (k: string, v: string | number) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <div className="modal-header">
          <h2 className="modal-title">{editing ? 'Edit Power Panel' : 'Add Power Panel'}</h2>
          <button onClick={onClose} className="modal-close-btn"><X className="w-4 h-4" /></button>
        </div>
        <div className="modal-body">
          <div>
            <label className="field-label">Panel Name *</label>
            <input className="field-input"
              value={form.name} onChange={e => f('name', e.target.value)} placeholder="e.g. PP-A01" />
          </div>
          <div>
            <label className="field-label">Data Center *</label>
            <select className="field-input"
              value={form.datacenter} onChange={e => f('datacenter', Number(e.target.value))}>
              <option value="">Select Data Center</option>
              {dcList.map(dc => <option key={dc.id} value={dc.id}>{dc.name}</option>)}
            </select>
          </div>
          <div>
            <label className="field-label">Location / Description</label>
            <input className="field-input"
              value={form.location} onChange={e => f('location', e.target.value)} placeholder="e.g. Row A, west wall" />
          </div>
          <div>
            <label className="field-label">Incoming Power (kW)</label>
            <input type="number" className="field-input"
              value={form.incoming_power_kw} onChange={e => f('incoming_power_kw', Number(e.target.value))} min={0} />
          </div>
          {mutation.isError && (
            <div className="modal-error">Failed to save power panel.</div>
          )}
        </div>
        <div className="modal-footer">
          <button onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
          <button
            className="btn-primary flex-1 justify-center disabled:opacity-50"
            disabled={!form.name || !form.datacenter || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? 'Saving…' : editing ? 'Save Changes' : 'Create Panel'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Feed Modal ────────────────────────────────────────────────────────────────

function FeedModal({ onClose, editing, panels }: { onClose: () => void; editing?: PowerFeed; panels: PowerPanel[] }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: editing?.name ?? '',
    power_panel: editing?.power_panel ?? ('' as number | ''),
    status: editing?.status ?? 'active',
    supply: editing?.supply ?? 'ac',
    phase: editing?.phase ?? 'single-phase',
    voltage: editing?.voltage ?? 208,
    amperage: editing?.amperage ?? 30,
    is_redundant: editing?.is_redundant ?? false,
  });

  const mutation = useMutation({
    mutationFn: () =>
      editing ? powerFeedApi.update(editing.id, form) : powerFeedApi.create(form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['power-feeds'] }); onClose(); },
  });

  const f = (k: string, v: string | number | boolean) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <div className="modal-header">
          <h2 className="modal-title">{editing ? 'Edit Power Feed' : 'Add Power Feed'}</h2>
          <button onClick={onClose} className="modal-close-btn"><X className="w-4 h-4" /></button>
        </div>
        <div className="modal-body">
          <div>
            <label className="field-label">Feed Name *</label>
            <input className="field-input"
              value={form.name} onChange={e => f('name', e.target.value)} placeholder="e.g. Feed-A1" />
          </div>
          <div>
            <label className="field-label">Power Panel *</label>
            <select className="field-input"
              value={form.power_panel} onChange={e => f('power_panel', Number(e.target.value))}>
              <option value="">Select Panel</option>
              {panels.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="field-label">Status</label>
              <select className="field-input"
                value={form.status} onChange={e => f('status', e.target.value)}>
                {['active', 'planned', 'offline'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label">Phase</label>
              <select className="field-input"
                value={form.phase} onChange={e => f('phase', e.target.value)}>
                {['single-phase', 'three-phase'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="field-label">Voltage (V)</label>
              <input type="number" className="field-input"
                value={form.voltage} onChange={e => f('voltage', Number(e.target.value))} min={0} />
            </div>
            <div>
              <label className="field-label">Amperage (A)</label>
              <input type="number" className="field-input"
                value={form.amperage} onChange={e => f('amperage', Number(e.target.value))} min={0} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input type="checkbox" checked={form.is_redundant} onChange={e => f('is_redundant', e.target.checked)} />
            Redundant feed
          </label>
          {mutation.isError && (
            <div className="modal-error">Failed to save power feed.</div>
          )}
        </div>
        <div className="modal-footer">
          <button onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
          <button
            className="btn-primary flex-1 justify-center disabled:opacity-50"
            disabled={!form.name || !form.power_panel || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? 'Saving…' : editing ? 'Save Changes' : 'Create Feed'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PowerPage() {
  const qc = useQueryClient();
  const [modal, setModal] = useState<'panel' | 'feed' | null>(null);
  const [editingPanel, setEditingPanel] = useState<PowerPanel | null>(null);
  const [editingFeed, setEditingFeed] = useState<PowerFeed | null>(null);

  const { data: panelsData } = useQuery({ queryKey: ['power-panels'], queryFn: () => powerPanelApi.list() });
  const { data: feedsData } = useQuery({ queryKey: ['power-feeds'], queryFn: () => powerFeedApi.list() });

  const panels: PowerPanel[] = (panelsData?.results as PowerPanel[]) || [];
  const feeds: PowerFeed[] = (feedsData?.results as PowerFeed[]) || [];

  const deletePanel = useMutation({
    mutationFn: (id: number) => powerPanelApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['power-panels'] }),
  });

  const deleteFeed = useMutation({
    mutationFn: (id: number) => powerFeedApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['power-feeds'] }),
  });

  const closeModal = () => { setModal(null); setEditingPanel(null); setEditingFeed(null); };

  return (
    <div>
      {(modal === 'panel' || editingPanel) && (
        <PanelModal editing={editingPanel ?? undefined} onClose={closeModal} />
      )}
      {(modal === 'feed' || editingFeed) && (
        <FeedModal editing={editingFeed ?? undefined} panels={panels} onClose={closeModal} />
      )}

      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Zap className="w-6 h-6 text-amber-400" />
            Power Management
          </h1>
          <p className="page-subtitle">Power panels, feeds, PDUs and outlet mapping</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary flex items-center gap-2" onClick={() => setModal('feed')}>
            <Plus className="w-4 h-4" /> Add Feed
          </button>
          <button className="btn-primary flex items-center gap-2" onClick={() => setModal('panel')}>
            <Plus className="w-4 h-4" /> Add Panel
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="card text-center">
          <div className="text-3xl font-bold text-amber-400">{panels.length}</div>
          <div className="text-dark-400 text-sm mt-1">Power Panels</div>
        </div>
        <div className="card text-center">
          <div className="text-3xl font-bold text-primary-400">{feeds.length}</div>
          <div className="text-dark-400 text-sm mt-1">Power Feeds</div>
        </div>
        <div className="card text-center">
          <div className="text-3xl font-bold text-emerald-400">
            {feeds.reduce((a: number, f: PowerFeed) => a + (f.capacity_kw || 0), 0).toFixed(1)}
          </div>
          <div className="text-dark-400 text-sm mt-1">Total Capacity (kW)</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Panels */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-dark-300">Power Panels</h2>
            <button onClick={() => setModal('panel')} className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1">
              <Plus className="w-3 h-3" /> Add
            </button>
          </div>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Data Center</th>
                  <th>Incoming (kW)</th>
                  <th>Feeds</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {panels.map((panel: PowerPanel) => (
                  <tr key={panel.id}>
                    <td className="font-medium text-dark-200">{panel.name}</td>
                    <td className="text-dark-400 text-xs">{panel.datacenter_name}</td>
                    <td className="text-dark-300">{panel.incoming_power_kw} kW</td>
                    <td className="text-dark-400">{panel.feeds_count}</td>
                    <td>
                      <div className="flex items-center gap-1">
                        <button onClick={() => setEditingPanel(panel)} className="p-1 rounded hover:bg-dark-700 text-dark-500 hover:text-dark-200" title="Edit">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => { if (confirm(`Delete panel "${panel.name}"?`)) deletePanel.mutate(panel.id); }}
                          className="p-1 rounded hover:bg-red-900/30 text-dark-500 hover:text-red-400" title="Delete">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {panels.length === 0 && (
                  <tr><td colSpan={5} className="text-center py-8 text-dark-500">No power panels found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Feeds */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-dark-300">Power Feeds</h2>
            <button onClick={() => setModal('feed')} className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1">
              <Plus className="w-3 h-3" /> Add
            </button>
          </div>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Panel</th>
                  <th>Voltage</th>
                  <th>Amperage</th>
                  <th>Capacity</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {feeds.map((feed: PowerFeed) => (
                  <tr key={feed.id}>
                    <td className="font-medium text-dark-200">{feed.name}</td>
                    <td className="text-dark-400 text-xs">{feed.panel_name}</td>
                    <td className="text-dark-300">{feed.voltage}V</td>
                    <td className="text-dark-300">{feed.amperage}A</td>
                    <td className="text-dark-300">{feed.capacity_kw?.toFixed(1)} kW</td>
                    <td><span className={`badge badge-${feed.status}`}>{feed.status}</span></td>
                    <td>
                      <div className="flex items-center gap-1">
                        <button onClick={() => setEditingFeed(feed)} className="p-1 rounded hover:bg-dark-700 text-dark-500 hover:text-dark-200" title="Edit">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => { if (confirm(`Delete feed "${feed.name}"?`)) deleteFeed.mutate(feed.id); }}
                          className="p-1 rounded hover:bg-red-900/30 text-dark-500 hover:text-red-400" title="Delete">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {feeds.length === 0 && (
                  <tr><td colSpan={7} className="text-center py-8 text-dark-500">No power feeds found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
