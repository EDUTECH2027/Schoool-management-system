import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { api } from '../../api/client';
import type { PlatformFeature } from '../../api/client';

export default function Features() {
  const [features, setFeatures] = useState<PlatformFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ key: '', label: '', description: '' });
  const [error, setError] = useState('');

  const load = () => {
    api.platform.getFeatures().then(setFeatures).catch(console.error).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await api.platform.createFeature(form);
      setForm({ key: '', label: '', description: '' });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create feature');
    }
  };

  const remove = async (id: string) => {
    await api.platform.deleteFeature(id);
    load();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-3">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Feature Catalog</h2>
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-800">
          {features.map(f => (
            <div key={f.id} className="flex items-center justify-between px-5 py-3">
              <div>
                <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{f.label} <span className="text-xs text-slate-400 font-mono ml-1">{f.key}</span></p>
                {f.description && <p className="text-xs text-slate-400 mt-0.5">{f.description}</p>}
              </div>
              <button onClick={() => remove(f.id)} className="text-slate-400 hover:text-red-600"><Trash2 size={15} /></button>
            </div>
          ))}
          {features.length === 0 && <p className="px-5 py-10 text-center text-slate-400 text-sm">No features defined yet</p>}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-5 h-fit">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">Add Feature</h3>
        <form onSubmit={submit} className="space-y-3">
          {error && <p className="text-red-600 text-xs">{error}</p>}
          <div>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Key *</label>
            <input required value={form.key} onChange={e => setForm({ ...form, key: e.target.value })} placeholder="e.g. payroll"
              className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Label *</label>
            <input required value={form.label} onChange={e => setForm({ ...form, label: e.target.value })}
              className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Description</label>
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2}
              className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <button type="submit" className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm py-2.5 rounded-lg transition-colors">
            <Plus size={16} /> Add Feature
          </button>
        </form>
      </div>
    </div>
  );
}
