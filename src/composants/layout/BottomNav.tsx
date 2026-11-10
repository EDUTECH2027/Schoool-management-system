/*
 * Copyright (c) 2026 [COMPANY LEGAL NAME]. All rights reserved.
 * Proprietary and confidential. Unauthorized copying, distribution or
 * modification of this file, via any medium, is strictly prohibited.
 */
import { NavLink } from 'react-router-dom';
import { Ellipsis } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { clsx } from 'clsx';
import { useLanguage } from '../../i18n/LanguageContext';

export interface BottomTab { label: string; to: string; icon: LucideIcon }

// Mobile-only tab bar. "More" opens the full side menu so every page stays reachable.
export default function BottomNav({ tabs, onMore }: { tabs: BottomTab[]; onMore: () => void }) {
  const { lang } = useLanguage();
  const fr = lang === 'fr';
  const base = 'flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium transition-colors';

  return (
    <nav
      className="lg:hidden shrink-0 flex items-stretch bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 pb-[env(safe-area-inset-bottom)]"
      aria-label={fr ? 'Navigation principale' : 'Main navigation'}
    >
      {tabs.map(({ label, to, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) => clsx(base, isActive ? 'text-blue-600' : 'text-slate-500 dark:text-slate-400')}
        >
          <Icon size={22} />
          <span>{label}</span>
        </NavLink>
      ))}
      <button type="button" onClick={onMore} className={clsx(base, 'text-slate-500 dark:text-slate-400')}>
        <Ellipsis size={22} />
        <span>{fr ? 'Plus' : 'More'}</span>
      </button>
    </nav>
  );
}
