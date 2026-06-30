import { useEffect, useState } from 'react';
import { Plus, KeyRound, Trash2, X, RefreshCw } from 'lucide-react';
import { api } from '../../api/client';
import type { PortalUser, CreateUserInput } from '../../api/client';

const ROLE_CHIP: Record<string, string> = {
  super_admin: 'bg-red-100 text-red-700',
  head_teacher:'bg-orange-100 text-orange-700',
  teacher:     'bg-indigo-100 text-indigo-700',
  student:     'bg-emerald-100 text-emerald-700',
  parent:      'bg-violet-100 text-violet-700',
};

const BLANK: CreateUserInput = { name: '', email: '', password: '', role: 'teacher', initials: '' };

export default function UserManagement() {
  const [users, setUsers] = useState<PortalUser[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<CreateUserInput>(BLANK);
  const [saving, setSaving] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [migResult, setMigResult] = useState<string | null>(null);
  const [resetId, setResetId] = useState<string | null>(null);
  const [newPw, setNewPw] = useState('');

  const load = () => api.getUsers().then(setUsers).catch(() => {});
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!form.name || !form.email || !form.password || !form.role) return;
    setSaving(true);
    try { await api.createUser(form); setShowCreate(false); setForm(BLANK); load(); }
    finally { setSaving(false); }
  };

  const doReset = async (id: string) => {
    if (!newPw || newPw.length < 6) return;
    await api.resetUserPw(id, newPw);
    setResetId(null); setNewPw('');
  };

  const doDelete = async (id: string) => {
    if (!confirm('Delete this user account?')) return;
    await api.deleteUser(id);
    load();
  };

  const migrate = async () => {
    setMigrating(true);
    try {
      const r = await api.triggerPortalMigration();
      setMigResult(`Teachers: ${r.result.teachers.created} created · Students: ${r.result.students.created} created · Parents: ${r.result.parents.created} created`);
      load();
    } finally { setMigrating(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">User Management</h1>
        <div className="flex gap-2">
          <button onClick={migrate} disabled={migrating}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 text-slate-600 dark:text-slate-400 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50">
            <RefreshCw size={14} className={migrating ? 'animate-spin' : ''} />
            Auto-Create Portal Accounts
          </button>
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm hover:bg-indigo-700">
            <Plus size={14} /> Create Account
          </button>
        </div>
      </div>

      {migResult && (
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 text-sm text-emerald-700 dark:text-emerald-400 flex items-center justify-between">
          {migResult}
          <button onClick={() => setMigResult(null)} className="text-emerald-500 hover:text-emerald-700"><X size={14} /></button>
        </div>
      )}

      {showCreate && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-800 dark:text-slate-200">Create Account</h2>
            <button onClick={() => setShowCreate(false)} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {([['Name', 'name', 'text'], ['Email', 'email', 'email'], ['Password', 'password', 'password'], ['Initials', 'initials', 'text']] as [string, keyof CreateUserInput, string][]).map(([label, key, type]) => (
              <div key={key}>
                <label className="text-xs text-slate-500 mb-1 block">{label}</label>
                <input type={type} value={form[key] as string} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200" />
              </div>
            ))}
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Role</label>
              <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                {['super_admin','teacher','student','parent'].map(r => <option key={r} value={r} className="capitalize">{r.replace('_', ' ')}</option>)}
              </select>
            </div>
          </div>
          <button onClick={create} disabled={saving}
            className="px-5 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
            {saving ? 'Creating…' : 'Create Account'}
          </button>
        </div>
      )}

      {resetId && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-amber-300 dark:border-amber-700 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-800 dark:text-slate-200">Reset Password</h2>
            <button onClick={() => { setResetId(null); setNewPw(''); }} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
          </div>
          <div className="flex gap-3">
            <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="New password (min 6 chars)"
              className="border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 w-64" />
            <button onClick={() => doReset(resetId)} disabled={newPw.length < 6}
              className="px-4 py-2 rounded-lg bg-amber-500 text-white text-sm hover:bg-amber-600 disabled:opacity-50">Reset</button>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-700/50">
            <tr>
              {['Name', 'Email', 'Role', 'Linked To', 'Created', 'Actions'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {users.map(u => (
              <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{u.name}</td>
                <td className="px-4 py-3 text-slate-500">{u.email}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${ROLE_CHIP[u.role] ?? 'bg-slate-100 text-slate-600'}`}>
                    {u.role.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-500 text-xs">
                  {u.teacher_id ? `Teacher: ${u.teacher_id}` : u.student_id ? `Student: ${u.student_id}` : u.parent_id ? `Parent: ${u.parent_id}` : '—'}
                </td>
                <td className="px-4 py-3 text-slate-500">{u.created_at?.slice(0, 10)}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button onClick={() => { setResetId(u.id); setNewPw(''); }}
                      className="p-1.5 rounded hover:bg-amber-100 dark:hover:bg-amber-900/30 text-amber-600" title="Reset password">
                      <KeyRound size={14} />
                    </button>
                    <button onClick={() => doDelete(u.id)}
                      className="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600" title="Delete account">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
