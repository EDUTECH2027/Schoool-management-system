import { useEffect, useState } from 'react';
import { History, QrCode, PenLine } from 'lucide-react';
import { clsx } from 'clsx';
import { api, type Teacher, type TeacherAttendanceRecord, type TeacherAttendanceSummary } from '../api/client';

const STATUS_LABEL: Record<string, string> = { present: 'On Time', late: 'Late', absent: 'Absent', excused: 'Excused' };
const STATUS_CHIP: Record<string, string> = {
  present: 'bg-emerald-50 text-emerald-700', late: 'bg-amber-50 text-amber-700',
  absent: 'bg-red-50 text-red-600', excused: 'bg-blue-50 text-blue-600',
};

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function TeacherAttendanceHistory() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [month, setMonth] = useState(currentMonth());
  const [teacherId, setTeacherId] = useState('');
  const [status, setStatus] = useState('');
  const [summary, setSummary] = useState<TeacherAttendanceSummary | null>(null);
  const [records, setRecords] = useState<TeacherAttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { api.getTeachers().then(setTeachers).catch(() => {}); }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.getTeacherAttendance({ month, ...(teacherId ? { teacherId } : {}), ...(status ? { status } : {}) }),
      api.getTeacherAttendanceSummary(month).catch(() => null),
    ]).then(([recs, sum]) => { setRecords(recs); setSummary(sum); })
      .finally(() => setLoading(false));
  }, [month, teacherId, status]);

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-100">
        <History size={16} className="text-indigo-500" />
        <h3 className="font-semibold text-slate-800">Attendance History</h3>
      </div>

      <div className="flex flex-wrap items-end gap-4 px-5 py-4 border-b border-slate-100 bg-slate-50">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Month</label>
          <input type="month" value={month} onChange={e => setMonth(e.target.value)}
            className="py-2 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Teacher</label>
          <select value={teacherId} onChange={e => setTeacherId(e.target.value)}
            className="py-2 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
            <option value="">All teachers</option>
            {teachers.map(t => <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Status</label>
          <select value={status} onChange={e => setStatus(e.target.value)}
            className="py-2 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
            <option value="">All</option>
            <option value="present">On Time</option>
            <option value="late">Late</option>
            <option value="absent">Absent</option>
            <option value="excused">Excused</option>
          </select>
        </div>

        {summary && (
          <div className="flex gap-3 ml-auto text-sm">
            <span className="px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-700 font-medium">On Time: {summary.totals.on_time}</span>
            <span className="px-3 py-1.5 rounded-lg bg-amber-100 text-amber-700 font-medium">Late: {summary.totals.late}</span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <div className="w-6 h-6 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : records.length === 0 ? (
        <div className="py-10 text-center text-slate-400 text-sm">No attendance records for this filter.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-400 uppercase tracking-wide border-b border-slate-100">
                <th className="px-5 py-2">Teacher</th>
                <th className="px-5 py-2">Date</th>
                <th className="px-5 py-2">Scan time</th>
                <th className="px-5 py-2">Status</th>
                <th className="px-5 py-2">Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {records.map(r => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-5 py-2.5 font-medium text-slate-700">{r.first_name} {r.last_name}</td>
                  <td className="px-5 py-2.5 text-slate-500">{r.date}</td>
                  <td className="px-5 py-2.5 text-slate-500">
                    {r.scan_time ? new Date(r.scan_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '—'}
                  </td>
                  <td className="px-5 py-2.5">
                    <span className={clsx('px-2 py-0.5 rounded text-xs font-medium', STATUS_CHIP[r.status])}>{STATUS_LABEL[r.status] ?? r.status}</span>
                  </td>
                  <td className="px-5 py-2.5">
                    <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                      {r.source === 'qr_scan' ? <QrCode size={12} /> : <PenLine size={12} />}
                      {r.source === 'qr_scan' ? 'QR' : 'Manual'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
