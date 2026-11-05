/*
 * Copyright (c) 2026 [COMPANY LEGAL NAME]. All rights reserved.
 * Proprietary and confidential. Unauthorized copying, distribution or
 * modification of this file, via any medium, is strictly prohibited.
 */
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import {
  rowValues, groupAverage, groupRank, groupTotals, cardSummary,
  type SubjectGridField, type TickField, type ImageField, type InfoField, type GridColumn, type GridRole, type FillContext, type CardSummary,
} from './templateGrid';
export type { SubjectGridField, TickField, ImageField, InfoField, FillContext } from './templateGrid';


export type SimpleFieldKey =
  | 'school_name' | 'school_motto' | 'school_address' | 'head_teacher'
  | 'student_name' | 'student_number' | 'class_name' | 'academic_year' | 'term_label'
  | 'percentage' | 'sequence1_average' | 'sequence2_average'
  | 'class_position' | 'conduct' | 'attendance'
  | 'class_teacher_comment' | 'head_teacher_comment' | 'generated_date'
  // student identity
  | 'sex' | 'date_of_birth' | 'nui' | 'class_master' | 'enrollment'
  // student performance / class profile (computed with the existing report-card engine)
  | 'total_marks' | 'total_coef' | 'student_average' | 'grade' | 'rank'
  | 'class_highest' | 'class_lowest' | 'class_average' | 'class_presents' | 'class_passed' | 'success_rate'
  // discipline / observation
  | 'absences_total' | 'absences_justified' | 'absences_unjustified' | 'general_observation';

export interface SimpleField {
  type: 'text';
  key: SimpleFieldKey;
  x: number;      // fraction 0..1 of page width, left edge
  y: number;      // fraction 0..1 of page height, top edge (screen convention)
  fontSize: number;
  align: 'left' | 'center' | 'right';
  bold?: boolean;
  boxWidth?: number;  // fraction of page width available for the value; longer text is shrunk / wrapped, never overlapping
  maxLines?: number;  // wrap into at most this many lines when boxWidth is set
  review?: string;    // set by the analyser when the detection is uncertain: shown to the administrator
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

export type TemplateField = SimpleField | TableField | SubjectGridField | TickField | ImageField | InfoField;

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
  { key: 'sex',                   labelEn: 'Sex / Gender',             labelFr: 'Sexe' },
  { key: 'date_of_birth',         labelEn: 'Date of Birth',            labelFr: 'Date de naissance' },
  { key: 'nui',                   labelEn: 'Unique Identifier (NUI)',  labelFr: 'Identifiant unique' },
  { key: 'class_master',          labelEn: 'Class Master',             labelFr: 'Professeur principal' },
  { key: 'enrollment',            labelEn: 'Class Enrollment',         labelFr: 'Effectif' },
  { key: 'total_marks',           labelEn: 'Total Marks (ΣN×C)',       labelFr: 'Total des points' },
  { key: 'total_coef',            labelEn: 'Total Coefficients',       labelFr: 'Total des coefficients' },
  { key: 'student_average',       labelEn: 'Student Average',          labelFr: "Moyenne de l'élève" },
  { key: 'grade',                 labelEn: 'Grade',                    labelFr: 'Mention' },
  { key: 'rank',                  labelEn: 'Rank',                     labelFr: 'Rang' },
  { key: 'class_highest',         labelEn: 'Class Highest Average',    labelFr: 'Moyenne la plus forte' },
  { key: 'class_lowest',          labelEn: 'Class Lowest Average',     labelFr: 'Moyenne la plus faible' },
  { key: 'class_average',         labelEn: 'Class Average',            labelFr: 'Moyenne de la classe' },
  { key: 'class_presents',        labelEn: 'Students Evaluated',       labelFr: 'Présents' },
  { key: 'class_passed',          labelEn: 'Number Passed',            labelFr: 'Nombre de reçus' },
  { key: 'success_rate',          labelEn: 'Success Rate',             labelFr: 'Taux de réussite' },
  { key: 'absences_total',        labelEn: 'Total Absences (days)',    labelFr: 'Total des absences (jours)' },
  { key: 'absences_justified',    labelEn: 'Justified Absences',       labelFr: 'Absences justifiées' },
  { key: 'absences_unjustified',  labelEn: 'Unjustified Absences',     labelFr: 'Absences non justifiées' },
  { key: 'general_observation',   labelEn: 'General Observation',      labelFr: 'Observation générale' },
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
  subject_id?: string;
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
  // Student identity for structured templates (all optional; a field with no value is left blank)
  gender?: string | null; date_of_birth?: string | null; nui?: string | null;
  class_master?: string | null; repeater?: boolean | null; days_absent?: number;
  justified_absences?: number; unjustified_absences?: number;
  photo?: { bytes: Uint8Array; mime: string } | null;
}

export interface TemplateSchoolInfo {
  name: string; motto: string; address: string; headTeacher: string;
}

export function termLabelOf(termName: string, lang: 'en' | 'fr', sequence?: number): string {
  if (sequence) return lang === 'fr' ? `Séquence ${sequence}` : `Sequence ${sequence}`;
  const n = termName === 'first' ? 1 : termName === 'second' ? 2 : 3;
  return lang === 'fr' ? `Trimestre ${n}` : `Term ${n}`;
}

const fmtNum = (n: number | null | undefined, suffix = '') => (n == null || Number.isNaN(n) ? '' : `${n}${suffix}`);

export function resolveSimpleValue(key: SimpleFieldKey, rc: TemplateReportCard, school: TemplateSchoolInfo, lang: 'en' | 'fr', ctx?: FillContext): string {
  const sum: CardSummary | null = ctx ? cardSummary(rc, ctx) : null;
  switch (key) {
    case 'sex':                   return rc.gender === 'male' ? 'M' : rc.gender === 'female' ? 'F' : (rc.gender ? rc.gender[0].toUpperCase() : '');
    case 'date_of_birth': {
      const d = rc.date_of_birth ? new Date(rc.date_of_birth) : null;
      return d && !Number.isNaN(d.getTime()) ? d.toLocaleDateString('en-GB') : (rc.date_of_birth || '');
    }
    case 'nui':                   return rc.nui || '';
    case 'class_master':          return rc.class_master || '';
    case 'enrollment':            return fmtNum(sum?.enrollment ?? rc.out_of);
    case 'total_marks':           return fmtNum(sum?.totalMarks);
    case 'total_coef':            return fmtNum(sum?.totalCoef);
    case 'student_average':       return fmtNum(rc.percentage);
    case 'grade':                 return sum?.grade ?? '';
    case 'rank':                  return rc.class_position != null ? String(rc.class_position) : '';
    case 'class_highest':         return fmtNum(sum?.classHighest);
    case 'class_lowest':          return fmtNum(sum?.classLowest);
    case 'class_average':         return fmtNum(sum?.classAverage);
    case 'class_presents':        return fmtNum(sum?.presents);
    case 'class_passed':          return fmtNum(sum?.passed);
    case 'success_rate':          return fmtNum(sum?.successRate, '%');
    case 'absences_justified':    return rc.justified_absences != null ? String(rc.justified_absences) : '';
    case 'absences_unjustified':  return rc.unjustified_absences != null ? String(rc.unjustified_absences) : '';
    case 'absences_total':
      if (rc.justified_absences != null || rc.unjustified_absences != null) return String((rc.justified_absences ?? 0) + (rc.unjustified_absences ?? 0));
      return rc.days_absent != null ? String(rc.days_absent) : '';
    case 'general_observation':   return rc.class_teacher_comment || rc.head_teacher_comment || '';
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
  // pdf.js takes ownership (detaches) the buffer it is given; callers keep using theirs, so pass a copy.
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(bytes.slice(0)) }).promise;
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

// Renders EVERY page of a (filled) PDF to PNG data URLs — used to preview/print template-based report cards.
export async function renderPdfPages(bytes: Uint8Array | ArrayBuffer, targetWidthPx: number): Promise<string[]> {
  const [pdfjsLib, { default: pdfjsWorkerUrl }] = await Promise.all([
    import('pdfjs-dist'),
    import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
  ]);
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;
  // pdf.js takes ownership of the buffer it is given, so hand it a copy.
  const data = bytes instanceof Uint8Array ? bytes.slice() : new Uint8Array(bytes.slice(0));
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  const pages: string[] = [];
  for (let n = 1; n <= pdf.numPages; n++) {
    const page = await pdf.getPage(n);
    const unscaled = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: targetWidthPx / unscaled.width });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas not supported');
    await page.render({ canvas, canvasContext: ctx, viewport }).promise;
    pages.push(canvas.toDataURL('image/png'));
  }
  return pages;
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

// Replace characters Helvetica (WinAnsi) cannot encode so a name like "Ŋgu" never aborts the whole PDF.
function safeText(text: string, font: PDFFont): string {
  const supported = new Set(font.getCharacterSet());
  return Array.from(text).map(ch => (supported.has(ch.codePointAt(0) ?? 0) ? ch : '?')).join('');
}

// Draws one line, shrinking the font (down to minSize) and finally truncating so it never leaves its box.
function drawFitted(page: PDFPage, text: string, font: PDFFont, x: number, baselineY: number, size: number, maxWidth: number, align: 'left' | 'center' | 'right', color: ReturnType<typeof rgb>, minSize = 5.5) {
  let t = safeText(text, font);
  let fs = size;
  while (fs > minSize && font.widthOfTextAtSize(t, fs) > maxWidth) fs -= 0.25;
  while (t.length > 1 && font.widthOfTextAtSize(t, fs) > maxWidth) t = t.slice(0, -1);
  const w = font.widthOfTextAtSize(t, fs);
  const dx = align === 'center' ? (maxWidth - w) / 2 : align === 'right' ? maxWidth - w : 0;
  page.drawText(t, { x: x + dx, y: baselineY, size: fs, font, color });
}

// Word-wrap into at most maxLines lines inside maxWidth, shrinking the font until it fits.
function drawWrapped(page: PDFPage, text: string, font: PDFFont, x: number, topY: number, size: number, maxWidth: number, maxLines: number, color: ReturnType<typeof rgb>) {
  const clean = safeText(text, font);
  let fs = size;
  let lines: string[] = [];
  for (; fs >= 5.5; fs -= 0.5) {
    lines = []; let cur = '';
    for (const word of clean.split(/\s+/)) {
      const test = cur ? `${cur} ${word}` : word;
      if (font.widthOfTextAtSize(test, fs) <= maxWidth) cur = test; else { if (cur) lines.push(cur); cur = word; }
    }
    if (cur) lines.push(cur);
    if (lines.length <= maxLines) break;
  }
  lines.slice(0, maxLines).forEach((ln, i) => page.drawText(ln, { x, y: topY - fs - i * fs * 1.2, size: fs, font, color }));
}

const ROLE_TEXT = (role: GridRole, v: NonNullable<ReturnType<typeof rowValues>>): string => {
  switch (role) {
    case 'mark': return String(v.mark);
    case 'coef': return String(v.coef);
    case 'nc': return String(v.nc);
    case 'rank': return String(v.rank);
    case 'grade': return v.grade;
    case 'min': return String(v.min);
    case 'max': return String(v.max);
    case 'remark': return v.remark;
    case 'visa': return ''; // the signature / validation area is preserved empty
  }
};

function drawSubjectGrid(page: PDFPage, grid: SubjectGridField, rc: TemplateReportCard, pw: number, ph: number, font: PDFFont, boldFont: PDFFont, ctx: FillContext) {
  const color = rgb(0.06, 0.09, 0.16);
  for (const row of grid.rows) {
    const v = rowValues(rc, row, ctx);
    if (!v) continue; // no mark for this subject (or the row is not bound to a subject): stays blank
    const top = row.yTop * ph, h = row.height * ph;
    for (const col of grid.columns as GridColumn[]) {
      if (col.printed && col.roles.every(r => r === 'coef')) continue; // coefficient already printed on the template
      const lines = col.roles.length;
      col.roles.forEach((role, i) => {
        const text = ROLE_TEXT(role, v);
        if (!text) return;
        const lineH = h / lines;
        const size = Math.min(grid.fontSize, lineH * 0.78, lines > 1 ? 6.5 : 99);
        const baselineScreen = top + lineH * i + lineH / 2 + size * 0.35;
        drawFitted(page, text, role === 'grade' ? boldFont : font, col.x * pw + 1.5, ph - baselineScreen, size, col.width * pw - 3, col.align, color);
      });
    }
  }
  grid.groups.forEach((g, gi) => {
    const avg = groupAverage(rc, grid, gi);
    const rank = groupRank(rc, grid, gi, ctx);
    const tot = groupTotals(rc, grid, gi);
    for (const slot of g.slots) {
      const text = slot.kind === 'avg' ? (avg != null ? String(avg) : '')
        : slot.kind === 'rank' ? (rank != null ? String(rank) : '')
        : slot.kind === 'notes' ? (tot ? String(tot.notes) : '')
        : slot.kind === 'nc' ? (tot ? String(tot.nc) : '')
        : (tot ? String(tot.coef) : '');
      if (!text) continue;
      const size = Math.min(grid.fontSize + 1, g.height * ph * 0.7);
      const baselineScreen = g.yTop * ph + (g.height * ph) / 2 + size * 0.35;
      const inCol = slot.kind === 'notes' || slot.kind === 'nc' || slot.kind === 'coef'; // Σ cells sit centred in their column
      drawFitted(page, text, boldFont, inCol ? slot.x * pw + 1.5 : slot.x * pw, ph - baselineScreen, size, inCol ? slot.width * pw - 3 : slot.width * pw, inCol ? 'center' : 'left', color);
    }
  });
}

function drawTick(page: PDFPage, tick: TickField, rc: TemplateReportCard, pw: number, ph: number, boldFont: PDFFont) {
  if (rc.repeater == null) return; // unknown: neither box is ticked
  const at = rc.repeater ? tick.yes : tick.no;
  const size = 9;
  const w = boldFont.widthOfTextAtSize('X', size);
  page.drawText('X', { x: at.x * pw - w / 2, y: ph - at.y * ph - size * 0.35, size, font: boldFont, color: rgb(0.06, 0.09, 0.16) });
}

async function drawPhoto(outDoc: PDFDocument, page: PDFPage, img: ImageField, rc: TemplateReportCard, pw: number, ph: number) {
  if (!rc.photo) return;
  try {
    const b = rc.photo.bytes;
    const isPng = b[0] === 0x89 && b[1] === 0x50;
    const image = isPng ? await outDoc.embedPng(b) : await outDoc.embedJpg(b);
    const boxW = img.width * pw, boxH = img.height * ph;
    const scale = Math.min(boxW / image.width, boxH / image.height); // fit inside the box, keep the aspect ratio
    const w = image.width * scale, h = image.height * scale;
    page.drawImage(image, { x: img.x * pw + (boxW - w) / 2, y: ph - img.y * ph - boxH + (boxH - h) / 2, width: w, height: h });
  } catch (err) {
    console.error('[template] could not embed the student photo', err); // unsupported image: leave the box empty
  }
}

export async function fillTemplatePdf(
  templateBytes: ArrayBuffer,
  fields: TemplateField[],
  cards: TemplateReportCard[],
  school: TemplateSchoolInfo,
  lang: 'en' | 'fr',
  context?: FillContext,
): Promise<Uint8Array> {
  // Without an explicit class context the given cards are the class (single-card previews pass the whole class).
  const ctx: FillContext = context ?? { classCards: cards, passMark: 10 };
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
      if (field.type === 'info') continue; // notes for the review screen only
      if (field.type === 'subject_grid') { drawSubjectGrid(copiedPage, field, rc, pageWidth, pageHeight, font, boldFont, ctx); continue; }
      if (field.type === 'tick') { drawTick(copiedPage, field, rc, pageWidth, pageHeight, boldFont); continue; }
      if (field.type === 'image') { await drawPhoto(outDoc, copiedPage, field, rc, pageWidth, pageHeight); continue; }
      const value = resolveSimpleValue(field.key, rc, school, lang, ctx);
      const useFont = field.bold ? boldFont : font;
      if (field.boxWidth) {
        // Structured templates: keep the value inside its box (wrap or shrink; never overlap neighbours).
        const boxW = field.boxWidth * pageWidth;
        if ((field.maxLines ?? 1) > 1) drawWrapped(copiedPage, value, useFont, field.x * pageWidth, pageHeight - field.y * pageHeight, field.fontSize, boxW, field.maxLines ?? 1, color);
        else drawFitted(copiedPage, value, useFont, field.x * pageWidth, pageHeight - field.y * pageHeight - field.fontSize, field.fontSize, boxW, field.align, color);
        continue;
      }
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
