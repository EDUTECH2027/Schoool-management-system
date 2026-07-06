import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import Badge from '../../composants/ui/Badge';
import { api } from '../../api/client';
import type { PlatformSchool } from '../../api/client';

export default function Schools() {
  const navigate = useNavigate();
  const [schools, setSchools] = useState<PlatformSchool[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const load = () => {
    api.platform.getSchools().then(setSchools).catch(console.error).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const toggleStatus = async (s: PlatformSchool, e: React.MouseEvent) => {
    e.stopPropagation();
    if (s.status === 'active') await api.platform.deactivateSchool(s.id);
    else await api.platform.activateSchool(s.id);
    load();
  };

  const filtered = schools.filter(s => {
    const matchesSearch = !search.trim() ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.admin_email.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">All Schools <span className="text-slate-400 font-normal text-sm">({filtered.length})</span></h2>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search schools or admin email..."
              className="pl-8 pr-3 py-1.5 text-sm border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 w-64" />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-sm border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wide">
                <th className="px-5 py-3 text-left font-medium">School Name</th>
                <th className="px-5 py-3 text-left font-medium">Admin</th>
                <th className="px-5 py-3 text-left font-medium">Students</th>
                <th className="px-5 py-3 text-left font-medium">Teachers</th>
                <th className="px-5 py-3 text-left font-medium">Plan</th>
                <th className="px-5 py-3 text-left font-medium">Status</th>
                <th className="px-5 py-3 text-left font-medium">Created</th>
                <th className="px-5 py-3 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map(s => (
                <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer" onClick={() => navigate(`/platform/schools/${s.id}`)}>
                  <td className="px-5 py-3 font-medium text-slate-800 dark:text-slate-100">{s.name}</td>
                  <td className="px-5 py-3">
                    <p className="text-slate-700 dark:text-slate-200">{s.admin_name}</p>
                    <p className="text-xs text-slate-400">{s.admin_email}</p>
                  </td>
                  <td className="px-5 py-3 text-slate-600 dark:text-slate-300">{s.students ?? 0}</td>
                  <td className="px-5 py-3 text-slate-600 dark:text-slate-300">{s.teachers ?? 0}</td>
                  <td className="px-5 py-3"><Badge label={s.plan_name ?? 'Unassigned'} variant="blue" /></td>
                  <td className="px-5 py-3"><Badge label={s.status} variant={s.status === 'active' ? 'green' : 'red'} /></td>
                  <td className="px-5 py-3 text-slate-500 dark:text-slate-400 text-xs">{new Date(s.created_at).toLocaleDateString()}</td>
                  <td className="px-5 py-3" onClick={e => e.stopPropagation()}>
                    <button onClick={(e) => toggleStatus(s, e)} className="text-xs font-medium text-indigo-600 hover:underline">
                      {s.status === 'active' ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="px-5 py-10 text-center text-slate-400 text-sm">No schools found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
