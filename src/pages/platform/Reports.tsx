import { useEffect, useState } from 'react';
import Badge from '../../composants/ui/Badge';
import { api } from '../../api/client';

export default function Reports() {
  const [byStatus, setByStatus] = useState<{ status: string; count: number }[]>([]);
  const [byPlan, setByPlan] = useState<{ plan_name: string; price: number; school_count: number; revenue: number }[]>([]);
  const [bySignup, setBySignup] = useState<{ month: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.platform.getSchoolsByStatusReport(),
      api.platform.getRevenueByPlanReport(),
      api.platform.getSignupsByMonthReport(),
    ])
      .then(([s, p, m]) => { setByStatus(s); setByPlan(p); setBySignup(m); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const totalRevenue = byPlan.reduce((s, p) => s + p.revenue, 0);

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Reports</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
          <h3 className="text-slate-800 dark:text-slate-100 font-semibold mb-4">Schools by Status</h3>
          <div className="space-y-2">
            {byStatus.map(s => (
              <div key={s.status} className="flex items-center justify-between text-sm">
                <Badge label={s.status} variant={s.status === 'active' ? 'green' : 'red'} />
                <span className="font-medium text-slate-800 dark:text-slate-100">{s.count}</span>
              </div>
            ))}
            {byStatus.length === 0 && <p className="text-slate-400 text-sm">No data yet</p>}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
          <h3 className="text-slate-800 dark:text-slate-100 font-semibold mb-4">Revenue by Plan <span className="text-slate-400 font-normal text-sm">(${totalRevenue.toLocaleString()} total/mo)</span></h3>
          <div className="space-y-2">
            {byPlan.map(p => (
              <div key={p.plan_name} className="flex items-center justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-300">{p.plan_name} ({p.school_count} schools)</span>
                <span className="font-medium text-slate-800 dark:text-slate-100">${p.revenue.toLocaleString()}</span>
              </div>
            ))}
            {byPlan.length === 0 && <p className="text-slate-400 text-sm">No data yet</p>}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
        <h3 className="text-slate-800 dark:text-slate-100 font-semibold mb-4">Signups by Month</h3>
        <div className="space-y-2">
          {bySignup.map(m => (
            <div key={m.month} className="flex items-center gap-3">
              <span className="text-xs text-slate-500 w-16">{m.month}</span>
              <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${Math.min(100, m.count * 20)}%` }} />
              </div>
              <span className="text-xs text-slate-600 dark:text-slate-300 w-6 text-right">{m.count}</span>
            </div>
          ))}
          {bySignup.length === 0 && <p className="text-slate-400 text-sm">No data yet</p>}
        </div>
      </div>
    </div>
  );
}
