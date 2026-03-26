import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { deviceTypeApi, manufacturerApi } from '../api';
import type { DeviceType, Manufacturer } from '../types';
import { Server, Plus, Search, RefreshCw, X, Pencil } from 'lucide-react';

const ROLE_LABELS: Record<string, string> = {
  server: 'Server', switch: 'Switch', router: 'Router', firewall: 'Firewall',
  pdu: 'PDU', ups: 'UPS', storage: 'Storage', patch_panel: 'Patch Panel', other: 'Other',
};


const LIGHT_GREY = '#d1d5db';

type DtForm = {
  manufacturer: number | ''; model: string; device_role: string;
  u_height: number; is_full_depth: boolean;
  width_mm: number; depth_mm: number;
  power_draw_w: number; max_power_draw_w: number;
  weight_kg: number;
};

const EMPTY_DT: DtForm = {
  manufacturer: '', model: '', device_role: 'server',
  u_height: 1, is_full_depth: true, width_mm: 482, depth_mm: 700,
  power_draw_w: 0, max_power_draw_w: 0, weight_kg: 0,
};

function dtToForm(dt: DeviceType): DtForm {
  return {
    manufacturer: dt.manufacturer, model: dt.model, device_role: dt.device_role,
    u_height: dt.u_height, is_full_depth: dt.is_full_depth,
    width_mm: dt.width_mm, depth_mm: dt.depth_mm,
    power_draw_w: dt.power_draw_w, max_power_draw_w: dt.max_power_draw_w,
    weight_kg: dt.weight_kg,
  };
}

const sel = 'w-full border border-gray-300 rounded px-3 py-1.5 text-sm text-gray-800 bg-white';
const inp = 'w-full border border-gray-300 rounded px-3 py-1.5 text-sm text-gray-800 bg-white';

function DtFormFields({ form, setForm, mfrList }: {
  form: DtForm;
  setForm: React.Dispatch<React.SetStateAction<DtForm>>;
  mfrList: Manufacturer[];
}) {
  const f = <K extends keyof DtForm>(k: K, v: DtForm[K]) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Manufacturer *</label>
          <select className={sel} value={form.manufacturer} onChange={e => f('manufacturer', Number(e.target.value))}>
            <option value="">Select Manufacturer</option>
            {mfrList.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Model *</label>
          <input className={inp} value={form.model} onChange={e => f('model', e.target.value)} placeholder="e.g. PowerEdge R750" />
        </div>
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Role *</label>
        <select className={sel} value={form.device_role} onChange={e => f('device_role', e.target.value)}>
          {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      <div className="pt-1 border-t border-gray-100">
        <div className="text-xs text-gray-400 mb-2 font-medium uppercase tracking-wide">Physical Dimensions</div>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Height (U) *</label>
            <input type="number" min={1} max={42} className={inp}
              value={form.u_height} onChange={e => f('u_height', Number(e.target.value))} />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Width (mm)</label>
            <input type="number" min={0} className={inp}
              value={form.width_mm} onChange={e => f('width_mm', Number(e.target.value))} />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Depth (mm)</label>
            <input type="number" min={0} className={inp}
              value={form.depth_mm} onChange={e => f('depth_mm', Number(e.target.value))} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 mt-2">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Weight (kg)</label>
            <input type="number" min={0} step={0.1} className={inp}
              value={form.weight_kg} onChange={e => f('weight_kg', Number(e.target.value))} />
          </div>
          <div className="flex items-end pb-1.5">
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input type="checkbox" checked={form.is_full_depth}
                onChange={e => f('is_full_depth', e.target.checked)} className="rounded border-gray-300" />
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
            <input type="number" min={0} className={inp}
              value={form.power_draw_w} onChange={e => f('power_draw_w', Number(e.target.value))} />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Max Power Draw (W)</label>
            <input type="number" min={0} className={inp}
              value={form.max_power_draw_w} onChange={e => f('max_power_draw_w', Number(e.target.value))} />
          </div>
        </div>
      </div>

    </div>
  );
}

function DtModal({ editDt, onClose }: { editDt: DeviceType | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<DtForm>(editDt ? dtToForm(editDt) : EMPTY_DT);
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [rearFile, setRearFile] = useState<File | null>(null);
  const [frontPreview, setFrontPreview] = useState<string | null>(editDt?.front_image ?? null);
  const [rearPreview, setRearPreview] = useState<string | null>(editDt?.rear_image ?? null);
  const { data: manufacturers } = useQuery({ queryKey: ['manufacturers-all'], queryFn: () => manufacturerApi.listAll() });

  const saveMutation = useMutation({
    mutationFn: () => {
      const hasFile = frontFile || rearFile;
      if (hasFile) {
        const fd = new FormData();
        Object.entries({ ...form, color: LIGHT_GREY }).forEach(([k, v]) => fd.append(k, String(v)));
        if (frontFile) fd.append('front_image', frontFile);
        if (rearFile) fd.append('rear_image', rearFile);
        return editDt
          ? deviceTypeApi.updateForm(editDt.id, fd)
          : deviceTypeApi.createForm(fd);
      }
      return editDt
        ? deviceTypeApi.update(editDt.id, { ...form, color: LIGHT_GREY })
        : deviceTypeApi.create({ ...form, color: LIGHT_GREY });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['device-types'] });
      qc.refetchQueries({ queryKey: ['device-types'] });
      onClose();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deviceTypeApi.delete(editDt!.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['device-types'] });
      qc.refetchQueries({ queryKey: ['device-types'] });
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl border border-gray-200 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-sm font-bold text-gray-800">
            {editDt
              ? <><span>Edit — </span><span className="font-normal text-gray-500">{editDt.manufacturer_name} {editDt.model}</span></>
              : 'Add Device Type'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 overflow-y-auto flex-1">
          <DtFormFields form={form} setForm={setForm} mfrList={(manufacturers as Manufacturer[]) || []} />

          {/* Front / Rear image upload */}
          <div className="pt-3 mt-3 border-t border-gray-100">
            <div className="text-xs text-gray-400 mb-2 font-medium uppercase tracking-wide">Device Images</div>
            <div className="grid grid-cols-2 gap-3">
              {(['front', 'rear'] as const).map(side => {
                const preview = side === 'front' ? frontPreview : rearPreview;
                const setFile = side === 'front' ? setFrontFile : setRearFile;
                const setPreview = side === 'front' ? setFrontPreview : setRearPreview;
                return (
                  <div key={side}>
                    <label className="block text-xs text-gray-500 mb-1 capitalize">{side} Image</label>
                    <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 transition-colors"
                      style={{ height: 90 }}>
                      {preview ? (
                        <img src={preview} alt={side} className="max-h-full max-w-full object-contain p-1 rounded" />
                      ) : (
                        <span className="text-[10px] text-gray-400">Click to upload</span>
                      )}
                      <input type="file" accept="image/*" className="hidden"
                        onChange={e => {
                          const file = e.target.files?.[0] ?? null;
                          setFile(file);
                          if (file) setPreview(URL.createObjectURL(file));
                        }} />
                    </label>
                  </div>
                );
              })}
            </div>
          </div>

          {saveMutation.isError && <div className="text-xs text-red-600 bg-red-50 rounded px-3 py-2 mt-3">Failed to save.</div>}
        </div>
        <div className="flex gap-2 px-5 pb-5 pt-3 border-t border-gray-100 flex-shrink-0">
          {editDt && (
            <button className="px-3 border border-red-300 text-red-500 rounded py-1.5 text-sm hover:bg-red-50 disabled:opacity-50"
              disabled={deleteMutation.isPending}
              onClick={() => { if (confirm(`Delete "${editDt.model}"?`)) deleteMutation.mutate(); }}>
              Delete
            </button>
          )}
          <button onClick={onClose} className="flex-1 border border-gray-300 rounded py-1.5 text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
          <button
            className="flex-1 bg-[#1e293b] text-white rounded py-1.5 text-sm hover:bg-[#334155] disabled:opacity-50"
            disabled={!form.manufacturer || !form.model || saveMutation.isPending}
            onClick={() => saveMutation.mutate()}>
            {saveMutation.isPending ? 'Saving…' : editDt ? 'Save Changes' : 'Create Type'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AssetsPage() {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [modal, setModal] = useState<'add' | DeviceType | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['device-types', search, roleFilter],
    queryFn: () => deviceTypeApi.list({ search: search || undefined, device_role: roleFilter || undefined }),
  });

  const deviceTypes = ((data as { results?: DeviceType[] })?.results ?? data ?? []) as DeviceType[];

  return (
    <div>
      {modal !== null && (
        <DtModal editDt={modal === 'add' ? null : modal as DeviceType} onClose={() => setModal(null)} />
      )}

      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Server className="w-6 h-6 text-primary-400" />
            Device Types
          </h1>
          <p className="page-subtitle">Manage hardware models and their physical dimensions</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => refetch()} className="btn-secondary flex items-center gap-2">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          <button className="btn-primary flex items-center gap-2" onClick={() => setModal('add')}>
            <Plus className="w-4 h-4" /> Add Device Type
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
          <input type="text" placeholder="Search models..." value={search}
            onChange={e => setSearch(e.target.value)} className="input w-full pl-9" />
        </div>
        <select className="select" value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
          <option value="">All Roles</option>
          {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Manufacturer / Model</th><th>Role</th><th>Height</th>
              <th>Width (mm)</th><th>Depth (mm)</th><th>Weight (kg)</th>
              <th>Power (W)</th><th>Devices</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={10} className="text-center py-12 text-dark-500">Loading...</td></tr>
            ) : deviceTypes.length === 0 ? (
              <tr><td colSpan={10} className="text-center py-12 text-dark-500">No device types found</td></tr>
            ) : deviceTypes.map(dt => (
              <tr key={dt.id}>
                <td>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: LIGHT_GREY }} />
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
                <td><span className="text-dark-400 text-sm">{dt.device_count ?? 0}</span></td>
                <td>
                  <button className="text-xs text-primary-400 hover:text-primary-300 transition-colors flex items-center gap-1"
                    onClick={() => setModal(dt)}>
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
