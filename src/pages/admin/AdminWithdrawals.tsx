import { useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';
import { api } from '../../api/client';
import type { Withdrawal } from '../../api/client';

const STATUS_CHIP: Record<string, string> = {
  pending:  'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
};

export default function AdminWithdrawals() {
  const [items, setItems] = useState<Withdrawal[]>([]);
  const [notesId, setNotesId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  const load = () => api.getWithdrawals().then(setItems).catch(() => {});
  useEffect(() => { load(); }, []);

  const setStatus = async (id: string, status: 'approved' | 'rejected') => {
    await api.setWithdrawalStatus(id, status, notes);
    setNotesId(null); setNotes('');
    load();
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Salary Withdrawal Requests</h1>

      {notesId && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-300 dark:border-slate-600 p-5 space-y-3">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Add review notes (optional)</p>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
            className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 resize-none" />
          <div className="flex gap-2">
            <button onClick={() => setStatus(notesId, 'approved')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm hover:bg-emerald-700">
              <Check size={14} /> Approve
            </button>
            <button onClick={() => setStatus(notesId, 'rejected')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white text-sm hover:bg-red-700">
              <X size={14} /> Reject
            </button>
            <button onClick={() => { setNotesId(null); setNotes(''); }}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-600 dark:text-slate-400 text-sm">
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-700/50">
            <tr>
              {['Teacher', 'Amount (FCFA)', 'Reason', 'Status', 'Submitted', 'Actions'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {items.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No withdrawal requests.</td></tr>}
            {items.map(w => (
              <tr key={w.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{w.teacher_name ?? w.teacher_id}</td>
                <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{w.amount.toLocaleString()}</td>
                <td className="px-4 py-3 text-slate-500 max-w-xs truncate">{w.reason ?? '—'}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${STATUS_CHIP[w.status] ?? 'bg-slate-100 text-slate-600'}`}>{w.status}</span>
                </td>
                <td className="px-4 py-3 text-slate-500">{w.created_at?.slice(0, 10)}</td>
                <td className="px-4 py-3">
                  {w.status === 'pending' && (
                    <button onClick={() => { setNotesId(w.id); setNotes(''); }}
                      className="px-3 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 text-xs font-medium hover:bg-indigo-100">
                      Review
                    </button>
                  )}
                  {w.notes && w.status !== 'pending' && <span className="text-xs text-slate-400">{w.notes}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
