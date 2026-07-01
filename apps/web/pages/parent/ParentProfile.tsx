import { useEffect, useState } from 'react';
import { Pencil, Save, X } from 'lucide-react';
import { api } from '../../api/client';
import type { Parent } from '../../api/client';

export default function ParentProfile() {
  const [parent, setParent] = useState<Parent | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', address: '', occupation: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.portalParentProfile().then(p => {
      setParent(p);
      setForm({ name: p.name ?? '', phone: p.phone ?? '', address: p.address ?? '', occupation: p.occupation ?? '' });
    }).catch(() => {});
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const updated = await api.portalParentProfileUpdate(form);
      setParent(updated);
      setEditing(false);
    } finally { setSaving(false); }
  };

  if (!parent) return <div className="text-slate-500">Loading…</div>;

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">My Profile</h1>
        {!editing
          ? <button onClick={() => setEditing(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 text-white text-sm hover:bg-violet-700"><Pencil size={14} /> Edit</button>
          : <div className="flex gap-2">
              <button onClick={() => setEditing(false)} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 text-slate-600 text-sm"><X size={14} /> Cancel</button>
              <button onClick={save} disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 text-white text-sm disabled:opacity-50"><Save size={14} /> {saving ? 'Saving…' : 'Save'}</button>
            </div>
        }
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700">
        {([
          ['Name', 'name'], ['Phone', 'phone'], ['Address', 'address'], ['Occupation', 'occupation'],
        ] as [string, keyof typeof form][]).map(([label, key]) => (
          <div key={key} className="flex items-center px-5 py-3.5">
            <span className="w-36 text-sm text-slate-500 shrink-0">{label}</span>
            {editing
              ? <input value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  className="text-sm border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-1.5 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 flex-1 max-w-xs" />
              : <span className="text-sm text-slate-800 dark:text-slate-200">{parent[key as keyof Parent] as string ?? '—'}</span>
            }
          </div>
        ))}
        <div className="flex items-center px-5 py-3.5">
          <span className="w-36 text-sm text-slate-500 shrink-0">Email</span>
          <span className="text-sm text-slate-800 dark:text-slate-200">{parent.email ?? '—'}</span>
        </div>
      </div>
    </div>
  );
}
