import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Table2, Trash2, Save, Type } from 'lucide-react';
import { api, mediaUrl } from '../../api/client';
import { useLanguage } from '../../i18n/LanguageContext';
import {
  SIMPLE_FIELD_DEFS, fieldLabel, columnLabel,
  defaultSimpleField, defaultTableField, renderPdfFirstPage,
  type TemplateField, type SimpleFieldKey, type RenderedPage,
} from '../../utils/reportCardTemplate';

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
        if (tpl.file_path) {
          const bytes = await fetch(mediaUrl(tpl.file_path)).then(r => r.arrayBuffer());
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

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await api.updateReportCardTemplate({
        is_enabled: isEnabled,
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

      <div className="flex flex-wrap items-center gap-2 bg-white rounded-xl border border-slate-200 p-3">
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
              style={{ width: page.displayWidth, height: page.displayHeight, backgroundImage: `url(${page.dataUrl})`, backgroundSize: 'cover' }}
            >
              {fields.map((f, idx) => (
                f.type === 'text' ? (
                  <div
                    key={idx}
                    onMouseDown={onMarkerMouseDown(idx)}
                    className={`absolute cursor-move px-1.5 py-0.5 text-[10px] font-medium rounded whitespace-nowrap border ${selected === idx ? 'bg-indigo-600 text-white border-indigo-700 z-10' : 'bg-white/90 text-indigo-700 border-indigo-300'}`}
                    style={{ left: f.x * page.displayWidth, top: f.y * page.displayHeight, transform: f.align === 'center' ? 'translateX(-50%)' : f.align === 'right' ? 'translateX(-100%)' : undefined }}
                  >
                    {fieldLabel(f.key, lang)}
                  </div>
                ) : (
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
            </div>
          )}
        </div>

        {/* Properties panel */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 h-fit">
          {!selectedField && (
            <p className="text-sm text-slate-400">{lbl('Select a field to edit its position and style.', 'Sélectionnez un champ pour modifier sa position et son style.')}</p>
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
                {fields.map((f, idx) => (
                  <button key={idx} onClick={() => setSelected(idx)}
                    className={`w-full text-left text-xs px-2 py-1 rounded ${selected === idx ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'}`}>
                    {f.type === 'text' ? fieldLabel(f.key, lang) : lbl('Marks Table', 'Tableau des notes')}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
