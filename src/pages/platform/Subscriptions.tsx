import { useEffect, useState } from 'react';
import Badge from '../../composants/ui/Badge';
import { api } from '../../api/client';
import type { PlatformSchool, SubscriptionPlan } from '../../api/client';

export default function Subscriptions() {
  const [schools, setSchools] = useState<PlatformSchool[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = () => {
    Promise.all([api.platform.getSchools(), api.platform.getPlans()])
      .then(([s, p]) => { setSchools(s); setPlans(p); })
      .catch(console.error)
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const changePlan = async (school: PlatformSchool, planId: string) => {
    setSavingId(school.id);
    try {
      await api.platform.updateSchool(school.id, { plan_id: planId });
      load();
    } finally {
      setSavingId(null);
    }
  };

  const changeExpiry = async (school: PlatformSchool, expiry: string) => {
    setSavingId(school.id);
    try {
      await api.platform.updateSchool(school.id, { subscription_expiry: expiry || null } as Partial<PlatformSchool>);
      load();
    } finally {
      setSavingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Subscriptions</h2>
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wide">
                <th className="px-5 py-3 text-left font-medium">School</th>
                <th className="px-5 py-3 text-left font-medium">Plan</th>
                <th className="px-5 py-3 text-left font-medium">Status</th>
                <th className="px-5 py-3 text-left font-medium">Expiry</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {schools.map(s => (
                <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-5 py-3 font-medium text-slate-800 dark:text-slate-100">{s.name}</td>
                  <td className="px-5 py-3">
                    <select disabled={savingId === s.id} value={s.plan_id} onChange={e => changePlan(s, e.target.value)}
                      className="px-2 py-1 text-sm border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
                      {plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </td>
                  <td className="px-5 py-3"><Badge label={s.status} variant={s.status === 'active' ? 'green' : 'red'} /></td>
                  <td className="px-5 py-3">
                    <input type="date" disabled={savingId === s.id}
                      value={s.subscription_expiry ? s.subscription_expiry.slice(0, 10) : ''}
                      onChange={e => changeExpiry(s, e.target.value)}
                      className="px-2 py-1 text-sm border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    <span className="text-xs text-slate-400 ml-2">{!s.subscription_expiry && '(no expiry)'}</span>
                  </td>
                </tr>
              ))}
              {schools.length === 0 && (
                <tr><td colSpan={4} className="px-5 py-10 text-center text-slate-400 text-sm">No schools yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
