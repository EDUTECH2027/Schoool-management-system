/*
 * Copyright (c) 2026 [COMPANY LEGAL NAME]. All rights reserved.
 * Proprietary and confidential. Unauthorized copying, distribution or
 * modification of this file, via any medium, is strictly prohibited.
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Trophy, Printer, FileDown, FileSpreadsheet, Search, ArrowUpDown, Star, ArrowRight } from 'lucide-react';
import { clsx } from 'clsx';
import { api, type AcademicYear, type ClassRecord, type Term, type MasterSheet as Sheet, type MasterSheetRow } from '../api/client';
import { useLanguage } from '../i18n/LanguageContext';
import { useBranding } from '../context/BrandingContext';
import StatusPill, { statusLabel } from '../composants/endOfYear/StatusPill';

type SortKey = 'rank' | 'name' | 'average' | string; // string = "s:<subjectId>"

const fmt = (n: number | null | undefined) => (n == null ? '—' : String(n));
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));

export default function MasterSheet() {
  const { lang } = useLanguage();
  const L = (en: string, fr: string) => (lang === 'fr' ? fr : en);
  const { schoolName } = useBranding();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const [years, setYears] = useState<AcademicYear[]>([]);
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [yearId, setYearId] = useState(params.get('yearId') ?? '');
  const [classId, setClassId] = useState(params.get('classId') ?? '');
  const [termId, setTermId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [data, setData] = useState<Sheet | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('rank');
  const [sortDesc, setSortDesc] = useState(false);
  const [showTop3, setShowTop3] = useState(false);

  // Reference data
  useEffect(() => {
    Promise.all([api.getYears(), api.getClasses()]).then(([ys, cs]) => {
      setYears(ys);
      setClasses(cs);
      setYearId((cur) => cur || (ys.find((y) => y.is_current) ?? ys[0])?.id || '');
    }).catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    if (!yearId) return;
    api.getTerms(yearId).then(setTerms).catch(() => setTerms([]));
    setTermId('');
  }, [yearId]);

  // The sheet itself
  useEffect(() => {
    if (!yearId || !classId) { setData(null); return; }
    setLoading(true);
    setError('');
    api.eoy.masterSheet({ yearId, classId, ...(termId ? { termId } : {}) })
      .then((d) => { setData(d); setSubjectId((s) => (d.subjects.some((x) => x.id === s) ? s : '')); })
      .catch((e) => { setData(null); setError(e.message); })
      .finally(() => setLoading(false));
    setParams({ yearId, classId }, { replace: true });
  }, [yearId, classId, termId, setParams]);

  const subjects = useMemo(
    () => (data ? (subjectId ? data.subjects.filter((s) => s.id === subjectId) : data.subjects) : []),
    [data, subjectId],
  );
  const leaders = useMemo(
    () => (data ? (subjectId ? data.subjectLeaders.filter((l) => l.subjectId === subjectId) : data.subjectLeaders) : []),
    [data, subjectId],
  );
  const leaderIds = useMemo(() => {
    const m: Record<string, Set<string>> = {};
    leaders.forEach((l) => { m[l.subjectId] = new Set(l.best.map((b) => b.studentId)); });
    return m;
  }, [leaders]);
  const topIds = useMemo(() => new Set(data?.bestStudents.map((b) => b.studentId) ?? []), [data]);

  const rows = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    const filtered = data.rows.filter((r) => !q || r.name.toLowerCase().includes(q) || r.matricule.toLowerCase().includes(q));
    const val = (r: MasterSheetRow): number | string | null =>
      sortKey === 'name' ? r.name.toLowerCase()
      : sortKey === 'average' ? r.average
      : sortKey === 'rank' ? r.rank
      : r.marks[sortKey.slice(2)] ?? null;
    const dir = sortDesc ? -1 : 1;
    return [...filtered].sort((a, b) => {
      const x = val(a); const y = val(b);
      if (x == null && y == null) return a.name.localeCompare(b.name);
      if (x == null) return 1; // blanks always last
      if (y == null) return -1;
      // "average" and subject marks read best-first by default
      const base = sortKey === 'average' || sortKey.startsWith('s:') ? -1 : 1;
      const cmp = typeof x === 'string' ? x.localeCompare(y as string) : (x as number) - (y as number);
      return (cmp * base * dir) || a.name.localeCompare(b.name);
    });
  }, [data, search, sortKey, sortDesc]);

  const sortBy = (k: SortKey) => {
    if (k === sortKey) setSortDesc((d) => !d);
    else { setSortKey(k); setSortDesc(false); }
  };

  const termLabel = (name: string | null) =>
    !name ? L('Full year', 'Année complète')
    : name === 'first' ? L('Term 1', 'Trimestre 1') : name === 'second' ? L('Term 2', 'Trimestre 2') : L('Term 3', 'Trimestre 3');
  const title = data ? `${L('Class Master Sheet', 'Tableau de classe')} — ${data.class.name} · ${data.year.label} · ${termLabel(data.term)}` : '';

  // ── Exports ────────────────────────────────────────────────────────────────
  const headerCells = () => [
    L('Rank', 'Rang'), L('Name', 'Nom'), L('Matricule', 'Matricule'),
    ...subjects.map((s) => `${s.name} (×${s.coefficient})`),
    L('Weighted total', 'Total pondéré'), L('Average', 'Moyenne'), L('Status', 'Statut'),
  ];
  const bodyCells = (r: MasterSheetRow) => [
    r.rank ?? '', r.name, r.matricule,
    ...subjects.map((s) => r.marks[s.id] ?? ''),
    r.weightedTotal ?? '', r.average == null ? '' : `${r.average}${r.provisional ? '*' : ''}`,
    r.statusValidated ? statusLabel(r.finalStatus, lang) : L('Pending review', 'À examiner'),
  ];

  const download = (blob: Blob, name: string) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const fileBase = () => `master-sheet_${data?.class.name}_${data?.year.label}_${data?.term ?? 'year'}`.replace(/[^\w.-]+/g, '_');

  const exportCsv = () => {
    if (!data) return;
    const cell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = [headerCells(), ...rows.map(bodyCells)].map((line) => line.map(cell).join(';')).join('\r\n');
    download(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }), `${fileBase()}.csv`);
  };

  const exportPdf = async () => {
    if (!data) return;
    const [{ jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    doc.setFontSize(14);
    doc.text(schoolName || '', 14, 12);
    doc.setFontSize(11);
    doc.text(title, 14, 19);
    doc.setFontSize(8);
    const s = data.stats;
    doc.text(
      `${L('Students', 'Élèves')}: ${s.studentCount}   ${L('Class average', 'Moyenne de classe')}: ${fmt(s.classAverage)}   ` +
      `${L('Highest', 'Max')}: ${fmt(s.highestAverage)}   ${L('Lowest', 'Min')}: ${fmt(s.lowestAverage)}   ` +
      `${L('Promoted', 'Admis')}: ${s.promoted} (${s.promotedPct}%)   ${L('Repeating', 'Redoublants')}: ${s.repeating} (${s.repeatingPct}%)   ` +
      `${L('Pending', 'À examiner')}: ${s.pendingReview}`, 14, 24);
    autoTable(doc, {
      startY: 28,
      head: [headerCells()],
      body: rows.map((r) => bodyCells(r).map(String)),
      styles: { fontSize: 7, cellPadding: 1.2 },
      headStyles: { fillColor: [67, 56, 202] },
      didParseCell: (h) => {
        if (h.section === 'body' && topIds.has(rows[h.row.index]?.studentId)) h.cell.styles.fillColor = [254, 243, 199];
      },
    });
    const y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
    autoTable(doc, {
      startY: y,
      head: [[L('Subject', 'Matière'), L('Coef.', 'Coef.'), L('Best student(s)', 'Meilleur(s) élève(s)'), L('Mark', 'Note'), L('Subject average', 'Moyenne matière')]],
      body: leaders.map((l) => [l.subjectName, String(l.coefficient), l.best.map((b) => `${b.name} (${b.matricule})`).join(', ') || '—', fmt(l.best[0]?.mark), fmt(l.average)]),
      styles: { fontSize: 7, cellPadding: 1.2 },
      headStyles: { fillColor: [5, 150, 105] },
    });
    doc.save(`${fileBase()}.pdf`);
  };

  // Printing uses a standalone document so the app shell (sidebar, scroll containers) never leaks into the page.
  const printSheet = () => {
    if (!data) return;
    const w = window.open('', '_blank', 'width=1100,height=800');
    if (!w) return;
    const head = headerCells().map((h) => `<th>${esc(String(h))}</th>`).join('');
    const body = rows.map((r) =>
      `<tr class="${topIds.has(r.studentId) ? 'top' : ''}">${bodyCells(r).map((c) => `<td>${esc(String(c))}</td>`).join('')}</tr>`).join('');
    const lead = leaders.map((l) =>
      `<tr><td>${esc(l.subjectName)}</td><td>${l.coefficient}</td><td>${esc(l.best.map((b) => `${b.name} (${b.matricule})`).join(', ') || '—')}</td><td>${fmt(l.best[0]?.mark)}</td></tr>`).join('');
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>
      @page{size:A4 landscape;margin:10mm} body{font-family:Arial,sans-serif;font-size:10px;color:#111}
      h1{font-size:15px;margin:0} h2{font-size:12px;margin:2px 0 8px;font-weight:normal} table{border-collapse:collapse;width:100%;margin-bottom:12px}
      th,td{border:1px solid #bbb;padding:3px 5px;text-align:left} th{background:#eef;} tr.top td{background:#fef3c7;font-weight:bold}
      .stats{margin:6px 0 10px}</style></head><body>
      <h1>${esc(schoolName || '')}</h1><h2>${esc(title)}</h2>
      <div class="stats">${L('Students', 'Élèves')}: ${data.stats.studentCount} · ${L('Class average', 'Moyenne de classe')}: ${fmt(data.stats.classAverage)} ·
      ${L('Highest', 'Max')}: ${fmt(data.stats.highestAverage)} · ${L('Lowest', 'Min')}: ${fmt(data.stats.lowestAverage)} ·
      ${L('Promoted', 'Admis')}: ${data.stats.promoted} (${data.stats.promotedPct}%) · ${L('Repeating', 'Redoublants')}: ${data.stats.repeating} (${data.stats.repeatingPct}%) ·
      ${L('Pending', 'À examiner')}: ${data.stats.pendingReview}</div>
      <table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>
      <table><thead><tr><th>${L('Subject', 'Matière')}</th><th>Coef.</th><th>${L('Best student(s)', 'Meilleur(s) élève(s)')}</th><th>${L('Mark', 'Note')}</th></tr></thead><tbody>${lead}</tbody></table>
      <script>window.onload=function(){window.print()}</script></body></html>`);
    w.document.close();
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  const selectCls = 'border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-900 min-w-0';
  const th = (label: string, key?: SortKey, extra = '') => (
    <th className={clsx('px-3 py-2.5 font-medium text-left whitespace-nowrap', extra)}>
      {key ? (
        <button onClick={() => sortBy(key)} className="inline-flex items-center gap-1 hover:text-indigo-700">
          {label} <ArrowUpDown size={11} className={clsx(sortKey === key ? 'text-indigo-600' : 'text-slate-300')} />
        </button>
      ) : label}
    </th>
  );

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 p-4 no-print">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <label className="text-xs text-slate-500 space-y-1">{L('Academic year', 'Année académique')}
            <select className={clsx(selectCls, 'w-full')} value={yearId} onChange={(e) => setYearId(e.target.value)}>
              {years.map((y) => <option key={y.id} value={y.id}>{y.label}</option>)}
            </select>
          </label>
          <label className="text-xs text-slate-500 space-y-1">{L('Class', 'Classe')}
            <select className={clsx(selectCls, 'w-full')} value={classId} onChange={(e) => setClassId(e.target.value)}>
              <option value="">{L('Select a class…', 'Choisir une classe…')}</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <label className="text-xs text-slate-500 space-y-1">{L('Term', 'Trimestre')}
            <select className={clsx(selectCls, 'w-full')} value={termId} onChange={(e) => setTermId(e.target.value)}>
              <option value="">{L('Full year (annual)', 'Année complète')}</option>
              {terms.map((tm) => <option key={tm.id} value={tm.id}>{termLabel(tm.name)}</option>)}
            </select>
          </label>
          <label className="text-xs text-slate-500 space-y-1">{L('Subject', 'Matière')}
            <select className={clsx(selectCls, 'w-full')} value={subjectId} onChange={(e) => setSubjectId(e.target.value)} disabled={!data}>
              <option value="">{L('All subjects', 'Toutes les matières')}</option>
              {data?.subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>}
      {loading && <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>}
      {!loading && !data && !error && (
        <p className="text-center text-slate-400 py-16 text-sm">{L('Choose an academic year and a class to see its master sheet.', 'Choisissez une année et une classe pour afficher son tableau.')}</p>
      )}

      {data && !loading && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-slate-800 dark:text-slate-100">{title}</h2>
              {data.provisional && (
                <p className="text-xs text-amber-600 mt-0.5">
                  {L('* Provisional average: not every term has results yet.', '* Moyenne provisoire : tous les trimestres ne sont pas encore notés.')}
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2 no-print">
              <button onClick={() => navigate(`/end-of-year?yearId=${yearId}&classId=${classId}`)} className="px-3 py-2 text-sm border border-indigo-200 text-indigo-700 rounded-lg hover:bg-indigo-50 inline-flex items-center gap-1.5">
                {L('End-of-year workflow', 'Clôture de l’année')} <ArrowRight size={14} />
              </button>
              <button onClick={printSheet} className="px-3 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 inline-flex items-center gap-1.5"><Printer size={14} />{L('Print', 'Imprimer')}</button>
              <button onClick={exportPdf} className="px-3 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 inline-flex items-center gap-1.5"><FileDown size={14} />PDF</button>
              <button onClick={exportCsv} className="px-3 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 inline-flex items-center gap-1.5"><FileSpreadsheet size={14} />Excel (CSV)</button>
            </div>
          </div>

          {/* Best student + indicators */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-1 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/30 p-4">
              <div className="flex items-center gap-2 text-amber-700 text-xs font-semibold uppercase tracking-wide mb-2"><Trophy size={15} />{L('Best student', 'Meilleur élève')}</div>
              {data.bestStudents.length === 0 ? <p className="text-sm text-slate-500">{L('No ranked student yet', 'Aucun élève classé')}</p> : data.bestStudents.map((b) => (
                <div key={b.studentId} className="mb-2 last:mb-0">
                  <p className="font-semibold text-slate-800 dark:text-slate-100">{b.name}</p>
                  <p className="text-xs text-slate-500">{b.matricule} · {L('Rank', 'Rang')} {b.rank}{data.bestStudents.length > 1 ? ` (${L('tie', 'ex æquo')})` : ''}</p>
                  <p className="text-2xl font-bold text-amber-700">{fmt(b.average)}<span className="text-xs font-normal text-slate-500"> / 20</span></p>
                </div>
              ))}
            </div>
            <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                [L('Students', 'Élèves'), data.stats.studentCount],
                [L('Class average', 'Moy. de classe'), fmt(data.stats.classAverage)],
                [L('Highest', 'Plus haute'), fmt(data.stats.highestAverage)],
                [L('Lowest', 'Plus basse'), fmt(data.stats.lowestAverage)],
                [L('Promoted', 'Admis'), `${data.stats.promoted} (${data.stats.promotedPct}%)`],
                [L('Repeating', 'Redoublants'), `${data.stats.repeating} (${data.stats.repeatingPct}%)`],
                [L('Pending review', 'À examiner'), `${data.stats.pendingReview} (${data.stats.pendingReviewPct}%)`],
                [L('Withdrawn / transferred', 'Retirés / transférés'), data.stats.withdrawn + data.stats.transferred],
              ].map(([label, value]) => (
                <div key={String(label)} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 p-3">
                  <p className="text-[11px] text-slate-500">{label}</p>
                  <p className="text-lg font-semibold text-slate-800 dark:text-slate-100">{value}</p>
                </div>
              ))}
              <div className="col-span-2 sm:col-span-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 p-3">
                <p className="text-[11px] text-slate-500 mb-2">{L('Distribution of averages', 'Répartition des moyennes')}</p>
                <div className="flex items-end gap-2 h-16">
                  {Object.entries(data.stats.distribution).map(([g, n]) => {
                    const max = Math.max(1, ...Object.values(data.stats.distribution));
                    return (
                      <div key={g} className="flex-1 flex flex-col items-center justify-end h-full">
                        <span className="text-[10px] text-slate-500">{n}</span>
                        <div className="w-full bg-indigo-400 rounded-t" style={{ height: `${(n / max) * 100}%`, minHeight: n ? 3 : 0 }} />
                        <span className="text-[10px] font-medium text-slate-600 mt-0.5">{g}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Master table */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2 no-print">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={L('Search name or matricule…', 'Rechercher nom ou matricule…')}
                  className="pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg w-64 max-w-full bg-transparent" />
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-200" />{L('Top student', 'Major de classe')}</span>
                <span className="inline-flex items-center gap-1"><Star size={11} className="text-emerald-600" />{L('Subject leader', 'Major de matière')}</span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 text-xs uppercase tracking-wide">
                  <tr>
                    {th(L('Rank', 'Rang'), 'rank')}
                    {th(L('Student', 'Élève'), 'name', 'sticky left-0 bg-slate-50 dark:bg-slate-800')}
                    {subjects.map((s) => (
                      <th key={s.id} className="px-3 py-2.5 font-medium text-center whitespace-nowrap">
                        <button onClick={() => sortBy(`s:${s.id}`)} className="inline-flex items-center gap-1 hover:text-indigo-700">{s.name}<ArrowUpDown size={11} className={sortKey === `s:${s.id}` ? 'text-indigo-600' : 'text-slate-300'} /></button>
                        <div className="text-[10px] normal-case text-slate-400">coef. {s.coefficient}</div>
                      </th>
                    ))}
                    {th(L('Weighted total', 'Total pondéré'), undefined, 'text-center')}
                    {th(L('Average', 'Moyenne'), 'average', 'text-center')}
                    {th(L('Status', 'Statut'))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {rows.length === 0 && <tr><td colSpan={subjects.length + 5} className="text-center text-slate-400 py-10">{L('No students match.', 'Aucun élève.')}</td></tr>}
                  {rows.map((r) => {
                    const top = topIds.has(r.studentId);
                    return (
                      <tr key={r.studentId} className={clsx(top ? 'bg-amber-50 dark:bg-amber-950/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50')}>
                        <td className="px-3 py-2 font-semibold text-slate-700 dark:text-slate-200">
                          {r.rank ?? '—'}{top && <Trophy size={12} className="inline ml-1 text-amber-600" />}
                        </td>
                        <td className={clsx('px-3 py-2 sticky left-0', top ? 'bg-amber-50 dark:bg-amber-950/20' : 'bg-white dark:bg-slate-900')}>
                          <div className="font-medium text-slate-800 dark:text-slate-100 whitespace-nowrap">{r.name}</div>
                          <div className="text-xs text-slate-400">{r.matricule}</div>
                        </td>
                        {subjects.map((s) => {
                          const lead = leaderIds[s.id]?.has(r.studentId);
                          return (
                            <td key={s.id} className={clsx('px-3 py-2 text-center tabular-nums', lead && 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 font-semibold')}>
                              {fmt(r.marks[s.id])}{lead && <Star size={10} className="inline ml-0.5 -mt-0.5" />}
                            </td>
                          );
                        })}
                        <td className="px-3 py-2 text-center tabular-nums text-slate-600">{fmt(r.weightedTotal)}</td>
                        <td className="px-3 py-2 text-center tabular-nums font-semibold">
                          {fmt(r.average)}{r.provisional && <span className="text-amber-600" title={L('Provisional', 'Provisoire')}>*</span>}
                          {!r.complete && <div className="text-[10px] font-normal text-amber-600" title={r.issues.join('\n')}>{L('incomplete', 'incomplet')}</div>}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <StatusPill status={r.statusValidated ? r.finalStatus : (r.proposedStatus ?? 'pending_review')} proposed={!r.statusValidated && !!r.proposedStatus && r.proposedStatus !== 'pending_review'} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {subjectId && <p className="px-4 py-2 text-xs text-slate-400 border-t border-slate-100">{L('Averages and ranks always use all subjects, even when one is shown.', 'Moyennes et rangs utilisent toujours toutes les matières.')}</p>}
          </div>

          {/* Subject leaders */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-semibold text-slate-800 dark:text-slate-100">{L('Best students by subject', 'Meilleurs élèves par matière')}</h3>
              <label className="text-xs text-slate-500 inline-flex items-center gap-1.5 no-print">
                <input type="checkbox" checked={showTop3} onChange={(e) => setShowTop3(e.target.checked)} /> {L('Show top 3', 'Afficher le top 3')}
              </label>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 text-xs uppercase tracking-wide">
                  <tr>
                    <th className="px-4 py-2.5 text-left font-medium">{L('Subject', 'Matière')}</th>
                    <th className="px-4 py-2.5 text-center font-medium">Coef.</th>
                    <th className="px-4 py-2.5 text-left font-medium">{showTop3 ? L('Top 3', 'Top 3') : L('Best student', 'Meilleur élève')}</th>
                    <th className="px-4 py-2.5 text-center font-medium">{L('Mark', 'Note')}</th>
                    <th className="px-4 py-2.5 text-center font-medium">{L('Subject avg.', 'Moy. matière')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {leaders.map((l) => (
                    <tr key={l.subjectId}>
                      <td className="px-4 py-2 font-medium text-slate-800 dark:text-slate-100">{l.subjectName}</td>
                      <td className="px-4 py-2 text-center text-slate-500">{l.coefficient}</td>
                      <td className="px-4 py-2">
                        {(showTop3 ? l.top : l.best).map((b) => (
                          <div key={b.studentId} className="flex items-center gap-2">
                            {showTop3 && <span className="text-xs text-slate-400 w-5">#{b.rank}</span>}
                            <span className={clsx(b.rank === 1 && 'font-semibold text-emerald-700')}>{b.name}</span>
                            <span className="text-xs text-slate-400">{b.matricule}</span>
                            {showTop3 && <span className="ml-auto tabular-nums text-slate-600">{b.mark}</span>}
                          </div>
                        ))}
                        {l.best.length === 0 && '—'}
                      </td>
                      <td className="px-4 py-2 text-center tabular-nums font-semibold">{fmt(l.best[0]?.mark)}</td>
                      <td className="px-4 py-2 text-center tabular-nums text-slate-600">{fmt(l.average)}</td>
                    </tr>
                  ))}
                  {leaders.length === 0 && <tr><td colSpan={5} className="text-center text-slate-400 py-8">{L('No marks recorded.', 'Aucune note enregistrée.')}</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
