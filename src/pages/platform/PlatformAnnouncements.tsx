import { useEffect, useState } from 'react';
import { Plus, Trash2, Pin } from 'lucide-react';
import { api } from '../../api/client';
import type { PlatformAnnouncement } from '../../api/client';

export default function PlatformAnnouncements() {
  const [items, setItems] = useState<PlatformAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title: '', body: '', is_pinned: false });
  const [error, setError] = useState('');

  const load = () => {
    api.platform.getAnnouncements().then(setItems).catch(console.error).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await api.platform.createAnnouncement(form);
      setForm({ title: '', body: '', is_pinned: false });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create announcement');
    }
  };

  const remove = async (id: string) => {
    await api.platform.deleteAnnouncement(id);
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
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Platform Announcements</h2>
        <div className="space-y-3">
          {items.map(a => (
            <div key={a.id} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  {!!a.is_pinned && <Pin size={13} className="text-amber-500" />}
                  <h3 className="font-medium text-slate-800 dark:text-slate-100">{a.title}</h3>
                </div>
                <button onClick={() => remove(a.id)} className="text-slate-400 hover:text-red-600"><Trash2 size={15} /></button>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">{a.body}</p>
              <p className="text-xs text-slate-400 mt-2">{new Date(a.created_at).toLocaleString()}</p>
            </div>
          ))}
          {items.length === 0 && <p className="text-slate-400 text-sm py-10 text-center">No announcements yet</p>}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-5 h-fit">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">New Announcement</h3>
        <form onSubmit={submit} className="space-y-3">
          {error && <p className="text-red-600 text-xs">{error}</p>}
          <div>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Title *</label>
            <input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
              className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Body *</label>
            <textarea required value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} rows={4}
              className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <input type="checkbox" checked={form.is_pinned} onChange={e => setForm({ ...form, is_pinned: e.target.checked })} />
            Pin to top
          </label>
          <button type="submit" className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm py-2.5 rounded-lg transition-colors">
            <Plus size={16} /> Publish
          </button>
        </form>
      </div>
    </div>
  );
}
