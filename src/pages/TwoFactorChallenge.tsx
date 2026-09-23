/*
 * Copyright (c) 2026 [COMPANY LEGAL NAME]. All rights reserved.
 * Proprietary and confidential. Unauthorized copying, distribution or
 * modification of this file, via any medium, is strictly prohibited.
 */
import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';

export default function TwoFactorChallenge() {
  const { submitTwoFactor, logout } = useAuth();
  const { lang } = useLanguage();
  const lbl = (en: string, fr: string) => (lang === 'fr' ? fr : en);

  const [code, setCode] = useState('');
  const [useRecovery, setUseRecovery] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const value = code.trim();
    if (!value) return;
    setBusy(true);
    try {
      const ok = await submitTwoFactor(value);
      if (!ok) setError(lbl('Could not verify. Please sign in again.', 'Vérification impossible. Veuillez vous reconnecter.'));
    } catch (err) {
      setError(err instanceof Error ? err.message : lbl('Incorrect code.', 'Code incorrect.'));
      setCode('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4">
      <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center shrink-0">
            <ShieldCheck size={20} className="text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h1 className="font-semibold text-slate-800 dark:text-slate-100">
              {lbl('Two-factor verification', 'Vérification en deux étapes')}
            </h1>
            <p className="text-xs text-slate-400">
              {useRecovery
                ? lbl('Enter one of your recovery codes', 'Saisissez un de vos codes de récupération')
                : lbl('Enter the 6-digit code from your app', 'Saisissez le code à 6 chiffres de votre application')}
            </p>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-3 mt-4">
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <input
            autoFocus
            inputMode={useRecovery ? 'text' : 'numeric'}
            value={code}
            onChange={e => { setCode(e.target.value); setError(''); }}
            placeholder={useRecovery ? 'XXXXXX-XXXXXX-XXXXXX' : '123456'}
            className="w-full px-3 py-2.5 text-center tracking-[0.3em] text-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            disabled={busy}
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-medium text-sm py-2.5 rounded-lg transition-colors"
          >
            {busy ? lbl('Verifying…', 'Vérification…') : lbl('Verify', 'Vérifier')}
          </button>
          <button
            type="button"
            onClick={() => { setUseRecovery(v => !v); setCode(''); setError(''); }}
            className="w-full text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            {useRecovery
              ? lbl('Use your authenticator app instead', 'Utiliser plutôt votre application')
              : lbl('Use a recovery code', 'Utiliser un code de récupération')}
          </button>
          <button type="button" onClick={logout} className="w-full text-xs text-slate-400 hover:text-slate-600 mt-1">
            {lbl('Sign out', 'Se déconnecter')}
          </button>
        </form>
      </div>
    </div>
  );
}
