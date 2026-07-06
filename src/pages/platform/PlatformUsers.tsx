import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import Badge from '../../composants/ui/Badge';
import { api } from '../../api/client';
import type { PlatformUserRow } from '../../api/client';

const ROLE_VARIANT: Record<string, 'purple' | 'blue' | 'green' | 'orange' | 'gray'> = {
  super_admin: 'purple', head_teacher: 'purple', teacher: 'blue', student: 'green', parent: 'orange',
};

export default function PlatformUsers() {
  const [users, setUsers] = useState<PlatformUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.platform.getUsers().then(setUsers).catch(console.error).finally(() => setLoading(false));
  }, []);

  const filtered = search.trim()
    ? users.filter(u =>
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase()) ||
        u.school_name.toLowerCase().includes(search.toLowerCase())
      )
    : users;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">All Users <span className="text-slate-400 font-normal text-sm">({filtered.length} across {new Set(users.map(u => u.school_id)).size} schools)</span></h2>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, email, or school..."
            className="pl-8 pr-3 py-1.5 text-sm border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 w-72" />
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wide">
                <th className="px-5 py-3 text-left font-medium">Name</th>
                <th className="px-5 py-3 text-left font-medium">Email</th>
                <th className="px-5 py-3 text-left font-medium">Role</th>
                <th className="px-5 py-3 text-left font-medium">School</th>
                <th className="px-5 py-3 text-left font-medium">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map(u => (
                <tr key={`${u.school_id}-${u.id}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center shrink-0">
                        <span className="text-xs font-medium text-indigo-700 dark:text-indigo-300">{u.initials}</span>
                      </div>
                      <span className="font-medium text-slate-800 dark:text-slate-100">{u.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-slate-600 dark:text-slate-300">{u.email}</td>
                  <td className="px-5 py-3"><Badge label={u.role} variant={ROLE_VARIANT[u.role] ?? 'gray'} /></td>
                  <td className="px-5 py-3 text-slate-600 dark:text-slate-300">{u.school_name}</td>
                  <td className="px-5 py-3 text-slate-500 dark:text-slate-400 text-xs">{new Date(u.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-10 text-center text-slate-400 text-sm">No users found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
