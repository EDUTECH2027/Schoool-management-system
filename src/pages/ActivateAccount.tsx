/*
 * Copyright (c) 2026 [COMPANY LEGAL NAME]. All rights reserved.
 * Proprietary and confidential. Unauthorized copying, distribution or
 * modification of this file, via any medium, is strictly prohibited.
 */
import { useState } from 'react';
import { KeyRound, CheckCircle2 } from 'lucide-react';
import { api } from '../api/client';

// Landing page for the one-time activation link sent over WhatsApp (/?activate=<token>).
export default function ActivateAccount({ token }: { token: string }) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  const goToLogin = () => { window.location.href = window.location.pathname; };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (newPassword.length < 8) return setError('Password must be at least 8 characters.');
    if (newPassword !== confirmPassword) return setError('Passwords do not match.');
    setSaving(true);
    try {
      const res = await api.activateAccount(token, newPassword);
      setDone(res.email);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Activation failed');
    } finally {
      setSaving(false);
    }
  };

  const input = 'w-full mt-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500';

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        {done ? (
          <div className="text-center space-y-3">
            <CheckCircle2 size={40} className="text-green-600 mx-auto" />
            <h1 className="font-semibold text-slate-800">Account activated</h1>
            <p className="text-sm text-slate-500">Sign in as <strong>{done}</strong> with the password you just chose.</p>
            <button onClick={goToLogin} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm py-2.5 rounded-lg">
              Go to sign in
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
                <KeyRound size={20} className="text-indigo-600" />
              </div>
              <h1 className="font-semibold text-slate-800">Activate your account</h1>
            </div>
            <p className="text-sm text-slate-500 mt-3 mb-4">Choose a password to finish setting up your school administrator account.</p>
            <form onSubmit={submit} className="space-y-3">
              {error && <p className="text-red-600 text-sm">{error}</p>}
              <div>
                <label className="text-xs font-medium text-slate-600">New Password</label>
                <input required type="password" minLength={8} autoComplete="new-password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className={input} />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">Confirm Password</label>
                <input required type="password" minLength={8} autoComplete="new-password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className={input} />
              </div>
              <button disabled={saving} type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-medium text-sm py-2.5 rounded-lg transition-colors">
                {saving ? 'Saving...' : 'Activate Account'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
