import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen, CalendarCheck, Award, ArrowUpRight, ArrowDownRight, MoreHorizontal,
  ChevronRight, Clock, MapPin, Megaphone, Pin, CheckCircle2, CircleDashed, Timer,
} from 'lucide-react';
import { api } from '../../api/client';
import type { Student, ScheduleEntry, ReportCard, Announcement } from '../../api/client';

const DOW = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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

function formatDay(d: Date) {
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

interface Scheduled extends ScheduleEntry { date: Date; range: [number, number] | null }

function buildUpcoming(timetable: ScheduleEntry[], todayDow: string, nowMinutes: number, limit: number): Scheduled[] {
  const now = new Date();
  const results: Scheduled[] = [];

  const todaysRemaining = timetable
    .filter(e => e.day === todayDow)
    .map(e => ({ ...e, date: now, range: parseTimeRange(e.time) }))
    .filter(e => !e.range || e.range[1] > nowMinutes)
    .sort((a, b) => (a.range?.[0] ?? 0) - (b.range?.[0] ?? 0));
  results.push(...todaysRemaining.slice(0, limit));

  for (let i = 1; i <= 6 && results.length < limit; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    const dow = DOW[d.getDay()];
    const dayEntries = timetable
      .filter(e => e.day === dow)
      .map(e => ({ ...e, date: d, range: parseTimeRange(e.time) }))
      .sort((a, b) => (a.range?.[0] ?? 0) - (b.range?.[0] ?? 0));
    results.push(...dayEntries.slice(0, limit - results.length));
  }
  return results;
}

function DonutChart({ segments, size = 168, strokeWidth = 24 }: { segments: { value: number; color: string }[]; size?: number; strokeWidth?: number }) {
  const total = segments.reduce((sum, s) => sum + s.value, 0) || 1;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashes = segments.map(s => (s.value / total) * circumference);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={strokeWidth} className="stroke-slate-100 dark:stroke-slate-700" />
      {segments.map((s, i) => {
        const dash = dashes[i];
        const offset = dashes.slice(0, i).reduce((sum, d) => sum + d, 0);
        return (
          <circle
            key={i} cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={s.color}
            strokeWidth={strokeWidth} strokeDasharray={`${dash} ${circumference - dash}`}
            strokeDashoffset={-offset} strokeLinecap="butt"
          />
        );
      })}
    </svg>
  );
}

const CHART_H = 176;

export default function StudentDashboard() {
  const [student, setStudent] = useState<Student | null>(null);
  const [reportCards, setReportCards] = useState<ReportCard[]>([]);
  const [timetable, setTimetable] = useState<ScheduleEntry[]>([]);
  const [attThis, setAttThis] = useState<{ status: string }[]>([]);
  const [attPrev, setAttPrev] = useState<{ status: string } []>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  useEffect(() => {
    const now = new Date();
    const firstOfThis = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const firstOfPrev = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10);
    const lastOfPrev = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0, 10);

    api.portalStudentProfile().then(setStudent).catch(() => {});
    api.portalStudentReportCards().then(setReportCards).catch(() => {});
    api.portalStudentTimetable().then(setTimetable).catch(() => {});
    api.portalStudentAttendance({ from: firstOfThis }).then(setAttThis).catch(() => {});
    api.portalStudentAttendance({ from: firstOfPrev, to: lastOfPrev }).then(setAttPrev).catch(() => {});
    api.getAnnouncements({ audience: 'students' }).then(setAnnouncements).catch(() => {});
  }, []);

  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const todayDow = DOW[now.getDay()];

  const todaysSchedule = useMemo(() => timetable
    .filter(e => e.day === todayDow)
    .map(e => ({ ...e, range: parseTimeRange(e.time) }))
    .sort((a, b) => (a.range?.[0] ?? 0) - (b.range?.[0] ?? 0)),
  [timetable, todayDow]);

  const doneCount = todaysSchedule.filter(e => e.range && nowMinutes >= e.range[1]).length;
  const totalToday = todaysSchedule.length;
  const classesPct = totalToday > 0 ? Math.round((doneCount / totalToday) * 100) : 0;

  const weeklyAvg = useMemo(() => {
    const perDay = new Map<string, number>();
    timetable.forEach(e => perDay.set(e.day, (perDay.get(e.day) ?? 0) + 1));
    const counts = [...perDay.values()];
    return counts.length ? counts.reduce((a, b) => a + b, 0) / counts.length : 0;
  }, [timetable]);
  const classesDelta = totalToday > 0 && weeklyAvg > 0 ? Math.round(((totalToday - weeklyAvg) / weeklyAvg) * 100) : null;

  const attPct = (rows: { status: string }[]) => rows.length ? Math.round((rows.filter(r => r.status === 'present').length / rows.length) * 100) : 0;
  const attendancePct = attPct(attThis);
  const attendancePrevPct = attPrev.length ? attPct(attPrev) : null;
  const attendanceDelta = attendancePrevPct !== null ? attendancePct - attendancePrevPct : null;

  const latestCard = reportCards[0];
  const prevCard = reportCards[1];
  const avgScorePct = latestCard ? Math.round(latestCard.percentage) : 0;
  const avgScoreDelta = latestCard && prevCard ? Math.round(latestCard.percentage - prevCard.percentage) : null;
  const positionLabel = latestCard ? `${latestCard.class_position ?? '—'}/${latestCard.out_of ?? '—'}` : null;

  const subjects = latestCard?.entries ?? [];
  const excellent = subjects.filter(e => e.total_score >= 80).length;
  const good = subjects.filter(e => e.total_score >= 50 && e.total_score < 80).length;
  const needsWork = subjects.filter(e => e.total_score < 50).length;

  const upcoming = useMemo(() => buildUpcoming(timetable, todayDow, nowMinutes, 3), [timetable, todayDow, nowMinutes]);

  const weekDates = useMemo(() => {
    const monday = new Date(now);
    const offset = (now.getDay() + 6) % 7;
    monday.setDate(now.getDate() - offset);
    return Array.from({ length: 5 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const statCards = [
    {
      key: 'classes', label: "Today's Classes", icon: BookOpen, bg: 'bg-amber-300 dark:bg-amber-500/80',
      value: `${classesPct}%`, delta: classesDelta, sub: totalToday ? `${doneCount} out of ${totalToday} classes` : 'No classes scheduled today',
      to: '/student/timetable',
    },
    {
      key: 'attendance', label: 'Attendance Rate', icon: CalendarCheck, bg: 'bg-rose-200 dark:bg-rose-500/70',
      value: `${attendancePct}%`, delta: attendanceDelta, sub: 'Based on this month',
      to: '/student/attendance',
    },
    {
      key: 'score', label: 'Average Score', icon: Award, bg: 'bg-violet-200 dark:bg-violet-500/70',
      value: `${avgScorePct}%`, delta: avgScoreDelta, sub: positionLabel ? `Class position ${positionLabel}` : 'No report card yet',
      to: '/student/marks',
    },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">
          Welcome{student ? `, ${student.first_name}` : ''}!
        </h1>
        <p className="text-slate-500 text-sm mt-0.5">
          {student?.class_name ?? ''} · {now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {statCards.map(({ key, label, icon: Icon, bg, value, delta, sub, to }) => (
          <div key={key} className={`${bg} rounded-2xl p-5 flex flex-col gap-4`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-full bg-white/70 flex items-center justify-center shrink-0">
                  <Icon size={17} className="text-slate-900" />
                </span>
                <span className="font-semibold text-slate-900 text-sm">{label}</span>
              </div>
              <button type="button" className="w-7 h-7 rounded-full bg-white/50 flex items-center justify-center shrink-0" aria-hidden>
                <MoreHorizontal size={15} className="text-slate-900" />
              </button>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-3xl font-bold text-slate-900">{value}</span>
                  {delta !== null && (
                    <span className="inline-flex items-center gap-0.5 bg-white/70 text-slate-900 text-[11px] font-semibold px-1.5 py-0.5 rounded-full">
                      {delta >= 0 ? <ArrowUpRight size={11} className="text-emerald-600" /> : <ArrowDownRight size={11} className="text-red-600" />}
                      {Math.abs(delta)}%
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-700 mt-1">{sub}</p>
              </div>
            </div>
            <Link to={to} className="self-start inline-flex items-center gap-1 bg-white/80 hover:bg-white text-slate-900 text-xs font-semibold px-3.5 py-1.5 rounded-full transition-colors">
              See Details <ArrowUpRight size={12} />
            </Link>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left/main column */}
        <div className="lg:col-span-2 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-5">
            {/* Score chart */}
            <div className="sm:col-span-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-slate-800 dark:text-slate-100 text-sm">Score by Subject</h2>
                <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
                  <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-600" />{prevCard?.term_name ?? 'Past'}</span>
                  <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-300" />{latestCard?.term_name ?? 'Recent'}</span>
                </div>
              </div>

              {subjects.length === 0 ? (
                <p className="text-sm text-slate-400 py-10 text-center">No report card published yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <div className="relative flex items-end gap-4 min-w-max px-1" style={{ height: CHART_H }}>
                    <div
                      className="absolute left-0 right-0 border-t border-dashed border-slate-400 dark:border-slate-500 z-10"
                      style={{ top: CHART_H * (1 - 70 / 100) }}
                    >
                      <span className="absolute -top-3 left-0 bg-slate-800 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap">
                        Pass mark 70%
                      </span>
                    </div>
                    {subjects.map(e => {
                      const pastEntry = prevCard?.entries.find(p => p.subject_name === e.subject_name);
                      return (
                        <div key={e.subject_id} className="flex flex-col items-center gap-2 shrink-0">
                          <div className="flex items-end gap-1" style={{ height: CHART_H }}>
                            <div
                              title={`${e.subject_name} (${prevCard?.term_name ?? 'past'}): ${pastEntry ? Math.round(pastEntry.total_score) : '—'}`}
                              className="w-4 rounded-t bg-slate-300 dark:bg-slate-600"
                              style={{ height: `${Math.max(pastEntry ? pastEntry.total_score : 0, 2)}%` }}
                            />
                            <div
                              title={`${e.subject_name} (${latestCard?.term_name ?? 'recent'}): ${Math.round(e.total_score)}`}
                              className="w-4 rounded-t bg-rose-300"
                              style={{
                                height: `${Math.max(e.total_score, 2)}%`,
                                backgroundImage: 'repeating-linear-gradient(135deg, rgba(255,255,255,.7) 0 3px, transparent 3px 6px)',
                              }}
                            />
                          </div>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 text-center max-w-12 truncate" title={e.subject_name}>
                            {e.subject_name.split(' ')[0]}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Donut */}
            <div className="sm:col-span-2 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 flex flex-col">
              <h2 className="font-semibold text-slate-800 dark:text-slate-100 text-sm mb-3">Grade Breakdown</h2>
              {subjects.length === 0 ? (
                <p className="text-sm text-slate-400 py-10 text-center">No data yet.</p>
              ) : (
                <>
                  <div className="relative mx-auto">
                    <DonutChart segments={[
                      { value: excellent, color: '#1e293b' },
                      { value: good, color: '#fcd34d' },
                      { value: needsWork, color: '#c4b5fd' },
                    ]} />
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-lg font-bold text-slate-800 dark:text-slate-100">{subjects.length}</span>
                      <span className="text-[10px] text-slate-400">Subjects</span>
                    </div>
                  </div>
                  <div className="mt-4 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300"><span className="w-2.5 h-2.5 rounded-full bg-slate-800" />Excellent (80+)</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-200">{excellent}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300"><span className="w-2.5 h-2.5 rounded-full bg-amber-300" />Good (50–79)</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-200">{good}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300"><span className="w-2.5 h-2.5 rounded-full bg-violet-300" />Needs Work (&lt;50)</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-200">{needsWork}</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Activities schedule */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-slate-800 dark:text-slate-100 text-sm">Today's Schedule</h2>
              <span className="inline-flex items-center gap-1.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-medium px-3 py-1.5 rounded-full">
                {formatDay(now)}
              </span>
            </div>
            {todaysSchedule.length === 0 ? (
              <p className="text-sm text-slate-400 py-6 text-center">No classes scheduled today.</p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-700">
                {todaysSchedule.map(s => {
                  const status = !s.range ? 'upcoming' : nowMinutes >= s.range[1] ? 'done' : nowMinutes >= s.range[0] ? 'in_progress' : 'upcoming';
                  const badge = status === 'done'
                    ? { label: 'Done', color: 'text-emerald-600', dot: 'bg-emerald-500', icon: CheckCircle2 }
                    : status === 'in_progress'
                    ? { label: 'In progress', color: 'text-rose-600', dot: 'bg-rose-500', icon: Timer }
                    : { label: 'Upcoming', color: 'text-slate-400', dot: 'bg-slate-300', icon: CircleDashed };
                  return (
                    <div key={s.id} className="flex items-center gap-3 py-3">
                      <span className="w-9 h-9 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center shrink-0">
                        <BookOpen size={15} className="text-violet-600 dark:text-violet-300" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-slate-700 dark:text-slate-200 text-sm truncate">{s.subject_name}</p>
                        {s.room && <p className="text-xs text-slate-400 flex items-center gap-1"><MapPin size={10} />{s.room}</p>}
                      </div>
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${badge.color}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />{badge.label}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400 w-28 text-right shrink-0 flex items-center gap-1 justify-end">
                        <Clock size={11} />{s.time ?? s.period_label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-5">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-800 dark:text-slate-100 text-sm">Upcoming Classes</h2>
              <Link to="/student/timetable" className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700">
                All <ChevronRight size={12} />
              </Link>
            </div>

            <div className="flex gap-1.5 mb-4">
              {weekDates.map(d => {
                const isToday = d.toDateString() === now.toDateString();
                return (
                  <div
                    key={d.toISOString()}
                    className={`flex-1 flex flex-col items-center gap-1 rounded-xl py-2 text-xs font-semibold ${
                      isToday ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900' : 'bg-slate-50 dark:bg-slate-900/40 text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    <span>{d.getDate()}</span>
                    <span className="font-normal">{WEEKDAY_SHORT[d.getDay()]}</span>
                  </div>
                );
              })}
            </div>

            {upcoming.length === 0 ? (
              <p className="text-sm text-slate-400 py-4 text-center">No upcoming classes.</p>
            ) : (
              <div className="space-y-3">
                {upcoming.map((s, i) => (
                  <div key={`${s.id}-${i}`} className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-700 last:border-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="text-[11px] text-slate-400">{formatDay(s.date)} · {s.time ?? s.period_label}</p>
                      <p className="font-medium text-slate-700 dark:text-slate-200 text-sm truncate">{s.subject_name}</p>
                    </div>
                    <Link to="/student/timetable" className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-700 flex items-center justify-center shrink-0 text-slate-400 hover:text-slate-700">
                      <ArrowUpRight size={14} />
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-800 dark:text-slate-100 text-sm">Announcements</h2>
              <Link to="/student/profile" className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700">
                All <ChevronRight size={12} />
              </Link>
            </div>
            {announcements.length === 0 ? (
              <p className="text-sm text-slate-400 py-4 text-center">No announcements.</p>
            ) : (
              <div className="space-y-3">
                {announcements.slice(0, 3).map(a => (
                  <div key={a.id} className="bg-slate-50 dark:bg-slate-900/40 rounded-xl p-3.5">
                    <div className="flex items-start gap-3">
                      <span className="w-9 h-9 rounded-lg bg-amber-200 dark:bg-amber-500/30 flex items-center justify-center shrink-0">
                        <Megaphone size={15} className="text-amber-700 dark:text-amber-300" />
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
    </div>
  );
}
