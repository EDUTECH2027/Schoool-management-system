/*
 * Copyright (c) 2026 [COMPANY LEGAL NAME]. All rights reserved.
 * Proprietary and confidential. Unauthorized copying, distribution or
 * modification of this file, via any medium, is strictly prohibited.
 */
// Designer section for the PDF → HTML/CSS template: convert, compare with the original, inspect the dynamic
// fields and their data bindings, then approve it as the renderer for report cards (or go back to the PDF).
import { useMemo, useState } from 'react';
import { RefreshCw, CheckCircle2, AlertTriangle, Undo2 } from 'lucide-react';
import { api } from '../../api/client';
import { useLanguage } from '../../i18n/LanguageContext';
import type { RenderedPage, TemplateField, TemplateReportCard } from '../../utils/reportCardTemplate';
import { buildDynamicElements } from '../../utils/htmlTemplate/bindings';
import { composeTemplateHtml, fillHtmlTemplate } from '../../utils/htmlTemplate/htmlRender';
import {
  convertAndStoreTemplate, loadHtmlTemplate, invalidateHtmlTemplateCache, measureSimilarity, summarize, SIMILARITY_TARGET,
  type PageSimilarity,
} from '../../utils/htmlTemplate/service';
import type { HtmlTemplateMetadata } from '../../utils/htmlTemplate/types';
import HtmlTemplateFrame from './HtmlTemplateFrame';

type View = 'original' | 'html' | 'sample' | 'blend';

interface Props {
  bytesRef: React.MutableRefObject<ArrayBuffer | null>;
  fileName: string | null;
  fields: TemplateField[];
  page: RenderedPage | null;
  sampleCards: () => TemplateReportCard[];
  initialMeta: HtmlTemplateMetadata | null;
  initialMode: 'overlay' | 'html';
}

const HIGHLIGHT = '.dyn{outline:1px dashed #6366f1;background:rgba(99,102,241,.14);color:#4338ca!important;font-size:6.5pt!important;line-height:1.1!important}.rc-table{outline:1px dashed #10b981;background:rgba(16,185,129,.08)}';

export default function HtmlTemplatePanel({ bytesRef, fileName, fields, page, sampleCards, initialMeta, initialMode }: Props) {
  const { lang } = useLanguage();
  const lbl = (en: string, fr: string) => lang === 'fr' ? fr : en;

  const [meta, setMeta] = useState<HtmlTemplateMetadata | null>(initialMeta);
  const [mode, setMode] = useState<'overlay' | 'html'>(initialMode);
  const [busy, setBusy] = useState<null | 'convert' | 'view' | 'mode' | 'measure'>(null);
  const [progress, setProgress] = useState<[number, number] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sim, setSim] = useState<PageSimilarity[] | null>(null);
  const [view, setView] = useState<View | null>(null);
  const [doc, setDoc] = useState<{ html: string; metadata: HtmlTemplateMetadata } | null>(null);
  const [opacity, setOpacity] = useState(50);
  const [showMap, setShowMap] = useState(false);

  const dyn = useMemo(() => meta ? buildDynamicElements(fields, meta.pageSettings.width, meta.pageSettings.height) : [], [fields, meta]);
  const review = dyn.filter(d => d.confidence === 'review');

  const loadDoc = async () => {
    const d = await loadHtmlTemplate(true);
    setDoc({ html: d.html, metadata: d.metadata });
    return d;
  };

  const convert = async () => {
    const bytes = bytesRef.current;
    if (!bytes) return;
    if (meta && !window.confirm(lbl('Convert the PDF again? The stored HTML template will be replaced and you will have to approve it again.', 'Convertir à nouveau le PDF ? Le modèle HTML enregistré sera remplacé et vous devrez l’approuver à nouveau.'))) return;
    setBusy('convert'); setError(null); setView(null); setSim(null);
    try {
      const out = await convertAndStoreTemplate(bytes, fields, fileName, (d, t) => setProgress([d, t]));
      invalidateHtmlTemplateCache();
      setMeta(out.template.metadata); setMode('overlay');
      setDoc({ html: out.template.html, metadata: out.template.metadata });
      setBusy('measure');
      setSim(await measureSimilarity(bytes, out.template.html));
    } catch (err) {
      console.error(err);
      setError(lbl('The conversion failed: ', 'La conversion a échoué : ') + (err instanceof Error ? err.message : String(err)));
    }
    setProgress(null); setBusy(null);
  };

  const open = async (v: View) => {
    if (view === v) { setView(null); return; }
    setBusy('view'); setError(null);
    try { if (!doc) await loadDoc(); setView(v); }
    catch (err) { console.error(err); setError(lbl('Could not load the HTML template.', 'Impossible de charger le modèle HTML.')); }
    setBusy(null);
  };

  const measure = async () => {
    if (!bytesRef.current) return;
    setBusy('measure'); setError(null);
    try {
      const d = doc ?? await loadDoc();
      setSim(await measureSimilarity(bytesRef.current, d.html));
    } catch (err) { console.error(err); setError(lbl('Could not compare the documents.', 'Impossible de comparer les documents.')); }
    setBusy(null);
  };

  const setRender = async (m: 'overlay' | 'html') => {
    if (m === 'html' && review.length && !window.confirm(lbl(`${review.length} field(s) still need verification (highlighted in the mapping list). Approve anyway?`, `${review.length} champ(s) restent à vérifier (surlignés dans la liste). Approuver quand même ?`))) return;
    setBusy('mode'); setError(null);
    try { const t = await api.setReportCardRenderMode(m); setMode(t.render_mode ?? m); }
    catch (err) { console.error(err); setError(err instanceof Error ? err.message : String(err)); }
    setBusy(null);
  };

  const viewerHtml = useMemo(() => {
    if (!doc || !view) return null;
    if (view === 'html' || view === 'blend') {
      const composed = composeTemplateHtml(doc, view === 'blend' ? [] : fields);
      return view === 'html' ? composed.replace('</style>', () => `${HIGHLIGHT}</style>`) : composed;
    }
    if (view === 'sample') {
      const cards = sampleCards();
      return fillHtmlTemplate(doc, cards, { school: { name: 'School', motto: '', address: '', headTeacher: '' }, lang, ctx: { classCards: cards, passMark: 10 }, fields });
    }
    return null;
  }, [doc, view, fields, lang, sampleCards]);

  const W = meta?.pageSettings.width ?? page?.pdfWidth ?? 595;
  const avg = sim && sim.length ? sim.reduce((a, s) => a + s.similarity, 0) / sim.length : null;
  const flagged = sim?.filter(s => !s.ok) ?? [];

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
      <div className="flex items-start justify-between flex-wrap gap-2">
        <div>
          <p className="text-sm font-semibold text-slate-800">{lbl('HTML / CSS template (converted from the PDF)', 'Modèle HTML / CSS (converti depuis le PDF)')}</p>
          <p className="text-xs text-slate-500">
            {lbl('Rebuilds the PDF with its own images, borders, text and fonts, and leaves the dynamic fields as placeholders.', 'Reconstruit le PDF avec ses propres images, bordures, textes et polices, et laisse les champs dynamiques sous forme de balises.')}
          </p>
        </div>
        <span className={`text-xs font-medium px-2 py-1 rounded-full ${mode === 'html' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
          {mode === 'html' ? lbl('Report cards use the HTML template', 'Les bulletins utilisent le modèle HTML') : lbl('Report cards use the original PDF', 'Les bulletins utilisent le PDF d’origine')}
        </span>
      </div>

      {error && <p className="text-sm text-red-600 flex items-start gap-1"><AlertTriangle size={14} className="mt-0.5 shrink-0" /> {error}</p>}

      <div className="flex flex-wrap items-center gap-2">
        <button onClick={convert} disabled={busy !== null || !page}
          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm px-3 py-1.5 rounded-lg">
          <RefreshCw size={14} className={busy === 'convert' ? 'animate-spin' : ''} />
          {busy === 'convert'
            ? lbl(`Converting${progress ? ` (page ${Math.min(progress[0] + 1, progress[1])}/${progress[1]})` : ''}…`, `Conversion${progress ? ` (page ${Math.min(progress[0] + 1, progress[1])}/${progress[1]})` : ''}…`)
            : meta ? lbl('Convert again', 'Convertir à nouveau') : lbl('Convert PDF to HTML template', 'Convertir le PDF en modèle HTML')}
        </button>
        {meta && (
          <>
            {(['original', 'html', 'sample', 'blend'] as View[]).map(v => (
              <button key={v} onClick={() => open(v)} disabled={busy !== null}
                className={`text-sm px-3 py-1.5 rounded-lg border disabled:opacity-50 ${view === v ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'border-slate-300 text-slate-700 hover:bg-slate-50'}`}>
                {v === 'original' ? lbl('Original PDF', 'PDF d’origine') : v === 'html' ? lbl('HTML template', 'Modèle HTML') : v === 'sample' ? lbl('HTML with sample data', 'HTML avec données d’exemple') : lbl('Overlay compare', 'Superposition')}
              </button>
            ))}
            <button onClick={measure} disabled={busy !== null}
              className="text-sm px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50">
              {busy === 'measure' ? lbl('Comparing…', 'Comparaison…') : lbl('Measure similarity', 'Mesurer la similarité')}
            </button>
          </>
        )}
      </div>

      {!meta && busy !== 'convert' && (
        <p className="text-sm text-slate-500">{lbl('No HTML template has been generated for this PDF yet.', 'Aucun modèle HTML n’a encore été généré pour ce PDF.')}</p>
      )}

      {meta && (
        <div className="text-xs text-slate-600 space-y-1">
          <p>
            {lbl(
              `${meta.pages.length} page(s), ${meta.pageSettings.widthMm}×${meta.pageSettings.heightMm} mm (${meta.pageSettings.orientation}) — ${meta.stats.texts} text blocks, ${meta.stats.images} images, ${meta.stats.shapes} shapes, ${dyn.length} dynamic areas.`,
              `${meta.pages.length} page(s), ${meta.pageSettings.widthMm}×${meta.pageSettings.heightMm} mm (${meta.pageSettings.orientation === 'landscape' ? 'paysage' : 'portrait'}) — ${meta.stats.texts} textes, ${meta.stats.images} images, ${meta.stats.shapes} formes, ${dyn.length} zones dynamiques.`)}
          </p>
          {summarize(meta).scannedPages.length > 0 && <p className="text-amber-700">• {lbl('Scanned page(s): the page image is kept as the background; there is no text layer, so place the fields manually in the layout above.', 'Page(s) numérisée(s) : l’image est conservée en arrière-plan ; sans couche de texte, placez les champs manuellement dans la mise en page ci-dessus.')}</p>}
          {meta.warnings.map((w, i) => <p key={i} className="text-amber-700">• {w}</p>)}
          {meta.pages.length > 1 && <p className="text-slate-500">• {lbl('Pages after the first are reproduced as static pages; dynamic fields are placed on page 1.', 'Les pages suivantes sont reproduites telles quelles ; les champs dynamiques sont placés sur la page 1.')}</p>}
        </div>
      )}

      {sim && (
        <div className={`rounded-lg border px-3 py-2 text-xs space-y-0.5 ${flagged.length ? 'border-amber-300 bg-amber-50 text-amber-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>
          <p className="font-medium">
            {lbl(`Visual match with the original: ${((avg ?? 0) * 100).toFixed(1)}% (target ≥ ${SIMILARITY_TARGET * 100}%)`, `Correspondance visuelle avec l’original : ${((avg ?? 0) * 100).toFixed(1)} % (objectif ≥ ${SIMILARITY_TARGET * 100} %)`)}
          </p>
          {sim.map(s => (
            <p key={s.page}>• {lbl('Page', 'Page')} {s.page}: {(s.similarity * 100).toFixed(1)}% — {(s.differingPixels * 100).toFixed(2)}% {lbl('of pixels differ noticeably', 'des pixels diffèrent nettement')} {s.ok ? '✓' : lbl('— review this page', '— à vérifier')}</p>
          ))}
          <p className="opacity-80">{lbl('Measured on the static page only (text rendering differences between engines account for small gaps). Never treat this as a guarantee: always look at the comparison.', 'Mesuré sur la page statique uniquement (les différences de rendu du texte entre moteurs expliquent de petits écarts). Ce n’est pas une garantie : regardez toujours la comparaison.')}</p>
        </div>
      )}

      {meta && view === 'original' && page && (
        <img src={page.dataUrl} alt="Original PDF" className="mx-auto border border-slate-300 max-w-full" />
      )}
      {meta && (view === 'html' || view === 'sample') && viewerHtml && (
        <HtmlTemplateFrame html={viewerHtml} pageWidthPt={W} title="HTML template" className="border border-slate-300 rounded overflow-hidden" />
      )}
      {meta && view === 'blend' && viewerHtml && page && (
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-xs text-slate-600">
            {lbl('HTML opacity', 'Opacité du HTML')} <input type="range" min={0} max={100} value={opacity} onChange={e => setOpacity(Number(e.target.value))} className="w-48" /> {opacity}%
          </label>
          <div className="relative mx-auto max-w-full" style={{ width: page.displayWidth }}>
            <img src={page.dataUrl} alt="Original PDF" className="w-full block border border-slate-300" />
            <div className="absolute inset-0" style={{ opacity: opacity / 100, mixBlendMode: 'multiply' }}>
              <HtmlTemplateFrame html={viewerHtml} pageWidthPt={W} title="Overlay" />
            </div>
          </div>
        </div>
      )}

      {meta && (
        <div>
          <button onClick={() => setShowMap(s => !s)} className="text-xs font-medium text-indigo-600 hover:underline">
            {showMap ? lbl('Hide', 'Masquer') : lbl('Show', 'Afficher')} {lbl('dynamic fields and data mapping', 'les champs dynamiques et leur association aux données')} ({dyn.length}{review.length ? `, ${review.length} ${lbl('to verify', 'à vérifier')}` : ''})
          </button>
          {showMap && (
            <div className="mt-2 max-h-64 overflow-auto border border-slate-200 rounded-lg">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 text-slate-500 sticky top-0"><tr><th className="text-left px-2 py-1">{lbl('Field', 'Champ')}</th><th className="text-left px-2 py-1">{lbl('Placeholder', 'Balise')}</th><th className="text-right px-2 py-1">x,y (pt)</th></tr></thead>
                <tbody>
                  {dyn.map(d => (
                    <tr key={d.id} className={d.confidence === 'review' ? 'bg-amber-50' : 'border-t border-slate-100'}>
                      <td className="px-2 py-1 text-slate-700">{d.label}{d.note ? <span className="block text-amber-700">{d.note}</span> : null}</td>
                      <td className="px-2 py-1 font-mono text-slate-500">{d.kind === 'photo' ? `{{{${d.dataBinding}}}}` : d.kind === 'table' ? '{{#each subjects}}' : `{{${d.dataBinding}}}`}</td>
                      <td className="px-2 py-1 text-right text-slate-500">{Math.round(d.x)}, {Math.round(d.y)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-xs text-slate-400 px-2 py-1.5">{lbl('To move or resize a field or change a subject mapping, edit it in the layout above; the HTML template follows automatically when you save.', 'Pour déplacer ou redimensionner un champ ou changer l’association d’une matière, modifiez-le dans la mise en page ci-dessus ; le modèle HTML suit automatiquement après l’enregistrement.')}</p>
            </div>
          )}
        </div>
      )}

      {meta && (
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
          {mode !== 'html' ? (
            <button onClick={() => setRender('html')} disabled={busy !== null}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm px-3 py-1.5 rounded-lg">
              <CheckCircle2 size={14} /> {lbl('Approve and use the HTML template', 'Approuver et utiliser le modèle HTML')}
            </button>
          ) : (
            <button onClick={() => setRender('overlay')} disabled={busy !== null}
              className="flex items-center gap-1.5 border border-slate-300 hover:bg-slate-50 disabled:opacity-50 text-slate-700 text-sm px-3 py-1.5 rounded-lg">
              <Undo2 size={14} /> {lbl('Go back to the original PDF', 'Revenir au PDF d’origine')}
            </button>
          )}
          <span className="text-xs text-slate-500">{lbl('Preview, print and download in Report Cards use the approved renderer.', 'L’aperçu, l’impression et le téléchargement dans Bulletins utilisent le moteur approuvé.')}</span>
        </div>
      )}
    </div>
  );
}
