import { useState } from 'react';
import {
  X, Mail, Phone, Calendar, BookOpen, GraduationCap,
  ClipboardCheck, Clock, Users,
} from 'lucide-react';
import type { Teacher, TeacherAttendance, TeacherScheduleEntry } from '../../types';
import { classes, students } from '../../data/mockData';
import { useLanguage } from '../../i18n/LanguageContext';
import { StatusBadge } from '../ui/Badge';

interface Props {
  teacher: Teacher;
  attendance: TeacherAttendance[];
  schedule: TeacherScheduleEntry[];
  onClose: () => void;
}

type Tab = 'overview' | 'classes' | 'attendance' | 'schedule';

const bannerGradients = [
  'from-indigo-700 to-indigo-400',
  'from-teal-700 to-emerald-400',
  'from-violet-700 to-purple-400',
  'from-blue-700 to-sky-400',
  'from-rose-700 to-pink-400',
  'from-amber-600 to-yellow-400',
];

const DAYS: Array<{ key: string; label: string }> = [
  { key: 'monday', label: 'Mon' }, { key: 'tuesday', label: 'Tue' },
  { key: 'wednesday', label: 'Wed' }, { key: 'thursday', label: 'Thu' },
  { key: 'friday', label: 'Fri' },
];

const PERIODS = [
  { key: 'p1', label: 'P1', time: '07:30–08:10' },
  { key: 'p2', label: 'P2', time: '08:10–08:50' },
  { key: 'p3', label: 'P3', time: '09:10–09:50' },
  { key: 'p4', label: 'P4', time: '09:50–10:30' },
  { key: 'p5', label: 'P5', time: '10:30–11:10' },
  { key: 'p6', label: 'P6', time: '11:50–12:30' },
  { key: 'p7', label: 'P7', time: '12:30–13:10' },
];

const subjectColors: Record<string, string> = {
  'English Language':   'bg-blue-100 text-blue-700',
  'Mathematics':        'bg-green-100 text-green-700',
  'General Science':    'bg-emerald-100 text-emerald-700',
  'Social Studies':     'bg-orange-100 text-orange-700',
  'Shona':              'bg-rose-100 text-rose-700',
  'Religious & Moral':  'bg-purple-100 text-purple-700',
  'Art & Craft':        'bg-pink-100 text-pink-700',
  'Physical Education': 'bg-teal-100 text-teal-700',
};

export default function TeacherDetailModal({ teacher, attendance, schedule, onClose }: Props) {
  const { t, lang } = useLanguage();
  const [tab, setTab] = useState<Tab>('overview');

  const gradient = bannerGradients[parseInt(teacher.id.replace(/\D/g, '') || '0') % bannerGradients.length];

  // Dynamic calendar for the current month
  const calNow   = new Date();
  const calYear  = calNow.getFullYear();
  const calMonth = calNow.getMonth();
  const calMonthLabel = calNow.toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-GB', { month: 'long', year: 'numeric' });

  const calendarWeeks = (() => {
    const weeks: (string | null)[][] = [];
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(calYear, calMonth, day);
      const dow = d.getDay(); // 0=Sun…6=Sat
      if (dow === 0 || dow === 6) continue;
      const pos = dow - 1; // Mon=0…Fri=4
      if (pos === 0 || weeks.length === 0) {
        weeks.push(pos > 0 ? (new Array(pos).fill(null) as null[]) : []);
      }
      weeks[weeks.length - 1].push(d.toISOString().split('T')[0]);
    }
    if (weeks.length > 0) {
      const last = weeks[weeks.length - 1];
      while (last.length < 5) last.push(null);
    }
    return weeks;
  })();

  // Stats
  const yearsOfService = new Date().getFullYear() - new Date(teacher.joinDate).getFullYear();
  const assignedClasses = classes.filter(c => c.classTeacherId === teacher.id);
  const periodsPerWeek  = schedule.length;

  // Attendance summary
  const attSummary = {
    present: attendance.filter(a => a.status === 'present').length,
    absent:  attendance.filter(a => a.status === 'absent').length,
    late:    attendance.filter(a => a.status === 'late').length,
    total:   attendance.length,
  };

  const tabs: { key: Tab; label: string; icon: typeof BookOpen }[] = [
    { key: 'overview',    label: t.teachers.overview,           icon: GraduationCap  },
    { key: 'classes',     label: t.teachers.classesTeaching,    icon: BookOpen       },
    { key: 'attendance',  label: t.teachers.attendanceRecord,   icon: ClipboardCheck },
    { key: 'schedule',    label: t.teachers.schedule,           icon: Clock          },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >

        {/* ── Banner ──────────────────────────────────────────── */}
        <div className={`relative bg-linear-to-r ${gradient} px-6 pt-6 pb-5 text-white shrink-0 overflow-hidden`}>
          <GraduationCap size={140} className="absolute -right-6 -top-4 text-white/8 pointer-events-none" />
          <div className="absolute top-0 inset-x-0 h-px bg-white/30" />

          <button onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition-colors">
            <X size={16} className="text-white" />
          </button>

          <div className="flex items-center gap-4 mb-4">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-extrabold shadow-md
              ${teacher.gender === 'female' ? 'bg-pink-200 text-pink-800' : 'bg-blue-200 text-blue-800'}`}>
              {teacher.firstName[0]}{teacher.lastName[0]}
            </div>
            <div>
              <h2 className="text-xl font-extrabold tracking-tight">{teacher.firstName} {teacher.lastName}</h2>
              <p className="text-white/70 text-sm">{teacher.qualification}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="bg-white/20 text-white text-xs px-2 py-0.5 rounded-full font-medium">
                  {teacher.isActive ? t.common.active : t.common.inactive}
                </span>
              </div>
            </div>
          </div>

          {/* 4 stat pills */}
          <div className="grid grid-cols-4 gap-2.5">
            {[
              { label: t.teachers.subjects,       value: teacher.subjects.length  },
              { label: lang === 'fr' ? 'Classes'  : 'Classes',  value: assignedClasses.length   },
              { label: t.teachers.yearsOfService, value: yearsOfService            },
              { label: t.teachers.periodsPerWeek, value: periodsPerWeek            },
            ].map(s => (
              <div key={s.label} className="bg-white/15 rounded-xl py-2.5 px-3 text-center backdrop-blur-sm">
                <p className="text-white font-extrabold text-xl leading-none">{s.value}</p>
                <p className="text-white/65 text-xs mt-1 leading-tight">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Tab bar ─────────────────────────────────────────── */}
        <div className="flex border-b border-slate-200 shrink-0 bg-white">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors border-b-2 ${
                tab === key
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>

        {/* ── Tab content ─────────────────────────────────────── */}
        <div className="overflow-y-auto flex-1 p-5">

          {/* ── OVERVIEW ──────────────────────────────────────── */}
          {tab === 'overview' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                {/* Contact info */}
                <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                    {lang === 'fr' ? 'Coordonnées' : 'Contact'}
                  </p>
                  <div className="space-y-2.5">
                    <a href={`mailto:${teacher.email}`}
                      className="flex items-center gap-3 text-sm text-slate-700 hover:text-indigo-600 transition-colors">
                      <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
                        <Mail size={14} className="text-indigo-600" />
                      </div>
                      <div>
                        <p className="text-slate-400 text-xs">{lang === 'fr' ? 'Email' : 'Email'}</p>
                        <p className="font-medium">{teacher.email}</p>
                      </div>
                    </a>
                    <div className="flex items-center gap-3 text-sm text-slate-700">
                      <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
                        <Phone size={14} className="text-green-600" />
                      </div>
                      <div>
                        <p className="text-slate-400 text-xs">{lang === 'fr' ? 'Téléphone' : 'Phone'}</p>
                        <p className="font-medium">{teacher.phone}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-slate-700">
                      <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                        <Calendar size={14} className="text-amber-600" />
                      </div>
                      <div>
                        <p className="text-slate-400 text-xs">{t.teachers.joinDate}</p>
                        <p className="font-medium">{new Date(teacher.joinDate).toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Subjects + attendance summary */}
                <div className="space-y-4">
                  <div className="bg-slate-50 rounded-xl p-4">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2.5">{t.teachers.subjects}</p>
                    <div className="flex flex-wrap gap-2">
                      {teacher.subjects.map(sub => (
                        <span key={sub} className={`text-xs px-2.5 py-1 rounded-lg font-medium ${subjectColors[sub] ?? 'bg-slate-100 text-slate-600'}`}>
                          {sub}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-xl p-4">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
                      {lang === 'fr' ? `Assiduité (${calMonthLabel})` : `Attendance (${calMonthLabel})`}
                    </p>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-green-50 rounded-lg py-2">
                        <p className="text-green-700 font-bold text-lg">{attSummary.present}</p>
                        <p className="text-green-600 text-xs">{t.common.present}</p>
                      </div>
                      <div className="bg-red-50 rounded-lg py-2">
                        <p className="text-red-600 font-bold text-lg">{attSummary.absent}</p>
                        <p className="text-red-500 text-xs">{t.common.absent}</p>
                      </div>
                      <div className="bg-yellow-50 rounded-lg py-2">
                        <p className="text-yellow-700 font-bold text-lg">{attSummary.late}</p>
                        <p className="text-yellow-600 text-xs">{t.common.late}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── CLASSES ───────────────────────────────────────── */}
          {tab === 'classes' && (
            <div className="space-y-4">
              {/* Class teacher cards */}
              {assignedClasses.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
                    {lang === 'fr' ? 'Classes principales' : 'Class Teacher Assignments'}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {assignedClasses.map(cls => {
                      const clsStudents = students.filter(s => s.classId === cls.id);
                      const boys  = clsStudents.filter(s => s.gender === 'male').length;
                      const girls = clsStudents.filter(s => s.gender === 'female').length;
                      const pct   = Math.round((cls.enrolled / cls.capacity) * 100);
                      return (
                        <div key={cls.id} className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <p className="font-bold text-indigo-800">{cls.name}</p>
                              <p className="text-indigo-500 text-xs">{cls.gradeLevelName} · {cls.room}</p>
                            </div>
                            <div className="w-9 h-9 bg-indigo-200 rounded-lg flex items-center justify-center">
                              <BookOpen size={16} className="text-indigo-700" />
                            </div>
                          </div>
                          <div className="flex gap-3 text-xs mb-2">
                            <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">{boys} {t.classes.boys}</span>
                            <span className="bg-pink-100 text-pink-700 px-2 py-0.5 rounded-full font-medium">{girls} {t.classes.girls}</span>
                            <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">{cls.enrolled} total</span>
                          </div>
                          <div className="h-1.5 bg-indigo-100 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-400 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <p className="text-indigo-400 text-xs mt-1">{pct}% {lang === 'fr' ? 'occupé' : 'full'}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* All subjects taught (from schedule) */}
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
                  {lang === 'fr' ? 'Matières enseignées' : 'Subjects Taught'}
                </p>
                <div className="space-y-2">
                  {[...new Set(schedule.map(s => `${s.className}|${s.subjectName}`))].map(key => {
                    const [className, subjectName] = key.split('|');
                    return (
                      <div key={key} className="flex items-center justify-between py-2.5 px-3 bg-slate-50 rounded-xl">
                        <div className="flex items-center gap-3">
                          <span className={`text-xs px-2 py-0.5 rounded font-medium ${subjectColors[subjectName] ?? 'bg-slate-100 text-slate-600'}`}>
                            {subjectName}
                          </span>
                        </div>
                        <span className="bg-indigo-50 text-indigo-700 text-xs px-2 py-0.5 rounded font-medium">{className}</span>
                      </div>
                    );
                  })}
                  {schedule.length === 0 && (
                    <p className="text-slate-400 text-sm text-center py-6">{t.teachers.noSchedule}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── ATTENDANCE ────────────────────────────────────── */}
          {tab === 'attendance' && (
            <div className="space-y-4">
              {/* Summary row */}
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: lang === 'fr' ? 'Total jours' : 'Total Days', value: attSummary.total,   color: 'bg-slate-50 text-slate-700'   },
                  { label: t.common.present, value: attSummary.present, color: 'bg-green-50 text-green-700'  },
                  { label: t.common.absent,  value: attSummary.absent,  color: 'bg-red-50 text-red-700'      },
                  { label: t.common.late,    value: attSummary.late,    color: 'bg-yellow-50 text-yellow-700'},
                ].map(s => (
                  <div key={s.label} className={`rounded-xl p-3 text-center ${s.color}`}>
                    <p className="text-2xl font-bold">{s.value}</p>
                    <p className="text-xs font-medium opacity-80 mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Calendar-style grid */}
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
                  {calMonthLabel}
                </p>
                {/* Week headers */}
                <div className="grid grid-cols-5 gap-1.5 mb-2">
                  {['Mon','Tue','Wed','Thu','Fri'].map(d => (
                    <p key={d} className="text-center text-xs font-semibold text-slate-400">{d}</p>
                  ))}
                </div>
                {/* Days grid — dynamic */}
                {calendarWeeks.map((week, wi) => (
                  <div key={wi} className="grid grid-cols-5 gap-1.5 mb-1.5">
                    {week.map((date, di) => {
                      if (!date) return <div key={di} />;
                      const rec = attendance.find(a => a.date === date);
                      const day = new Date(date).getDate();
                      const statusColors: Record<string, string> = {
                        present: 'bg-green-400 text-white',
                        absent:  'bg-red-400 text-white',
                        late:    'bg-yellow-400 text-white',
                        excused: 'bg-blue-400 text-white',
                      };
                      const cls = rec ? (statusColors[rec.status] ?? 'bg-slate-200 text-slate-500') : 'bg-white border border-slate-200 text-slate-400';
                      return (
                        <div key={date} title={rec ? rec.status : date}
                          className={`h-9 rounded-lg flex items-center justify-center text-xs font-semibold cursor-default ${cls}`}>
                          {day}
                        </div>
                      );
                    })}
                  </div>
                ))}
                {/* Legend */}
                <div className="flex gap-3 mt-3 flex-wrap">
                  {[
                    { label: t.common.present, color: 'bg-green-400'  },
                    { label: t.common.absent,  color: 'bg-red-400'    },
                    { label: t.common.late,    color: 'bg-yellow-400' },
                  ].map(l => (
                    <div key={l.label} className="flex items-center gap-1.5">
                      <div className={`w-3 h-3 rounded ${l.color}`} />
                      <span className="text-xs text-slate-500">{l.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Detailed list */}
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                  {lang === 'fr' ? 'Jours non présents' : 'Non-Present Days'}
                </p>
                <div className="space-y-1.5">
                  {attendance.filter(a => a.status !== 'present').map(a => (
                    <div key={a.id} className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-lg">
                      <p className="text-sm text-slate-700">
                        {new Date(a.date).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                      </p>
                      <StatusBadge status={a.status} />
                    </div>
                  ))}
                  {attendance.filter(a => a.status !== 'present').length === 0 && (
                    <p className="text-slate-400 text-sm text-center py-4">
                      {lang === 'fr' ? 'Présent tous les jours !' : 'Present every day!'}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── TIMETABLE ─────────────────────────────────────── */}
          {tab === 'schedule' && (
            <div>
              {schedule.length === 0 ? (
                <div className="text-center py-16 text-slate-400">
                  <Clock size={36} className="mx-auto mb-2 opacity-20" />
                  <p>{t.teachers.noSchedule}</p>
                </div>
              ) : (
                <>
                  <div className="mb-4 flex items-center gap-4 text-sm text-slate-500">
                    <span className="flex items-center gap-1.5">
                      <Clock size={14} className="text-indigo-500" />
                      {periodsPerWeek} {t.teachers.periodsPerWeek}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Users size={14} className="text-indigo-500" />
                      {[...new Set(schedule.map(s => s.classId))].length} {lang === 'fr' ? 'classes' : 'classes'}
                    </span>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-slate-800 text-white">
                          <th className="text-left px-3 py-2.5 font-semibold w-20">
                            {lang === 'fr' ? 'Séance' : 'Period'}
                          </th>
                          <th className="text-left px-3 py-2.5 font-semibold w-28 text-white/60">
                            {lang === 'fr' ? 'Heure' : 'Time'}
                          </th>
                          {DAYS.map(d => (
                            <th key={d.key} className="text-center px-3 py-2.5 font-semibold">{d.label}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {PERIODS.map((period, idx) => (
                          <tr key={period.key} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                            <td className="px-3 py-2.5 font-semibold text-slate-600">{period.label}</td>
                            <td className="px-3 py-2.5 text-slate-400 whitespace-nowrap">{period.time}</td>
                            {DAYS.map(day => {
                              const entry = schedule.find(
                                s => s.periodKey === period.key && s.day === day.key
                              );
                              return (
                                <td key={day.key} className="px-2 py-2 text-center">
                                  {entry ? (
                                    <div className={`rounded-lg px-2 py-1 ${subjectColors[entry.subjectName] ?? 'bg-slate-100 text-slate-700'}`}>
                                      <p className="font-semibold leading-tight truncate max-w-[90px]">{entry.subjectName.split(' ')[0]}</p>
                                      <p className="text-[10px] opacity-70 leading-tight">{entry.className}</p>
                                    </div>
                                  ) : (
                                    <span className="text-slate-200 text-[10px]">{t.teachers.free}</span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Subject color legend */}
                  <div className="flex flex-wrap gap-2 mt-3">
                    {[...new Set(schedule.map(s => s.subjectName))].map(sub => (
                      <span key={sub} className={`text-xs px-2 py-0.5 rounded font-medium ${subjectColors[sub] ?? 'bg-slate-100 text-slate-600'}`}>
                        {sub}
                      </span>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* ── Footer ──────────────────────────────────────────── */}
        <div className="px-6 py-3.5 border-t border-slate-200 shrink-0 flex items-center justify-between bg-slate-50/60">
          <p className="text-xs text-slate-400">
            {teacher.firstName} {teacher.lastName} · {teacher.qualification}
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-600 border border-slate-200 bg-white rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
          >
            {t.common.cancel}
          </button>
        </div>
      </div>
    </div>
  );
}
