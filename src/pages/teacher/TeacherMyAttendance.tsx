import { useEffect, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { api } from '../../api/client';
import type { TeacherAttendanceRecord } from '../../api/client';

const STATUS_CHIP: Record<string, string> = {
  present: 'bg-emerald-100 text-emerald-700',
  absent:  'bg-red-100 text-red-700',
  late:    'bg-amber-100 text-amber-700',
  excused: 'bg-blue-100 text-blue-700',
};

export default function TeacherMyAttendance() {
  const [records, setRecords] = useState<TeacherAttendanceRecord[]>([]);
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0, 10), status: 'absent', remarks: '' });
  const [saving, setSaving] = useState(false);

  const load = () => api.portalTeacherMyAttendance(month).then(setRecords).catch(() => {});
  useEffect(() => { load(); }, [month]);

  const submit = async () => {
    setSaving(true);
    try {
      await api.portalTeacherReportAbsence(form);
      setShowForm(false);
      load();
    } finally { setSaving(false); }
  };

  const counts = records.reduce((acc, r) => { acc[r.status] = (acc[r.status] ?? 0) + 1; return acc; }, {} as Record<string, number>);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">My Attendance</h1>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm hover:bg-indigo-700">
          <Plus size={15} /> Report Absence
        </button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <input type="month" value={month} onChange={e => setMonth(e.target.value)}
          className="border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300" />
        {Object.entries(counts).map(([status, count]) => (
          <span key={status} className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize ${STATUS_CHIP[status] ?? 'bg-slate-100 text-slate-600'}`}>{status}: {count}</span>
        ))}
      </div>

      {showForm && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-800 dark:text-slate-200">Report Absence / Late</h2>
            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Date</label>
              <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200" />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Status</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                <option value="absent">Absent</option>
                <option value="late">Late</option>
                <option value="excused">Excused</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Remarks</label>
              <input value={form.remarks} onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))} placeholder="Optional"
                className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200" />
            </div>
          </div>
          <button onClick={submit} disabled={saving}
            className="px-5 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
            {saving ? 'Saving…' : 'Submit'}
          </button>
        </div>
      )}

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-700/50">
            <tr>
              {['Date', 'Status', 'Remarks'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {records.length === 0 && (
              <tr><td colSpan={3} className="px-4 py-8 text-center text-slate-400">No records for this month.</td></tr>
            )}
            {records.map(r => (
              <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{r.date}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${STATUS_CHIP[r.status] ?? 'bg-slate-100 text-slate-600'}`}>{r.status}</span>
                </td>
                <td className="px-4 py-3 text-slate-500">{r.remarks ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
