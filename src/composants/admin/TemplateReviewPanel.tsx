/*
 * Copyright (c) 2026 [COMPANY LEGAL NAME]. All rights reserved.
 * Proprietary and confidential. Unauthorized copying, distribution or
 * modification of this file, via any medium, is strictly prohibited.
 */
// Lets the administrator verify what the analyser detected in a structured report-card template:
// the subject <-> template-row mapping (with confirm / correct), the labelled fields it will fill,
// and the notes (values printed on the PDF, sections with no data, warnings).
import { AlertTriangle, CheckCircle2, CircleDashed, Info } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { fieldLabel, type TemplateField, type SubjectGridField, type SimpleField, type InfoField } from '../../utils/reportCardTemplate';
import { MATCH_AUTO } from '../../utils/templateGrid';

interface Props {
  fields: TemplateField[];
  onChange: (fields: TemplateField[]) => void;
  subjects: { id: string; name: string }[];
}

export default function TemplateReviewPanel({ fields, onChange, subjects }: Props) {
  const { lang } = useLanguage();
  const lbl = (en: string, fr: string) => (lang === 'fr' ? fr : en);

  const gridIdx = fields.findIndex(f => f.type === 'subject_grid');
  const grid = gridIdx >= 0 ? (fields[gridIdx] as SubjectGridField) : null;
  const notes = fields.filter((f): f is InfoField => f.type === 'info');
  const texts = fields.filter((f): f is SimpleField => f.type === 'text');
  const hasPhoto = fields.some(f => f.type === 'image');
  const hasTick = fields.some(f => f.type === 'tick');

  const updateRow = (rowIdx: number, patch: Partial<SubjectGridField['rows'][number]>) => {
    if (!grid) return;
    const rows = grid.rows.map((r, i) => (i === rowIdx ? { ...r, ...patch } : r));
    onChange(fields.map((f, i) => (i === gridIdx ? { ...grid, rows } : f)));
  };

  const setSubject = (rowIdx: number, subjectId: string) => {
    const s = subjects.find(x => x.id === subjectId);
    // An explicit choice by the administrator is always trusted.
    updateRow(rowIdx, { subjectId: s?.id ?? null, subjectName: s?.name ?? null, confirmed: !!s });
  };

  if (!grid) {
    return (
      <p className="text-sm text-slate-500">
        {lbl('This template has no pre-printed subject table, so it is filled with the sequential layout set in the designer.',
             'Ce modèle n’a pas de tableau de matières pré-imprimé : il est rempli selon la disposition séquentielle définie dans le concepteur.')}
      </p>
    );
  }

  const mapped = grid.rows.filter(r => r.subjectId);
  const needsReview = grid.rows.filter(r => r.subjectId && r.confirmed === false);
  const unmapped = grid.rows.filter(r => !r.subjectId);
  const usedIds = new Map<string, number>();
  mapped.forEach(r => usedIds.set(r.subjectId!, (usedIds.get(r.subjectId!) ?? 0) + 1));
  const duplicates = [...usedIds.entries()].filter(([, n]) => n > 1).map(([id]) => subjects.find(s => s.id === id)?.name ?? id);

  const groupName = (g: number) => grid.groups[g]?.name || lbl('Other rows', 'Autres lignes');

  return (
    <div className="space-y-4 text-sm">
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-2">
          <p className="text-lg font-bold text-emerald-700">{mapped.length - needsReview.length}</p>
          <p className="text-[11px] text-emerald-700">{lbl('subjects mapped', 'matières associées')}</p>
        </div>
        <div className={`rounded-lg border p-2 ${needsReview.length ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'}`}>
          <p className={`text-lg font-bold ${needsReview.length ? 'text-amber-700' : 'text-slate-500'}`}>{needsReview.length}</p>
          <p className={`text-[11px] ${needsReview.length ? 'text-amber-700' : 'text-slate-500'}`}>{lbl('to verify', 'à vérifier')}</p>
        </div>
        <div className="rounded-lg bg-slate-50 border border-slate-200 p-2">
          <p className="text-lg font-bold text-slate-600">{unmapped.length}</p>
          <p className="text-[11px] text-slate-500">{lbl('not in the app', 'absentes de l’app')}</p>
        </div>
      </div>

      {needsReview.length > 0 && (
        <p className="flex items-start gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <AlertTriangle size={14} className="shrink-0 mt-0.5" />
          {lbl('Uncertain matches are NOT filled on report cards until you confirm them (✓) or pick the right subject.',
               'Les correspondances incertaines ne sont PAS remplies sur les bulletins tant que vous ne les confirmez pas (✓) ou ne choisissez pas la bonne matière.')}
        </p>
      )}
      {duplicates.length > 0 && (
        <p className="flex items-start gap-1.5 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <AlertTriangle size={14} className="shrink-0 mt-0.5" />
          {lbl('Two template rows use the same subject:', 'Deux lignes du modèle utilisent la même matière :')} {duplicates.join(', ')}
        </p>
      )}

      <div>
        <p className="text-xs font-semibold text-slate-700 mb-1.5">{lbl('Subject rows in the template', 'Lignes de matières du modèle')}</p>
        <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-80 overflow-y-auto">
          {grid.rows.map((row, i) => {
            const status = !row.subjectId ? 'none' : row.confirmed === false ? 'review' : 'ok';
            const showGroup = i === 0 || grid.rows[i - 1].group !== row.group;
            return (
              <div key={i}>
                {showGroup && <div className="px-2.5 py-1 bg-slate-50 text-[10px] font-semibold uppercase tracking-wide text-slate-500">{groupName(row.group)}</div>}
                <div className="flex items-center gap-2 px-2.5 py-1.5">
                  <span className="shrink-0">
                    {status === 'ok' && <CheckCircle2 size={14} className="text-emerald-600" />}
                    {status === 'review' && <AlertTriangle size={14} className="text-amber-600" />}
                    {status === 'none' && <CircleDashed size={14} className="text-slate-400" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-slate-800 truncate" title={row.label}>{row.label}</p>
                    {row.printedCoef != null && <p className="text-[10px] text-slate-400">coef {row.printedCoef}</p>}
                  </div>
                  <select
                    value={row.subjectId ?? ''}
                    onChange={e => setSubject(i, e.target.value)}
                    className="w-36 border border-slate-200 rounded px-1.5 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="">{lbl('— leave blank —', '— laisser vide —')}</option>
                    {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  {status === 'review' && (
                    <button onClick={() => updateRow(i, { confirmed: true })}
                      title={lbl('Confirm this match', 'Confirmer cette correspondance')}
                      className="px-1.5 py-1 rounded text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 shrink-0">✓</button>
                  )}
                  {status !== 'none' && status !== 'review' && row.confidence < MATCH_AUTO && (
                    <span className="text-[10px] text-slate-400 shrink-0">{lbl('manual', 'manuel')}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-[11px] text-slate-400 mt-1">
          {lbl('Rows set to "leave blank" keep their printed look and receive no marks. Marks are matched to rows by subject, never by position.',
               'Les lignes « laisser vide » gardent leur aspect imprimé et ne reçoivent aucune note. Les notes sont associées aux lignes par matière, jamais par position.')}
        </p>
      </div>

      <div>
        <p className="text-xs font-semibold text-slate-700 mb-1.5">{lbl('Fields that will be filled', 'Champs qui seront remplis')}</p>
        <div className="flex flex-wrap gap-1">
          {texts.map((f, i) => (
            <span key={i} className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[11px]">{fieldLabel(f.key, lang)}</span>
          ))}
          {hasPhoto && <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[11px]">{lbl('Photo', 'Photo')}</span>}
          {hasTick && <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[11px]">{lbl('Repeater (tick)', 'Redoublant (coche)')}</span>}
        </div>
        {hasTick && (
          <p className="text-[11px] text-slate-400 mt-1">
            {lbl('Repeater is ticked only when the student’s year-end history says so; with no history nothing is ticked.',
                 'Redoublant n’est coché que si l’historique de fin d’année l’indique ; sans historique, rien n’est coché.')}
          </p>
        )}
      </div>

      {notes.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-700 mb-1.5">{lbl('Notes', 'Remarques')}</p>
          <ul className="space-y-1">
            {notes.map((n, i) => (
              <li key={i} className={`flex items-start gap-1.5 text-xs rounded px-2 py-1.5 ${n.kind === 'warning' ? 'bg-amber-50 text-amber-800' : 'bg-slate-50 text-slate-600'}`}>
                {n.kind === 'warning' ? <AlertTriangle size={13} className="shrink-0 mt-0.5" /> : <Info size={13} className="shrink-0 mt-0.5" />}
                <span>
                  <strong>{n.label}</strong>
                  {n.kind === 'printed' && ` — ${lbl('already printed on the PDF', 'déjà imprimé sur le PDF')}${n.detail ? `: “${n.detail}”` : ''}, ${lbl('left as is', 'laissé tel quel')}`}
                  {n.kind === 'unsupported' && ` — ${lbl('no data in the application, left blank', 'aucune donnée dans l’application, laissé vide')}`}
                  {n.kind === 'warning' && n.detail ? ` — ${n.detail}` : ''}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
