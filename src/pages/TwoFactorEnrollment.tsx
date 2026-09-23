/*
 * Copyright (c) 2026 [COMPANY LEGAL NAME]. All rights reserved.
 * Proprietary and confidential. Unauthorized copying, distribution or
 * modification of this file, via any medium, is strictly prohibited.
 */
import { useEffect, useState } from 'react';
import { ShieldCheck, Copy, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import { api } from '../api/client';

type Step = 'loading' | 'scan' | 'recovery' | 'error';

export default function TwoFactorEnrollment() {
  const { enrollToken, applySession, logout } = useAuth();
  const { lang } = useLanguage();
  const lbl = (en: string, fr: string) => (lang === 'fr' ? fr : en);

  const [step, setStep] = useState<Step>('loading');
  const [qr, setQr] = useState('');
  const [secret, setSecret] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [pendingSession, setPendingSession] = useState<Parameters<typeof applySession>[0] | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!enrollToken) return;
    api.twoFactor.enrollStart(enrollToken)
      .then(res => { setQr(res.qr); setSecret(res.secret); setStep('scan'); })
      .catch(() => { setError(lbl('Could not start enrolment.', 'Impossible de démarrer l’activation.')); setStep('error'); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enrollToken]);

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!/^\d{6}$/.test(code.trim())) {
      setError(lbl('Enter the 6-digit code.', 'Saisissez le code à 6 chiffres.'));
      return;
    }
    setBusy(true);
    try {
      const res = await api.twoFactor.enrollVerify(code.trim(), enrollToken ?? undefined);
      const { recovery_codes, enabled: _enabled, ...session } = res;
      setRecoveryCodes(recovery_codes);
      setPendingSession(session);
      setStep('recovery');
    } catch (err) {
      setError(err instanceof Error ? err.message : lbl('Incorrect code.', 'Code incorrect.'));
    } finally {
      setBusy(false);
    }
  };

  const finish = () => {
    if (pendingSession) applySession(pendingSession);
  };

  const copyCodes = () => {
    navigator.clipboard?.writeText(recoveryCodes.join('\n')).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4 py-8">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center shrink-0">
            <ShieldCheck size={20} className="text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h1 className="font-semibold text-slate-800 dark:text-slate-100">
              {lbl('Set up two-factor authentication', 'Configurer la double authentification')}
            </h1>
            <p className="text-xs text-slate-400">
              {lbl('Required for your role before you can continue.', 'Obligatoire pour votre rôle avant de continuer.')}
            </p>
          </div>
        </div>

        {step === 'loading' && <p className="text-sm text-slate-500">{lbl('Preparing…', 'Préparation…')}</p>}

        {step === 'error' && (
          <>
            <p className="text-red-600 text-sm">{error}</p>
            <button onClick={logout} className="mt-4 text-xs text-slate-400 hover:text-slate-600">{lbl('Sign out', 'Se déconnecter')}</button>
          </>
        )}

        {step === 'scan' && (
          <form onSubmit={verify} className="space-y-4">
            <ol className="text-sm text-slate-600 dark:text-slate-300 list-decimal list-inside space-y-1">
              <li>{lbl('Open an authenticator app (Google Authenticator, Authy, 1Password…).', 'Ouvrez une application d’authentification (Google Authenticator, Authy, 1Password…).')}</li>
              <li>{lbl('Scan this QR code, or enter the key below.', 'Scannez ce QR code, ou saisissez la clé ci-dessous.')}</li>
              <li>{lbl('Enter the 6-digit code it shows.', 'Saisissez le code à 6 chiffres affiché.')}</li>
            </ol>

            {qr && (
              <div className="flex justify-center">
                <img src={qr} alt="QR code" className="w-44 h-44 rounded-lg border border-slate-200 dark:border-slate-700" />
              </div>
            )}
            <p className="text-center text-xs font-mono break-all text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 rounded-lg px-3 py-2">
              {secret}
            </p>

            {error && <p className="text-red-600 text-sm">{error}</p>}
            <input
              autoFocus
              inputMode="numeric"
              value={code}
              onChange={e => { setCode(e.target.value); setError(''); }}
              placeholder="123456"
              className="w-full px-3 py-2.5 text-center tracking-[0.3em] text-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button disabled={busy} type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-medium text-sm py-2.5 rounded-lg transition-colors">
              {busy ? lbl('Verifying…', 'Vérification…') : lbl('Verify & enable', 'Vérifier et activer')}
            </button>
            <button type="button" onClick={logout} className="w-full text-xs text-slate-400 hover:text-slate-600">
              {lbl('Sign out', 'Se déconnecter')}
            </button>
          </form>
        )}

        {step === 'recovery' && (
          <div className="space-y-4">
            <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-800 p-3">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                {lbl('Save your recovery codes', 'Enregistrez vos codes de récupération')}
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                {lbl('Each code works once, if you lose your device. They will not be shown again.', 'Chaque code fonctionne une fois, si vous perdez votre appareil. Ils ne seront plus affichés.')}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 font-mono text-sm">
              {recoveryCodes.map(c => (
                <span key={c} className="bg-slate-50 dark:bg-slate-800 rounded px-2 py-1.5 text-center text-slate-700 dark:text-slate-200">{c}</span>
              ))}
            </div>
            <button onClick={copyCodes}
              className="w-full flex items-center justify-center gap-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? lbl('Copied', 'Copié') : lbl('Copy all', 'Tout copier')}
            </button>
            <button onClick={finish}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm py-2.5 rounded-lg transition-colors">
              {lbl('I’ve saved them — continue', 'Je les ai enregistrés — continuer')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
