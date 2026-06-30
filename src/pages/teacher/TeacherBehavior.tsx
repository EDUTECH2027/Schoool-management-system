import { useEffect, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { api } from '../../api/client';
import type { BehaviorRecord, ClassRecord, Student } from '../../api/client';

const CAT_CHIP: Record<string, string> = {
  positive: 'bg-emerald-100 text-emerald-700',
  negative: 'bg-red-100 text-red-700',
  neutral:  'bg-slate-100 text-slate-600',
};

export default function TeacherBehavior() {
  const [records, setRecords] = useState<BehaviorRecord[]>([]);
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [classId, setClassId] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ student_id: '', date: new Date().toISOString().slice(0,10), category: 'positive' as 'positive'|'negative'|'neutral', description: '', action_taken: '' });
  const [saving, setSaving] = useState(false);

  const load = (cid: string) => api.portalTeacherBehavior(cid || undefined).then(setRecords).catch(() => {});

  useEffect(() => {
    api.portalTeacherClasses().then(cls => {
      setClasses(cls);
      if (cls[0]) { setClassId(cls[0].id); load(cls[0].id); }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (classId) api.getClassStudents(classId).then(setStudents).catch(() => {});
  }, [classId]);

  const submit = async () => {
    if (!form.student_id || !form.description) return;
    setSaving(true);
    try {
      await api.portalTeacherCreateBehavior({ ...form, class_id: classId });
      setShowForm(false);
      setForm(f => ({ ...f, student_id: '', description: '', action_taken: '' }));
      load(classId);
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Student Behavior</h1>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm hover:bg-indigo-700">
          <Plus size={15} /> Add Record
        </button>
      </div>

      <select value={classId} onChange={e => { setClassId(e.target.value); load(e.target.value); }}
        className="border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300">
        {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>

      {showForm && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-800 dark:text-slate-200">New Behavior Record</h2>
            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Student</label>
              <select value={form.student_id} onChange={e => setForm(f => ({ ...f, student_id: e.target.value }))}
                className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                <option value="">Select student…</option>
                {students.map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Date</label>
              <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200" />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Category</label>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value as typeof form.category }))}
                className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                <option value="positive">Positive</option>
                <option value="negative">Negative</option>
                <option value="neutral">Neutral</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Action Taken</label>
              <input value={form.action_taken} onChange={e => setForm(f => ({ ...f, action_taken: e.target.value }))} placeholder="Optional"
                className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200" />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs text-slate-500 mb-1 block">Description</label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2}
                className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200" />
            </div>
          </div>
          <button onClick={submit} disabled={saving || !form.student_id || !form.description}
            className="px-5 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      )}

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-700/50">
            <tr>
              {['Student', 'Date', 'Category', 'Description', 'Action'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {records.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">No records yet.</td></tr>}
            {records.map(r => (
              <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{r.student_name ?? r.student_id}</td>
                <td className="px-4 py-3 text-slate-500">{r.date}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${CAT_CHIP[r.category]}`}>{r.category}</span>
                </td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-400 max-w-xs truncate">{r.description}</td>
                <td className="px-4 py-3 text-slate-500">{r.action_taken ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
