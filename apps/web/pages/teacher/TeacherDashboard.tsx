import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, ClipboardCheck, FileText, Calendar } from 'lucide-react';
import { api } from '../../api/client';
import type { Teacher, ClassRecord, ScheduleEntry } from '../../api/client';

export default function TeacherDashboard() {
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [today, setToday] = useState<ScheduleEntry[]>([]);

  useEffect(() => {
    const dow = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'][new Date().getDay()];
    Promise.all([
      api.portalTeacherProfile(),
      api.portalTeacherClasses(),
      api.portalTeacherTimetable(),
    ]).then(([t, cls, tt]) => {
      setTeacher(t);
      setClasses(cls);
      setToday(tt.filter(e => e.day === dow));
    }).catch(() => {});
  }, []);

  const totalStudents = classes.reduce((s, c) => s + (c.enrolled ?? 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
          Welcome back{teacher ? `, ${teacher.first_name}` : ''}!
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          {teacher?.class_assigned ?? 'Teacher'} · {new Date().toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long' })}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Students in Class', value: totalStudents, icon: Users, color: 'indigo' },
          { label: 'Classes Assigned', value: classes.length, icon: ClipboardCheck, color: 'emerald' },
          { label: "Today's Periods", value: today.length, icon: Calendar, color: 'violet' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg bg-${color}-100 dark:bg-${color}-900/30 flex items-center justify-center`}>
                <Icon size={20} className={`text-${color}-600 dark:text-${color}-400`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{value}</p>
                <p className="text-xs text-slate-500">{label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Quick Actions</h2>
        <div className="flex flex-wrap gap-2">
          {[
            { label: 'Enter Marks', to: '/teacher/marks', icon: FileText },
            { label: 'Take Attendance', to: '/teacher/attendance', icon: ClipboardCheck },
            { label: 'View Timetable', to: '/teacher/timetable', icon: Calendar },
            { label: 'View Salary', to: '/teacher/salary', icon: Calendar },
          ].map(({ label, to, icon: Icon }) => (
            <Link key={to} to={to}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 text-sm font-medium hover:bg-indigo-100 transition-colors"
            >
              <Icon size={15} /> {label}
            </Link>
          ))}
        </div>
      </div>

      {/* Today's schedule */}
      {today.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Today's Schedule</h2>
          <div className="space-y-2">
            {today.map(slot => (
              <div key={slot.id} className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700 last:border-0">
                <div>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{slot.subject_name}</p>
                  <p className="text-xs text-slate-500">{slot.class_name} · {slot.room}</p>
                </div>
                <span className="text-xs text-slate-500">{slot.time ?? slot.period_label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
