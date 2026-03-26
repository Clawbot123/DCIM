import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { deviceTypeApi, manufacturerApi } from '../api';
import type { DeviceType, Manufacturer } from '../types';
import { Cpu, Plus, Search, RefreshCw, X, Pencil } from 'lucide-react';

const ROLE_LABELS: Record<string, string> = {
  server: 'Server', switch: 'Switch', router: 'Router', firewall: 'Firewall',
  pdu: 'PDU', ups: 'UPS', storage: 'Storage', patch_panel: 'Patch Panel', other: 'Other',
};

const AIRFLOW_LABELS: Record<string, string> = {
  front_to_rear: 'Front → Rear', rear_to_front: 'Rear → Front',
  left_to_right: 'Left → Right', right_to_left: 'Right → Left',
  side_to_rear: 'Side → Rear', passive: 'Passive',
};

type FormState = {
  manufacturer: number | '';
  model: string;
  device_role: string;
  u_height: number;
  is_full_depth: boolean;
  width_mm: number;
  depth_mm: number;
  power_draw_w: number;
  max_power_draw_w: number;
  weight_kg: number;
  color: string;
  airflow: string;
};

const EMPTY_FORM: FormState = {
  manufacturer: '', model: '', device_role: 'server',
  u_height: 1, is_full_depth: true,
  width_mm: 482, depth_mm: 700,
  power_draw_w: 0, max_power_draw_w: 0, weight_kg: 0,
  color: '#6366f1', airflow: 'front_to_rear',
};

function dtToForm(dt: DeviceType): FormState {
  return {
    manufacturer: dt.manufacturer,
    model: dt.model,
    device_role: dt.device_role,
    u_height: dt.u_height,
    is_full_depth: dt.is_full_depth,
    width_mm: dt.width_mm,
    depth_mm: dt.depth_mm,
    power_draw_w: dt.power_draw_w,
    max_power_draw_w: dt.max_power_draw_w,
    weight_kg: dt.weight_kg,
    color: dt.color || '#6366f1',
    airflow: dt.airflow || 'front_to_rear',
  };
}

function DeviceTypeFormFields({
  form, setForm, mfrList,
}: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  mfrList: Manufacturer[];
}) {
  const f = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Manufacturer *</label>
          <select className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm text-gray-800 bg-white"
            value={form.manufacturer} onChange={e => f('manufacturer', Number(e.target.value))}>
            <option value="">Select Manufacturer</option>
            {mfrList.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Model *</label>
          <input className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm text-gray-800 bg-white"
            value={form.model} onChange={e => f('model', e.target.value)} placeholder="e.g. PowerEdge R750" />
        </div>
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Role *</label>
        <select className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm text-gray-800 bg-white"
          value={form.device_role} onChange={e => f('device_role', e.target.value)}>
          {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      <div className="pt-1 border-t border-gray-100">
        <div className="text-xs text-gray-400 mb-2 font-medium uppercase tracking-wide">Physical Dimensions</div>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Height (U) *</label>
            <input type="number" min={1} max={42} className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm text-gray-800 bg-white"
              value={form.u_height} onChange={e => f('u_height', Number(e.target.value))} />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Width (mm)</label>
            <input type="number" min={0} className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm text-gray-800 bg-white"
              value={form.width_mm} onChange={e => f('width_mm', Number(e.target.value))} />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Depth (mm)</label>
            <input type="number" min={0} className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm text-gray-800 bg-white"
              value={form.depth_mm} onChange={e => f('depth_mm', Number(e.target.value))} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 mt-2">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Weight (kg)</label>
            <input type="number" min={0} step={0.1} className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm text-gray-800 bg-white"
              value={form.weight_kg} onChange={e => f('weight_kg', Number(e.target.value))} />
          </div>
          <div className="flex items-end pb-1.5">
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input type="checkbox" checked={form.is_full_depth}
                onChange={e => f('is_full_depth', e.target.checked)}
                className="rounded border-gray-300" />
              Full Depth
            </label>
          </div>
        </div>
      </div>

      <div className="pt-1 border-t border-gray-100">
        <div className="text-xs text-gray-400 mb-2 font-medium uppercase tracking-wide">Power</div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Power Draw (W)</label>
            <input type="number" min={0} className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm text-gray-800 bg-white"
              value={form.power_draw_w} onChange={e => f('power_draw_w', Number(e.target.value))} />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Max Power Draw (W)</label>
            <input type="number" min={0} className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm text-gray-800 bg-white"
              value={form.max_power_draw_w} onChange={e => f('max_power_draw_w', Number(e.target.value))} />
          </div>
        </div>
      </div>

      <div className="pt-1 border-t border-gray-100">
        <div className="text-xs text-gray-400 mb-2 font-medium uppercase tracking-wide">Appearance & Airflow</div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Airflow</label>
            <select className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm text-gray-800 bg-white"
              value={form.airflow} onChange={e => f('airflow', e.target.value)}>
              {Object.entries(AIRFLOW_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Color</label>
            <div className="flex items-center gap-2">
              <input type="color" className="h-8 w-10 rounded border border-gray-300 cursor-pointer p-0.5"
                value={form.color} onChange={e => f('color', e.target.value)} />
              <span className="text-xs text-gray-500 font-mono">{form.color}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DeviceTypeModal({
  editDt, onClose,
}: {
  editDt: DeviceType | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState<FormState>(editDt ? dtToForm(editDt) : EMPTY_FORM);

  const { data: manufacturers } = useQuery({
    queryKey: ['manufacturers-all'],
    queryFn: () => manufacturerApi.listAll(),
  });

  const saveMutation = useMutation({
    mutationFn: () => editDt
      ? deviceTypeApi.update(editDt.id, form)
      : deviceTypeApi.create(form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['device-types'] }); qc.invalidateQueries({ queryKey: ['device-types-all'] }); onClose(); },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deviceTypeApi.delete(editDt!.id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['device-types'] }); qc.invalidateQueries({ queryKey: ['device-types-all'] }); onClose(); },
  });

  const mfrList = (manufacturers as Manufacturer[]) || [];
  const isValid = !!form.manufacturer && !!form.model;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl border border-gray-200 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-sm font-bold text-gray-800">
            {editDt ? `Edit — ${editDt.manufacturer_name} ${editDt.model}` : 'Add Device Type'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 overflow-y-auto flex-1">
          <DeviceTypeFormFields form={form} setForm={setForm} mfrList={mfrList} />
          {saveMutation.isError && (
            <div className="text-xs text-red-600 bg-red-50 rounded px-3 py-2 mt-3">Failed to save device type.</div>
          )}
        </div>
        <div className="flex gap-2 px-5 pb-5 pt-3 border-t border-gray-100 flex-shrink-0">
          {editDt && (
            <button
              className="px-3 border border-red-300 text-red-500 rounded py-1.5 text-sm hover:bg-red-50 disabled:opacity-50"
              disabled={deleteMutation.isPending}
              onClick={() => { if (confirm(`Delete "${editDt.model}"?`)) deleteMutation.mutate(); }}
            >
              Delete
            </button>
          )}
          <button onClick={onClose} className="flex-1 border border-gray-300 rounded py-1.5 text-sm hover:bg-gray-50">Cancel</button>
          <button
            className="flex-1 bg-[#1e293b] text-white rounded py-1.5 text-sm hover:bg-[#334155] disabled:opacity-50"
            disabled={!isValid || saveMutation.isPending}
            onClick={() => saveMutation.mutate()}
          >
            {saveMutation.isPending ? 'Saving…' : editDt ? 'Save Changes' : 'Create Type'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DeviceTypesPage() {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editDt, setEditDt] = useState<DeviceType | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['device-types', search, roleFilter],
    queryFn: () => deviceTypeApi.list({ search: search || undefined, device_role: roleFilter || undefined }),
  });

  const deviceTypes = (data?.results ?? data ?? []) as DeviceType[];

  return (
    <div>
      {(showModal || editDt) && (
        <DeviceTypeModal
          editDt={editDt}
          onClose={() => { setShowModal(false); setEditDt(null); }}
        />
      )}

      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Cpu className="w-6 h-6 text-primary-400" />
            Device Types
          </h1>
          <p className="page-subtitle">Manage hardware models and their physical dimensions</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => refetch()} className="btn-secondary flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button className="btn-primary flex items-center gap-2" onClick={() => setShowModal(true)}>
            <Plus className="w-4 h-4" />
            Add Device Type
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
          <input
            type="text"
            placeholder="Search models..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input w-full pl-9"
          />
        </div>
        <select className="select" value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
          <option value="">All Roles</option>
          {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Manufacturer / Model</th>
              <th>Role</th>
              <th>Height</th>
              <th>Width (mm)</th>
              <th>Depth (mm)</th>
              <th>Weight (kg)</th>
              <th>Power Draw (W)</th>
              <th>Airflow</th>
              <th>Devices</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={10} className="text-center py-12 text-dark-500">Loading...</td></tr>
            ) : deviceTypes.length === 0 ? (
              <tr><td colSpan={10} className="text-center py-12 text-dark-500">No device types found</td></tr>
            ) : deviceTypes.map((dt: DeviceType) => (
              <tr key={dt.id}>
                <td>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: dt.color || '#6366f1' }} />
                    <div>
                      <div className="font-medium text-dark-200">{dt.model}</div>
                      <div className="text-xs text-dark-500">{dt.manufacturer_name}</div>
                    </div>
                  </div>
                </td>
                <td><span className="text-dark-300 text-sm">{ROLE_LABELS[dt.device_role] ?? dt.device_role}</span></td>
                <td><span className="font-mono text-sm text-dark-300">{dt.u_height}U</span></td>
                <td><span className="font-mono text-sm text-dark-400">{dt.width_mm}</span></td>
                <td><span className="font-mono text-sm text-dark-400">{dt.depth_mm}</span></td>
                <td><span className="font-mono text-sm text-dark-400">{dt.weight_kg}</span></td>
                <td><span className="font-mono text-sm text-dark-400">{dt.power_draw_w}</span></td>
                <td><span className="text-xs text-dark-500">{AIRFLOW_LABELS[dt.airflow] ?? dt.airflow ?? '—'}</span></td>
                <td><span className="text-dark-400 text-sm">{dt.device_count ?? 0}</span></td>
                <td>
                  <button
                    className="text-xs text-primary-400 hover:text-primary-300 transition-colors flex items-center gap-1"
                    onClick={() => setEditDt(dt)}
                  >
                    <Pencil className="w-3 h-3" /> Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
