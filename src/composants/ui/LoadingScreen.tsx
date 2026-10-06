/*
 * Copyright (c) 2026 [COMPANY LEGAL NAME]. All rights reserved.
 * Proprietary and confidential. Unauthorized copying, distribution or
 * modification of this file, via any medium, is strictly prohibited.
 */
import { useEffect, useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';

// Messages escalate with how long the wait has lasted, so a slow load (cold server,
// weak connection) explains itself instead of looking frozen.
const STEPS: { after: number; en: string; fr: string }[] = [
  { after: 0,  en: 'Loading your workspace…',                                                                   fr: 'Chargement de votre espace…' },
  { after: 3,  en: 'Preparing your dashboard…',                                                                 fr: 'Préparation de votre tableau de bord…' },
  { after: 6,  en: 'Still working — connecting to the server…',                                                 fr: 'Toujours en cours — connexion au serveur…' },
  { after: 10, en: 'This is taking longer than usual. The server may be waking up — please keep this page open.', fr: 'Cela prend plus de temps que d\'habitude. Le serveur est peut-être en train de démarrer — gardez cette page ouverte.' },
  { after: 20, en: 'Almost there… if nothing appears, check your internet connection and refresh the page.',   fr: 'Presque terminé… si rien n\'apparaît, vérifiez votre connexion internet et actualisez la page.' },
];

interface Props {
  /** 'screen' fills the viewport (app start); 'page' sits inside a page area. */
  variant?: 'screen' | 'page';
}

export default function LoadingScreen({ variant = 'page' }: Props) {
  const { lang } = useLanguage();
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setSeconds(s => s + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  const step = [...STEPS].reverse().find(s => seconds >= s.after) ?? STEPS[0];

  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex flex-col items-center justify-center gap-4 px-6 text-center ${variant === 'screen' ? 'min-h-screen bg-slate-50 dark:bg-slate-950' : 'py-24'}`}
    >
      <div className="w-9 h-9 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      <p className="max-w-sm text-sm text-slate-500 dark:text-slate-400 transition-opacity">
        {lang === 'fr' ? step.fr : step.en}
      </p>
    </div>
  );
}
