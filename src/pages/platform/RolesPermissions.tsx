import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import Badge from '../../composants/ui/Badge';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import type { PlatformAdmin } from '../../api/client';

export default function RolesPermissions() {
  const { user } = useAuth();
  const [admins, setAdmins] = useState<PlatformAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'platform_admin' });
  const [error, setError] = useState('');
  const isOwner = user?.role === 'platform_owner';

  const load = () => {
    api.platform.getAdmins().then(setAdmins).catch(console.error).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await api.platform.createAdmin(form);
      setForm({ name: '', email: '', password: '', role: 'platform_admin' });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create admin');
    }
  };

  const remove = async (id: string) => {
    try {
      await api.platform.deleteAdmin(id);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete admin');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isOwner) {
    return <p className="text-slate-400 text-sm">Only the platform owner can manage admin accounts.</p>;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-3">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Platform Admins</h2>
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-800">
          {admins.map(a => (
            <div key={a.id} className="flex items-center justify-between px-5 py-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center">
                  <span className="text-xs font-medium text-indigo-700 dark:text-indigo-300">{a.initials}</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{a.name}</p>
                  <p className="text-xs text-slate-400">{a.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge label={a.role === 'platform_owner' ? 'Owner' : 'Admin'} variant={a.role === 'platform_owner' ? 'purple' : 'blue'} />
                {a.id !== user?.id && (
                  <button onClick={() => remove(a.id)} className="text-slate-400 hover:text-red-600"><Trash2 size={15} /></button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-5 h-fit">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">Add Platform Admin</h3>
        <form onSubmit={submit} className="space-y-3">
          {error && <p className="text-red-600 text-xs">{error}</p>}
          <div>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Name *</label>
            <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Email *</label>
            <input required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
              className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Password *</label>
            <input required type="password" minLength={6} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
              className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Role</label>
            <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}
              className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="platform_admin">Admin</option>
              <option value="platform_owner">Owner</option>
            </select>
          </div>
          <button type="submit" className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm py-2.5 rounded-lg transition-colors">
            <Plus size={16} /> Add Admin
          </button>
        </form>
      </div>
    </div>
  );
}
