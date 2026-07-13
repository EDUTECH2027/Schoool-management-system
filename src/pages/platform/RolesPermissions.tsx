import { useEffect, useState } from 'react';
import { Plus, Trash2, ShieldCheck } from 'lucide-react';
import Badge from '../../composants/ui/Badge';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import type { PlatformAdmin } from '../../api/client';

const PERMISSION_OPTIONS = [
  { key: 'schools', label: 'Schools' },
  { key: 'announcements', label: 'Announcements' },
  { key: 'users', label: 'Users' },
  { key: 'plans', label: 'Plans' },
  { key: 'settings', label: 'Settings' },
  { key: 'features', label: 'Features' },
  { key: 'reports', label: 'Reports' },
  { key: 'logs', label: 'Logs' },
  { key: 'backups', label: 'Backups' },
];

export default function RolesPermissions() {
  const { user } = useAuth();
  const [admins, setAdmins] = useState<PlatformAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'platform_admin' });
  const [selectedAdminId, setSelectedAdminId] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [savingPermissions, setSavingPermissions] = useState(false);
  const [error, setError] = useState('');
  const isOwner = user?.role === 'platform_owner';

  const load = () => {
    api.platform.getAdmins().then((rows) => {
      setAdmins(rows);
      if (!selectedAdminId && rows.length > 0) {
        setSelectedAdminId(rows[0].id);
        setSelectedPermissions(rows[0].permissions ?? []);
      }
    }).catch(console.error).finally(() => setLoading(false));
  };
  useEffect(load, []);

  useEffect(() => {
    if (!selectedAdminId) return;
    const admin = admins.find((item) => item.id === selectedAdminId);
    if (admin) setSelectedPermissions(admin.permissions ?? []);
  }, [admins, selectedAdminId]);

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

  const togglePermission = (permission: string) => {
    setSelectedPermissions((current) =>
      current.includes(permission) ? current.filter((item) => item !== permission) : [...current, permission]
    );
  };

  const savePermissions = async () => {
    if (!selectedAdminId) return;
    setSavingPermissions(true);
    setError('');
    try {
      await api.platform.updateAdmin(selectedAdminId, { permissions: selectedPermissions });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update permissions');
    } finally {
      setSavingPermissions(false);
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
    <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-6">
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Platform Admins</h2>
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-800">
          {admins.map((a) => {
            const isSelected = a.id === selectedAdminId;
            const permissionCount = a.permissions?.length ?? 0;
            return (
              <div key={a.id} className={`flex flex-col gap-3 px-5 py-3 ${isSelected ? 'bg-indigo-50/70 dark:bg-indigo-950/20' : ''}`}>
                <div className="flex items-center justify-between">
                  <button type="button" onClick={() => setSelectedAdminId(a.id)} className="flex items-center gap-3 text-left flex-1">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center">
                      <span className="text-xs font-medium text-indigo-700 dark:text-indigo-300">{a.initials}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{a.name}</p>
                      <p className="text-xs text-slate-400">{a.email}</p>
                    </div>
                  </button>
                  <div className="flex items-center gap-3">
                    <Badge label={a.role === 'platform_owner' ? 'Owner' : 'Admin'} variant={a.role === 'platform_owner' ? 'purple' : 'blue'} />
                    <span className="text-xs text-slate-400">{permissionCount} perms</span>
                    {a.id !== user?.id && (
                      <button onClick={() => remove(a.id)} className="text-slate-400 hover:text-red-600"><Trash2 size={15} /></button>
                    )}
                  </div>
                </div>
                {isSelected && (
                  <div className="flex flex-wrap gap-2">
                    {(a.permissions ?? []).map((permission) => (
                      <span key={permission} className="px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-300 capitalize">
                        {permission}
                      </span>
                    ))}
                    {(a.permissions ?? []).length === 0 && <span className="text-xs text-slate-400">No custom permissions</span>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-5 h-fit">
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck size={16} className="text-indigo-600" />
            <h3 className="font-semibold text-slate-800 dark:text-slate-100">Manage Permissions</h3>
          </div>
          {selectedAdminId ? (
            <>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                Select permissions for <span className="font-medium text-slate-700 dark:text-slate-200">{admins.find((a) => a.id === selectedAdminId)?.name ?? 'this admin'}</span>.
              </p>
              <div className="space-y-2 mb-4">
                {PERMISSION_OPTIONS.map((option) => {
                  const checked = selectedPermissions.includes(option.key);
                  return (
                    <label key={option.key} className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm text-slate-600 dark:text-slate-300">
                      <span>{option.label}</span>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => togglePermission(option.key)}
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </label>
                  );
                })}
              </div>
              <button type="button" onClick={savePermissions} disabled={savingPermissions} className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-medium text-sm py-2.5 rounded-lg transition-colors">
                <ShieldCheck size={16} /> {savingPermissions ? 'Saving...' : 'Save Permissions'}
              </button>
            </>
          ) : (
            <p className="text-sm text-slate-400">Select an admin to manage permissions.</p>
          )}
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
    </div>
  );
}
