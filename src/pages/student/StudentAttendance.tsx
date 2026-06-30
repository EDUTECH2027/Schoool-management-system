import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import type { AttendanceRecord } from '../../api/client';

const STATUS_COLOR: Record<string, string> = {
  present: 'bg-emerald-500',
  absent:  'bg-red-500',
  late:    'bg-amber-400',
  excused: 'bg-blue-400',
};
const STATUS_CHIP: Record<string, string> = {
  present: 'bg-emerald-100 text-emerald-700',
  absent:  'bg-red-100 text-red-700',
  late:    'bg-amber-100 text-amber-700',
  excused: 'bg-blue-100 text-blue-700',
};

export default function StudentAttendance() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));

  useEffect(() => {
    api.portalStudentAttendance({ from: `${month}-01`, to: `${month}-31` }).then(setRecords).catch(() => {});
  }, [month]);

  const counts = records.reduce((acc, r) => { acc[r.status] = (acc[r.status] ?? 0) + 1; return acc; }, {} as Record<string, number>);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">My Attendance</h1>
        <input type="month" value={month} onChange={e => setMonth(e.target.value)}
          className="border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300" />
      </div>

      {/* Summary chips */}
      <div className="flex gap-3 flex-wrap">
        {Object.entries(counts).map(([status, count]) => (
          <div key={status} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <span className={`w-2.5 h-2.5 rounded-full ${STATUS_COLOR[status] ?? 'bg-slate-400'}`} />
            <span className="text-sm capitalize text-slate-600 dark:text-slate-400">{status}</span>
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{count}</span>
          </div>
        ))}
      </div>

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
            {records.length === 0 && <tr><td colSpan={3} className="px-4 py-8 text-center text-slate-400">No records for this month.</td></tr>}
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
