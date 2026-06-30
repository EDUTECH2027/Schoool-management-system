import { useEffect, useState } from 'react';
import { Pencil, Save, X } from 'lucide-react';
import { api } from '../../api/client';
import type { Teacher } from '../../api/client';

export default function TeacherProfile() {
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ phone: '', qualification: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.portalTeacherProfile().then(t => { setTeacher(t); setForm({ phone: t.phone ?? '', qualification: t.qualification ?? '' }); }).catch(() => {});
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const updated = await api.portalTeacherProfileUpdate(form);
      setTeacher(updated);
      setEditing(false);
    } finally { setSaving(false); }
  };

  if (!teacher) return <div className="text-slate-500">Loading…</div>;

  const rows: [string, string][] = [
    ['Full Name', `${teacher.first_name} ${teacher.last_name}`],
    ['Email', teacher.email],
    ['Gender', teacher.gender ?? '—'],
    ['Class Assigned', teacher.class_assigned ?? '—'],
    ['Joined', teacher.join_date ?? '—'],
    ['Subjects', Array.isArray(teacher.subjects) ? teacher.subjects.join(', ') : teacher.subjects],
  ];

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">My Profile</h1>
        {!editing
          ? <button onClick={() => setEditing(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm hover:bg-indigo-700"><Pencil size={14} /> Edit</button>
          : <div className="flex gap-2">
              <button onClick={() => setEditing(false)} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 text-slate-600 text-sm hover:bg-slate-50"><X size={14} /> Cancel</button>
              <button onClick={save} disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm hover:bg-indigo-700 disabled:opacity-50"><Save size={14} /> {saving ? 'Saving…' : 'Save'}</button>
            </div>
        }
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center px-5 py-3.5">
            <span className="w-40 text-sm text-slate-500 shrink-0">{label}</span>
            <span className="text-sm text-slate-800 dark:text-slate-200">{value}</span>
          </div>
        ))}

        <div className="flex items-center px-5 py-3.5">
          <span className="w-40 text-sm text-slate-500 shrink-0">Phone</span>
          {editing
            ? <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="text-sm border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-1.5 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 w-56" />
            : <span className="text-sm text-slate-800 dark:text-slate-200">{teacher.phone ?? '—'}</span>
          }
        </div>

        <div className="flex items-center px-5 py-3.5">
          <span className="w-40 text-sm text-slate-500 shrink-0">Qualification</span>
          {editing
            ? <input value={form.qualification} onChange={e => setForm(f => ({ ...f, qualification: e.target.value }))} className="text-sm border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-1.5 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 w-64" />
            : <span className="text-sm text-slate-800 dark:text-slate-200">{teacher.qualification ?? '—'}</span>
          }
        </div>
      </div>
    </div>
  );
}
