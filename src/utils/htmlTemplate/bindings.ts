/*
 * Copyright (c) 2026 [COMPANY LEGAL NAME]. All rights reserved.
 * Proprietary and confidential. Unauthorized copying, distribution or
 * modification of this file, via any medium, is strictly prohibited.
 */
// Connects the dynamic fields the analyser detected (SimpleField / subject_grid / tick / image / table)
// to HTML placeholders and to EduTech data. Values always come from the EXISTING report-card engine
// (resolveSimpleValue, rowValues, groupAverage, groupRank, groupTotals, cardSummary): nothing is
// recalculated here, so the HTML output can never disagree with the PDF output.
import {
  resolveSimpleValue, SIMPLE_FIELD_DEFS,
  type SimpleFieldKey, type SimpleField, type TableField, type TableColumnKey, type TemplateField,
  type TemplateReportCard, type TemplateSchoolInfo, type SubjectGridField, type TickField, type ImageField, type FillContext,
} from '../reportCardTemplate';
import { isLowMark, LOW_MARK_CLASS } from '../lowMark';
import { rowValues, groupAverage, groupRank, groupTotals, type GridColumn } from '../templateGrid';
import type { DynamicElement } from './types';

// field key → placeholder path (the semantic name the administrator sees in the validation screen)
export const SIMPLE_BINDINGS: Record<SimpleFieldKey, string> = {
  school_name: 'school.name', school_motto: 'school.motto', school_address: 'school.address', head_teacher: 'school.headTeacher',
  student_name: 'student.fullName', student_number: 'student.number', class_name: 'student.className',
  academic_year: 'academic.year', term_label: 'academic.term',
  percentage: 'results.overallAverage', sequence1_average: 'results.sequence1Average', sequence2_average: 'results.sequence2Average',
  class_position: 'results.classPosition', conduct: 'discipline.conduct', attendance: 'attendance.rate',
  class_teacher_comment: 'comments.classTeacher', head_teacher_comment: 'comments.headTeacher', generated_date: 'document.generatedDate',
  sex: 'student.gender', date_of_birth: 'student.dateOfBirth', nui: 'student.nui', class_master: 'class.master', enrollment: 'class.enrollment',
  total_marks: 'results.totalMarks', total_coef: 'results.totalCoefficients', student_average: 'results.average', grade: 'results.grade', rank: 'results.rank',
  class_highest: 'classProfile.highest', class_lowest: 'classProfile.lowest', class_average: 'classProfile.average',
  class_presents: 'classProfile.presents', class_passed: 'classProfile.passed', success_rate: 'classProfile.successRate',
  absences_total: 'discipline.absencesTotal', absences_justified: 'discipline.absencesJustified', absences_unjustified: 'discipline.absencesUnjustified',
  general_observation: 'comments.general',
};

export const PHOTO_BINDING = 'student.photo';
export const REPEATER_YES = 'student.repeater.yes';
export const REPEATER_NO = 'student.repeater.no';

const TABLE_COLUMN_BINDING: Record<TableColumnKey, string> = {
  subject_name: 'subject.name', ca_score: 'subject.sequence1', exam_score: 'subject.sequence2',
  coefficient: 'subject.coefficient', total_score: 'subject.total', grade: 'subject.grade', remark: 'subject.appreciation',
};

export const gridCellBinding = (rowIdx: number, role: string) => `grid.r${rowIdx}.${role}`;
export const groupBinding = (groupIdx: number, kind: string) => `grid.groups.g${groupIdx}.${kind}`;

const labelOf = (key: SimpleFieldKey) => SIMPLE_FIELD_DEFS.find(d => d.key === key)?.labelEn ?? key;

// ── Placeholder elements (geometry in pt, top-left origin) ─────────────────────────────────────
export function buildDynamicElements(fields: TemplateField[], W: number, H: number, page = 1): DynamicElement[] {
  const out: DynamicElement[] = [];
  let n = 0;
  const base = (kind: DynamicElement['kind'], fieldKey: string, label: string, binding: string, x: number, y: number, w: number, h: number) => ({
    id: `dyn_${String(++n).padStart(3, '0')}`, type: 'dynamic' as const, dynamic: true as const, page, z: 1000 + n,
    kind, fieldKey, label, dataBinding: binding, x, y, width: w, height: h,
  });

  for (const f of fields) {
    if (f.type === 'text') {
      const s = f as SimpleField;
      const w = s.boxWidth ? s.boxWidth * W : Math.max(60, (1 - s.x) * W * 0.9);
      const lines = Math.max(1, s.maxLines ?? 1);
      const h = s.fontSize * 1.25 * lines;
      let x = s.x * W;
      if (!s.boxWidth) { if (s.align === 'center') x -= w / 2; else if (s.align === 'right') x -= w; }
      out.push({ ...base('text', s.key, labelOf(s.key), SIMPLE_BINDINGS[s.key], x, s.y * H, w, h),
        align: s.align, fontSize: s.fontSize, bold: s.bold, maxLines: lines, confidence: s.review ? 'review' : 'high', note: s.review });
    } else if (f.type === 'subject_grid') {
      const g = f as SubjectGridField;
      g.rows.forEach((row, ri) => {
        (g.columns as GridColumn[]).forEach(col => {
          if (col.printed && col.roles.every(r => r === 'coef')) return;
          const lines = col.roles.length;
          col.roles.forEach((role, li) => {
            if (role === 'visa') return;
            const lineH = (row.height * H) / lines;
            const size = Math.min(g.fontSize, lineH * 0.78, lines > 1 ? 6.5 : 99);
            out.push({ ...base('grid_cell', `subject_grid.${role}`, `${row.label} — ${role}`, gridCellBinding(ri, role),
              col.x * W, row.yTop * H + lineH * li, col.width * W, lineH),
              align: role === 'remark' ? 'center' : (col.align ?? 'left'), fontSize: size, bold: role === 'grade',
              confidence: row.subjectId && row.confirmed !== false ? 'high' : 'review',
              note: !row.subjectId ? 'Row not mapped to an application subject' : row.confirmed === false ? 'Subject match needs confirmation' : undefined });
          });
        });
      });
      g.groups.forEach((grp, gi) => {
        for (const slot of grp.slots) {
          const size = Math.min(g.fontSize + 1, grp.height * H * 0.7);
          out.push({ ...base('group_total', `subject_grid.group.${slot.kind}`, `${grp.name || 'Group ' + (gi + 1)} — ${slot.kind}`, groupBinding(gi, slot.kind),
            slot.x * W, grp.yTop * H, slot.width * W, grp.height * H),
            align: ['notes', 'nc', 'coef'].includes(slot.kind) ? 'center' : 'left', fontSize: size, bold: true, confidence: 'high' });
        }
      });
    } else if (f.type === 'tick') {
      const t = f as TickField;
      const size = 9;
      out.push({ ...base('tick', 'repeater.yes', 'Repeater — YES box', REPEATER_YES, t.yes.x * W - size / 2, t.yes.y * H - size * 0.65, size, size * 1.3), align: 'center', fontSize: size, bold: true });
      out.push({ ...base('tick', 'repeater.no', 'Repeater — NO box', REPEATER_NO, t.no.x * W - size / 2, t.no.y * H - size * 0.65, size, size * 1.3), align: 'center', fontSize: size, bold: true });
    } else if (f.type === 'image') {
      const im = f as ImageField;
      out.push({ ...base('photo', 'student_photo', 'Student photograph', PHOTO_BINDING, im.x * W, im.y * H, im.width * W, im.height * H) });
    } else if (f.type === 'table') {
      const t = f as TableField;
      const rowH = t.rowHeight * H;
      const rows = t.maxRows ?? 12;
      out.push({ ...base('table', 'marks_table', 'Marks table (one row per subject)', 'subjects', t.x * W, t.y * H, t.width * W, rowH * rows), fontSize: t.fontSize, confidence: 'high' });
    }
  }
  return out;
}

// HTML for the legacy sequential marks table: a real repeating block.
export function legacyTableHtml(t: TableField, W: number, H: number): string {
  const rowH = t.rowHeight * H;
  const cols: string[] = [];
  let x = 0;
  for (const c of t.columns) {
    x += (c.gapBeforeFrac ?? 0) * t.width * W;
    const w = c.widthFrac * t.width * W;
    const align = c.align === 'center' ? 'center' : 'left';
    const lowKey = c.key === 'ca_score' || c.key === 'exam_score' || c.key === 'total_score' ? ` {{${TABLE_COLUMN_BINDING[c.key]}Class}}` : '';
    cols.push(`<div class="cell${lowKey}" style="left:${r2(x)}pt;width:${r2(w)}pt;text-align:${align}">{{${TABLE_COLUMN_BINDING[c.key]}}}</div>`);
    x += w;
  }
  return `{{#each subjects as subject}}<div class="row" style="top:calc(${r2(rowH)}pt * {{index}});height:${r2(rowH)}pt;font-size:${t.fontSize}pt">${cols.join('')}</div>{{/each}}`;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

// ── Data object the placeholders read from ─────────────────────────────────────────────────────
function setPath(obj: Record<string, unknown>, path: string, value: unknown) {
  const parts = path.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    cur = (cur[parts[i]] ??= {}) as Record<string, unknown>;
  }
  cur[parts[parts.length - 1]] = value;
}

function photoHtml(card: TemplateReportCard): string {
  if (!card.photo) return '';
  let bin = '';
  const b = card.photo.bytes;
  for (let i = 0; i < b.length; i += 0x8000) bin += String.fromCharCode(...b.subarray(i, i + 0x8000));
  const mime = /^image\/(png|jpe?g|webp|gif)$/.test(card.photo.mime) ? card.photo.mime : 'image/jpeg';
  return `<img alt="" src="data:${mime};base64,${btoa(bin)}" style="width:100%;height:100%;object-fit:contain;display:block">`;
}

export interface BuildDataInput {
  card: TemplateReportCard; school: TemplateSchoolInfo; lang: 'en' | 'fr'; ctx: FillContext; fields: TemplateField[];
}

export function buildTemplateData({ card, school, lang, ctx, fields }: BuildDataInput): Record<string, unknown> {
  const fillCtx: FillContext = { ...ctx, grid: fields.find((f): f is SubjectGridField => f.type === 'subject_grid') };
  const data: Record<string, unknown> = {};
  for (const key of Object.keys(SIMPLE_BINDINGS) as SimpleFieldKey[]) {
    setPath(data, SIMPLE_BINDINGS[key], resolveSimpleValue(key, card, school, lang, fillCtx));
  }
  setPath(data, PHOTO_BINDING, photoHtml(card));
  setPath(data, REPEATER_YES, card.repeater === true ? 'X' : '');
  setPath(data, REPEATER_NO, card.repeater === false ? 'X' : '');

  const grid = fields.find((f): f is SubjectGridField => f.type === 'subject_grid');
  if (grid) {
    const g: Record<string, unknown> = { groups: {} };
    grid.rows.forEach((row, ri) => {
      const v = rowValues(card, row, fillCtx);
      g[`r${ri}`] = v
        ? { mark: String(v.mark), markClass: isLowMark(v.mark, ctx.passMark) ? LOW_MARK_CLASS : '', coef: String(v.coef), nc: String(v.nc), rank: String(v.rank), grade: v.grade, min: String(v.min), max: v.max === v.min ? '' : String(v.max), remark: v.remark, visa: '' }
        : { mark: '', markClass: '', coef: '', nc: '', rank: '', grade: '', min: '', max: '', remark: '', visa: '' };
    });
    grid.groups.forEach((_grp, gi) => {
      const avg = groupAverage(card, grid, gi);
      const rank = groupRank(card, grid, gi, fillCtx);
      const tot = groupTotals(card, grid, gi);
      (g.groups as Record<string, unknown>)[`g${gi}`] = {
        avg: avg != null ? String(avg) : '', rank: rank != null ? String(rank) : '',
        notes: tot ? String(tot.notes) : '', nc: tot ? String(tot.nc) : '', coef: tot ? String(tot.coef) : '',
      };
    });
    data.grid = g;
  }

  // legacy sequential table
  const seqOnly = !!card.sequence;
  data.subjects = card.entries.map(e => ({
    name: e.subject_name || '', sequence1: String(e.ca_score ?? 0), sequence2: seqOnly || e.exam_score == null ? '' : String(e.exam_score),
    coefficient: String(e.coefficient ?? 1), total: String(e.total_score ?? 0), grade: e.grade || '', appreciation: e.remark || '',
    sequence1Class: isLowMark(e.ca_score ?? 0, ctx.passMark) ? LOW_MARK_CLASS : '',
    sequence2Class: !seqOnly && e.exam_score != null && isLowMark(e.exam_score, ctx.passMark) ? LOW_MARK_CLASS : '',
    totalClass: isLowMark(e.total_score ?? 0, ctx.passMark) ? LOW_MARK_CLASS : '',
  }));
  return data;
}
