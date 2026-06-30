import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import type { Student, Mark, ScheduleEntry } from '../../api/client';

export default function StudentDashboard() {
  const [student, setStudent] = useState<Student | null>(null);
  const [marks, setMarks] = useState<Mark[]>([]);
  const [today, setToday] = useState<ScheduleEntry[]>([]);
  const [attStats, setAttStats] = useState({ present: 0, total: 0 });

  useEffect(() => {
    const dow = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'][new Date().getDay()];
    Promise.all([
      api.portalStudentProfile(),
      api.portalStudentMarks(),
      api.portalStudentTimetable(),
      api.portalStudentAttendance({ from: new Date().toISOString().slice(0,7) + '-01' }),
    ]).then(([s, m, tt, att]) => {
      setStudent(s);
      setMarks(m.slice(0, 3));
      setToday(tt.filter(e => e.day === dow));
      setAttStats({ present: att.filter(a => a.status === 'present').length, total: att.length });
    }).catch(() => {});
  }, []);

  const pct = attStats.total > 0 ? Math.round((attStats.present / attStats.total) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
          Welcome{student ? `, ${student.first_name}` : ''}!
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          {student?.class_name ?? ''} · {new Date().toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long' })}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Attendance This Month</p>
          <p className="text-3xl font-bold text-emerald-600">{pct}%</p>
          <p className="text-xs text-slate-400 mt-1">{attStats.present} / {attStats.total} days present</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-3">Recent Marks</p>
          {marks.length === 0 ? <p className="text-slate-400 text-sm">No marks yet.</p> : (
            <div className="space-y-1.5">
              {marks.map(m => (
                <div key={m.id} className="flex justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-400">{m.subject_name}</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{m.total_score}/100 <span className="text-slate-400 font-normal">({m.grade})</span></span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {[{ label: 'View All Marks', to: '/student/marks' }, { label: 'My Attendance', to: '/student/attendance' }, { label: 'Timetable', to: '/student/timetable' }].map(({ label, to }) => (
          <Link key={to} to={to} className="px-4 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 text-sm font-medium hover:bg-emerald-100 transition-colors">{label}</Link>
        ))}
      </div>

      {today.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Today's Schedule</h2>
          <div className="space-y-2">
            {today.map(s => (
              <div key={s.id} className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-700 last:border-0 text-sm">
                <span className="font-medium text-slate-700 dark:text-slate-300">{s.subject_name}</span>
                <span className="text-slate-500">{s.teacher_name ?? ''} · {s.time ?? s.period_label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
