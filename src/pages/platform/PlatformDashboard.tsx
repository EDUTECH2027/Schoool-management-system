import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { School, GraduationCap, Users2, UserRound, Wallet, Plus } from 'lucide-react';
import StatCard from '../../composants/ui/StatCard';
import Badge from '../../composants/ui/Badge';
import { api } from '../../api/client';
import type { PlatformDashboardData, PlatformSchool, SubscriptionPlan, CreateSchoolInput } from '../../api/client';

const DONUT_COLORS = ['#4f46e5', '#0ea5e9', '#f59e0b', '#10b981', '#a855f7'];

function SchoolsByPlanDonut({ data }: { data: { name: string; count: number }[] }) {
  const total = data.reduce((s, d) => s + d.count, 0) || 1;
  const R = 15.9155;
  const circumference = 2 * Math.PI * R;

  const segments: { name: string; dash: number; offset: number }[] = [];
  let cumulative = 0;
  for (const d of data) {
    const pct = (d.count / total) * 100;
    const dash = (pct / 100) * circumference;
    segments.push({ name: d.name, dash, offset: -((cumulative / 100) * circumference) });
    cumulative += pct;
  }

  return (
    <div className="flex items-center gap-6">
      <div className="relative w-36 h-36 shrink-0">
        <svg viewBox="0 0 36 36" className="w-36 h-36 -rotate-90">
          <circle cx="18" cy="18" r={R} fill="none" stroke="#e2e8f0" strokeWidth="4" />
          {segments.map((s, i) => (
            <circle
              key={s.name}
              cx="18" cy="18" r={R} fill="none"
              stroke={DONUT_COLORS[i % DONUT_COLORS.length]}
              strokeWidth="4"
              strokeDasharray={`${s.dash} ${circumference - s.dash}`}
              strokeDashoffset={s.offset}
            />
          ))}
        </svg>
        <span className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-slate-800 dark:text-slate-100">{total}</span>
          <span className="text-xs text-slate-400">Total</span>
        </span>
      </div>
      <div className="space-y-2">
        {data.map((d, i) => (
          <div key={d.name} className="flex items-center gap-2 text-sm">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
            <span className="text-slate-600 dark:text-slate-300">{d.name}</span>
            <span className="text-slate-400 text-xs">{d.count} ({Math.round((d.count / total) * 100)}%)</span>
          </div>
        ))}
        {data.length === 0 && <p className="text-slate-400 text-sm">No schools yet</p>}
      </div>
    </div>
  );
}

function SchoolsOverviewChart({ data }: { data: { month: string; active: number; new: number }[] }) {
  const width = 560, height = 180, padding = 24;
  const maxVal = Math.max(1, ...data.map(d => Math.max(d.active, d.new)));
  const stepX = data.length > 1 ? (width - padding * 2) / (data.length - 1) : 0;
  const toY = (v: number) => height - padding - (v / maxVal) * (height - padding * 2);

  const linePath = (key: 'active' | 'new') =>
    data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${padding + i * stepX} ${toY(d[key])}`).join(' ');

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-44">
      <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#e2e8f0" strokeWidth="1" />
      <path d={linePath('active')} fill="none" stroke="#4f46e5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d={linePath('new')} fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="4 3" />
      {data.map((d, i) => (
        <text key={d.month} x={padding + i * stepX} y={height - 4} fontSize="9" textAnchor="middle" fill="#94a3b8">{d.month}</text>
      ))}
    </svg>
  );
}

export default function PlatformDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<PlatformDashboardData | null>(null);
  const [schools, setSchools] = useState<PlatformSchool[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<CreateSchoolInput>({ name: '', email: '', phone: '', plan_id: '', admin_name: '', admin_email: '' });
  const [createResult, setCreateResult] = useState<{ email: string; tempPassword: string } | null>(null);
  const [error, setError] = useState('');

  const load = () => {
    Promise.all([api.platform.getDashboard(), api.platform.getSchools(), api.platform.getPlans()])
      .then(([d, s, p]) => { setStats(d); setSchools(s); setPlans(p); })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const filtered = search.trim()
    ? schools.filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || s.admin_email.toLowerCase().includes(search.toLowerCase()))
    : schools;

  const submitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setCreating(true);
    try {
      const res = await api.platform.createSchool(form);
      setCreateResult(res.admin);
      setForm({ name: '', email: '', phone: '', plan_id: '', admin_name: '', admin_email: '' });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create school');
    } finally {
      setCreating(false);
    }
  };

  const toggleStatus = async (school: PlatformSchool) => {
    if (school.status === 'active') await api.platform.deactivateSchool(school.id);
    else await api.platform.activateSchool(school.id);
    load();
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
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard label="Total Schools"  value={stats?.totalSchools ?? 0}  sub={`Active: ${stats?.activeSchools ?? 0} · Inactive: ${stats?.inactiveSchools ?? 0}`} icon={School}       color="indigo" onClick={() => navigate('/platform/schools')} />
        <StatCard label="Total Students" value={stats?.totalStudents ?? 0} sub="Across all schools" icon={GraduationCap} color="green" />
        <StatCard label="Total Teachers" value={stats?.totalTeachers ?? 0} sub="Across all schools" icon={Users2}       color="purple" />
        <StatCard label="Total Parents"  value={stats?.totalParents ?? 0}  sub="Across all schools" icon={UserRound}    color="orange" />
        <StatCard label="Total Revenue"  value={`$${(stats?.revenue ?? 0).toLocaleString()}`} sub="Active subscriptions (monthly)" icon={Wallet} color="blue" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
          <h3 className="text-slate-800 dark:text-slate-100 font-semibold mb-4">Schools Overview</h3>
          <SchoolsOverviewChart data={stats?.schoolsOverview ?? []} />
          <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
            <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-indigo-600 inline-block" /> Active Schools</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-slate-400 inline-block" /> New Schools</span>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
          <h3 className="text-slate-800 dark:text-slate-100 font-semibold mb-4">Schools by Plan</h3>
          <SchoolsByPlanDonut data={stats?.schoolsByPlan ?? []} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_0.9fr] gap-6">
        {/* All Schools */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-slate-100 dark:border-slate-700">
            <h3 className="font-semibold text-slate-800 dark:text-slate-100">All Schools</h3>
            <input
              value={search} onChange={e => setSearch(e.target.value)} placeholder="Search schools..."
              className="px-3 py-1.5 text-sm border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 w-48"
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wide">
                  <th className="px-5 py-3 text-left font-medium">School</th>
                  <th className="px-5 py-3 text-left font-medium">Plan</th>
                  <th className="px-5 py-3 text-left font-medium">Status</th>
                  <th className="px-5 py-3 text-left font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.slice(0, 8).map(s => (
                  <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer" onClick={() => navigate(`/platform/schools/${s.id}`)}>
                    <td className="px-5 py-3">
                      <p className="font-medium text-slate-800 dark:text-slate-100">{s.name}</p>
                      <p className="text-xs text-slate-400">{s.admin_email}</p>
                    </td>
                    <td className="px-5 py-3">
                      <Badge label={s.plan_name ?? 'Unassigned'} variant="blue" />
                    </td>
                    <td className="px-5 py-3">
                      <Badge label={s.status} variant={s.status === 'active' ? 'green' : 'red'} />
                    </td>
                    <td className="px-5 py-3" onClick={e => e.stopPropagation()}>
                      <button onClick={() => toggleStatus(s)} className="text-xs font-medium text-indigo-600 hover:underline">
                        {s.status === 'active' ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={4} className="px-5 py-10 text-center text-slate-400 text-sm">No schools found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          {/* Create New School */}
          <div className="bg-indigo-600 rounded-xl overflow-hidden">
            <div className="px-5 py-4 flex items-center gap-2 text-white font-semibold">
              <Plus size={18} /> Create New School
            </div>
            <form onSubmit={submitCreate} className="bg-white dark:bg-slate-900 p-5 space-y-3">
              {error && <p className="text-red-600 text-xs">{error}</p>}
              {createResult && (
                <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg p-3 text-xs text-green-800 dark:text-green-300">
                  School created. Admin login: <strong>{createResult.email}</strong> / <strong>{createResult.tempPassword}</strong>
                </div>
              )}
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-300">School Name *</label>
                <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-300">School Email *</label>
                <input required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                  className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Phone Number</label>
                <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                  className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Plan *</label>
                <select required value={form.plan_id} onChange={e => setForm({ ...form, plan_id: e.target.value })}
                  className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">Select plan</option>
                  {plans.map(p => <option key={p.id} value={p.id}>{p.name} (${p.price}/mo)</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Admin Name *</label>
                <input required value={form.admin_name} onChange={e => setForm({ ...form, admin_name: e.target.value })}
                  className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Admin Email *</label>
                <input required type="email" value={form.admin_email} onChange={e => setForm({ ...form, admin_email: e.target.value })}
                  className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <button disabled={creating} type="submit"
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-medium text-sm py-2.5 rounded-lg transition-colors">
                <Plus size={16} /> {creating ? 'Creating...' : 'Create School'}
              </button>
            </form>
          </div>

          {/* Recent Activities */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
            <h3 className="text-slate-800 dark:text-slate-100 font-semibold mb-4">Recent System Activities</h3>
            {(!stats?.recentActivities || stats.recentActivities.length === 0) ? (
              <p className="text-slate-400 text-sm">No activity yet.</p>
            ) : (
              <div className="space-y-3">
                {stats.recentActivities.map(a => (
                  <div key={a.id} className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 last:border-0 pb-3 last:pb-0">
                    <div>
                      <p className="text-sm text-slate-800 dark:text-slate-100">{a.action}</p>
                      <p className="text-xs text-slate-400">{a.actor_name ?? 'System'}</p>
                    </div>
                    <span className="text-xs text-slate-400">{new Date(a.created_at).toLocaleString()}</span>
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
