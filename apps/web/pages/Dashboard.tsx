import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, GraduationCap, BookOpen, UserCheck, Search } from 'lucide-react';
import StatCard from '../composants/ui/StatCard';
import { useBranding } from '../context/BrandingContext';
import { StatusBadge } from '../composants/ui/Badge';
import { useLanguage } from '../i18n/LanguageContext';
import { api } from '../api/client';
import type { DashboardData, AttendanceRecord } from '../api/client';
import { mapStudent } from '../api/mappers';
import type { Student } from '../types';

export default function Dashboard() {
  const { t, lang } = useLanguage();
  const { schoolInfo } = useBranding();
  const navigate = useNavigate();

  const today = new Date().toISOString().split('T')[0];

  const [stats,         setStats]         = useState<DashboardData | null>(null);
  const [todayAtt,      setTodayAtt]      = useState<AttendanceRecord[]>([]);
  const [students,      setStudents]      = useState<Student[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [studentSearch, setStudentSearch] = useState('');

  useEffect(() => {
    Promise.all([
      api.dashboard(),
      api.getAttendance({ date: today }),
      api.getStudents(),
    ])
      .then(([dash, att, sts]) => {
        setStats(dash);
        setTodayAtt(att);
        setStudents(sts.map(mapStudent));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [today]);

  const feePercent = stats && stats.feesTotal > 0
    ? Math.round((stats.feesCollected / stats.feesTotal) * 100) : 0;

  const attCounts = {
    present: todayAtt.filter(a => a.status === 'present').length,
    absent:  todayAtt.filter(a => a.status === 'absent').length,
    late:    todayAtt.filter(a => a.status === 'late').length,
    excused: todayAtt.filter(a => a.status === 'excused').length,
  };

  const activeStudents = students.filter(s => s.isActive);
  const filteredStudents = studentSearch.trim()
    ? activeStudents.filter(s => {
        const q = studentSearch.toLowerCase();
        return (
          `${s.firstName} ${s.lastName}`.toLowerCase().includes(q) ||
          s.studentNumber.toLowerCase().includes(q) ||
          s.className.toLowerCase().includes(q)
        );
      })
    : activeStudents;

  const statusLabels: Record<string, string> = {
    present: t.common.present,
    absent:  t.common.absent,
    late:    t.common.late,
    excused: t.common.excused,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <div className="bg-linear-to-r from-indigo-600 to-indigo-500 rounded-xl px-6 py-5 text-white">
        <p className="text-indigo-100 text-sm">{t.dashboard.welcomeBack}</p>
        <h2 className="text-xl font-bold mt-0.5">{schoolInfo.headTeacher} &nbsp;·&nbsp; {schoolInfo.name}</h2>
        <p className="text-indigo-200 text-sm mt-1">{schoolInfo.motto}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label={t.dashboard.totalStudents}   value={stats?.totalStudents ?? 0}        sub={t.dashboard.enrolledThisYear} icon={Users}         color="indigo" onClick={() => navigate('/students')}   />
        <StatCard label={t.dashboard.teachers}        value={stats?.totalTeachers ?? 0}        sub={t.dashboard.activeStaff}      icon={GraduationCap} color="blue"   onClick={() => navigate('/teachers')}   />
        <StatCard label={t.dashboard.classes}         value={stats?.totalClasses  ?? 0}        sub={t.dashboard.activeStreams}     icon={BookOpen}      color="purple" onClick={() => navigate('/classes')}    />
        <StatCard label={t.dashboard.attendanceToday} value={`${stats?.attendanceRate ?? 0}%`} sub={t.dashboard.presentToday}     icon={UserCheck}     color="green"  onClick={() => navigate('/attendance')} />
      </div>

      {/* Middle row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Attendance breakdown */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 transition-transform duration-200 hover:-translate-y-1 hover:shadow-md cursor-default">
          <h3 className="text-slate-800 font-semibold mb-4">{t.dashboard.todaysAttendance}</h3>
          <div className="space-y-3">
            {(['present','absent','late','excused'] as const).map(s => {
              const count = attCounts[s];
              const pct = todayAtt.length ? Math.round((count / todayAtt.length) * 100) : 0;
              const barColor = s === 'present' ? 'bg-green-500' : s === 'absent' ? 'bg-red-400' : s === 'late' ? 'bg-yellow-400' : 'bg-blue-400';
              return (
                <div key={s}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-600">{statusLabels[s]}</span>
                    <span className="font-medium text-slate-800">{count} <span className="text-slate-400 font-normal">({pct}%)</span></span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full ${barColor} rounded-full`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-slate-400 text-xs mt-4">
            {todayAtt.length} {t.dashboard.records} · {new Date().toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>

        {/* Fee collection */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 transition-transform duration-200 hover:-translate-y-1 hover:shadow-md cursor-default">
          <h3 className="text-slate-800 font-semibold mb-4">{t.dashboard.feeCollection}</h3>
          <div className="flex items-center gap-4 mb-4">
            <div className="relative w-20 h-20 shrink-0">
              <svg viewBox="0 0 36 36" className="w-20 h-20 -rotate-90">
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e2e8f0" strokeWidth="3" />
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#4f46e5" strokeWidth="3"
                  strokeDasharray={`${feePercent} ${100 - feePercent}`}
                  strokeDashoffset="0" strokeLinecap="round" />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-slate-800">
                {feePercent}%
              </span>
            </div>
            <div className="space-y-2">
              <div>
                <p className="text-slate-500 text-xs">{t.dashboard.collected}</p>
                <p className="text-slate-800 font-bold">{(stats?.feesCollected ?? 0).toLocaleString()} FCFA</p>
              </div>
              <div>
                <p className="text-slate-500 text-xs">{t.dashboard.pending}</p>
                <p className="text-orange-600 font-semibold">{(stats?.feesPending ?? 0).toLocaleString()} FCFA</p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {(['paid','partial','overdue','pending'] as const).map(status => {
              const entry = stats?.feesByStatus?.find(f => f.status === status);
              const colorMap: Record<string, string> = {
                paid: 'text-green-600', partial: 'text-yellow-600',
                overdue: 'text-red-600', pending: 'text-blue-600',
              };
              const labelMap: Record<string, string> = {
                paid: t.common.paid, partial: t.common.partial,
                overdue: t.common.overdue, pending: t.common.pending,
              };
              return (
                <div key={status} className="bg-slate-50 rounded-lg p-2.5 text-center">
                  <p className={`text-xl font-bold ${colorMap[status]}`}>{entry?.count ?? 0}</p>
                  <p className="text-slate-500 text-xs">{labelMap[status]}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Class enrollment */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 transition-transform duration-200 hover:-translate-y-1 hover:shadow-md cursor-default">
          <h3 className="text-slate-800 font-semibold mb-4">{t.classes.enrollment}</h3>
          {(!stats?.classSizes || stats.classSizes.length === 0) ? (
            <p className="text-slate-400 text-sm">{t.classes.noClasses ?? 'No classes yet'}</p>
          ) : (
            <div className="space-y-3 overflow-y-auto max-h-52">
              {stats.classSizes.map(cls => {
                const pct = cls.capacity > 0 ? Math.round((cls.enrolled / cls.capacity) * 100) : 0;
                return (
                  <div key={cls.name}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-700 font-medium">{cls.name}</span>
                      <span className="text-slate-500 text-xs">{cls.enrolled}/{cls.capacity}</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${pct >= 90 ? 'bg-red-400' : pct >= 75 ? 'bg-yellow-400' : 'bg-green-400'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Absent students today */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 transition-transform duration-200 hover:-translate-y-1 hover:shadow-md cursor-default">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-800 font-semibold">{t.dashboard.absentToday}</h3>
            <span className="bg-red-100 text-red-700 text-xs font-semibold px-2 py-0.5 rounded-full">
              {attCounts.absent} {t.dashboard.students}
            </span>
          </div>
          {todayAtt.filter(a => a.status !== 'present').length === 0 ? (
            <p className="text-slate-400 text-sm">{t.dashboard.allPresent}</p>
          ) : (
            <div className="space-y-2">
              {todayAtt.filter(a => a.status !== 'present').map(a => (
                <div key={a.id} className="flex items-center justify-between py-1.5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                      <span className="text-xs font-medium text-slate-600">
                        {a.student_name?.split(' ').map((n: string) => n[0]).join('') ?? '?'}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-800">{a.student_name}</p>
                      <p className="text-xs text-slate-400">{a.class_name}</p>
                    </div>
                  </div>
                  <StatusBadge status={a.status} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent announcements */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 transition-transform duration-200 hover:-translate-y-1 hover:shadow-md cursor-default">
          <h3 className="text-slate-800 font-semibold mb-4">{t.dashboard.recentActivity}</h3>
          {(!stats?.recentAnnouncements || stats.recentAnnouncements.length === 0) ? (
            <p className="text-slate-400 text-sm">No recent announcements.</p>
          ) : (
            <div className="space-y-3">
              {stats.recentAnnouncements.map(a => (
                <div key={a.id} className="border-b border-slate-100 last:border-0 pb-3 last:pb-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{a.title}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {a.author} · {new Date(a.created_at).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-GB')}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Student Directory */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <h3 className="font-semibold text-slate-800">{t.dashboard.studentDirectory}</h3>
            <span className="bg-indigo-100 text-indigo-700 text-xs font-semibold px-2 py-0.5 rounded-full">
              {filteredStudents.length}
            </span>
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={studentSearch}
              onChange={e => setStudentSearch(e.target.value)}
              placeholder={t.students.searchPlaceholder}
              className="pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 w-52"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                <th className="px-5 py-3 text-left font-medium w-10">#</th>
                <th className="px-5 py-3 text-left font-medium">{t.common.name}</th>
                <th className="px-5 py-3 text-left font-medium">{t.common.class}</th>
                <th className="px-5 py-3 text-left font-medium">{t.dashboard.guardianPhone}</th>
                <th className="px-5 py-3 text-left font-medium">{t.common.status}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.map((s, i) => (
                <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3 text-slate-400 text-xs">{i + 1}</td>
                  <td className="px-5 py-3">
                    <p className="font-medium text-slate-800">{s.firstName} {s.lastName}</p>
                    <p className="text-xs text-slate-400 font-mono">{s.studentNumber}</p>
                  </td>
                  <td className="px-5 py-3">
                    <span className="bg-indigo-50 text-indigo-700 text-xs font-medium px-2 py-0.5 rounded">
                      {s.className}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-slate-600">{s.guardianPhone}</td>
                  <td className="px-5 py-3">
                    <StatusBadge status={s.isActive ? 'present' : 'absent'} />
                  </td>
                </tr>
              ))}
              {filteredStudents.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-slate-400 text-sm">
                    {t.common.noResults}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
