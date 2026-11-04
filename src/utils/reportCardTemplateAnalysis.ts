/*
 * Copyright (c) 2026 [COMPANY LEGAL NAME]. All rights reserved.
 * Proprietary and confidential. Unauthorized copying, distribution or
 * modification of this file, via any medium, is strictly prohibited.
 */
// Automatic analysis of an uploaded report card PDF. The PDF itself is always used as the
// page background (so logos, borders, colours and fonts are reproduced pixel-for-pixel);
// this module works out WHERE each piece of data belongs by reading the PDF's text layer
// (labels such as "Matricule :", the marks table header) and its ruling lines (cell borders),
// then produces the same TemplateField[] the manual designer edits.
import { PDFDocument } from 'pdf-lib';
import type { PDFPageProxy } from 'pdfjs-dist';
import { api, mediaUrl } from '../api/client';
import { detectStructure } from './templateStructureAnalysis';
import {
  fillTemplatePdf,
  type SimpleFieldKey, type SimpleField, type TableField, type TableColumn, type TableColumnKey,
  type TemplateField, type TemplateReportCard, type TemplateSchoolInfo, type SubjectGridField,
} from './reportCardTemplate';

// ── Types ───────────────────────────────────────────────────────────────────
export interface Seg { text: string; norm: string; x: number; right: number; y: number; fs: number }
export interface Line { y: number; fs: number; segs: Seg[] }
export interface HRule { y: number; x0: number; x1: number }
export interface VRule { x: number; y0: number; y1: number }

export interface TemplateAnalysis {
  pageWidth: number; pageHeight: number;
  fields: TemplateField[];
  hasTextLayer: boolean;
  detectedLabels: SimpleFieldKey[];
  tableDetected: boolean;
  usedRules: boolean;
}

export interface TemplateValidation { ok: boolean; errors: string[]; warnings: string[] }

// ── Text helpers ────────────────────────────────────────────────────────────
const normalize = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’‘`]/g, "'").toLowerCase().replace(/\s+/g, ' ').trim();

const stripPunct = (s: string) => s.replace(/[\s:.\-–—_…]+$/g, '').trim();

const isLeader = (s: string) => /^[\s._\-–—:…]{2,}$/.test(s) || /^:\s*[._\-–—…]*$/.test(s);

// ── Label dictionaries (English + French, Cameroon bilingual) ───────────────
const FIELD_PATTERNS: { key: SimpleFieldKey; re: RegExp; deny?: RegExp }[] = [
  { key: 'class_teacher_comment', re: /^(appreciation|appreciations|comment|comments|remarque|remarques|observations?).*(professeur|prof\b|teacher|titulaire|principal|class)/ },
  { key: 'head_teacher_comment',  re: /^(appreciation|appreciations|comment|comments|visa|remarque|observations?).*(directeur|directrice|director|head|proviseur|principal|chef)/ },
  { key: 'student_number', re: /^(matricule|n°? ?matricule|admission( no\.?| number)?|adm\.? ?no\.?|student (id|number|no\.?)|id( eleve)?)$/ },
  { key: 'student_name',   re: /^(nom( et prenoms?| complet)?|noms? (et|&) prenoms?|prenoms?|name|full name|student( name)?|nom de l'eleve|eleve|nom de l'etudiant)$/,
    deny: /(pere|mere|parent|tuteur|guardian|father|mother|ecole|school)/ },
  { key: 'class_name',     re: /^(classe|class)$/ },
  { key: 'academic_year',  re: /^(annee (scolaire|academique)|academic year|school year|session)$/ },
  { key: 'term_label',     re: /^(trimestre|term|periode|period)$/ },
  { key: 'sequence1_average', re: /(moyenne|average|moy\.?).*(seq\w*\.? ?(n°? ?)?0?1|1(ere|re|st)? ?seq)/ },
  { key: 'sequence2_average', re: /(moyenne|average|moy\.?).*(seq\w*\.? ?(n°? ?)?0?2|2(eme|nd|e)? ?seq)/ },
  { key: 'percentage',     re: /^(moyenne (generale|trimestrielle|du trimestre|de l'eleve)?|moy\.? ?gen(erale)?\.?|overall average|general average|average|term average)$/ },
  { key: 'class_position', re: /^(rang|rank|position|classement|class position|rang dans la classe)$/ },
  { key: 'conduct',        re: /^(conduite|conduct|comportement|discipline|behaviou?r)$/ },
  { key: 'attendance',     re: /^(presence|assiduite|attendance|taux de presence)$/ },
  { key: 'head_teacher',   re: /^(directeur|directrice|head ?teacher|head ?master|principal|proviseur|le directeur)$/ },
  { key: 'generated_date', re: /^(date|fait a|done at|delivre le|date d'edition)$/ },
];

const COLUMN_PATTERNS: { key: TableColumnKey; re: RegExp }[] = [
  { key: 'subject_name', re: /^(matieres?|subjects?|disciplines?|courses?|intitule.*|libelle.*|matieres? enseignees)\b/ },
  { key: 'ca_score',     re: /(^|\b)(seq\w*\.? ?(n°? ?)?0?1\b|1(ere|re|st)? ?seq|s0?1$|note ?seq\w*\.? ?1|ca$|cont(inu)?$)/ },
  { key: 'exam_score',   re: /(^|\b)(seq\w*\.? ?(n°? ?)?0?2\b|2(eme|nd|e)? ?seq|s0?2$|note ?seq\w*\.? ?2|exam(en)?$)/ },
  { key: 'coefficient',  re: /^(coef|coeff|coefficient|coef\.|cf)\b/ },
  { key: 'grade',        re: /^(mention|grade|niveau|cote)\b/ },
  { key: 'remark',       re: /^(appreciations?|remarks?|observations?|comments?|avis)\b/ },
  { key: 'total_score',  re: /^(total|note|points|moy\b|moyenne|moy\.? ?coef|note ?x ?coef|nxc)/ },
];

// ── PDF reading ─────────────────────────────────────────────────────────────
type PdfjsModule = typeof import('pdfjs-dist');

async function loadPdfjs(): Promise<PdfjsModule> {
  const [pdfjsLib, { default: workerUrl }] = await Promise.all([
    import('pdfjs-dist'),
    import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
  ]);
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
  return pdfjsLib;
}

function buildLines(items: { str: string; transform: number[]; width: number; height: number }[], offX: number, offY: number): Line[] {
  const raw = items
    .filter(i => i.str && i.str.trim().length > 0)
    .map(i => {
      const fs = Math.hypot(i.transform[2], i.transform[3]) || i.height || 10;
      return { text: i.str, x: i.transform[4] - offX, y: i.transform[5] - offY, w: i.width, fs };
    })
    .sort((a, b) => b.y - a.y || a.x - b.x);

  const lines: { y: number; fs: number; items: typeof raw }[] = [];
  for (const it of raw) {
    const line = lines.find(l => Math.abs(l.y - it.y) < Math.max(l.fs, it.fs) * 0.4);
    if (line) { line.items.push(it); line.fs = Math.max(line.fs, it.fs); }
    else lines.push({ y: it.y, fs: it.fs, items: [it] });
  }

  return lines.map(l => {
    const sorted = l.items.sort((a, b) => a.x - b.x);
    const segs: Seg[] = [];
    for (const it of sorted) {
      const last = segs[segs.length - 1];
      if (last && it.x - last.right < it.fs * 0.7) {
        const gap = it.x - last.right;
        last.text += (gap > it.fs * 0.15 && !last.text.endsWith(' ') && !it.text.startsWith(' ') ? ' ' : '') + it.text;
        last.right = it.x + it.w;
        last.fs = Math.max(last.fs, it.fs);
      } else {
        segs.push({ text: it.text, norm: '', x: it.x, right: it.x + it.w, y: it.y, fs: it.fs });
      }
    }
    segs.forEach(s => { s.text = s.text.replace(/\s+/g, ' ').trim(); s.norm = normalize(s.text); });
    return { y: l.y, fs: l.fs, segs: segs.filter(s => s.text.length > 0) };
  }).filter(l => l.segs.length > 0);
}

// Walks the page's drawing operators, tracking the current transform, and collects the straight
// horizontal / vertical edges of every stroked or filled path (table borders, thin filled bars).
async function extractRules(pdfjs: PdfjsModule, page: PDFPageProxy, offX: number, offY: number) {
  const hRules: HRule[] = [];
  const vRules: VRule[] = [];
  try {
    const { OPS } = pdfjs;
    const opList = await page.getOperatorList();
    type M = [number, number, number, number, number, number];
    let ctm: M = [1, 0, 0, 1, 0, 0];
    const stack: M[] = [];
    const mul = (m: M, n: M): M => [
      m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1],
      m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3],
      m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5],
    ];
    const pt = (x: number, y: number): [number, number] => [ctm[0] * x + ctm[2] * y + ctm[4] - offX, ctm[1] * x + ctm[3] * y + ctm[5] - offY];
    const addEdge = (a: [number, number], b: [number, number]) => {
      const dx = Math.abs(a[0] - b[0]); const dy = Math.abs(a[1] - b[1]);
      if (dy < 0.6 && dx > 8) hRules.push({ y: (a[1] + b[1]) / 2, x0: Math.min(a[0], b[0]), x1: Math.max(a[0], b[0]) });
      else if (dx < 0.6 && dy > 8) vRules.push({ x: (a[0] + b[0]) / 2, y0: Math.min(a[1], b[1]), y1: Math.max(a[1], b[1]) });
    };

    for (let i = 0; i < opList.fnArray.length; i++) {
      const fn = opList.fnArray[i];
      const args = opList.argsArray[i] as unknown;
      if (fn === OPS.save) stack.push([...ctm] as M);
      else if (fn === OPS.restore) ctm = stack.pop() ?? ctm;
      else if (fn === OPS.transform) ctm = mul(ctm, args as M);
      else if (fn === OPS.constructPath) {
        // pdf.js v4+: [paintOp, [pathData], minMax]; path data is DrawOPS-encoded.
        const a = args as [number, ArrayLike<number>[]];
        const data = a[1]?.[0];
        if (!data) continue;
        let cur: [number, number] | null = null;
        let start: [number, number] | null = null;
        for (let k = 0; k < data.length;) {
          const op = data[k++];
          if (op === 0) { cur = pt(data[k++], data[k++]); start = cur; }
          else if (op === 1) { const p = pt(data[k++], data[k++]); if (cur) addEdge(cur, p); cur = p; }
          else if (op === 2) { k += 6; cur = null; }
          else if (op === 3) { k += 4; cur = null; }
          else if (op === 4) { if (cur && start) addEdge(cur, start); cur = start; }
          else break;
        }
      }
    }
  } catch (err) {
    console.warn('[template analysis] could not read ruling lines, using text positions only', err);
  }

  // De-duplicate: rectangles contribute two nearly-identical edges.
  const dedupH: HRule[] = [];
  for (const r of hRules.sort((a, b) => b.y - a.y || a.x0 - b.x0)) {
    const d = dedupH.find(o => Math.abs(o.y - r.y) < 1.5 && r.x0 <= o.x1 + 2 && r.x1 >= o.x0 - 2);
    if (d) { d.x0 = Math.min(d.x0, r.x0); d.x1 = Math.max(d.x1, r.x1); } else dedupH.push({ ...r });
  }
  const dedupV: VRule[] = [];
  for (const r of vRules.sort((a, b) => a.x - b.x || b.y1 - a.y1)) {
    const d = dedupV.find(o => Math.abs(o.x - r.x) < 1.5 && r.y0 <= o.y1 + 2 && r.y1 >= o.y0 - 2);
    if (d) { d.y0 = Math.min(d.y0, r.y0); d.y1 = Math.max(d.y1, r.y1); } else dedupV.push({ ...r });
  }
  return { hRules: dedupH, vRules: dedupV };
}

// ── Detection ───────────────────────────────────────────────────────────────
function columnKeyOf(norm: string): TableColumnKey | null {
  const t = stripPunct(norm);
  for (const c of COLUMN_PATTERNS) if (c.re.test(t)) return c.key;
  return null;
}

function detectTable(lines: Line[], hRules: HRule[], vRules: VRule[], pageW: number, pageH: number):
  { table: TableField; headerLineIdx: number; usedRules: boolean } | null {
  let best: { idx: number; cols: { key: TableColumnKey; seg: Seg }[] } | null = null;
  for (let li = 0; li < lines.length; li++) {
    const seen = new Set<TableColumnKey>();
    const cols: { key: TableColumnKey; seg: Seg }[] = [];
    for (const seg of lines[li].segs) {
      const key = columnKeyOf(seg.norm);
      if (key && !seen.has(key)) { seen.add(key); cols.push({ key, seg }); }
    }
    if (!seen.has('subject_name') || cols.length < 3) continue;
    if (!best || cols.length > best.cols.length) best = { idx: li, cols };
  }
  if (!best) return null;
  const { idx, cols } = best;
  const header = lines[idx];
  const fs = Math.min(Math.max(header.fs, 7), 12);
  const allSegs = header.segs;

  // Cell boundaries for every header segment (recognised or not).
  const baseline = header.y;
  const spanning = vRules.filter(v => v.y0 <= baseline + header.fs && v.y1 >= baseline - 1).map(v => v.x).sort((a, b) => a - b);
  let usedRules = false;
  const cell = (seg: Seg): { left: number; right: number } => {
    const i = allSegs.indexOf(seg);
    const cx = (seg.x + seg.right) / 2;
    if (spanning.length >= 2) {
      const left = [...spanning].reverse().find(x => x <= cx);
      const right = spanning.find(x => x >= cx);
      if (left !== undefined && right !== undefined && right - left > 8 && right - left < pageW * 0.7) { usedRules = true; return { left, right }; }
    }
    const prev = allSegs[i - 1]; const next = allSegs[i + 1];
    return {
      left: prev ? (prev.right + seg.x) / 2 : seg.x - 3,
      right: next ? (seg.right + next.x) / 2 : seg.right + fs,
    };
  };

  const cells = cols.map(c => ({ ...c, ...cell(c.seg) })).sort((a, b) => a.left - b.left);
  const tableLeft = cells[0].left;
  const tableRight = cells[cells.length - 1].right;
  const tableW = tableRight - tableLeft;
  if (tableW < pageW * 0.25) return null;

  const columns: TableColumn[] = cells.map((c, i) => {
    const prevRight = i === 0 ? tableLeft : cells[i - 1].right;
    return {
      key: c.key,
      widthFrac: (c.right - c.left) / tableW,
      align: c.key === 'subject_name' || c.key === 'remark' ? 'left' : 'center',
      ...(c.left - prevRight > 1 ? { gapBeforeFrac: (c.left - prevRight) / tableW } : {}),
    } as TableColumn;
  });

  // Body rows: horizontal rules under the header that span (most of) the table.
  const under = hRules
    .filter(r => r.y < baseline - 1 && r.x0 <= tableLeft + tableW * 0.15 && r.x1 >= tableRight - tableW * 0.15)
    .map(r => r.y).sort((a, b) => b - a);
  let rowH = fs * 1.9;
  let firstRowTop = baseline - fs * 0.9;
  let maxRows: number | undefined;
  // The rule directly under the header text is the header's bottom edge = top of body row 1.
  const headerBottom = under.find(y => y < baseline);
  if (headerBottom !== undefined) {
    const rules = under.filter(y => y <= headerBottom);
    const diffs = rules.slice(1).map((y, i) => rules[i] - y);
    if (diffs.length >= 1) {
      const sorted = [...diffs].sort((a, b) => a - b);
      rowH = sorted[Math.floor(sorted.length / 2)];
      firstRowTop = headerBottom;
      let n = 0;
      for (const d of diffs) { if (Math.abs(d - rowH) <= rowH * 0.25) n++; else break; }
      if (n >= 3) maxRows = n;
    }
  }
  rowH = Math.min(Math.max(rowH, 8), 40);

  const table: TableField = {
    type: 'table', key: 'marks_table',
    x: tableLeft / pageW,
    y: (pageH - firstRowTop) / pageH,
    width: tableW / pageW,
    rowHeight: rowH / pageH,
    fontSize: Math.min(Math.max(fs - 0.5, 7), 10),
    headerFontSize: fs,
    columns,
    drawHeader: false,
    ...(maxRows ? { maxRows } : {}),
  };
  return { table, headerLineIdx: idx, usedRules };
}

function textBelow(lines: Line[], lineIdx: number, seg: Seg): string {
  const next = lines[lineIdx + 1];
  if (!next || lines[lineIdx].y - next.y > lines[lineIdx].fs * 2.2) return '';
  const below = next.segs.find(s => Math.abs(s.x - seg.x) < seg.fs * 2);
  return below ? below.norm : '';
}

function detectSimpleFields(lines: Line[], skipLineIdx: number, pageW: number, pageH: number): SimpleField[] {
  const found = new Map<SimpleFieldKey, SimpleField>();

  lines.forEach((line, lineIdx) => {
    if (lineIdx === skipLineIdx) return;
    line.segs.forEach((seg, segIdx) => {
      if (seg.text.length > 60 || isLeader(seg.text)) return;
      const hadColon = /:\s*$/.test(seg.text);
      // "Nom : Dupont" printed as one run: only the label part counts.
      const labelNorm = stripPunct(seg.norm.includes(':') ? seg.norm.split(':')[0] : seg.norm);
      if (!labelNorm) return;

      for (const p of FIELD_PATTERNS) {
        if (found.has(p.key)) continue;
        const candidate = (p.key === 'class_teacher_comment' || p.key === 'head_teacher_comment')
          ? `${labelNorm} ${textBelow(lines, lineIdx, seg)}`.trim() : labelNorm;
        if (!p.re.test(candidate) || (p.deny && p.deny.test(candidate))) continue;

        const fs = Math.min(Math.max(seg.fs, 7), 12);
        const isComment = p.key === 'class_teacher_comment' || p.key === 'head_teacher_comment';
        const nextSeg = line.segs[segIdx + 1];
        const leader = nextSeg && isLeader(nextSeg.text) && nextSeg.x - seg.right < seg.fs * 3 ? nextSeg : null;

        let x: number; let baseline: number;
        if (isComment && !(hadColon && seg.right < pageW * 0.5 && !textBelow(lines, lineIdx, seg))) {
          // Label sits above its box: write beneath it (after any second label line).
          const below = textBelow(lines, lineIdx, seg);
          const labelBottom = below ? lines[lineIdx + 1].y : line.y;
          x = seg.x; baseline = labelBottom - fs * 1.6;
        } else if (leader) {
          x = leader.x + 2; baseline = line.y;
        } else {
          x = seg.right + fs * 0.5; baseline = line.y;
        }
        if (x > pageW * 0.97 || baseline < 0) continue;

        found.set(p.key, {
          type: 'text', key: p.key, x: x / pageW, y: (pageH - baseline - fs) / pageH,
          fontSize: fs, align: 'left',
        });
        break;
      }
    });
  });
  return [...found.values()];
}

// ── Public API ──────────────────────────────────────────────────────────────
export async function analyzeTemplatePdf(bytes: ArrayBuffer, subjects: { id: string; name: string }[] = []): Promise<TemplateAnalysis> {
  const pdfjs = await loadPdfjs();
  const pdf = await pdfjs.getDocument({ data: bytes.slice(0) }).promise;
  const page = await pdf.getPage(1);
  const view = page.view; // [x0, y0, x1, y1]
  const pageW = view[2] - view[0];
  const pageH = view[3] - view[1];

  const textContent = await page.getTextContent();
  const items = textContent.items.filter((i): i is typeof i & { str: string; transform: number[]; width: number; height: number } => 'str' in i);
  const lines = buildLines(items, view[0], view[1]);

  const empty: TemplateAnalysis = {
    pageWidth: pageW, pageHeight: pageH, fields: [], hasTextLayer: lines.length > 0,
    detectedLabels: [], tableDetected: false, usedRules: false,
  };
  if (lines.length === 0 || page.rotate % 360 !== 0) return empty;

  const { hRules, vRules } = await extractRules(pdfjs, page, view[0], view[1]);
  // Structured bulletin (pre-printed subject rows, column roles, group totals)? Understand it fully.
  const structure = detectStructure({ lines, hRules, vRules, pageW, pageH, subjects });
  if (structure) {
    return {
      pageWidth: pageW, pageHeight: pageH, fields: structure.fields, hasTextLayer: true,
      detectedLabels: structure.labels, tableDetected: true, usedRules: true,
    };
  }

  const tableRes = detectTable(lines, hRules, vRules, pageW, pageH);
  const simple = detectSimpleFields(lines, tableRes ? tableRes.headerLineIdx : -1, pageW, pageH);

  const fields: TemplateField[] = [...simple];
  if (tableRes) fields.push(tableRes.table);
  return {
    pageWidth: pageW, pageHeight: pageH, fields, hasTextLayer: true,
    detectedLabels: simple.map(f => f.key), tableDetected: !!tableRes, usedRules: !!tableRes?.usedRules,
  };
}

const SAMPLE_SCHOOL: TemplateSchoolInfo = {
  name: 'Sample School', motto: 'Motto', address: 'Address', headTeacher: 'Head Teacher',
};

function sampleCard(subjects: number): TemplateReportCard {
  return {
    student_name: 'Sample Student', student_number: 'STU-0001', class_name: 'Form 1',
    term_name: 'first', academic_year: '2025/2026',
    percentage: 14.5, sequence1_average: 14, sequence2_average: 15,
    class_position: 3, out_of: 40, conduct: 'Good', days_present: 55, total_school_days: 60,
    class_teacher_comment: 'Good work.', head_teacher_comment: 'Keep it up.',
    entries: Array.from({ length: subjects }, (_, i) => ({
      subject_name: `Subject ${i + 1}`, ca_score: 14, exam_score: 15, coefficient: 2, total_score: 14.5, grade: 'B', remark: 'Good',
    })),
  };
}

// Structural checks plus a real dry-run: the template is filled with sample data and the output
// is re-opened, so a template that cannot actually render is never switched on.
export async function validateTemplate(
  bytes: ArrayBuffer, fields: TemplateField[], pageWidth: number, pageHeight: number,
): Promise<TemplateValidation> {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!(pageWidth > 0 && pageHeight > 0)) errors.push('Page size could not be determined.');
  const grid = fields.find((f): f is SubjectGridField => f.type === 'subject_grid');
  const table = fields.find((f): f is TableField => f.type === 'table');
  if (grid) {
    // Structured template: rows are bound to subjects by name; check the grid itself.
    if (!grid.columns.some(c => c.roles.includes('mark'))) errors.push('The subject table has no marks (NOTES) column.');
    if (!grid.rows.length) errors.push('No subject rows were found in the template.');
    const bound = grid.rows.filter(r => r.subjectId);
    if (!bound.length) warnings.push('No template row is mapped to an application subject yet — no marks would be printed.');
    const pending = bound.filter(r => r.confirmed === false).length;
    if (pending) warnings.push(`${pending} uncertain subject match(es) are not filled until confirmed.`);
    const ids = bound.map(r => r.subjectId);
    if (new Set(ids).size !== ids.length) errors.push('Two template rows are mapped to the same subject.');
    if (grid.rows.some(r => r.yTop < 0 || r.yTop > 1 || r.height <= 0)) errors.push('A subject row is positioned outside the page.');
  } else if (!table) errors.push('No marks table was found.');
  else {
    if (!table.columns.some(c => c.key === 'subject_name')) errors.push('The marks table has no subject column.');
    if (table.columns.length < 3) errors.push('The marks table has too few columns.');
    const used = table.columns.reduce((s, c) => s + c.widthFrac + (c.gapBeforeFrac ?? 0), 0);
    if (used > 1.02) errors.push('The marks table columns are wider than the table.');
    if (table.x < 0 || table.x + table.width > 1.01) errors.push('The marks table extends beyond the page.');
    if (table.y < 0 || table.y > 1) errors.push('The marks table is positioned outside the page.');
  }
  for (const f of fields) {
    if (f.type === 'text' && (f.x < 0 || f.x > 1 || f.y < 0 || f.y > 1)) errors.push(`Field "${f.key}" is positioned outside the page.`);
  }
  const keys = new Set(fields.filter(f => f.type === 'text').map(f => (f as SimpleField).key));
  if (!keys.has('student_name')) warnings.push('Student name field was not detected — place it in the designer.');
  if (!keys.has('class_name') && !grid) warnings.push('Class field was not detected.');

  if (errors.length === 0) {
    try {
      const rows = table?.maxRows ?? 12;
      const card = sampleCard(rows);
      if (grid) {
        // exercise the grid with entries for every bound subject
        card.entries = grid.rows.filter(r => r.subjectId).map((r, i) => ({
          subject_id: r.subjectId!, subject_name: r.subjectName ?? r.label, ca_score: 14, exam_score: 0, coefficient: r.printedCoef ?? 2, total_score: 10 + (i % 9), grade: 'B', remark: 'Good',
        }));
      }
      const out = await fillTemplatePdf(bytes.slice(0), fields, [card], SAMPLE_SCHOOL, 'en', { classCards: [card], passMark: 10 });
      const doc = await PDFDocument.load(out);
      if (doc.getPageCount() !== 1) errors.push('Test rendering produced an unexpected page count.');
    } catch (err) {
      errors.push(`Test rendering failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  return { ok: errors.length === 0, errors, warnings };
}

// ── Upload pipeline: analyse → validate → save (enable only when valid) ─────
export type AnalysisStep = 'reading' | 'layout' | 'mapping' | 'validating' | 'saving';
export const ANALYSIS_STEPS: AnalysisStep[] = ['reading', 'layout', 'mapping', 'validating', 'saving'];

export interface AnalysisOutcome {
  status: 'enabled' | 'needs_review' | 'no_text';
  detectedLabels: number;
  tableDetected: boolean;
  validation: TemplateValidation | null;
  // structured templates: how the printed subject rows were matched to application subjects
  grid?: { rows: number; mapped: number; toVerify: number; unmapped: number };
}

const MIN_STEP_MS = 700; // let the user follow the progress; large PDFs naturally take longer
const pause = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

async function timed<T>(work: () => Promise<T>): Promise<T> {
  const started = Date.now();
  const result = await work();
  const left = MIN_STEP_MS - (Date.now() - started);
  if (left > 0) await pause(left);
  return result;
}

export async function analyzeAndApplyTemplate(
  filePath: string,
  onStep: (step: AnalysisStep) => void,
): Promise<AnalysisOutcome> {
  onStep('reading');
  const bytes = await timed(() => fetch(mediaUrl(filePath)).then(r => {
    if (!r.ok) throw new Error(`Could not read the uploaded template (${r.status})`);
    return r.arrayBuffer();
  }));

  onStep('layout');
  const subjects = await api.getSubjects().catch(() => []);
  const analysis = await timed(() => analyzeTemplatePdf(bytes, subjects.map(s => ({ id: s.id, name: s.name }))));

  onStep('mapping');
  await timed(async () => undefined);

  if (!analysis.hasTextLayer || analysis.fields.length === 0) {
    // Scanned image or unreadable layout: leave the upload as-is (disabled, no fields) for the manual designer.
    return { status: 'no_text', detectedLabels: 0, tableDetected: false, validation: null };
  }

  onStep('validating');
  const validation = await timed(() => validateTemplate(bytes, analysis.fields, analysis.pageWidth, analysis.pageHeight));

  onStep('saving');
  const gridField = analysis.fields.find((f): f is SubjectGridField => f.type === 'subject_grid');
  const toVerify = gridField ? gridField.rows.filter(r => r.subjectId && r.confirmed === false).length : 0;
  // An uncertain subject match always needs a human decision, so such a template is never switched on automatically.
  const enable = validation.ok && toVerify === 0;
  await timed(() => api.updateReportCardTemplate({
    is_enabled: enable,
    page_width: analysis.pageWidth,
    page_height: analysis.pageHeight,
    fields: analysis.fields,
  }));

  return {
    status: enable ? 'enabled' : 'needs_review',
    detectedLabels: analysis.detectedLabels.length,
    tableDetected: analysis.tableDetected,
    validation,
    ...(gridField ? { grid: { rows: gridField.rows.length, mapped: gridField.rows.filter(r => r.subjectId).length, toVerify, unmapped: gridField.rows.filter(r => !r.subjectId).length } } : {}),
  };
}
