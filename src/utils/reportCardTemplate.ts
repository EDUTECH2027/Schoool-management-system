/*
 * Copyright (c) 2026 [COMPANY LEGAL NAME]. All rights reserved.
 * Proprietary and confidential. Unauthorized copying, distribution or
 * modification of this file, via any medium, is strictly prohibited.
 */
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';


export type SimpleFieldKey =
  | 'school_name' | 'school_motto' | 'school_address' | 'head_teacher'
  | 'student_name' | 'student_number' | 'class_name' | 'academic_year' | 'term_label'
  | 'percentage' | 'sequence1_average' | 'sequence2_average'
  | 'class_position' | 'conduct' | 'attendance'
  | 'class_teacher_comment' | 'head_teacher_comment' | 'generated_date';

export interface SimpleField {
  type: 'text';
  key: SimpleFieldKey;
  x: number;      // fraction 0..1 of page width, left edge
  y: number;      // fraction 0..1 of page height, top edge (screen convention)
  fontSize: number;
  align: 'left' | 'center' | 'right';
  bold?: boolean;
}

export type TableColumnKey = 'subject_name' | 'ca_score' | 'exam_score' | 'coefficient' | 'total_score' | 'grade' | 'remark';

export interface TableColumn {
  key: TableColumnKey;
  widthFrac: number; // fraction of the table's own width
  align?: 'left' | 'center'; // set by auto-detection; absent = legacy left-aligned
  gapBeforeFrac?: number;    // unmapped template column(s) skipped before this one
}

export interface TableField {
  type: 'table';
  key: 'marks_table';
  x: number; y: number; width: number; // fractions of page size
  rowHeight: number;                   // fraction of page height
  fontSize: number;
  headerFontSize: number;
  columns: TableColumn[];
  drawHeader?: boolean; // false = the PDF already prints the header row (auto-detected tables)
  maxRows?: number;     // printed body rows available in the template; more rows are squeezed to fit
}

export type TemplateField = SimpleField | TableField;

export const SIMPLE_FIELD_DEFS: { key: SimpleFieldKey; labelEn: string; labelFr: string }[] = [
  { key: 'school_name',           labelEn: 'School Name',              labelFr: "Nom de l'école" },
  { key: 'school_motto',          labelEn: 'School Motto',             labelFr: "Devise de l'école" },
  { key: 'school_address',        labelEn: 'School Address',           labelFr: "Adresse de l'école" },
  { key: 'head_teacher',          labelEn: 'Head Teacher Name',        labelFr: 'Nom du directeur' },
  { key: 'student_name',          labelEn: 'Student Name',             labelFr: "Nom de l'élève" },
  { key: 'student_number',        labelEn: 'Admission Number',         labelFr: 'Matricule' },
  { key: 'class_name',            labelEn: 'Class',                    labelFr: 'Classe' },
  { key: 'academic_year',         labelEn: 'Academic Year',            labelFr: 'Année académique' },
  { key: 'term_label',            labelEn: 'Term',                     labelFr: 'Trimestre' },
  { key: 'percentage',            labelEn: 'Overall Average',          labelFr: 'Moyenne générale' },
  { key: 'sequence1_average',     labelEn: 'Sequence 1 Average',       labelFr: 'Moyenne Séquence 1' },
  { key: 'sequence2_average',     labelEn: 'Sequence 2 Average',       labelFr: 'Moyenne Séquence 2' },
  { key: 'class_position',        labelEn: 'Class Position',           labelFr: 'Rang' },
  { key: 'conduct',               labelEn: 'Conduct',                  labelFr: 'Conduite' },
  { key: 'attendance',            labelEn: 'Attendance %',             labelFr: 'Présence %' },
  { key: 'class_teacher_comment', labelEn: "Class Teacher's Comment",  labelFr: 'Appréciation du professeur' },
  { key: 'head_teacher_comment',  labelEn: "Head Teacher's Comment",   labelFr: 'Appréciation du directeur' },
  { key: 'generated_date',        labelEn: 'Date Generated',           labelFr: 'Date de génération' },
];

export const TABLE_COLUMN_DEFS: { key: TableColumnKey; labelEn: string; labelFr: string }[] = [
  { key: 'subject_name', labelEn: 'Subject',  labelFr: 'Matière' },
  { key: 'ca_score',     labelEn: 'Seq 1',    labelFr: 'Séq 1' },
  { key: 'exam_score',   labelEn: 'Seq 2',    labelFr: 'Séq 2' },
  { key: 'coefficient',  labelEn: 'Coef.',    labelFr: 'Coef.' },
  { key: 'total_score',  labelEn: 'Total',    labelFr: 'Total' },
  { key: 'grade',        labelEn: 'Grade',    labelFr: 'Mention' },
  { key: 'remark',       labelEn: 'Remark',   labelFr: 'Appréciation' },
];

export function fieldLabel(key: SimpleFieldKey, lang: 'en' | 'fr'): string {
  const def = SIMPLE_FIELD_DEFS.find(d => d.key === key);
  return def ? (lang === 'fr' ? def.labelFr : def.labelEn) : key;
}

export function columnLabel(key: TableColumnKey, lang: 'en' | 'fr'): string {
  const def = TABLE_COLUMN_DEFS.find(d => d.key === key);
  return def ? (lang === 'fr' ? def.labelFr : def.labelEn) : key;
}

export function defaultTableField(): TableField {
  return {
    type: 'table', key: 'marks_table',
    x: 0.08, y: 0.42, width: 0.84, rowHeight: 0.025,
    fontSize: 9, headerFontSize: 9,
    columns: [
      { key: 'subject_name', widthFrac: 0.32 },
      { key: 'ca_score',     widthFrac: 0.11 },
      { key: 'exam_score',   widthFrac: 0.11 },
      { key: 'coefficient',  widthFrac: 0.10 },
      { key: 'total_score',  widthFrac: 0.12 },
      { key: 'grade',        widthFrac: 0.12 },
      { key: 'remark',       widthFrac: 0.12 },
    ],
  };
}

export function defaultSimpleField(key: SimpleFieldKey): SimpleField {
  return { type: 'text', key, x: 0.1, y: 0.1, fontSize: 11, align: 'left' };
}

// ── Data the template can draw from ─────────────────────────────────────────
export interface TemplateEntry {
  subject_name: string; ca_score: number; exam_score: number | null;
  coefficient: number; total_score: number; grade: string; remark: string;
}

export interface TemplateReportCard {
  student_name: string; student_number: string; class_name: string;
  term_name: string; academic_year: string;
  percentage: number; sequence1_average: number; sequence2_average: number;
  class_position: number | null; out_of: number | null;
  conduct: string | null; days_present: number; total_school_days: number;
  class_teacher_comment: string | null; head_teacher_comment: string | null;
  entries: TemplateEntry[];
  // Set for single-sequence cards (1, 3 or 5): only the first mark column is meaningful.
  sequence?: number;
}

export interface TemplateSchoolInfo {
  name: string; motto: string; address: string; headTeacher: string;
}

export function termLabelOf(termName: string, lang: 'en' | 'fr', sequence?: number): string {
  if (sequence) return lang === 'fr' ? `Séquence ${sequence}` : `Sequence ${sequence}`;
  const n = termName === 'first' ? 1 : termName === 'second' ? 2 : 3;
  return lang === 'fr' ? `Trimestre ${n}` : `Term ${n}`;
}

export function resolveSimpleValue(key: SimpleFieldKey, rc: TemplateReportCard, school: TemplateSchoolInfo, lang: 'en' | 'fr'): string {
  switch (key) {
    case 'school_name':           return school.name || '';
    case 'school_motto':          return school.motto || '';
    case 'school_address':        return school.address || '';
    case 'head_teacher':          return school.headTeacher || '';
    case 'student_name':          return rc.student_name || '';
    case 'student_number':        return rc.student_number || '';
    case 'class_name':            return rc.class_name || '';
    case 'academic_year':         return rc.academic_year || '';
    case 'term_label':            return termLabelOf(rc.term_name, lang, rc.sequence);
    case 'percentage':            return `${rc.percentage ?? 0}/20`;
    case 'sequence1_average':     return `${rc.sequence1_average ?? 0}/20`;
    case 'sequence2_average':     return rc.sequence ? '' : `${rc.sequence2_average ?? 0}/20`;
    case 'class_position':        return `${rc.class_position ?? '—'}/${rc.out_of ?? '—'}`;
    case 'conduct':                return rc.conduct || '—';
    case 'attendance': {
      const pct = rc.total_school_days ? Math.round((rc.days_present / rc.total_school_days) * 100) : 0;
      return `${pct}%`;
    }
    case 'class_teacher_comment': return rc.class_teacher_comment || '';
    case 'head_teacher_comment':  return rc.head_teacher_comment || '';
    case 'generated_date':        return new Date().toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US');
    default:                      return '';
  }
}

// ── Rendering the uploaded PDF's first page to an image (designer background) ──
export interface RenderedPage {
  dataUrl: string;
  displayWidth: number; displayHeight: number; // px, at the requested scale
  pdfWidth: number; pdfHeight: number;         // pt, the PDF's native page size
}

export async function renderPdfFirstPage(bytes: ArrayBuffer, targetWidthPx: number): Promise<RenderedPage> {
  // pdf.js (+ its 1 MB worker) is only fetched when a template is actually previewed.
  const [pdfjsLib, { default: pdfjsWorkerUrl }] = await Promise.all([
    import('pdfjs-dist'),
    import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
  ]);
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;
  const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
  const page = await pdf.getPage(1);
  const unscaled = page.getViewport({ scale: 1 });
  const scale = targetWidthPx / unscaled.width;
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');
  await page.render({ canvas, canvasContext: ctx, viewport }).promise;
  return {
    dataUrl: canvas.toDataURL('image/png'),
    displayWidth: viewport.width, displayHeight: viewport.height,
    pdfWidth: unscaled.width, pdfHeight: unscaled.height,
  };
}

// ── Filling the template with real data, one page per student ──────────────
function cellText(col: TableColumnKey, entry: TemplateEntry): string {
  switch (col) {
    case 'subject_name': return entry.subject_name || '';
    case 'ca_score':     return String(entry.ca_score ?? 0);
    case 'exam_score':   return entry.exam_score == null ? '' : String(entry.exam_score);
    case 'coefficient':  return String(entry.coefficient ?? 1);
    case 'total_score':  return String(entry.total_score ?? 0);
    case 'grade':        return entry.grade || '';
    case 'remark':       return entry.remark || '';
  }
}

function fitText(text: string, font: PDFFont, size: number, maxWidth: number): string {
  let t = text;
  while (t.length > 1 && font.widthOfTextAtSize(t, size) > maxWidth) t = t.slice(0, -1);
  return t;
}

function drawTableField(page: PDFPage, field: TableField, rc: TemplateReportCard, pageWidth: number, pageHeight: number, font: PDFFont, boldFont: PDFFont, lang: 'en' | 'fr') {
  const tableX = field.x * pageWidth;
  const tableTop = pageHeight - field.y * pageHeight;
  const tableWidth = field.width * pageWidth;
  let rowH = field.rowHeight * pageHeight;
  const color = rgb(0.06, 0.09, 0.16);
  const detected = field.drawHeader === false; // auto-detected table: header is already printed on the template

  if (!detected) {
    let colX = tableX;
    field.columns.forEach(col => {
      const label = rc.sequence && col.key === 'exam_score' ? '' : columnLabel(col.key, lang);
      page.drawText(label, { x: colX + 2, y: tableTop - field.headerFontSize, size: field.headerFontSize, font: boldFont, color });
      colX += col.widthFrac * tableWidth;
    });
  }

  // More subjects than the template has printed rows: squeeze rather than run off the table.
  let fontSize = field.fontSize;
  if (detected && field.maxRows && rc.entries.length > field.maxRows) {
    const k = field.maxRows / rc.entries.length;
    rowH *= k;
    fontSize = Math.max(6, fontSize * Math.max(k, 0.75));
  }

  rc.entries.forEach((entry, rowIdx) => {
    const rowY = detected
      ? tableTop - rowH * rowIdx - rowH / 2 - fontSize * 0.35
      : tableTop - rowH * (rowIdx + 1) - fontSize;
    let cx = tableX;
    field.columns.forEach(col => {
      cx += (col.gapBeforeFrac ?? 0) * tableWidth;
      const colW = col.widthFrac * tableWidth;
      let text = rc.sequence && col.key === 'exam_score' ? '' : cellText(col.key, entry);
      if (detected) {
        const useFont = col.key === 'grade' ? boldFont : font;
        text = fitText(text, useFont, fontSize, colW - 4);
        const tw = useFont.widthOfTextAtSize(text, fontSize);
        const x = col.align === 'center' ? cx + (colW - tw) / 2 : cx + 2;
        page.drawText(text, { x, y: rowY, size: fontSize, font: useFont, color });
      } else {
        page.drawText(text, { x: cx + 2, y: rowY, size: fontSize, font, color });
      }
      cx += colW;
    });
  });
}

export async function fillTemplatePdf(
  templateBytes: ArrayBuffer,
  fields: TemplateField[],
  cards: TemplateReportCard[],
  school: TemplateSchoolInfo,
  lang: 'en' | 'fr',
): Promise<Uint8Array> {
  const srcDoc = await PDFDocument.load(templateBytes);
  const outDoc = await PDFDocument.create();
  const font = await outDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await outDoc.embedFont(StandardFonts.HelveticaBold);
  const color = rgb(0.06, 0.09, 0.16);

  for (const rc of cards) {
    const [copiedPage] = await outDoc.copyPages(srcDoc, [0]);
    outDoc.addPage(copiedPage);
    const { width: pageWidth, height: pageHeight } = copiedPage.getSize();

    for (const field of fields) {
      if (field.type === 'table') {
        drawTableField(copiedPage, field, rc, pageWidth, pageHeight, font, boldFont, lang);
        continue;
      }
      const value = resolveSimpleValue(field.key, rc, school, lang);
      const useFont = field.bold ? boldFont : font;
      const textWidth = useFont.widthOfTextAtSize(value, field.fontSize);
      let x = field.x * pageWidth;
      if (field.align === 'center') x -= textWidth / 2;
      else if (field.align === 'right') x -= textWidth;
      const y = pageHeight - field.y * pageHeight - field.fontSize;
      copiedPage.drawText(value, { x, y, size: field.fontSize, font: useFont, color });
    }
  }

  return outDoc.save();
}
