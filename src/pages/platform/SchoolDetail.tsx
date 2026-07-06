import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Badge from '../../composants/ui/Badge';
import { api } from '../../api/client';
import type { PlatformSchool, SchoolSummary, SubscriptionPlan } from '../../api/client';

export default function SchoolDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [school, setSchool] = useState<PlatformSchool | null>(null);
  const [summary, setSummary] = useState<SchoolSummary | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = () => {
    if (!id) return;
    Promise.all([api.platform.getSchool(id), api.platform.getSchoolSummary(id), api.platform.getPlans()])
      .then(([s, sum, p]) => { setSchool(s); setSummary(sum); setPlans(p); })
      .catch(console.error)
      .finally(() => setLoading(false));
  };
  useEffect(load, [id]);

  const toggleStatus = async () => {
    if (!school) return;
    if (school.status === 'active') await api.platform.deactivateSchool(school.id);
    else await api.platform.activateSchool(school.id);
    load();
  };

  const changePlan = async (planId: string) => {
    if (!school) return;
    setSaving(true);
    try {
      await api.platform.updateSchool(school.id, { plan_id: planId });
      load();
    } finally {
      setSaving(false);
    }
  };

  if (loading || !school) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <button onClick={() => navigate('/platform/schools')} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 dark:hover:text-slate-200">
        <ArrowLeft size={15} /> Back to Schools
      </button>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">{school.name}</h2>
            <Badge label={school.status} variant={school.status === 'active' ? 'green' : 'red'} />
          </div>
          <p className="text-slate-500 text-sm mt-1">{school.email} · {school.phone || 'No phone'}</p>
          <p className="text-slate-400 text-xs mt-1">{school.address || 'No address on file'}</p>
        </div>
        <button onClick={toggleStatus}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${school.status === 'active' ? 'bg-red-50 text-red-700 hover:bg-red-100' : 'bg-green-50 text-green-700 hover:bg-green-100'}`}>
          {school.status === 'active' ? 'Deactivate School' : 'Activate School'}
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <p className="text-slate-400 text-xs">Students</p>
          <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{summary?.students ?? 0}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <p className="text-slate-400 text-xs">Teachers</p>
          <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{summary?.teachers ?? 0}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <p className="text-slate-400 text-xs">Classes</p>
          <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{summary?.classes ?? 0}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <p className="text-slate-400 text-xs">Fees Collected</p>
          <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{(summary?.fees.collected ?? 0).toLocaleString()}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
          <h3 className="text-slate-800 dark:text-slate-100 font-semibold mb-4">Subscription</h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-slate-500">Current Plan</label>
              <select disabled={saving} value={school.plan_id} onChange={e => changePlan(e.target.value)}
                className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
                {plans.map(p => <option key={p.id} value={p.id}>{p.name} (${p.price}/mo)</option>)}
              </select>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Admin</span>
              <span className="text-slate-800 dark:text-slate-100">{school.admin_name} ({school.admin_email})</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Subscription Started</span>
              <span className="text-slate-800 dark:text-slate-100">{school.subscription_started ? new Date(school.subscription_started).toLocaleDateString() : '—'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Expiry</span>
              <span className="text-slate-800 dark:text-slate-100">{school.subscription_expiry ? new Date(school.subscription_expiry).toLocaleDateString() : 'No expiry'}</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
          <h3 className="text-slate-800 dark:text-slate-100 font-semibold mb-4">Recent Announcements</h3>
          {(!summary?.recentAnnouncements || summary.recentAnnouncements.length === 0) ? (
            <p className="text-slate-400 text-sm">No announcements yet.</p>
          ) : (
            <div className="space-y-3">
              {summary.recentAnnouncements.map((a, i) => (
                <div key={i} className="border-b border-slate-100 dark:border-slate-800 last:border-0 pb-2 last:pb-0">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{a.title}</p>
                  <p className="text-xs text-slate-400">{new Date(a.created_at).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
