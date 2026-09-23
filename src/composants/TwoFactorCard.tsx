/*
 * Copyright (c) 2026 [COMPANY LEGAL NAME]. All rights reserved.
 * Proprietary and confidential. Unauthorized copying, distribution or
 * modification of this file, via any medium, is strictly prohibited.
 */
import { useEffect, useState } from 'react';
import { ShieldCheck, ShieldAlert, Copy, Check } from 'lucide-react';
import { api, type TwoFactorStatus } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';

type Mode = 'idle' | 'enrolling' | 'recovery';

export default function TwoFactorCard() {
  const { applySession } = useAuth();
  const { lang } = useLanguage();
  const lbl = (en: string, fr: string) => (lang === 'fr' ? fr : en);

  const [status, setStatus] = useState<TwoFactorStatus | null>(null);
  const [mode, setMode] = useState<Mode>('idle');
  const [qr, setQr] = useState('');
  const [secret, setSecret] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  const refresh = () => api.twoFactor.status().then(setStatus).catch(() => {});
  useEffect(() => { refresh(); }, []);

  const startEnroll = async () => {
    setError(''); setBusy(true);
    try {
      const res = await api.twoFactor.enrollStart();
      setQr(res.qr); setSecret(res.secret); setCode(''); setMode('enrolling');
    } catch (e) {
      setError(e instanceof Error ? e.message : lbl('Could not start.', 'Échec du démarrage.'));
    } finally { setBusy(false); }
  };

  const verifyEnroll = async (e: React.FormEvent) => {
    e.preventDefault(); setError('');
    if (!/^\d{6}$/.test(code.trim())) { setError(lbl('Enter the 6-digit code.', 'Saisissez le code à 6 chiffres.')); return; }
    setBusy(true);
    try {
      const res = await api.twoFactor.enrollVerify(code.trim());
      const { recovery_codes, enabled, ...session } = res;
      void enabled;
      applySession(session);
      setRecoveryCodes(recovery_codes);
      setMode('recovery');
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : lbl('Incorrect code.', 'Code incorrect.'));
    } finally { setBusy(false); }
  };

  const disable = async () => {
    const entered = window.prompt(lbl('Enter a current 6-digit code to turn off two-factor:', 'Saisissez un code à 6 chiffres pour désactiver :'));
    if (!entered) return;
    setBusy(true); setError('');
    try {
      const res = await api.twoFactor.disable(entered.trim());
      const { enabled, ...session } = res;
      void enabled;
      applySession(session);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : lbl('Could not disable.', 'Désactivation impossible.'));
    } finally { setBusy(false); }
  };

  const regenerate = async () => {
    const entered = window.prompt(lbl('Enter a current 6-digit code to generate new recovery codes:', 'Saisissez un code à 6 chiffres pour de nouveaux codes de récupération :'));
    if (!entered) return;
    setBusy(true); setError('');
    try {
      const res = await api.twoFactor.regenerate(entered.trim());
      setRecoveryCodes(res.recovery_codes);
      setMode('recovery');
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : lbl('Could not regenerate.', 'Échec.'));
    } finally { setBusy(false); }
  };

  const copyCodes = () => {
    navigator.clipboard?.writeText(recoveryCodes.join('\n'))
      .then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); })
      .catch(() => {});
  };

  const cardClass = 'bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-5';

  return (
    <div className={cardClass}>
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${status?.enabled ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}>
          {status?.enabled ? <ShieldCheck size={18} /> : <ShieldAlert size={18} />}
        </div>
        <div>
          <h3 className="font-semibold text-slate-800 dark:text-slate-100">{lbl('Two-factor authentication', 'Double authentification')}</h3>
          <p className="text-xs text-slate-400">
            {status?.enabled
              ? lbl(`Enabled · ${status.recovery_remaining} recovery codes left`, `Activée · ${status?.recovery_remaining} codes de récupération restants`)
              : status?.mandatory
                ? lbl('Required for your role', 'Obligatoire pour votre rôle')
                : lbl('Add a second step to every sign-in', 'Ajoutez une deuxième étape à chaque connexion')}
          </p>
        </div>
      </div>

      {error && <p className="text-red-600 text-sm mb-2">{error}</p>}

      {mode === 'idle' && !status?.enabled && (
        <button disabled={busy} onClick={startEnroll}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-lg">
          {lbl('Enable', 'Activer')}
        </button>
      )}

      {mode === 'idle' && status?.enabled && (
        <div className="flex flex-wrap gap-2">
          <button disabled={busy} onClick={regenerate}
            className="text-sm border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
            {lbl('New recovery codes', 'Nouveaux codes de récupération')}
          </button>
          {!status.mandatory && (
            <button disabled={busy} onClick={disable}
              className="text-sm border border-red-200 text-red-600 px-3 py-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40">
              {lbl('Turn off', 'Désactiver')}
            </button>
          )}
        </div>
      )}

      {mode === 'enrolling' && (
        <form onSubmit={verifyEnroll} className="space-y-3">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {lbl('Scan with an authenticator app, then enter the code.', 'Scannez avec une application d’authentification, puis saisissez le code.')}
          </p>
          {qr && <img src={qr} alt="QR" className="w-40 h-40 rounded-lg border border-slate-200 dark:border-slate-700" />}
          <p className="text-xs font-mono break-all text-slate-500 bg-slate-50 dark:bg-slate-800 rounded px-2 py-1.5">{secret}</p>
          <input inputMode="numeric" value={code} onChange={e => { setCode(e.target.value); setError(''); }}
            placeholder="123456"
            className="w-40 px-3 py-2 text-center tracking-[0.3em] border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          <div className="flex gap-2">
            <button disabled={busy} type="submit" className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-lg">
              {lbl('Verify & enable', 'Vérifier et activer')}
            </button>
            <button type="button" onClick={() => { setMode('idle'); setError(''); }} className="text-sm text-slate-500 px-3 py-2">
              {lbl('Cancel', 'Annuler')}
            </button>
          </div>
        </form>
      )}

      {mode === 'recovery' && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
            {lbl('Save these recovery codes — they will not be shown again.', 'Enregistrez ces codes — ils ne seront plus affichés.')}
          </p>
          <div className="grid grid-cols-2 gap-2 font-mono text-sm">
            {recoveryCodes.map(c => (
              <span key={c} className="bg-slate-50 dark:bg-slate-800 rounded px-2 py-1.5 text-center text-slate-700 dark:text-slate-200">{c}</span>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={copyCodes} className="flex items-center gap-2 text-sm border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-lg text-slate-600 dark:text-slate-300">
              {copied ? <Check size={14} /> : <Copy size={14} />}{copied ? lbl('Copied', 'Copié') : lbl('Copy all', 'Tout copier')}
            </button>
            <button onClick={() => setMode('idle')} className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg">
              {lbl('Done', 'Terminé')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
