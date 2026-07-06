import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import type { SystemLog } from '../../api/client';

export default function SystemLogs() {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const limit = 25;

  useEffect(() => {
    setLoading(true);
    api.platform.getLogs({ limit, offset })
      .then(res => { setLogs(res.rows); setTotal(res.total); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [offset]);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">System Logs <span className="text-slate-400 font-normal text-sm">({total} total)</span></h2>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wide">
                <th className="px-5 py-3 text-left font-medium">Action</th>
                <th className="px-5 py-3 text-left font-medium">Actor</th>
                <th className="px-5 py-3 text-left font-medium">Target</th>
                <th className="px-5 py-3 text-left font-medium">When</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr><td colSpan={4} className="px-5 py-10 text-center text-slate-400 text-sm">Loading...</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={4} className="px-5 py-10 text-center text-slate-400 text-sm">No log entries yet</td></tr>
              ) : logs.map(l => (
                <tr key={l.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-5 py-3 font-medium text-slate-800 dark:text-slate-100">{l.action}</td>
                  <td className="px-5 py-3 text-slate-600 dark:text-slate-300">{l.actor_name ?? 'System'}</td>
                  <td className="px-5 py-3 text-slate-500 dark:text-slate-400 text-xs">{l.target_type ? `${l.target_type}: ${l.target_id}` : '—'}</td>
                  <td className="px-5 py-3 text-slate-500 dark:text-slate-400 text-xs">{new Date(l.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between text-sm">
        <button disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - limit))}
          className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-40 text-slate-600 dark:text-slate-300">
          Previous
        </button>
        <span className="text-slate-400 text-xs">Showing {offset + 1}-{Math.min(offset + limit, total)} of {total}</span>
        <button disabled={offset + limit >= total} onClick={() => setOffset(offset + limit)}
          className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-40 text-slate-600 dark:text-slate-300">
          Next
        </button>
      </div>
    </div>
  );
}
