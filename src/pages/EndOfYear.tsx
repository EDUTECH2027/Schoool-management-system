/*
 * Copyright (c) 2026 [COMPANY LEGAL NAME]. All rights reserved.
 * Proprietary and confidential. Unauthorized copying, distribution or
 * modification of this file, via any medium, is strictly prohibited.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, AlertTriangle, XCircle, Lock, Unlock, Calculator, ClipboardList, Table2, Eye, ShieldCheck, Undo2, Settings2, ArrowRight } from 'lucide-react';
import { clsx } from 'clsx';
import {
  api, type AcademicYear, type ClassRecord, type EoyConfig, type EoyDecisionRow, type EoyDecisions, type EoyPreview,
  type EoyReadiness, type EoyRun, type EoyAuditRow, type EoyProgressionRow, type YearEndStatus,
} from '../api/client';
import { useLanguage } from '../i18n/LanguageContext';
import StatusPill, { statusLabel } from '../composants/endOfYear/StatusPill';

const STEPS = ['select', 'verify', 'review', 'sheet', 'confirm'] as const;
type Step = (typeof STEPS)[number];
const SELECTABLE: YearEndStatus[] = ['promoted', 'repeating', 'withdrawn', 'transferred', 'pending_review'];

export default function EndOfYear() {
  const { lang } = useLanguage();
  const L = useCallback((en: string, fr: string) => (lang === 'fr' ? fr : en), [lang]);
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const [step, setStep] = useState<Step>('select');
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [yearId, setYearId] = useState(params.get('yearId') ?? '');
  const [classId, setClassId] = useState(params.get('classId') ?? '');
  const [nextYearId, setNextYearId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [config, setConfig] = useState<EoyConfig>({ passAverage: 50, finalClassOutcome: 'graduate' });
  const [progression, setProgression] = useState<EoyProgressionRow[]>([]);
  const [showSettings, setShowSettings] = useState(false);

  const [readiness, setReadiness] = useState<EoyReadiness | null>(null);
  const [decisions, setDecisions] = useState<EoyDecisions | null>(null);
  const [preview, setPreview] = useState<EoyPreview | null>(null);
  const [run, setRun] = useState<EoyRun | null>(null);
  const [audit, setAudit] = useState<EoyAuditRow[]>([]);
  const [editing, setEditing] = useState<EoyDecisionRow | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'override'>('all');
  const [note, setNote] = useState('');

  const year = years.find((y) => y.id === yearId);
  const cls = classes.find((c) => c.id === classId);
  const nextYear = years.find((y) => y.id === nextYearId);

  const guard = async <T,>(fn: () => Promise<T>): Promise<T | undefined> => {
    setBusy(true); setError(''); setNotice('');
    try { return await fn(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };

  const loadRef = useCallback(async () => {
    const [ys, cs, cfg, prog] = await Promise.all([api.getYears(), api.getClasses(), api.eoy.getConfig(), api.eoy.getProgression()]);
    setYears(ys); setClasses(cs); setConfig(cfg); setProgression(prog);
    setYearId((cur) => cur || (ys.find((y) => y.is_current) ?? ys[0])?.id || '');
  }, []);
  useEffect(() => { loadRef().catch((e) => setError(e.message)); }, [loadRef]);

  // Suggest the next year: the earliest year starting after the closing one.
  useEffect(() => {
    if (!year) return;
    const later = years.filter((y) => y.start_date > year.start_date).sort((a, b) => a.start_date.localeCompare(b.start_date));
    setNextYearId((cur) => (later.some((y) => y.id === cur) ? cur : later[0]?.id ?? ''));
  }, [yearId, years, year]);

  const refreshDecisions = useCallback(async () => {
    if (!yearId || !classId) return;
    setDecisions(await api.eoy.decisions({ yearId, classId }));
    setRun(await api.eoy.run({ yearId, classId }));
  }, [yearId, classId]);

  // Reset downstream data when the selection changes.
  useEffect(() => { setReadiness(null); setDecisions(null); setPreview(null); setRun(null); setAudit([]); }, [yearId, classId, nextYearId]);

  const ready = !!(yearId && classId && nextYearId);
  const go = (s: Step) => {
    setStep(s);
    if (!ready) return;
    if (s === 'verify') guard(async () => setReadiness(await api.eoy.readiness({ yearId, classId })));
    if (s === 'review') guard(refreshDecisions);
    if (s === 'confirm') guard(async () => {
      await refreshDecisions();
      setPreview(await api.eoy.preview({ yearId, classId, nextYearId }));
      setAudit(await api.eoy.audit({ yearId, classId }));
    });
  };

  const calculate = () => guard(async () => {
    const r = await api.eoy.calculate({ yearId, classId });
    setNotice(L(`Calculated: ${r.created} new, ${r.updated} updated${r.locked ? `, ${r.locked} already transitioned (unchanged)` : ''}.`,
                `Calcul terminé : ${r.created} nouveaux, ${r.updated} mis à jour${r.locked ? `, ${r.locked} déjà traités (inchangés)` : ''}.`));
    await refreshDecisions();
    setStep('review');
  });

  const acceptAll = () => guard(async () => {
    const r = await api.eoy.acceptProposals({ yearId, classId });
    setNotice(L(`${r.accepted} proposal(s) validated. Students with incomplete results still need an individual decision.`,
                `${r.accepted} proposition(s) validée(s). Les élèves aux résultats incomplets nécessitent une décision individuelle.`));
    await refreshDecisions();
  });

  const saveDecision = (row: EoyDecisionRow, status: YearEndStatus, comment: string, targetClassId: string) => guard(async () => {
    if (!row.decision) return;
    await api.eoy.decide(row.decision.id, { status, comment, targetClassId: targetClassId || null });
    setEditing(null);
    await refreshDecisions();
  });

  const toggleYear = () => guard(async () => {
    if (!year) return;
    if (year.closed_at) await api.eoy.reopenYear(year.id); else await api.eoy.closeYear(year.id);
    await loadRef();
    if (step === 'confirm') setPreview(await api.eoy.preview({ yearId, classId, nextYearId }));
  });

  const confirm = () => guard(async () => {
    if (!window.confirm(L('Confirm the end-of-year transition? Students will be enrolled in the new academic year.', 'Confirmer la clôture ? Les élèves seront inscrits dans la nouvelle année académique.'))) return;
    const r = await api.eoy.confirm({ yearId, classId, nextYearId, note: note || undefined });
    const a = r.applied;
    setNotice(L(`Done — ${a.promoted} promoted, ${a.repeated} repeating, ${a.graduated} graduated, ${a.exited} left the roll, ${a.skippedPending} skipped (pending review), ${a.alreadyApplied} already processed.`,
                `Terminé — ${a.promoted} admis, ${a.repeated} redoublants, ${a.graduated} diplômés, ${a.exited} sortis, ${a.skippedPending} ignorés (à examiner), ${a.alreadyApplied} déjà traités.`));
    await refreshDecisions();
    setPreview(await api.eoy.preview({ yearId, classId, nextYearId }));
    setAudit(await api.eoy.audit({ yearId, classId }));
  });

  const reverse = () => guard(async () => {
    const reason = window.prompt(L('Reason for reversing this transition (recorded in the audit trail):', 'Motif de l’annulation (consigné dans l’historique) :'));
    if (!reason?.trim()) return;
    const r = await api.eoy.reverse({ yearId, classId, reason });
    setNotice(L(`Reversed ${r.reverted} student(s).${r.warnings.length ? ' ' + r.warnings.join(' ') : ''}`, `${r.reverted} élève(s) rétabli(s).${r.warnings.length ? ' ' + r.warnings.join(' ') : ''}`));
    await refreshDecisions();
    setPreview(await api.eoy.preview({ yearId, classId, nextYearId }));
    setAudit(await api.eoy.audit({ yearId, classId }));
  });

  const saveConfig = () => guard(async () => { setConfig(await api.eoy.saveConfig(config)); setNotice(L('Rules saved.', 'Règles enregistrées.')); });
  const saveProgression = (id: string, nextClassId: string | null, isFinalClass: boolean) =>
    guard(async () => { await api.eoy.saveProgression(id, { nextClassId, isFinalClass }); setProgression(await api.eoy.getProgression()); });

  const stepMeta: Record<Step, { label: string; icon: typeof Eye }> = {
    select:  { label: L('1. Select', '1. Sélection'),        icon: Settings2 },
    verify:  { label: L('2. Verify', '2. Vérification'),      icon: ClipboardList },
    review:  { label: L('3. Review', '3. Examen'),            icon: Calculator },
    sheet:   { label: L('4. Master sheet', '4. Tableau'),     icon: Table2 },
    confirm: { label: L('5. Preview & confirm', '5. Aperçu et confirmation'), icon: ShieldCheck },
  };

  const rows = useMemo(() => {
    const all = decisions?.rows ?? [];
    return filter === 'pending' ? all.filter((r) => !r.decision?.validated)
         : filter === 'override' ? all.filter((r) => r.decision?.isOverride) : all;
  }, [decisions, filter]);
  const validatedCount = decisions?.rows.filter((r) => r.decision?.validated).length ?? 0;
  const lockedByRun = run?.status === 'confirmed';

  const card = 'bg-white dark:bg-slate-900 rounded-xl border border-slate-200 p-5';
  const btn = 'px-4 py-2 text-sm rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5';
  const primary = clsx(btn, 'bg-indigo-600 hover:bg-indigo-700 text-white');
  const outline = clsx(btn, 'border border-slate-200 hover:bg-slate-50 text-slate-700 dark:text-slate-200');
  const select = 'border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-900 w-full';

  return (
    <div className="space-y-5">
      {/* Stepper */}
      <div className="flex flex-wrap gap-2">
        {STEPS.map((s) => {
          const Icon = stepMeta[s].icon;
          return (
            <button key={s} onClick={() => go(s)} disabled={s !== 'select' && !ready}
              className={clsx('px-3 py-2 rounded-lg text-sm font-medium inline-flex items-center gap-2 border disabled:opacity-40',
                step === s ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-slate-900 border-slate-200 text-slate-600 hover:border-indigo-300')}>
              <Icon size={15} />{stepMeta[s].label}
            </button>
          );
        })}
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 flex gap-2"><XCircle size={16} className="mt-0.5 shrink-0" />{error}</div>}
      {notice && <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-lg px-4 py-3 flex gap-2"><CheckCircle2 size={16} className="mt-0.5 shrink-0" />{notice}</div>}
      {busy && <div className="h-1 bg-indigo-100 rounded overflow-hidden"><div className="h-full w-1/3 bg-indigo-500 animate-pulse" /></div>}

      {/* 1 — Select */}
      {step === 'select' && (
        <div className="space-y-4">
          <div className={card}>
            <h2 className="font-semibold text-slate-800 dark:text-slate-100 mb-1">{L('What are we closing?', 'Que clôturons-nous ?')}</h2>
            <p className="text-sm text-slate-500 mb-4">{L('Process one class at a time. Nothing moves until you confirm in the last step.', 'Traitez une classe à la fois. Rien ne bouge avant la confirmation finale.')}</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <label className="text-xs text-slate-500 space-y-1">{L('Academic year to close', 'Année à clôturer')}
                <select className={select} value={yearId} onChange={(e) => setYearId(e.target.value)}>
                  {years.map((y) => <option key={y.id} value={y.id}>{y.label}{y.closed_at ? ` (${L('closed', 'clôturée')})` : ''}</option>)}
                </select>
              </label>
              <label className="text-xs text-slate-500 space-y-1">{L('Class', 'Classe')}
                <select className={select} value={classId} onChange={(e) => setClassId(e.target.value)}>
                  <option value="">{L('Select a class…', 'Choisir une classe…')}</option>
                  {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </label>
              <label className="text-xs text-slate-500 space-y-1">{L('New academic year', 'Nouvelle année')}
                <select className={select} value={nextYearId} onChange={(e) => setNextYearId(e.target.value)}>
                  <option value="">{L('Select…', 'Choisir…')}</option>
                  {years.filter((y) => year && y.start_date > year.start_date).map((y) => <option key={y.id} value={y.id}>{y.label}</option>)}
                </select>
                {year && !years.some((y) => y.start_date > year.start_date) && (
                  <span className="text-amber-600 block">{L('Create the next academic year in Settings first.', 'Créez d’abord l’année suivante dans Paramètres.')}</span>
                )}
              </label>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button className={primary} disabled={!ready} onClick={() => go('verify')}>{L('Continue', 'Continuer')} <ArrowRight size={15} /></button>
              <button className={outline} onClick={() => setShowSettings((s) => !s)}><Settings2 size={15} />{L('Promotion rules & class progression', 'Règles de passage et progression des classes')}</button>
            </div>
          </div>

          {showSettings && (
            <div className={card}>
              <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-3">{L('Promotion rules', 'Règles de passage')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <label className="text-xs text-slate-500 space-y-1">{L('Minimum annual average to be promoted (/20)', 'Moyenne annuelle minimale pour passer (/20)')}
                  <input type="number" min={0} max={20} step={0.5} className={select} value={config.passAverage}
                    onChange={(e) => setConfig({ ...config, passAverage: Number(e.target.value) })} />
                </label>
                <label className="text-xs text-slate-500 space-y-1">{L('Students promoted from the last class', 'Élèves admis de la dernière classe')}
                  <select className={select} value={config.finalClassOutcome} onChange={(e) => setConfig({ ...config, finalClassOutcome: e.target.value as EoyConfig['finalClassOutcome'] })}>
                    <option value="graduate">{L('Graduate (leave the active roll)', 'Diplômés (quittent les effectifs)')}</option>
                    <option value="hold">{L('Hold for manual placement', 'Conserver pour placement manuel')}</option>
                  </select>
                </label>
                <button className={primary} disabled={busy} onClick={saveConfig}>{L('Save rules', 'Enregistrer')}</button>
              </div>

              <h3 className="font-semibold text-slate-800 dark:text-slate-100 mt-6 mb-1">{L('Class progression', 'Progression des classes')}</h3>
              <p className="text-xs text-slate-500 mb-3">{L('Where promoted students go. “Auto” follows the grade-level order and matching section.', 'Où vont les élèves admis. « Auto » suit l’ordre des niveaux et la section.')}</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs text-slate-500 uppercase"><tr><th className="text-left py-2">{L('Class', 'Classe')}</th><th className="text-left">{L('Promoted students go to', 'Les admis vont en')}</th><th className="text-left">{L('Resolved as', 'Résultat')}</th></tr></thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {progression.map((p) => (
                      <tr key={p.id}>
                        <td className="py-2 font-medium">{p.name}</td>
                        <td className="py-2 pr-3">
                          <select className={clsx(select, 'max-w-xs')}
                            value={p.isFinalClass ? '__final' : p.nextClassId ?? ''}
                            onChange={(e) => {
                              const v = e.target.value;
                              saveProgression(p.id, v === '' || v === '__final' ? null : v, v === '__final');
                            }}>
                            <option value="">{L('Auto', 'Auto')}</option>
                            <option value="__final">{L('Last class (no next class)', 'Dernière classe')}</option>
                            {classes.filter((c) => c.id !== p.id).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                        </td>
                        <td className="py-2 text-xs">
                          {p.resolved.kind === 'class' && <span className="text-emerald-700">→ {p.resolved.className}</span>}
                          {p.resolved.kind === 'final' && <span className="text-slate-500">{L('Last class', 'Dernière classe')}</span>}
                          {p.resolved.kind === 'unresolved' && <span className="text-amber-600">{p.resolved.reason}</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2 — Verify */}
      {step === 'verify' && (
        <div className={card}>
          <h2 className="font-semibold text-slate-800 dark:text-slate-100 mb-1">{L('Are the results available?', 'Les résultats sont-ils disponibles ?')}</h2>
          <p className="text-sm text-slate-500 mb-4">{cls?.name} · {year?.label}</p>
          {readiness && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                {readiness.terms.map((t) => (
                  <div key={t.name} className={clsx('rounded-lg border p-3', t.defined && t.studentsGraded ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50')}>
                    <p className="text-xs uppercase text-slate-500">{t.name === 'first' ? L('Term 1', 'Trimestre 1') : t.name === 'second' ? L('Term 2', 'Trimestre 2') : L('Term 3', 'Trimestre 3')}</p>
                    {t.defined
                      ? <p className="text-sm text-slate-700">{t.studentsGraded}/{readiness.studentCount} {L('students graded', 'élèves notés')} · {t.subjects} {L('subjects', 'matières')}</p>
                      : <p className="text-sm text-amber-700">{L('Term not configured', 'Trimestre non configuré')}</p>}
                  </div>
                ))}
              </div>
              <p className="text-sm text-slate-600 mb-3">
                {readiness.completeStudents} {L('of', 'sur')} {readiness.studentCount} {L('students have complete results.', 'élèves ont des résultats complets.')}
                {readiness.incompleteStudents > 0 && <span className="text-amber-600"> {readiness.incompleteStudents} {L('will need a manual decision.', 'nécessiteront une décision manuelle.')}</span>}
              </p>
              {readiness.blockers.map((b) => <p key={b} className="text-sm text-red-600 flex gap-2"><XCircle size={15} className="mt-0.5" />{b}</p>)}
              <div className="mt-4"><button className={primary} disabled={!readiness.ready || busy || lockedByRun} onClick={calculate}><Calculator size={15} />{L('Calculate averages and propose statuses', 'Calculer les moyennes et proposer les statuts')}</button></div>
            </>
          )}
        </div>
      )}

      {/* 3 — Review */}
      {step === 'review' && (
        <div className={card}>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="font-semibold text-slate-800 dark:text-slate-100">{L('Review and validate decisions', 'Examiner et valider les décisions')}</h2>
              <p className="text-sm text-slate-500">{cls?.name} · {year?.label} · {L('pass mark', 'seuil')} {decisions?.passAverage ?? config.passAverage}/20 · {validatedCount}/{decisions?.rows.length ?? 0} {L('validated', 'validés')}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <select className={clsx(select, 'w-auto')} value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)}>
                <option value="all">{L('All students', 'Tous')}</option>
                <option value="pending">{L('Not yet validated', 'Non validés')}</option>
                <option value="override">{L('Overridden', 'Modifiés')}</option>
              </select>
              <button className={outline} disabled={busy || lockedByRun} onClick={calculate}><Calculator size={15} />{L('Recalculate', 'Recalculer')}</button>
              <button className={primary} disabled={busy || lockedByRun || !decisions?.calculated} onClick={acceptAll}><CheckCircle2 size={15} />{L('Accept all complete proposals', 'Valider les propositions complètes')}</button>
            </div>
          </div>
          {decisions && !decisions.calculated && (
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-3">{L('Averages have not been calculated yet — go back to step 2.', 'Les moyennes ne sont pas encore calculées — retournez à l’étape 2.')}</p>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800 text-xs uppercase text-slate-500">
                <tr><th className="px-3 py-2 text-left">{L('Rank', 'Rang')}</th><th className="px-3 py-2 text-left">{L('Student', 'Élève')}</th><th className="px-3 py-2 text-center">{L('Annual avg.', 'Moy. annuelle')}</th>
                  <th className="px-3 py-2 text-left">{L('Proposed', 'Proposé')}</th><th className="px-3 py-2 text-left">{L('Final decision', 'Décision finale')}</th><th className="px-3 py-2" /></tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {rows.map((r) => {
                  const d = r.decision;
                  return (
                    <tr key={r.studentId} className="align-top">
                      <td className="px-3 py-2 text-slate-600">{r.rank ?? '—'}</td>
                      <td className="px-3 py-2"><div className="font-medium">{r.name}</div><div className="text-xs text-slate-400">{r.matricule}</div></td>
                      <td className="px-3 py-2 text-center tabular-nums font-semibold">{r.average ?? '—'}</td>
                      <td className="px-3 py-2">
                        {d ? <StatusPill status={d.proposedStatus} proposed /> : '—'}
                        {!r.complete && <div className="text-xs text-amber-600 flex items-start gap-1 mt-1 max-w-56"><AlertTriangle size={12} className="mt-0.5 shrink-0" />{r.issues[0]}</div>}
                      </td>
                      <td className="px-3 py-2">
                        {d?.validated ? (
                          <div>
                            <StatusPill status={d.status} />
                            {d.isOverride && <span className="ml-1 text-[10px] text-orange-600 font-medium">{L('OVERRIDE', 'MODIFIÉ')}</span>}
                            {d.applied && <span className="ml-1 text-[10px] text-slate-500"><Lock size={10} className="inline" /> {L('applied', 'appliqué')}</span>}
                            {d.comment && <div className="text-xs text-slate-500 mt-1 max-w-56">“{d.comment}”</div>}
                          </div>
                        ) : <StatusPill status="pending_review" />}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button className="text-xs text-indigo-600 hover:underline disabled:opacity-40" disabled={!d || d.applied || busy} onClick={() => setEditing(r)}>{L('Decide', 'Décider')}</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex justify-end"><button className={primary} onClick={() => go('sheet')}>{L('Continue', 'Continuer')} <ArrowRight size={15} /></button></div>
        </div>
      )}

      {/* 4 — Master sheet */}
      {step === 'sheet' && (
        <div className={card}>
          <h2 className="font-semibold text-slate-800 dark:text-slate-100 mb-1">{L('Class master sheet', 'Tableau de classe')}</h2>
          <p className="text-sm text-slate-500 mb-4">{L('Review the overall and per-subject rankings before moving anyone.', 'Examinez les classements général et par matière avant tout déplacement.')}</p>
          <div className="flex flex-wrap gap-2">
            <button className={primary} onClick={() => navigate(`/master-sheet?yearId=${yearId}&classId=${classId}`)}><Table2 size={15} />{L('Open master sheet', 'Ouvrir le tableau')}</button>
            <button className={outline} onClick={() => go('confirm')}>{L('Skip to preview', 'Passer à l’aperçu')} <ArrowRight size={15} /></button>
          </div>
        </div>
      )}

      {/* 5 — Preview & confirm */}
      {step === 'confirm' && preview && (
        <div className="space-y-4">
          <div className={card}>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <div>
                <h2 className="font-semibold text-slate-800 dark:text-slate-100">{L('Preview the transition', 'Aperçu des transitions')}</h2>
                <p className="text-sm text-slate-500">{cls?.name} · {year?.label} → {nextYear?.label}</p>
              </div>
              <button className={outline} disabled={busy || !!lockedByRun} onClick={toggleYear}>
                {year?.closed_at ? <><Unlock size={15} />{L('Reopen year', 'Rouvrir l’année')}</> : <><Lock size={15} />{L('Close academic year', 'Clôturer l’année')}</>}
              </button>
            </div>
            <ul className="space-y-1 mb-3">
              {preview.checks.map((c) => (
                <li key={c.message} className={clsx('text-sm flex items-start gap-2', c.ok ? 'text-emerald-700' : 'text-red-600')}>
                  {c.ok ? <CheckCircle2 size={15} className="mt-0.5" /> : <XCircle size={15} className="mt-0.5" />}{c.message}
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-2 text-xs mb-3">
              {([['promote', L('Promote', 'Admis'), 'bg-emerald-100 text-emerald-700'], ['repeat', L('Repeat', 'Redoublent'), 'bg-orange-100 text-orange-700'],
                ['graduate', L('Graduate', 'Diplômés'), 'bg-blue-100 text-blue-700'], ['hold', L('Held', 'En attente'), 'bg-slate-100 text-slate-600'],
                ['exit', L('Leave roll', 'Sortants'), 'bg-purple-100 text-purple-700'], ['skip_pending', L('Skipped: pending review', 'Ignorés : à examiner'), 'bg-yellow-100 text-yellow-700'],
                ['already_applied', L('Already processed', 'Déjà traités'), 'bg-slate-100 text-slate-500']] as const).map(([k, label, c]) =>
                preview.summary[k] ? <span key={k} className={clsx('px-2 py-1 rounded-full font-medium', c)}>{label}: {preview.summary[k]}</span> : null)}
            </div>
            {preview.pendingCount > 0 && (
              <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 mb-3">
                {preview.pendingCount} {L('student(s) are not validated and will NOT be moved. You can process them later by confirming again.', 'élève(s) non validé(s) ne seront PAS déplacés. Vous pourrez les traiter plus tard en confirmant à nouveau.')}
              </p>
            )}
            <div className="overflow-x-auto max-h-96 overflow-y-auto border border-slate-100 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800 text-xs uppercase text-slate-500 sticky top-0">
                  <tr><th className="px-3 py-2 text-left">{L('Student', 'Élève')}</th><th className="px-3 py-2 text-left">{L('Decision', 'Décision')}</th><th className="px-3 py-2 text-left">{L('Outcome', 'Résultat')}</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {preview.plan.map((p) => (
                    <tr key={p.studentId}>
                      <td className="px-3 py-2"><div className="font-medium">{p.name}</div><div className="text-xs text-slate-400">{p.matricule}</div></td>
                      <td className="px-3 py-2"><StatusPill status={p.status} proposed={p.action === 'skip_pending'} /></td>
                      <td className="px-3 py-2 text-sm">
                        {p.action === 'promote' && p.targetClassName && <span>{cls?.name} → <b>{p.targetClassName}</b></span>}
                        {p.action === 'repeat' && <span>{L('Stays in', 'Reste en')} <b>{cls?.name}</b></span>}
                        {p.action === 'graduate' && L('Graduates — leaves the active roll', 'Diplômé — quitte les effectifs')}
                        {p.action === 'hold' && L('Held for manual placement', 'En attente de placement')}
                        {p.action === 'exit' && L('Leaves the active roll', 'Quitte les effectifs')}
                        {p.action === 'skip_pending' && <span className="text-amber-600">{L('Not moved — awaiting validation', 'Non déplacé — en attente de validation')}</span>}
                        {p.action === 'already_applied' && <span className="text-slate-500">{L('Already processed', 'Déjà traité')}</span>}
                        {p.blockers.map((b) => <div key={b} className="text-xs text-red-600">⛔ {b}</div>)}
                        {p.warnings.map((w) => <div key={w} className="text-xs text-amber-600">⚠ {w}</div>)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className={card}>
            {run?.status === 'confirmed' && (
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3">
                <p className="text-sm text-emerald-800">
                  <CheckCircle2 size={15} className="inline mr-1" />
                  {L('Confirmed by', 'Confirmé par')} <b>{run.confirmedBy}</b> {L('on', 'le')} {new Date(run.confirmedAt).toLocaleString()}
                  {run.totals && <> — {run.totals.promoted ?? 0} {L('promoted', 'admis')}, {run.totals.repeated ?? 0} {L('repeating', 'redoublants')}, {run.totals.graduated ?? 0} {L('graduated', 'diplômés')}</>}
                </p>
                <button className={clsx(btn, 'border border-red-200 text-red-700 hover:bg-red-50')} disabled={busy} onClick={reverse}><Undo2 size={15} />{L('Reverse', 'Annuler')}</button>
              </div>
            )}
            {run?.status === 'reversed' && <p className="text-sm text-slate-500 mb-3">{L('Last transition was reversed by', 'La dernière transition a été annulée par')} {run.reversedBy}.</p>}
            <label className="text-xs text-slate-500 space-y-1 block mb-3">{L('Note (optional, kept in the audit trail)', 'Note (facultative, conservée dans l’historique)')}
              <input className={select} value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} />
            </label>
            <button className={primary} disabled={busy || !preview.canConfirm} onClick={confirm}><ShieldCheck size={15} />{L('Confirm end-of-year operation', 'Confirmer la clôture')}</button>
            {!preview.canConfirm && <p className="text-xs text-slate-500 mt-2">{L('Resolve the checks above (and validate at least one student) to enable confirmation.', 'Résolvez les points ci-dessus (et validez au moins un élève) pour confirmer.')}</p>}
          </div>

          <div className={card}>
            <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-2">{L('Audit trail', 'Historique')}</h3>
            {audit.length === 0 ? <p className="text-sm text-slate-400">{L('No activity yet.', 'Aucune activité.')}</p> : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800 max-h-72 overflow-y-auto text-sm">
                {audit.map((a) => (
                  <li key={a.id} className="py-1.5 flex flex-wrap gap-x-3">
                    <span className="text-slate-400 text-xs w-36 shrink-0">{new Date(a.at).toLocaleString()}</span>
                    <span className="font-medium">{a.action}</span>
                    <span className="text-slate-500">{a.actor}</span>
                    {a.details && <span className="text-xs text-slate-400 truncate max-w-md">{JSON.stringify(a.details)}</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {editing && (
        <DecisionModal row={editing} classes={classes.filter((c) => c.id !== classId)} L={L} lang={lang} busy={busy}
          onClose={() => setEditing(null)} onSave={saveDecision} />
      )}
    </div>
  );
}

function DecisionModal({ row, classes, L, lang, busy, onClose, onSave }: {
  row: EoyDecisionRow; classes: ClassRecord[]; L: (en: string, fr: string) => string; lang: string; busy: boolean;
  onClose: () => void; onSave: (row: EoyDecisionRow, status: YearEndStatus, comment: string, targetClassId: string) => void;
}) {
  const d = row.decision!;
  const [status, setStatus] = useState<YearEndStatus>(d.validated ? d.status : (d.proposedStatus === 'pending_review' ? 'promoted' : d.proposedStatus));
  const [comment, setComment] = useState(d.comment ?? '');
  const [target, setTarget] = useState(d.targetClassId ?? '');
  const differs = status !== 'pending_review' && status !== d.proposedStatus;
  const needsComment = differs && !comment.trim();

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div>
          <h3 className="font-semibold text-slate-800 dark:text-slate-100">{row.name}</h3>
          <p className="text-xs text-slate-500">{row.matricule} · {L('average', 'moyenne')} {row.average ?? '—'} · {L('proposed', 'proposé')}: {statusLabel(d.proposedStatus, lang)}</p>
          {!row.complete && <p className="text-xs text-amber-600 mt-1">{row.issues.join(' · ')}</p>}
        </div>
        <label className="text-xs text-slate-500 space-y-1 block">{L('Final status', 'Statut final')}
          <select className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-900 w-full" value={status} onChange={(e) => setStatus(e.target.value as YearEndStatus)}>
            {SELECTABLE.map((s) => <option key={s} value={s}>{statusLabel(s, lang)}</option>)}
          </select>
        </label>
        {status === 'promoted' && (
          <label className="text-xs text-slate-500 space-y-1 block">{L('Destination class (optional override)', 'Classe de destination (facultatif)')}
            <select className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-900 w-full" value={target} onChange={(e) => setTarget(e.target.value)}>
              <option value="">{L('Automatic', 'Automatique')}</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
        )}
        <label className="text-xs text-slate-500 space-y-1 block">
          {L('Comment / reason', 'Commentaire / motif')}{differs && <span className="text-red-500"> * {L('required — differs from the proposal', 'obligatoire — diffère de la proposition')}</span>}
          <textarea rows={3} className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-transparent w-full" value={comment} onChange={(e) => setComment(e.target.value)} />
        </label>
        <div className="flex justify-end gap-2">
          <button className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50" onClick={onClose}>{L('Cancel', 'Annuler')}</button>
          <button className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50" disabled={busy || needsComment}
            onClick={() => onSave(row, status, comment, target)}>{status === 'pending_review' ? L('Mark pending', 'Remettre à examiner') : L('Validate', 'Valider')}</button>
        </div>
      </div>
    </div>
  );
}
