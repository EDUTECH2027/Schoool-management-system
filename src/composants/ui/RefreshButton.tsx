/*
 * Copyright (c) 2026 [COMPANY LEGAL NAME]. All rights reserved.
 * Proprietary and confidential. Unauthorized copying, distribution or
 * modification of this file, via any medium, is strictly prohibited.
 */
import { RefreshCw } from 'lucide-react';
import { useRefresh } from '../../context/RefreshContext';
import { useLanguage } from '../../i18n/LanguageContext';

// Small icon button: reloads the data of the page you are on straight from the server.
export default function RefreshButton({ className = '' }: { className?: string }) {
  const { available, refreshing, refresh } = useRefresh();
  const { lang } = useLanguage();
  if (!available) return null;

  const label = lang === 'fr' ? 'Actualiser les données' : 'Refresh data';
  return (
    <button
      type="button"
      onClick={refresh}
      disabled={refreshing}
      title={label}
      aria-label={label}
      className={`inline-flex items-center justify-center rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-70 transition-colors ${className}`}
    >
      <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
    </button>
  );
}
