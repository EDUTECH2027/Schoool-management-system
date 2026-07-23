import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, Layers, Calendar as CalendarIcon, FileText, ClipboardCheck, CheckCircle2,
  ChevronLeft, ChevronRight, MessageSquare, ArrowUpRight,
} from 'lucide-react';
import { api } from '../../api/client';
import type { Teacher, ClassRecord, ScheduleEntry, Mark, AttendanceRecord, BehaviorRecord } from '../../api/client';

const DOW = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const WEEKDAY_LETTERS = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];

function parseTimeRange(range?: string | null): [number, number] | null {
  if (!range) return null;
  const parts = range.split(/[–-]/).map(p => p.trim());
  if (parts.length !== 2) return null;
  const toMinutes = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return Number.isFinite(h) ? h * 60 + (Number.isFinite(m) ? m : 0) : null;
  };
  const start = toMinutes(parts[0]);
  const end = toMinutes(parts[1]);
  return start !== null && end !== null ? [start, end] : null;
}

function monthGrid(anchor: Date): (Date | null)[][] {
  const year = anchor.getFullYear();
  const month = anchor.getMonth();
  const first = new Date(year, month, 1);
  const startOffset = (first.getDay() + 6) % 7; // Monday-first
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = Array(startOffset).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).filter(Boolean).join('').toUpperCase().slice(0, 2);
}

export default function TeacherDashboard() {
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [timetable, setTimetable] = useState<ScheduleEntry[]>([]);
  const [termId, setTermId] = useState<string | null>(null);
  const [marksByClass, setMarksByClass] = useState<Map<string, Mark[]>>(new Map());
  const [attendanceByClass, setAttendanceByClass] = useState<Map<string, AttendanceRecord[]>>(new Map());
  const [behavior, setBehavior] = useState<BehaviorRecord[]>([]);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => new Date());

  useEffect(() => {
    api.portalTeacherProfile().then(setTeacher).catch(() => {});
    api.portalTeacherClasses().then(setClasses).catch(() => {});
    api.portalTeacherTimetable().then(setTimetable).catch(() => {});
    api.portalTeacherBehavior().then(setBehavior).catch(() => {});
    api.getTerms().then(terms => setTermId(terms.find(t => !!t.is_current)?.id ?? terms[0]?.id ?? null)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!termId || classes.length === 0) return;
    Promise.all(classes.map(c => api.portalTeacherMarks(c.id, termId).then(rows => [c.id, rows] as const).catch(() => [c.id, [] as Mark[]] as const)))
      .then(entries => setMarksByClass(new Map(entries)));
  }, [classes, termId]);

  useEffect(() => {
    if (classes.length === 0) return;
    const today = new Date().toISOString().slice(0, 10);
    Promise.all(classes.map(c => api.portalTeacherStudentAttendance(c.id, today).then(rows => [c.id, rows] as const).catch(() => [c.id, [] as AttendanceRecord[]] as const)))
      .then(entries => setAttendanceByClass(new Map(entries)));
  }, [classes]);

  const now = new Date();
  const totalStudents = classes.reduce((s, c) => s + (c.enrolled ?? 0), 0);

  const todayDow = DOW[now.getDay()];
  const todaysSchedule = useMemo(() => timetable
    .filter(e => e.day === todayDow)
    .map(e => ({ ...e, range: parseTimeRange(e.time) }))
    .sort((a, b) => (a.range?.[0] ?? 0) - (b.range?.[0] ?? 0)),
  [timetable, todayDow]);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const periodsDone = todaysSchedule.filter(e => e.range && nowMinutes >= e.range[1]).length;

  const { studentsWithMarks, marksRecorded } = useMemo(() => {
    let withMarks = 0;
    let recorded = 0;
    marksByClass.forEach(rows => {
      withMarks += new Set(rows.filter(m => m.total_score > 0).map(m => m.student_id)).size;
      recorded += rows.filter(m => m.total_score > 0).length;
    });
    return { studentsWithMarks: withMarks, marksRecorded: recorded };
  }, [marksByClass]);
  const studentsPending = Math.max(totalStudents - studentsWithMarks, 0);

  const classesAttendanceTaken = useMemo(() =>
    classes.filter(c => (attendanceByClass.get(c.id)?.length ?? 0) > 0).length,
  [classes, attendanceByClass]);

  const pct = (n: number, d: number) => d > 0 ? Math.min(Math.round((n / d) * 100), 100) : 0;

  const overviewTiles = [
    { key: 'students', label: 'Total Students', value: totalStudents, icon: Users, bar: 100, barColor: 'bg-rose-500' },
    { key: 'classes', label: 'My Classes', value: classes.length, icon: Layers, bar: 100, barColor: 'bg-orange-400' },
    { key: 'periods', label: "Today's Periods", value: todaysSchedule.length, icon: CalendarIcon, bar: pct(periodsDone, todaysSchedule.length), barColor: 'bg-yellow-400' },
    { key: 'recorded', label: 'Marks Recorded', value: marksRecorded, icon: FileText, bar: pct(studentsWithMarks, totalStudents), barColor: 'bg-violet-500' },
    { key: 'pending', label: 'Students Pending Marks', value: studentsPending, icon: ClipboardCheck, bar: pct(studentsPending, totalStudents), barColor: 'bg-slate-400' },
    { key: 'attendance-done', label: 'Attendance Taken Today', value: classesAttendanceTaken, icon: CheckCircle2, bar: pct(classesAttendanceTaken, classes.length), barColor: 'bg-emerald-500' },
  ];

  const attendanceToday = useMemo(() => {
    const all = [...attendanceByClass.values()].flat();
    const present = all.filter(a => a.status === 'present').length;
    return { total: all.length, present, absent: all.length - present };
  }, [attendanceByClass]);

  const topStudents = useMemo(() => {
    const totals = new Map<string, { name: string; sum: number; count: number }>();
    marksByClass.forEach(rows => rows.forEach(m => {
      const cur = totals.get(m.student_id) ?? { name: m.student_name, sum: 0, count: 0 };
      cur.sum += m.total_score;
      cur.count += 1;
      totals.set(m.student_id, cur);
    }));
    return [...totals.entries()]
      .map(([id, v]) => ({ id, name: v.name, avg: Math.round(v.sum / v.count) }))
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 4);
  }, [marksByClass]);

  const tasks = useMemo(() => {
    const list: { id: string; icon: typeof FileText; color: string; title: string; subtitle: string; to: string }[] = [];
    classes.forEach(c => {
      const rows = marksByClass.get(c.id) ?? [];
      const withMarks = new Set(rows.filter(m => m.total_score > 0).map(m => m.student_id)).size;
      const pending = Math.max((c.enrolled ?? 0) - withMarks, 0);
      if (pending > 0) {
        list.push({ id: `marks-${c.id}`, icon: FileText, color: 'amber', title: `Enter marks for ${c.name}`, subtitle: `${pending} student${pending === 1 ? '' : 's'} still need grades this term`, to: '/teacher/marks' });
      }
      if (!attendanceByClass.get(c.id)?.length) {
        list.push({ id: `att-${c.id}`, icon: ClipboardCheck, color: 'sky', title: `Take attendance for ${c.name}`, subtitle: 'Not yet recorded today', to: '/teacher/attendance' });
      }
    });
    behavior.filter(b => b.category === 'negative').slice(0, 2).forEach(b => {
      list.push({ id: `beh-${b.id}`, icon: MessageSquare, color: 'rose', title: `Follow up: ${b.student_name ?? 'Student'}`, subtitle: b.description, to: '/teacher/behavior' });
    });
    return list.slice(0, 5);
  }, [classes, marksByClass, attendanceByClass, behavior]);

  const weeks = useMemo(() => monthGrid(calendarMonth), [calendarMonth]);
  const selectedDow = DOW[selectedDate.getDay()];
  const timetableForSelected = useMemo(() => timetable
    .filter(e => e.day === selectedDow)
    .map(e => ({ ...e, range: parseTimeRange(e.time) }))
    .sort((a, b) => (a.range?.[0] ?? 0) - (b.range?.[0] ?? 0)),
  [timetable, selectedDow]);

  const TASK_COLORS: Record<string, string> = {
    amber: 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300',
    sky: 'bg-sky-100 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300',
    rose: 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300',
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">
          Welcome back{teacher ? `, ${teacher.first_name}` : ''}!
        </h1>
        <p className="text-slate-500 text-sm mt-0.5">
          {teacher?.class_assigned ?? 'Teacher'} · {now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left / main column */}
        <div className="lg:col-span-2 space-y-5">
          {/* Assignment overview */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-800 dark:text-slate-100 text-sm">Class Overview</h2>
              <Link to="/teacher/marks" className="text-xs font-medium text-indigo-600 hover:text-indigo-700">Marks &amp; Assessments</Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {overviewTiles.map(({ key, label, value, icon: Icon, bar, barColor }) => (
                <div key={key} className="rounded-xl border border-slate-100 dark:border-slate-700 p-3.5">
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-2xl font-bold text-slate-800 dark:text-slate-100">{value}</span>
                    <span className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-700 flex items-center justify-center shrink-0">
                      <Icon size={15} className="text-slate-500 dark:text-slate-300" />
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">{label}</p>
                  <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                    <div className={`h-full rounded-full ${barColor}`} style={{ width: `${bar}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Attendance donut */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-semibold text-slate-800 dark:text-slate-100 text-sm">Attendance Today</h2>
                <Link to="/teacher/attendance"><ArrowUpRight size={15} className="text-slate-400" /></Link>
              </div>
              {attendanceToday.total === 0 ? (
                <p className="text-sm text-slate-400 py-10 text-center flex-1">Not taken yet today.</p>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center py-2">
                  <div className="relative">
                    <svg width={150} height={150} viewBox="0 0 150 150" className="-rotate-90">
                      <circle cx={75} cy={75} r={62} fill="none" stroke="currentColor" strokeWidth={18} className="text-rose-100 dark:text-rose-900/30" />
                      <circle
                        cx={75} cy={75} r={62} fill="none" stroke="#f43f5e" strokeWidth={18}
                        strokeDasharray={`${(attendanceToday.present / attendanceToday.total) * 2 * Math.PI * 62} ${2 * Math.PI * 62}`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-xl font-bold text-slate-800 dark:text-slate-100">{attendanceToday.total}</span>
                      <span className="text-[10px] text-slate-400">Students</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mt-4 text-xs text-slate-500 dark:text-slate-400">
                    <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-500" />Present</span>
                    <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-100 dark:bg-rose-900/40" />Absent</span>
                  </div>
                </div>
              )}
            </div>

            {/* Students performance */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-slate-800 dark:text-slate-100 text-sm">Students Performance</h2>
                <Link to="/teacher/marks" className="text-xs font-medium text-indigo-600 hover:text-indigo-700">View All</Link>
              </div>
              {topStudents.length === 0 ? (
                <p className="text-sm text-slate-400 py-8 text-center">No marks recorded yet.</p>
              ) : (
                <div className="space-y-3">
                  {topStudents.map(s => (
                    <div key={s.id} className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-xs font-semibold shrink-0">
                        {initials(s.name)}
                      </span>
                      <span className="flex-1 text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{s.name}</span>
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{s.avg}%</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Today's timetable */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-slate-800 dark:text-slate-100 text-sm">
                {selectedDate.toDateString() === now.toDateString() ? "Today's Timetable" : 'Timetable'}
              </h2>
              <Link to="/teacher/timetable" className="text-xs font-medium text-indigo-600 hover:text-indigo-700">Full Timetable</Link>
            </div>
            {timetableForSelected.length === 0 ? (
              <p className="text-sm text-slate-400 py-6 text-center">No classes scheduled on {selectedDate.toLocaleDateString('en-GB', { weekday: 'long' })}.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[10px] font-semibold uppercase tracking-wide text-slate-400 border-b border-slate-100 dark:border-slate-700">
                      <th className="pb-2 font-semibold">Subject</th>
                      <th className="pb-2 font-semibold">Date</th>
                      <th className="pb-2 font-semibold">Time</th>
                      <th className="pb-2 font-semibold">Venue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {timetableForSelected.map(e => (
                      <tr key={e.id} className="border-b border-slate-50 dark:border-slate-700/60 last:border-0">
                        <td className="py-2.5 font-medium text-slate-700 dark:text-slate-200">{e.subject_name}</td>
                        <td className="py-2.5 text-slate-500 dark:text-slate-400">{selectedDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</td>
                        <td className="py-2.5 text-slate-500 dark:text-slate-400">{e.time ?? e.period_label}</td>
                        <td className="py-2.5 text-slate-500 dark:text-slate-400">{e.room ?? e.class_name}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-5">
          {/* Planner */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-semibold text-slate-800 dark:text-slate-100 text-sm">My Planner</h2>
            </div>
            <p className="text-xs text-slate-400 mb-3">
              {selectedDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' })}
            </p>

            <div className="flex items-center justify-between mb-2">
              <button type="button" onClick={() => setCalendarMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))} className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-300 hover:bg-slate-200">
                <ChevronLeft size={14} />
              </button>
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                {calendarMonth.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
              </span>
              <button type="button" onClick={() => setCalendarMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))} className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-300 hover:bg-slate-200">
                <ChevronRight size={14} />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center mb-1">
              {WEEKDAY_LETTERS.map(d => <span key={d} className="text-[10px] font-semibold text-slate-400">{d}</span>)}
            </div>
            <div className="space-y-1">
              {weeks.map((week, i) => (
                <div key={i} className="grid grid-cols-7 gap-1">
                  {week.map((d, j) => {
                    if (!d) return <span key={j} />;
                    const isSelected = d.toDateString() === selectedDate.toDateString();
                    const isToday = d.toDateString() === now.toDateString();
                    return (
                      <button
                        key={j}
                        type="button"
                        onClick={() => setSelectedDate(d)}
                        className={`aspect-square rounded-lg text-xs font-medium flex items-center justify-center transition-colors ${
                          isSelected ? 'bg-rose-500 text-white' : isToday ? 'text-rose-500 font-bold' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                        }`}
                      >
                        {d.getDate()}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Tasks */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-800 dark:text-slate-100 text-sm">My Tasks</h2>
              <span className="inline-flex items-center justify-center min-w-6 h-6 px-1.5 rounded-full bg-rose-500 text-white text-xs font-semibold">{tasks.length}</span>
            </div>
            {tasks.length === 0 ? (
              <p className="text-sm text-slate-400 py-8 text-center">You're all caught up.</p>
            ) : (
              <div className="space-y-3">
                {tasks.map(task => (
                  <Link key={task.id} to={task.to} className="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors">
                    <span className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${TASK_COLORS[task.color]}`}>
                      <task.icon size={16} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{task.title}</p>
                      <p className="text-xs text-slate-400 truncate">{task.subtitle}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
