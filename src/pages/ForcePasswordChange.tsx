import { useState } from 'react';
import { KeyRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

export default function ForcePasswordChange() {
  const { user, logout, clearMustChangePassword } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setSaving(true);
    try {
      await api.changePassword(currentPassword, newPassword);
      clearMustChangePassword();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
            <KeyRound size={20} className="text-indigo-600" />
          </div>
          <div>
            <h1 className="font-semibold text-slate-800">Set a new password</h1>
            <p className="text-xs text-slate-400">Signed in as {user?.email}</p>
          </div>
        </div>
        <p className="text-sm text-slate-500 mt-3 mb-4">
          For security, you must set your own password before continuing.
        </p>

        <form onSubmit={submit} className="space-y-3">
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <div>
            <label className="text-xs font-medium text-slate-600">Temporary Password</label>
            <input required type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)}
              className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">New Password</label>
            <input required type="password" minLength={6} value={newPassword} onChange={e => setNewPassword(e.target.value)}
              className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">Confirm New Password</label>
            <input required type="password" minLength={6} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
              className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <button disabled={saving} type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-medium text-sm py-2.5 rounded-lg transition-colors">
            {saving ? 'Saving...' : 'Set Password & Continue'}
          </button>
          <button type="button" onClick={logout} className="w-full text-xs text-slate-400 hover:text-slate-600 mt-1">
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}
