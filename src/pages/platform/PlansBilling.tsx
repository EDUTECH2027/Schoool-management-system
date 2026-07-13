import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { api } from '../../api/client';
import type { SubscriptionPlan } from '../../api/client';

const emptyForm = { name: '', price: 0, billing_cycle: 'monthly' as const, max_students: '', max_teachers: '', is_custom: false };

export default function PlansBilling() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');

  const load = () => {
    api.platform.getPlans().then(setPlans).catch(console.error).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await api.platform.createPlan({
        name: form.name,
        price: Number(form.price),
        billing_cycle: form.billing_cycle,
        max_students: form.max_students ? Number(form.max_students) : null,
        max_teachers: form.max_teachers ? Number(form.max_teachers) : null,
        is_custom: form.is_custom ? 1 : 0,
      });
      setForm(emptyForm);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create plan');
    }
  };

  const remove = async (id: string) => {
    try {
      await api.platform.deletePlan(id);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete plan');
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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Plan Catalog</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {plans.map(p => (
            <div key={p.id} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-slate-800 dark:text-slate-100">{p.name}</h3>
                  <p className="text-2xl font-bold text-indigo-600 mt-1">${p.price}<span className="text-sm font-normal text-slate-400">/{p.billing_cycle === 'monthly' ? 'mo' : 'yr'}</span></p>
                </div>
                <button onClick={() => remove(p.id)} disabled={(p.school_count ?? 0) > 0}
                  className="text-slate-400 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed" title={(p.school_count ?? 0) > 0 ? 'In use by schools' : 'Delete plan'}>
                  <Trash2 size={16} />
                </button>
              </div>
              <ul className="mt-3 space-y-1 text-sm text-slate-600 dark:text-slate-300">
                <li>{p.max_students ? `Up to ${p.max_students} students` : 'Unlimited students'}</li>
                <li>{p.max_teachers ? `Up to ${p.max_teachers} teachers` : 'Unlimited teachers'}</li>
                <li className="text-xs text-slate-400 mt-2">{(p.features ?? []).join(', ')}</li>
              </ul>
              <p className="text-xs text-slate-400 mt-3">{p.school_count ?? 0} school(s) on this plan</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-5 h-fit">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">Create Custom Plan</h3>
        <form onSubmit={submit} className="space-y-3">
          {error && <p className="text-red-600 text-xs">{error}</p>}
          <div>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Name *</label>
            <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Price ($) *</label>
            <input required type="number" min="0" value={form.price} onChange={e => setForm({ ...form, price: Number(e.target.value) })}
              className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Billing Cycle</label>
            <select value={form.billing_cycle} onChange={e => setForm({ ...form, billing_cycle: e.target.value as 'monthly' })}
              className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Max Students</label>
            <input type="number" min="0" value={form.max_students} onChange={e => setForm({ ...form, max_students: e.target.value })}
              placeholder="Unlimited" className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Max Teachers</label>
            <input type="number" min="0" value={form.max_teachers} onChange={e => setForm({ ...form, max_teachers: e.target.value })}
              placeholder="Unlimited" className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <input type="checkbox" checked={form.is_custom} onChange={e => setForm({ ...form, is_custom: e.target.checked })} />
            Custom plan (negotiated)
          </label>
          <button type="submit" className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm py-2.5 rounded-lg transition-colors">
            <Plus size={16} /> Create Plan
          </button>
        </form>
      </div>
    </div>
  );
}
