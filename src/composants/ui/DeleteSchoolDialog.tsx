/*
 * Copyright (c) 2026 [COMPANY LEGAL NAME]. All rights reserved.
 * Proprietary and confidential. Unauthorized copying, distribution or
 * modification of this file, via any medium, is strictly prohibited.
 */
import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { api } from '../../api/client';
import type { PlatformSchool } from '../../api/client';

interface Props {
  school: PlatformSchool;
  onClose: () => void;
  /** Called after the school was really deleted, so the list can reload. */
  onDeleted: () => void;
}

// Permanent deletion needs the school's exact name typed in — the server checks it too.
export default function DeleteSchoolDialog({ school, onClose, onDeleted }: Props) {
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const matches = typed.trim() === school.name.trim();

  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [busy, onClose]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!matches || busy) return;
    setBusy(true); setError('');
    try {
      await api.platform.deleteSchool(school.id, typed.trim());
      onDeleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete the school');
      setBusy(false);
    }
  };

  const counts = [
    school.students != null ? `${school.students} student${school.students === 1 ? '' : 's'}` : null,
    school.teachers != null ? `${school.teachers} teacher${school.teachers === 1 ? '' : 's'}` : null,
  ].filter(Boolean).join(' and ');

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4" onClick={() => !busy && onClose()} role="presentation">
      <form
        onSubmit={submit}
        onClick={e => e.stopPropagation()}
        role="alertdialog" aria-modal="true" aria-labelledby="del-title"
        className="bg-white dark:bg-slate-900 border border-transparent dark:border-slate-700 rounded-2xl shadow-2xl w-full max-w-md p-6"
      >
        <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle size={22} className="text-red-500" />
        </div>
        <h3 id="del-title" className="text-slate-800 dark:text-slate-100 font-bold text-center text-base">Delete “{school.name}” permanently?</h3>
        <p className="text-slate-600 dark:text-slate-300 text-sm text-center mt-2">
          This erases the school's whole database{counts ? ` (${counts})` : ''}, its uploaded files, and the administrator's login. <strong>It cannot be undone.</strong>
        </p>
        <p className="text-slate-400 text-xs text-center mt-1">Need the data? Export a backup first (Backup &amp; Restore).</p>

        <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mt-5">
          Type <span className="font-mono font-semibold text-slate-800 dark:text-slate-100">{school.name}</span> to confirm
        </label>
        <input
          ref={inputRef} value={typed} onChange={e => setTyped(e.target.value)} disabled={busy}
          autoComplete="off" spellCheck={false}
          className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
        />
        {error && <p className="text-red-600 text-xs mt-2" role="alert">{error}</p>}

        <div className="flex gap-3 mt-6">
          <button type="button" onClick={onClose} disabled={busy}
            className="flex-1 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={!matches || busy}
            className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition-colors">
            <Trash2 size={15} /> {busy ? 'Deleting…' : 'Delete school'}
          </button>
        </div>
      </form>
    </div>
  );
}
