/*
 * Copyright (c) 2026 [COMPANY LEGAL NAME]. All rights reserved.
 * Proprietary and confidential. Unauthorized copying, distribution or
 * modification of this file, via any medium, is strictly prohibited.
 */
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Table2, Trash2, Save, Type, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { api, mediaUrl } from '../../api/client';
import { useLanguage } from '../../i18n/LanguageContext';
import {
  SIMPLE_FIELD_DEFS, fieldLabel, columnLabel,
  defaultSimpleField, defaultTableField, renderPdfFirstPage, renderPdfPages, fillTemplatePdf,
  type TemplateField, type SimpleFieldKey, type RenderedPage, type SubjectGridField, type TemplateReportCard,
} from '../../utils/reportCardTemplate';
import { analyzeTemplatePdf, validateTemplate } from '../../utils/reportCardTemplateAnalysis';
import { gradeFor } from '../../utils/sequenceReportCards';
import TemplateReviewPanel from '../../composants/admin/TemplateReviewPanel';
import HtmlTemplatePanel from '../../composants/admin/HtmlTemplatePanel';
import type { HtmlTemplateMetadata } from '../../utils/htmlTemplate/types';

const CANVAS_WIDTH = 800;

export default function ReportCardTemplateDesigner() {
  const { lang } = useLanguage();
  const lbl = (en: string, fr: string) => lang === 'fr' ? fr : en;

  const [fileName, setFileName] = useState<string | null>(null);
  const [filePath, setFilePath] = useState<string | null>(null);
  const [page, setPage] = useState<RenderedPage | null>(null);
  const [fields, setFields] = useState<TemplateField[]>([]);
  const [isEnabled, setIsEnabled] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [newFieldKey, setNewFieldKey] = useState<SimpleFieldKey>('student_name');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([]);
  const [previewImg, setPreviewImg] = useState<string | null>(null);
  const [busy, setBusy] = useState<'preview' | 'analyse' | null>(null);
  const [htmlMeta, setHtmlMeta] = useState<HtmlTemplateMetadata | null>(null);
  const [renderMode, setRenderMode] = useState<'overlay' | 'html'>('overlay');
  const bytesRef = useRef<ArrayBuffer | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);
  const dragIndex = useRef<number | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const tpl = await api.getReportCardTemplate();
        setFileName(tpl.file_name);
        setFilePath(tpl.file_path);
        setIsEnabled(tpl.is_enabled);
        setFields((tpl.fields as TemplateField[]) ?? []);
        setHtmlMeta((tpl.html_meta as HtmlTemplateMetadata | null) ?? null);
        setRenderMode(tpl.render_mode ?? 'overlay');
        setSubjects((await api.getSubjects().catch(() => [])).map(s => ({ id: s.id, name: s.name })));
        if (tpl.file_path) {
          const bytes = await fetch(mediaUrl(tpl.file_path)).then(r => r.arrayBuffer());
          bytesRef.current = bytes;
          const rendered = await renderPdfFirstPage(bytes, CANVAS_WIDTH);
          setPage(rendered);
        }
      } catch (err) {
        console.error(err);
        setError(lbl('Could not load the template.', 'Impossible de charger le modèle.'));
      }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const usedKeys = new Set(fields.filter(f => f.type === 'text').map(f => (f as { key: SimpleFieldKey }).key));
  const availableKeys = SIMPLE_FIELD_DEFS.filter(d => !usedKeys.has(d.key));
  const hasTable = fields.some(f => f.type === 'table');

  const addSimpleField = () => {
    if (!newFieldKey) return;
    setFields(prev => [...prev, defaultSimpleField(newFieldKey)]);
    setSelected(fields.length);
  };

  const addTableField = () => {
    if (hasTable) return;
    setFields(prev => [...prev, defaultTableField()]);
    setSelected(fields.length);
  };

  const removeField = (idx: number) => {
    setFields(prev => prev.filter((_, i) => i !== idx));
    setSelected(null);
  };

  const updateField = (idx: number, patch: Partial<TemplateField>) => {
    setFields(prev => prev.map((f, i) => (i === idx ? { ...f, ...patch } as TemplateField : f)));
  };

  // ── Drag to reposition ──────────────────────────────────────────
  const onMarkerMouseDown = (idx: number) => (e: React.MouseEvent) => {
    e.stopPropagation();
    dragIndex.current = idx;
    setSelected(idx);
  };

  const onCanvasMouseMove = (e: React.MouseEvent) => {
    if (dragIndex.current === null || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    const y = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height));
    updateField(dragIndex.current, { x, y });
  };

  const onCanvasMouseUp = () => { dragIndex.current = null; };

  // Sample students for the preview: the template's own mapped subjects with plausible marks, so ranks,
  // min/max, group averages and the class profile all show up.
  const sampleCards = (): TemplateReportCard[] => {
    const grid = fields.find((f): f is SubjectGridField => f.type === 'subject_grid');
    const subs = (grid ? grid.rows.filter(r => r.subjectId && r.confirmed !== false).map(r => ({ id: r.subjectId!, name: r.subjectName ?? r.label, coef: r.printedCoef ?? 2 })) : [])
      .concat([]);
    const pool = subs.length ? subs : subjects.slice(0, 6).map(s => ({ id: s.id, name: s.name, coef: 2 }));
    const marks = [[15.5, 12, 17, 9, 14, 11, 16, 13], [11, 16, 8, 14, 12, 17, 10, 15], [8, 10, 12, 7, 9, 13, 6, 11]];
    return ['SAMPLE STUDENT ONE', 'SAMPLE STUDENT TWO', 'SAMPLE STUDENT THREE'].map((name, si) => {
      const entries = pool.map((s, i) => { const v = marks[si][i % 8]; const g = gradeFor(v); return { subject_id: s.id, subject_name: s.name, ca_score: v, exam_score: 0, coefficient: s.coef, total_score: v, grade: g.grade, remark: g.remark }; });
      const tc = entries.reduce((a, e) => a + e.coefficient, 0) || 1;
      const avg = Math.round((entries.reduce((a, e) => a + e.total_score * e.coefficient, 0) / tc) * 10) / 10;
      return {
        student_name: name, student_number: 'ID-0001', class_name: 'CLASS', term_name: 'first', academic_year: '2025/2026',
        percentage: avg, sequence1_average: avg, sequence2_average: 0, class_position: si + 1, out_of: 3, conduct: 'Good',
        days_present: 50, total_school_days: 55, days_absent: 3, justified_absences: 1, unjustified_absences: 2,
        class_teacher_comment: 'Sample comment for the layout preview.', head_teacher_comment: null,
        sequence: 1, gender: 'male', date_of_birth: '2011-03-14', nui: 'NUI-000001', class_master: 'Class Master', repeater: false, entries,
      } as TemplateReportCard;
    });
  };

  const togglePreview = async () => {
    if (previewImg) { setPreviewImg(null); return; }
    if (!bytesRef.current) return;
    setBusy('preview'); setError(null);
    try {
      const cards = sampleCards();
      const out = await fillTemplatePdf(bytesRef.current.slice(0), fields, cards, { name: 'School', motto: '', address: '', headTeacher: '' }, lang, { classCards: cards, passMark: 10 });
      setPreviewImg((await renderPdfPages(out, CANVAS_WIDTH))[0] ?? null);
    } catch (err) {
      console.error(err);
      setError(lbl('Could not build the preview.', 'Impossible de générer l’aperçu.'));
    }
    setBusy(null);
  };

  // Re-run the automatic analysis on the stored PDF (replaces the current field placement and mapping).
  const reanalyse = async () => {
    if (!bytesRef.current) return;
    if (fields.length && !window.confirm(lbl('Re-analyse the PDF? Your current field placement and subject mapping will be replaced.', 'Ré-analyser le PDF ? Le placement des champs et l’association des matières actuels seront remplacés.'))) return;
    setBusy('analyse'); setError(null); setNotice(null); setPreviewImg(null);
    try {
      const a = await analyzeTemplatePdf(bytesRef.current, subjects);
      if (!a.fields.length) { setError(lbl('Nothing could be detected in this PDF. Place the fields manually.', 'Rien n’a pu être détecté dans ce PDF. Placez les champs manuellement.')); }
      else { setFields(a.fields); setSelected(null); setNotice(lbl('Analysis complete — review the detected structure on the right, then save.', 'Analyse terminée — vérifiez la structure détectée à droite, puis enregistrez.')); }
    } catch (err) {
      console.error(err);
      setError(lbl('The analysis failed.', 'L’analyse a échoué.'));
    }
    setBusy(null);
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      // Only a template that survives a real test fill can be switched on.
      let enable = isEnabled;
      if (bytesRef.current && page) {
        const v = await validateTemplate(bytesRef.current, fields, page.pdfWidth, page.pdfHeight);
        if (!v.ok) { enable = false; setIsEnabled(false); setError(lbl('Saved, but NOT enabled — validation failed: ', 'Enregistré mais NON activé — la validation a échoué : ') + v.errors.join(' ')); }
        else if (v.warnings.length) setNotice(v.warnings.join(' '));
      }
      await api.updateReportCardTemplate({
        is_enabled: enable,
        page_width: page?.pdfWidth ?? null,
        page_height: page?.pdfHeight ?? null,
        fields,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error(err);
      setError(lbl('Could not save the template.', 'Impossible d’enregistrer le modèle.'));
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-7 h-7 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!filePath) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-10 text-center max-w-lg mx-auto mt-10">
        <p className="text-slate-600 mb-4">
          {lbl('No report card PDF has been uploaded yet. Upload one from Settings first.', 'Aucun PDF de bulletin n’a encore été téléchargé. Téléchargez-en un depuis Paramètres d’abord.')}
        </p>
        <Link to="/settings" className="text-indigo-600 hover:underline text-sm font-medium">
          {lbl('Go to Settings', 'Aller aux paramètres')}
        </Link>
      </div>
    );
  }

  const selectedField = selected !== null ? fields[selected] : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <Link to="/settings" className="text-sm text-slate-500 hover:text-slate-800 flex items-center gap-1 mb-1">
            <ArrowLeft size={14} /> {lbl('Back to Settings', 'Retour aux paramètres')}
          </Link>
          <h1 className="text-xl font-bold text-slate-800">{lbl('Report Card Template Designer', 'Concepteur de modèle de bulletin')}</h1>
          <p className="text-sm text-slate-500">{fileName}</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input type="checkbox" checked={isEnabled} onChange={e => setIsEnabled(e.target.checked)} className="accent-indigo-600" />
            {lbl('Use this template for report cards', 'Utiliser ce modèle pour les bulletins')}
          </label>
          <button onClick={save} disabled={saving}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            <Save size={14} /> {saving ? lbl('Saving…', 'Enregistrement…') : saved ? lbl('Saved!', 'Enregistré !') : lbl('Save Template', 'Enregistrer le modèle')}
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <p className="text-sm text-slate-500 bg-indigo-50 border border-indigo-100 rounded-lg px-4 py-2.5">
        {lbl(
          'Add fields below, then drag them onto the PDF to position them exactly where each piece of data should appear. This is a one-time setup — every student’s report card will then be generated automatically from this layout.',
          'Ajoutez des champs ci-dessous, puis faites-les glisser sur le PDF pour les positionner exactement là où chaque donnée doit apparaître. Cette configuration est unique : le bulletin de chaque élève sera ensuite généré automatiquement à partir de cette mise en page.'
        )}
      </p>

      {notice && <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5">{notice}</p>}

      <div className="flex flex-wrap items-center gap-2 bg-white rounded-xl border border-slate-200 p-3">
        <button onClick={reanalyse} disabled={busy !== null}
          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm px-3 py-1.5 rounded-lg transition-colors">
          <RefreshCw size={14} className={busy === 'analyse' ? 'animate-spin' : ''} /> {busy === 'analyse' ? lbl('Analysing…', 'Analyse…') : lbl('Re-analyse PDF', 'Ré-analyser le PDF')}
        </button>
        <button onClick={togglePreview} disabled={busy !== null || fields.length === 0}
          className="flex items-center gap-1.5 border border-slate-300 hover:bg-slate-50 disabled:opacity-50 text-slate-700 text-sm px-3 py-1.5 rounded-lg transition-colors">
          {previewImg ? <EyeOff size={14} /> : <Eye size={14} />}
          {busy === 'preview' ? lbl('Building preview…', 'Génération…') : previewImg ? lbl('Back to layout view', 'Retour à la vue de mise en page') : lbl('Preview with sample data', 'Aperçu avec données d’exemple')}
        </button>
        <span className="w-px h-6 bg-slate-200 mx-1" />
        <select value={newFieldKey} onChange={e => setNewFieldKey(e.target.value as SimpleFieldKey)}
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
          {availableKeys.map(d => <option key={d.key} value={d.key}>{lang === 'fr' ? d.labelFr : d.labelEn}</option>)}
        </select>
        <button onClick={addSimpleField} disabled={availableKeys.length === 0}
          className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white text-sm px-3 py-1.5 rounded-lg transition-colors">
          <Type size={14} /> {lbl('Add Field', 'Ajouter un champ')}
        </button>
        <button onClick={addTableField} disabled={hasTable}
          className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white text-sm px-3 py-1.5 rounded-lg transition-colors">
          <Table2 size={14} /> {lbl('Add Marks Table', 'Ajouter le tableau des notes')}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4">
        {/* Canvas */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 overflow-auto">
          {page && (
            <div
              ref={canvasRef}
              onMouseMove={onCanvasMouseMove}
              onMouseUp={onCanvasMouseUp}
              onMouseLeave={onCanvasMouseUp}
              className="relative select-none mx-auto border border-slate-300"
              style={{ width: page.displayWidth, height: page.displayHeight, backgroundImage: `url(${previewImg ?? page.dataUrl})`, backgroundSize: 'cover' }}
            >
              {!previewImg && fields.map((f, idx) => (
                f.type === 'text' ? (
                  <div
                    key={idx}
                    onMouseDown={onMarkerMouseDown(idx)}
                    className={`absolute cursor-move px-1.5 py-0.5 text-[10px] font-medium rounded whitespace-nowrap border ${selected === idx ? 'bg-indigo-600 text-white border-indigo-700 z-10' : 'bg-white/90 text-indigo-700 border-indigo-300'}`}
                    style={{ left: f.x * page.displayWidth, top: f.y * page.displayHeight, transform: f.align === 'center' ? 'translateX(-50%)' : f.align === 'right' ? 'translateX(-100%)' : undefined }}
                  >
                    {fieldLabel(f.key, lang)}
                  </div>
                ) : f.type !== 'table' ? null : (
                  <div
                    key={idx}
                    onMouseDown={onMarkerMouseDown(idx)}
                    className={`absolute cursor-move border-2 border-dashed ${selected === idx ? 'border-indigo-600 bg-indigo-600/10 z-10' : 'border-emerald-400 bg-emerald-400/10'}`}
                    style={{ left: f.x * page.displayWidth, top: f.y * page.displayHeight, width: f.width * page.displayWidth, height: f.rowHeight * page.displayHeight * 4 }}
                  >
                    <span className="absolute -top-5 left-0 text-[10px] font-medium text-emerald-700 bg-white/90 px-1 rounded whitespace-nowrap">
                      {lbl('Marks Table (drag corner via panel)', 'Tableau des notes')}
                    </span>
                  </div>
                )
              ))}
              {!previewImg && fields.map((f, idx) => {
                if (f.type === 'image') return <div key={idx} className="absolute border-2 border-dashed border-sky-500 bg-sky-400/10 pointer-events-none" style={{ left: f.x * page.displayWidth, top: f.y * page.displayHeight, width: f.width * page.displayWidth, height: f.height * page.displayHeight }}><span className="absolute -top-4 left-0 text-[9px] font-medium text-sky-700 bg-white/90 px-1 rounded">{lbl('Photo', 'Photo')}</span></div>;
                if (f.type === 'tick') return [f.yes, f.no].map((p, k) => <div key={`${idx}-${k}`} className="absolute w-3 h-3 -ml-1.5 -mt-1.5 border-2 border-violet-500 rounded-sm pointer-events-none" style={{ left: p.x * page.displayWidth, top: p.y * page.displayHeight }} title={k === 0 ? 'YES' : 'NO'} />);
                if (f.type !== 'subject_grid') return null;
                const left = Math.min(...f.columns.map(c => c.x)), right = Math.max(...f.columns.map(c => c.x + c.width));
                return (
                  <div key={idx} className="pointer-events-none">
                    {f.rows.map((r, ri) => {
                      const tone = !r.subjectId ? 'border-slate-300 bg-slate-300/10' : r.confirmed === false ? 'border-amber-500 bg-amber-400/20' : 'border-emerald-500 bg-emerald-400/10';
                      return <div key={ri} className={`absolute border ${tone}`} title={`${r.label} → ${r.subjectName ?? '—'}`} style={{ left: left * page.displayWidth, top: r.yTop * page.displayHeight, width: (right - left) * page.displayWidth, height: r.height * page.displayHeight }} />;
                    })}
                    {f.groups.flatMap((g, gi) => g.slots.map((s, si) => <div key={`${gi}-${si}`} className="absolute border border-indigo-500 bg-indigo-400/20" title={`${g.name} ${s.kind}`} style={{ left: s.x * page.displayWidth, top: g.yTop * page.displayHeight, width: s.width * page.displayWidth, height: g.height * page.displayHeight }} />))}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Properties panel */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 h-fit">
          {!selectedField && (
            fields.some(f => f.type === 'subject_grid')
              ? <TemplateReviewPanel fields={fields} onChange={setFields} subjects={subjects} />
              : <p className="text-sm text-slate-400">{lbl('Select a field to edit its position and style.', 'Sélectionnez un champ pour modifier sa position et son style.')}</p>
          )}

          {selectedField && selectedField.type === 'text' && (
            <>
              <p className="text-sm font-semibold text-slate-800">{fieldLabel(selectedField.key, lang)}</p>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs text-slate-500">
                  X (%)
                  <input type="number" min={0} max={100} value={Math.round(selectedField.x * 100)}
                    onChange={e => updateField(selected!, { x: Number(e.target.value) / 100 })}
                    className="w-full mt-0.5 border border-slate-200 rounded px-2 py-1 text-sm" />
                </label>
                <label className="text-xs text-slate-500">
                  Y (%)
                  <input type="number" min={0} max={100} value={Math.round(selectedField.y * 100)}
                    onChange={e => updateField(selected!, { y: Number(e.target.value) / 100 })}
                    className="w-full mt-0.5 border border-slate-200 rounded px-2 py-1 text-sm" />
                </label>
              </div>
              <label className="text-xs text-slate-500 block">
                {lbl('Font size', 'Taille de police')}
                <input type="number" min={6} max={40} value={selectedField.fontSize}
                  onChange={e => updateField(selected!, { fontSize: Number(e.target.value) })}
                  className="w-full mt-0.5 border border-slate-200 rounded px-2 py-1 text-sm" />
              </label>
              <label className="text-xs text-slate-500 block">
                {lbl('Alignment', 'Alignement')}
                <select value={selectedField.align} onChange={e => updateField(selected!, { align: e.target.value as 'left' | 'center' | 'right' })}
                  className="w-full mt-0.5 border border-slate-200 rounded px-2 py-1 text-sm">
                  <option value="left">{lbl('Left', 'Gauche')}</option>
                  <option value="center">{lbl('Center', 'Centre')}</option>
                  <option value="right">{lbl('Right', 'Droite')}</option>
                </select>
              </label>
              <label className="flex items-center gap-2 text-xs text-slate-500">
                <input type="checkbox" checked={!!selectedField.bold} onChange={e => updateField(selected!, { bold: e.target.checked })} className="accent-indigo-600" />
                {lbl('Bold', 'Gras')}
              </label>
              <button onClick={() => removeField(selected!)} className="flex items-center gap-1.5 text-red-600 hover:text-red-800 text-sm font-medium">
                <Trash2 size={14} /> {lbl('Remove field', 'Supprimer le champ')}
              </button>
            </>
          )}

          {selectedField && selectedField.type === 'table' && (
            <>
              <p className="text-sm font-semibold text-slate-800">{lbl('Marks Table', 'Tableau des notes')}</p>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs text-slate-500">
                  X (%)
                  <input type="number" min={0} max={100} value={Math.round(selectedField.x * 100)}
                    onChange={e => updateField(selected!, { x: Number(e.target.value) / 100 })}
                    className="w-full mt-0.5 border border-slate-200 rounded px-2 py-1 text-sm" />
                </label>
                <label className="text-xs text-slate-500">
                  Y (%)
                  <input type="number" min={0} max={100} value={Math.round(selectedField.y * 100)}
                    onChange={e => updateField(selected!, { y: Number(e.target.value) / 100 })}
                    className="w-full mt-0.5 border border-slate-200 rounded px-2 py-1 text-sm" />
                </label>
                <label className="text-xs text-slate-500">
                  {lbl('Width (%)', 'Largeur (%)')}
                  <input type="number" min={10} max={100} value={Math.round(selectedField.width * 100)}
                    onChange={e => updateField(selected!, { width: Number(e.target.value) / 100 })}
                    className="w-full mt-0.5 border border-slate-200 rounded px-2 py-1 text-sm" />
                </label>
                <label className="text-xs text-slate-500">
                  {lbl('Row height (%)', 'Hauteur de ligne (%)')}
                  <input type="number" min={1} max={10} step={0.1} value={Math.round(selectedField.rowHeight * 1000) / 10}
                    onChange={e => updateField(selected!, { rowHeight: Number(e.target.value) / 100 })}
                    className="w-full mt-0.5 border border-slate-200 rounded px-2 py-1 text-sm" />
                </label>
                <label className="text-xs text-slate-500">
                  {lbl('Font size', 'Taille de police')}
                  <input type="number" min={6} max={20} value={selectedField.fontSize}
                    onChange={e => updateField(selected!, { fontSize: Number(e.target.value) })}
                    className="w-full mt-0.5 border border-slate-200 rounded px-2 py-1 text-sm" />
                </label>
                <label className="text-xs text-slate-500">
                  {lbl('Header size', 'Taille en-tête')}
                  <input type="number" min={6} max={20} value={selectedField.headerFontSize}
                    onChange={e => updateField(selected!, { headerFontSize: Number(e.target.value) })}
                    className="w-full mt-0.5 border border-slate-200 rounded px-2 py-1 text-sm" />
                </label>
              </div>
              <p className="text-xs font-medium text-slate-600 pt-1">{lbl('Column widths (% of table width)', 'Largeurs des colonnes (% du tableau)')}</p>
              {selectedField.columns.map((col, ci) => (
                <label key={col.key} className="flex items-center justify-between gap-2 text-xs text-slate-500">
                  {columnLabel(col.key, lang)}
                  <input type="number" min={5} max={80} value={Math.round(col.widthFrac * 100)}
                    onChange={e => {
                      const cols = selectedField.columns.map((c, i) => i === ci ? { ...c, widthFrac: Number(e.target.value) / 100 } : c);
                      updateField(selected!, { columns: cols });
                    }}
                    className="w-16 border border-slate-200 rounded px-2 py-1 text-sm" />
                </label>
              ))}
              <button onClick={() => removeField(selected!)} className="flex items-center gap-1.5 text-red-600 hover:text-red-800 text-sm font-medium pt-1">
                <Trash2 size={14} /> {lbl('Remove table', 'Supprimer le tableau')}
              </button>
            </>
          )}

          {fields.length > 0 && (
            <div className="pt-3 border-t border-slate-100">
              <p className="text-xs font-medium text-slate-500 mb-1">{lbl('All fields', 'Tous les champs')}</p>
              <div className="space-y-1">
                {fields.map((f, idx) => f.type === 'info' ? null : (
                  <button key={idx} onClick={() => setSelected(idx)}
                    className={`w-full text-left text-xs px-2 py-1 rounded ${selected === idx ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'}`}>
                    {f.type === 'text' ? fieldLabel(f.key, lang) : f.type === 'table' ? lbl('Marks Table', 'Tableau des notes') : f.type === 'subject_grid' ? lbl('Subject table (detected)', 'Tableau des matières (détecté)') : f.type === 'image' ? lbl('Photo box', 'Cadre photo') : lbl('Repeater tick', 'Coche redoublant')}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <HtmlTemplatePanel
        bytesRef={bytesRef} fileName={fileName} fields={fields} page={page}
        sampleCards={sampleCards} initialMeta={htmlMeta} initialMode={renderMode}
      />
    </div>
  );
}
