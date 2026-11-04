/*
 * Copyright (c) 2026 [COMPANY LEGAL NAME]. All rights reserved.
 * Proprietary and confidential. Unauthorized copying, distribution or
 * modification of this file, via any medium, is strictly prohibited.
 */
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

interface Props {
  total: number;
  page: number;       // 1-based; callers may pass a stale value — it is clamped here
  pageSize: number;
  onPage: (page: number) => void;
}

// Renders nothing when everything fits on one page.
export default function Pagination({ total, page, pageSize, onPage }: Props) {
  const { lang } = useLanguage();
  const lbl = (en: string, fr: string) => lang === 'fr' ? fr : en;
  if (total <= pageSize) return null;

  const totalPages = Math.ceil(total / pageSize);
  const current = Math.min(Math.max(page, 1), totalPages);
  const start = (current - 1) * pageSize;

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between px-5 py-3 border-t border-slate-100 text-sm text-slate-500">
      <span>{start + 1}–{Math.min(start + pageSize, total)} {lbl('of', 'sur')} {total}</span>
      <div className="flex flex-wrap items-center gap-1">
        <button
          onClick={() => onPage(Math.max(1, current - 1))}
          disabled={current === 1}
          aria-label={lbl('Previous page', 'Page précédente')}
          className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronLeft size={15} />
        </button>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
          <button
            key={n}
            onClick={() => onPage(n)}
            aria-current={n === current ? 'page' : undefined}
            className={`min-w-8 px-2 py-1 rounded-lg border text-xs font-medium ${n === current ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-200 hover:bg-slate-50'}`}
          >
            {n}
          </button>
        ))}
        <button
          onClick={() => onPage(Math.min(totalPages, current + 1))}
          disabled={current === totalPages}
          aria-label={lbl('Next page', 'Page suivante')}
          className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}
