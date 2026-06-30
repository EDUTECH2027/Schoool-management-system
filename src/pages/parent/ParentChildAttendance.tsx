import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { api } from '../../api/client';
import type { AttendanceRecord } from '../../api/client';

const STATUS_CHIP: Record<string, string> = {
  present: 'bg-emerald-100 text-emerald-700',
  absent:  'bg-red-100 text-red-700',
  late:    'bg-amber-100 text-amber-700',
  excused: 'bg-blue-100 text-blue-700',
};

export default function ParentChildAttendance() {
  const { studentId } = useParams<{ studentId: string }>();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));

  useEffect(() => {
    if (!studentId) return;
    api.portalParentChildAttendance(studentId, { from: `${month}-01`, to: `${month}-31` }).then(setRecords).catch(() => {});
  }, [studentId, month]);

  const counts = records.reduce((acc, r) => { acc[r.status] = (acc[r.status] ?? 0) + 1; return acc; }, {} as Record<string, number>);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link to="/parent/children" className="text-slate-400 hover:text-slate-600"><ChevronLeft size={20} /></Link>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Attendance</h1>
        <input type="month" value={month} onChange={e => setMonth(e.target.value)}
          className="ml-auto border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300" />
      </div>

      <div className="flex gap-3 flex-wrap">
        {Object.entries(counts).map(([status, count]) => (
          <span key={status} className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize ${STATUS_CHIP[status] ?? 'bg-slate-100 text-slate-600'}`}>{status}: {count}</span>
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
