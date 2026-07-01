import { useState } from 'react';
import {
  X, Mail, Phone, Search, BookOpen,
  Users, GraduationCap, Calendar,
} from 'lucide-react';
import type { Class, Student, Teacher } from '../../types';
import { useLanguage } from '../../i18n/LanguageContext';
import { StatusBadge } from '../ui/Badge';

interface Props {
  cls: Class;
  students: Student[];
  teacher: Teacher | undefined;
  onClose: () => void;
}

const bannerGradients = [
  'from-indigo-700 via-indigo-600 to-indigo-400',
  'from-blue-700 via-blue-600 to-sky-400',
  'from-violet-700 via-violet-600 to-purple-400',
  'from-sky-700 via-sky-600 to-cyan-400',
  'from-teal-700 via-teal-600 to-emerald-400',
  'from-emerald-700 via-emerald-600 to-teal-400',
  'from-amber-600 via-amber-500 to-yellow-400',
  'from-rose-700 via-rose-600 to-pink-400',
];

export default function ClassDetailModal({ cls, students, teacher, onClose }: Props) {
  const { t } = useLanguage();
  const [search, setSearch] = useState('');

  const boys   = students.filter(s => s.gender === 'male');
  const girls  = students.filter(s => s.gender === 'female');
  const pct    = cls.capacity ? Math.round((cls.enrolled / cls.capacity) * 100) : 0;

  const gradient = bannerGradients[parseInt(cls.id.replace(/\D/g, '') || '0') % bannerGradients.length];

  const filtered = students.filter(s =>
    `${s.firstName} ${s.lastName} ${s.studentNumber}`.toLowerCase().includes(search.toLowerCase())
  );

  const barColor = pct >= 90 ? 'bg-red-300' : pct >= 75 ? 'bg-yellow-300' : 'bg-white/70';

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >

        {/* ── Banner ─────────────────────────────────────────────── */}
        <div className={`relative bg-linear-to-r ${gradient} px-7 pt-6 pb-7 text-white shrink-0 overflow-hidden`}>

          {/* Decorative large icon */}
          <BookOpen size={160} className="absolute -right-8 -top-6 text-white/8 pointer-events-none" />
          <div className="absolute top-0 inset-x-0 h-px bg-white/30" />

          {/* Close */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
          >
            <X size={16} className="text-white" />
          </button>

          {/* Title */}
          <div className="flex items-center gap-4 mb-5">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center shadow-sm">
              <BookOpen size={26} className="text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-extrabold tracking-tight">{cls.name}</h2>
              <p className="text-white/65 text-sm">{cls.gradeLevelName} &nbsp;·&nbsp; {t.classes.classTeacher}: {cls.classTeacherName}</p>
            </div>
          </div>

          {/* Stats row — 6 pills */}
          <div className="grid grid-cols-6 gap-2.5 mb-4">
            {[
              { label: t.classes.enrolled, value: cls.enrolled,  bg: 'bg-white/15' },
              { label: t.classes.capacity, value: cls.capacity,  bg: 'bg-white/15' },
              { label: t.classes.room,     value: cls.room,       bg: 'bg-white/15' },
              { label: t.classes.boys,     value: boys.length,    bg: 'bg-blue-400/25' },
              { label: t.classes.girls,    value: girls.length,   bg: 'bg-pink-400/25' },
              { label: t.classes.enrollment, value: `${pct}%`,   bg: pct >= 90 ? 'bg-red-400/30' : pct >= 75 ? 'bg-yellow-400/25' : 'bg-white/15' },
            ].map(stat => (
              <div key={stat.label} className={`${stat.bg} rounded-xl py-2.5 px-3 text-center backdrop-blur-sm`}>
                <p className="text-white font-bold text-xl leading-none">{stat.value}</p>
                <p className="text-white/65 text-xs mt-1 leading-tight">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Capacity bar */}
          <div>
            <div className="flex justify-between text-xs text-white/60 mb-1.5">
              <span>{t.classes.enrollment}</span>
              <span>{cls.enrolled} / {cls.capacity}</span>
            </div>
            <div className="h-2 bg-white/20 rounded-full overflow-hidden">
              <div className={`h-full ${barColor} rounded-full transition-all`} style={{ width: `${pct}%` }} />
            </div>
          </div>
        </div>

        {/* ── Two-column body ─────────────────────────────────────── */}
        <div className="flex flex-1 min-h-0">

          {/* LEFT — Teacher & class info (fixed width) */}
          <div className="w-80 shrink-0 border-r border-slate-100 p-5 overflow-y-auto space-y-5 bg-slate-50/50">

            {/* Teacher */}
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                {t.classes.teacherDetails}
              </p>
              {teacher ? (
                <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm space-y-3">
                  {/* Avatar + name */}
                  <div className="flex items-center gap-3">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-bold shrink-0
                      ${teacher.gender === 'female' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'}`}>
                      {teacher.firstName[0]}{teacher.lastName[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800 text-sm leading-tight">
                        {teacher.firstName} {teacher.lastName}
                      </p>
                      <p className="text-slate-400 text-xs mt-0.5">{teacher.qualification}</p>
                      <span className="inline-block mt-1 bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-medium">
                        {t.common.active}
                      </span>
                    </div>
                  </div>

                  {/* Subjects */}
                  <div>
                    <p className="text-xs text-slate-400 mb-1.5">{t.teachers.subjects}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {teacher.subjects.map(sub => (
                        <span key={sub} className="bg-indigo-50 text-indigo-700 text-xs px-2 py-0.5 rounded-lg font-medium">
                          {sub}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Contact */}
                  <div className="space-y-2 pt-1 border-t border-slate-100">
                    <a href={`mailto:${teacher.email}`}
                      className="flex items-center gap-2 text-xs text-slate-500 hover:text-indigo-600 transition-colors truncate">
                      <Mail size={13} className="shrink-0" /> {teacher.email}
                    </a>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Phone size={13} className="shrink-0" /> {teacher.phone}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Calendar size={13} className="shrink-0" />
                      {t.teachers.joinDate}: {new Date(teacher.joinDate).toLocaleDateString('en-GB')}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-slate-400 text-sm bg-white rounded-xl border border-slate-100 p-4">
                  <GraduationCap size={16} />
                  <span>No teacher assigned</span>
                </div>
              )}
            </div>

            {/* Gender breakdown mini-chart */}
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                {t.classes.classOverview}
              </p>
              <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm space-y-3">
                {[
                  { label: t.classes.boys,  count: boys.length,  total: students.length, bar: 'bg-blue-400',  text: 'text-blue-700',  bg: 'bg-blue-50'  },
                  { label: t.classes.girls, count: girls.length, total: students.length, bar: 'bg-pink-400',  text: 'text-pink-700',  bg: 'bg-pink-50'  },
                ].map(row => (
                  <div key={row.label}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className={`font-semibold ${row.text}`}>{row.label}</span>
                      <span className="text-slate-500">{row.count} <span className="text-slate-300">/ {row.total}</span></span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${row.bar} rounded-full`}
                        style={{ width: row.total ? `${Math.round((row.count / row.total) * 100)}%` : '0%' }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT — Student list (scrollable) */}
          <div className="flex-1 flex flex-col min-w-0">

            {/* Students header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2">
                <Users size={16} className="text-indigo-500" />
                <p className="font-semibold text-slate-800">{t.classes.studentsInClass}</p>
                <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-0.5 rounded-full">
                  {students.length}
                </span>
              </div>
              {students.length > 0 && (
                <div className="relative">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder={t.students?.searchPlaceholder ?? 'Search...'}
                    className="pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 w-48"
                  />
                </div>
              )}
            </div>

            {/* Student rows */}
            <div className="overflow-y-auto flex-1 p-3">
              {students.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 py-16">
                  <Users size={40} className="mb-3 opacity-20" />
                  <p className="text-sm">{t.classes.noStudents}</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {filtered.map((s, i) => (
                    <div
                      key={s.id}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors group"
                    >
                      {/* Rank */}
                      <span className="text-slate-300 text-xs w-5 text-right shrink-0 font-mono">{i + 1}</span>

                      {/* Avatar */}
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0
                        ${s.gender === 'female' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'}`}>
                        {s.firstName[0]}{s.lastName[0]}
                      </div>

                      {/* Name + number */}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-800 text-sm truncate">
                          {s.firstName} {s.lastName}
                        </p>
                        <p className="text-slate-400 text-xs font-mono">{s.studentNumber}</p>
                      </div>

                      {/* DOB */}
                      <p className="text-slate-400 text-xs shrink-0 hidden sm:block">
                        {new Date(s.dateOfBirth).toLocaleDateString('en-GB')}
                      </p>

                      {/* Gender pill */}
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0
                        ${s.gender === 'female' ? 'bg-pink-50 text-pink-600' : 'bg-blue-50 text-blue-600'}`}>
                        {s.gender === 'female' ? t.common.female : t.common.male}
                      </span>

                      {/* Status */}
                      <div className="shrink-0">
                        <StatusBadge status={s.isActive ? 'present' : 'absent'} />
                      </div>
                    </div>
                  ))}

                  {filtered.length === 0 && search && (
                    <div className="text-center py-8 text-slate-400">
                      <p className="text-sm">{t.common.noResults}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Footer ─────────────────────────────────────────────── */}
        <div className="px-6 py-3.5 border-t border-slate-200 shrink-0 flex items-center justify-between bg-slate-50/60">
          <p className="text-xs text-slate-400">
            {cls.name} &nbsp;·&nbsp; {cls.gradeLevelName} &nbsp;·&nbsp; {cls.room}
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
