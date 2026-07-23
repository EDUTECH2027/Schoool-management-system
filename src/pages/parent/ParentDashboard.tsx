import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight, ChevronDown, Plus, CheckCircle2, Circle,
  Wallet, Megaphone, Pin, ArrowUpRight,
} from 'lucide-react';
import { api } from '../../api/client';
import type { Student, Mark, ScheduleEntry, AttendanceRecord, ReportCard, BehaviorRecord, FeeRecord, Announcement } from '../../api/client';

const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DOW = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

const PALETTE = [
  { bg: 'bg-amber-100 dark:bg-amber-500/15', text: 'text-amber-800 dark:text-amber-300', border: 'border-amber-300 dark:border-amber-500/30' },
  { bg: 'bg-rose-100 dark:bg-rose-500/15', text: 'text-rose-800 dark:text-rose-300', border: 'border-rose-300 dark:border-rose-500/30' },
  { bg: 'bg-violet-100 dark:bg-violet-500/15', text: 'text-violet-800 dark:text-violet-300', border: 'border-violet-300 dark:border-violet-500/30' },
  { bg: 'bg-emerald-100 dark:bg-emerald-500/15', text: 'text-emerald-800 dark:text-emerald-300', border: 'border-emerald-300 dark:border-emerald-500/30' },
  { bg: 'bg-sky-100 dark:bg-sky-500/15', text: 'text-sky-800 dark:text-sky-300', border: 'border-sky-300 dark:border-sky-500/30' },
];

function colorFor(key: string) {
  let h = 0;
  for (const c of key) h = (h * 31 + c.charCodeAt(0)) % 997;
  return PALETTE[h % PALETTE.length];
}

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

function formatHour(h: number) {
  const period = h < 12 ? 'AM' : 'PM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12} ${period}`;
}

function mondayOf(d: Date) {
  const monday = new Date(d);
  const offset = (d.getDay() + 6) % 7;
  monday.setDate(d.getDate() - offset);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

export default function ParentDashboard() {
  const [children, setChildren] = useState<Student[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [childPickerOpen, setChildPickerOpen] = useState(false);

  const [timetable, setTimetable] = useState<ScheduleEntry[]>([]);
  const [marks, setMarks] = useState<Mark[]>([]);
  const [attThis, setAttThis] = useState<AttendanceRecord[]>([]);
  const [reportCards, setReportCards] = useState<ReportCard[]>([]);
  const [behavior, setBehavior] = useState<BehaviorRecord[]>([]);
  const [fees, setFees] = useState<FeeRecord[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [weekOffset, setWeekOffset] = useState(0);

  useEffect(() => {
    api.portalParentChildren().then(kids => {
      setChildren(kids);
      setSelectedId(prev => prev ?? kids[0]?.id ?? null);
    }).catch(() => {});
    api.getAnnouncements({ audience: 'parents' }).then(setAnnouncements).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    const now = new Date();
    const firstOfThis = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);

    api.portalParentChildTimetable(selectedId).then(setTimetable).catch(() => setTimetable([]));
    api.portalParentChildMarks(selectedId).then(setMarks).catch(() => setMarks([]));
    api.portalParentChildAttendance(selectedId, { from: firstOfThis }).then(setAttThis).catch(() => setAttThis([]));
    api.portalParentChildReportCards(selectedId).then(setReportCards).catch(() => setReportCards([]));
    api.portalParentChildBehavior(selectedId).then(setBehavior).catch(() => setBehavior([]));
    api.portalParentChildFees(selectedId).then(setFees).catch(() => setFees([]));
  }, [selectedId]);

  const selectedChild = children.find(c => c.id === selectedId) ?? null;
  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Good Morning!' : now.getHours() < 18 ? 'Good Afternoon!' : 'Good Evening!';

  const weekStart = useMemo(() => {
    const d = mondayOf(now);
    d.setDate(d.getDate() + weekOffset * 7);
    return d;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekOffset]);
  const weekDates = useMemo(() => Array.from({ length: 5 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  }), [weekStart]);

  const teacherBySubject = useMemo(() => {
    const map = new Map<string, string>();
    timetable.forEach(e => { if (e.teacher_name && !map.has(e.subject_name)) map.set(e.subject_name, e.teacher_name); });
    return map;
  }, [timetable]);

  const times = timetable.map(e => parseTimeRange(e.time)).filter((t): t is [number, number] => !!t);
  const rangeStartHour = times.length ? Math.floor(Math.min(...times.map(t => t[0])) / 60) : 7;
  const rangeEndHour = times.length ? Math.ceil(Math.max(...times.map(t => t[1])) / 60) : 14;
  const hours = Array.from({ length: Math.max(rangeEndHour - rangeStartHour, 1) + 1 }, (_, i) => rangeStartHour + i);
  const ROW_H = 52;
  const gridHeight = (hours.length - 1) * ROW_H;

  const attPct = attThis.length ? Math.round((attThis.filter(a => a.status === 'present').length / attThis.length) * 100) : null;
  const latestCard = reportCards[0];
  const avgPct = latestCard ? Math.round(latestCard.percentage) : null;
  const posLabel = latestCard ? `${latestCard.class_position ?? '—'}/${latestCard.out_of ?? '—'}` : null;
  const positiveBehavior = behavior.filter(b => b.category === 'positive').length;
  const negativeBehavior = behavior.filter(b => b.category === 'negative').length;
  const behaviorTotal = positiveBehavior + negativeBehavior;
  const behaviorPct = behaviorTotal ? Math.round((positiveBehavior / behaviorTotal) * 100) : null;

  const recentMarks = useMemo(() => [...marks].sort((a, b) => b.id.localeCompare(a.id)).slice(0, 5), [marks]);

  const dueFees = useMemo(() => [...fees]
    .filter(f => f.balance > 0)
    .sort((a, b) => a.due_date.localeCompare(b.due_date))
    .slice(0, 4), [fees]);

  const statTiles = [
    { key: 'average', label: 'Average', sub: posLabel ? `Position ${posLabel}` : 'All grades', value: avgPct, bar: 'bg-indigo-500', to: `/parent/children/${selectedId}/marks` },
    { key: 'attendance', label: 'Attendance', sub: 'This month', value: attPct, bar: 'bg-sky-500', to: `/parent/children/${selectedId}/attendance` },
    { key: 'behavior', label: 'Behavior', sub: 'All behavior', value: behaviorPct, bar: 'bg-emerald-500', to: `/parent/children/${selectedId}` },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">{greeting}</h1>

        {children.length > 0 && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setChildPickerOpen(v => !v)}
              className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full pl-1.5 pr-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-200"
            >
              <span className="w-7 h-7 rounded-full bg-violet-600 text-white flex items-center justify-center text-xs font-semibold shrink-0">
                {selectedChild ? `${selectedChild.first_name[0]}${selectedChild.last_name[0]}` : '?'}
              </span>
              {selectedChild ? `${selectedChild.first_name} ${selectedChild.last_name}` : 'Select child'}
              <ChevronDown size={14} className={childPickerOpen ? 'rotate-180 transition-transform' : 'transition-transform'} />
            </button>
            {childPickerOpen && children.length > 1 && (
              <div className="absolute right-0 top-full mt-1.5 w-56 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg py-1 z-20">
                {children.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => { setSelectedId(c.id); setChildPickerOpen(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                  >
                    <span className="w-7 h-7 rounded-full bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 flex items-center justify-center text-xs font-semibold shrink-0">
                      {c.first_name[0]}{c.last_name[0]}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate">{c.first_name} {c.last_name}</span>
                      <span className="block text-xs text-slate-400 truncate">{c.class_name}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {children.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-8 text-center text-slate-400">
          No children linked to your account yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left / main column */}
          <div className="lg:col-span-2 space-y-5">
            {/* This Week calendar */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-slate-800 dark:text-slate-100 text-sm">This Week</h2>
                <div className="flex items-center gap-1.5">
                  <button type="button" onClick={() => setWeekOffset(o => o - 1)} className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-300 hover:bg-slate-200">
                    <ChevronLeft size={14} />
                  </button>
                  <button type="button" onClick={() => setWeekOffset(o => o + 1)} className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-300 hover:bg-slate-200">
                    <ChevronRight size={14} />
                  </button>
                  <button type="button" onClick={() => setWeekOffset(0)} className="px-3 h-7 rounded-full bg-slate-100 dark:bg-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200">
                    All
                  </button>
                </div>
              </div>

              {timetable.length === 0 ? (
                <p className="text-sm text-slate-400 py-10 text-center">No timetable available for this class yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <div className="grid min-w-[640px]" style={{ gridTemplateColumns: '52px repeat(5, 1fr)' }}>
                    <div />
                    {weekDates.map(d => {
                      const isToday = d.toDateString() === now.toDateString();
                      return (
                        <div key={d.toISOString()} className="text-center pb-2">
                          <p className={`text-[10px] font-semibold uppercase tracking-wide ${isToday ? 'text-violet-600' : 'text-slate-400'}`}>{WEEKDAY_SHORT[d.getDay()]}</p>
                          <p className={`text-sm font-bold ${isToday ? 'text-violet-600' : 'text-slate-700 dark:text-slate-200'}`}>{d.getDate()}</p>
                        </div>
                      );
                    })}

                    <div className="relative" style={{ height: gridHeight }}>
                      {hours.slice(0, -1).map(h => (
                        <div key={h} className="absolute left-0 -translate-y-1/2 text-[10px] text-slate-400" style={{ top: (h - rangeStartHour) * ROW_H }}>
                          {formatHour(h)}
                        </div>
                      ))}
                    </div>
                    {weekDates.map(d => {
                      const dow = DOW[d.getDay()];
                      const dayEntries = timetable.filter(e => e.day === dow).map(e => ({ ...e, range: parseTimeRange(e.time) })).filter(e => e.range);
                      return (
                        <div key={d.toISOString()} className="relative border-l border-slate-100 dark:border-slate-700" style={{ height: gridHeight }}>
                          {hours.slice(0, -1).map(h => (
                            <div key={h} className="absolute left-0 right-0 border-t border-slate-50 dark:border-slate-700/50" style={{ top: (h - rangeStartHour) * ROW_H }} />
                          ))}
                          {dayEntries.map(e => {
                            const [start, end] = e.range as [number, number];
                            const top = ((start - rangeStartHour * 60) / 60) * ROW_H;
                            const height = Math.max(((end - start) / 60) * ROW_H, 22);
                            const c = colorFor(e.subject_name);
                            return (
                              <div
                                key={e.id}
                                title={`${e.subject_name} · ${e.time} · ${e.teacher_name ?? ''}`}
                                className={`absolute left-0.5 right-0.5 rounded-lg border px-2 py-1 overflow-hidden ${c.bg} ${c.border} ${c.text}`}
                                style={{ top, height }}
                              >
                                <p className="text-[11px] font-semibold truncate">{e.subject_name}</p>
                                <p className="text-[10px] opacity-80 truncate">{e.time}</p>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {/* Stats */}
              <div className="sm:col-span-1 space-y-3">
                {statTiles.map(({ key, label, sub, value, bar, to }) => (
                  <Link key={key} to={to} className="flex items-center justify-between bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 hover:border-slate-300 dark:hover:border-slate-600 transition-colors">
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm">{label}</p>
                      <p className="text-xs text-slate-400">{sub}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-2xl font-bold text-slate-800 dark:text-slate-100">{value !== null ? `${value}%` : '—'}</span>
                      <span className={`w-1.5 h-9 rounded-full ${bar}`} />
                    </div>
                  </Link>
                ))}
              </div>

              {/* Recent marks */}
              <div className="sm:col-span-2 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-semibold text-slate-800 dark:text-slate-100 text-sm">Recent Marks</h2>
                  <Link to={`/parent/children/${selectedId}/marks`} className="text-xs font-medium text-violet-600 hover:text-violet-700">View all</Link>
                </div>
                {recentMarks.length === 0 ? (
                  <p className="text-sm text-slate-400 py-8 text-center">No marks recorded yet.</p>
                ) : (
                  <div>
                    <div className="grid grid-cols-[1fr_auto_auto] gap-3 text-[10px] font-semibold uppercase tracking-wide text-slate-400 pb-2 border-b border-slate-100 dark:border-slate-700">
                      <span>Subject</span>
                      <span className="w-14 text-right">Score</span>
                      <span className="w-8" />
                    </div>
                    {recentMarks.map(m => {
                      const passed = m.total_score >= 50;
                      return (
                        <div key={m.id} className="grid grid-cols-[1fr_auto_auto] gap-3 items-center py-2.5 border-b border-slate-50 dark:border-slate-700/60 last:border-0">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{m.subject_name}</p>
                            <p className="text-xs text-slate-400 truncate">{teacherBySubject.get(m.subject_name) ?? m.remark ?? '—'}</p>
                          </div>
                          <span className="w-14 text-right text-sm font-semibold text-slate-700 dark:text-slate-200">{Math.round(m.total_score)}%</span>
                          <span className="w-8 flex justify-center">
                            {passed ? <CheckCircle2 size={17} className="text-emerald-500" /> : <Circle size={17} className="text-slate-300 dark:text-slate-600" />}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-5">
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-slate-800 dark:text-slate-100 text-sm">Reminders</h2>
                <div className="flex items-center gap-1.5">
                  <Link to={`/parent/children/${selectedId}/fees`} className="w-7 h-7 rounded-full bg-violet-600 text-white flex items-center justify-center hover:bg-violet-700">
                    <Plus size={14} />
                  </Link>
                  <Link to={`/parent/children/${selectedId}/fees`} className="px-3 h-7 rounded-full border border-slate-200 dark:border-slate-700 flex items-center text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700">
                    All
                  </Link>
                </div>
              </div>
              {dueFees.length === 0 ? (
                <p className="text-sm text-slate-400 py-4 text-center">No fee reminders — all paid up.</p>
              ) : (
                <div className="space-y-3">
                  {dueFees.map(f => {
                    const d = new Date(f.due_date);
                    const overdue = d < now;
                    return (
                      <div key={f.id} className="flex items-center gap-3">
                        <div className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center shrink-0 ${overdue ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-300' : 'bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                          <span className="text-sm font-bold leading-none">{d.getDate()}</span>
                          <span className="text-[9px] uppercase leading-none mt-0.5">{d.toLocaleDateString('en-GB', { month: 'short' })}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{f.fee_name}</p>
                          <p className="text-xs text-slate-400 flex items-center gap-1">
                            <Wallet size={11} />Balance {f.balance.toLocaleString()}{overdue ? ' · overdue' : ''}
                          </p>
                        </div>
                        <Circle size={17} className="text-slate-300 dark:text-slate-600 shrink-0" />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-slate-800 dark:text-slate-100 text-sm">Announcements</h2>
                <Link to="/parent/profile" className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700">
                  More <ArrowUpRight size={12} />
                </Link>
              </div>
              {announcements.length === 0 ? (
                <p className="text-sm text-slate-400 py-4 text-center">No announcements.</p>
              ) : (
                <div className="space-y-3">
                  {announcements.slice(0, 3).map(a => (
                    <div key={a.id} className="bg-slate-50 dark:bg-slate-900/40 rounded-xl p-3.5">
                      <div className="flex items-start gap-3">
                        <span className="w-9 h-9 rounded-lg bg-violet-100 dark:bg-violet-500/20 flex items-center justify-center shrink-0">
                          <Megaphone size={15} className="text-violet-700 dark:text-violet-300" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-medium text-slate-700 dark:text-slate-200 text-sm truncate">{a.title}</p>
                            {!!a.is_pinned && (
                              <span className="inline-flex items-center gap-0.5 bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900 text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0">
                                <Pin size={9} />Pinned
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {new Date(a.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
