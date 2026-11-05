/*
 * Copyright (c) 2026 [COMPANY LEGAL NAME]. All rights reserved.
 * Proprietary and confidential. Unauthorized copying, distribution or
 * modification of this file, via any medium, is strictly prohibited.
 */
// Understands structured bulletins: a subject table whose rows, columns and group-total lines are
// already printed on the PDF. Works only from the PDF's own text positions and ruling lines (no fixed
// layout), so different templates are handled by reading their header words, cell borders and
// printed subject names. Anything uncertain is flagged for the administrator instead of guessed.
import type { Seg, Line, HRule, VRule } from './reportCardTemplateAnalysis';
import type { SimpleField, SimpleFieldKey, TemplateField } from './reportCardTemplate';
import {
  matchSubject, MATCH_AUTO,
  type GridColumn, type GridRole, type GridRow, type GridGroup, type GridSlot,
  type SubjectGridField, type TickField, type ImageField, type InfoField,
} from './templateGrid';

export interface StructureInput {
  lines: Line[];
  hRules: HRule[];
  vRules: VRule[];
  pageW: number; pageH: number;
  subjects: { id: string; name: string }[];
}

export interface StructureResult {
  fields: TemplateField[];
  gridDetected: boolean;
  labels: SimpleFieldKey[];
}

// ── text helpers ────────────────────────────────────────────────────────────
const clean = (norm: string) => norm.replace(/[()]/g, '').replace(/^[^a-z0-9]+/, '').replace(/\s+/g, ' ').trim();
const noPunctTail = (s: string) => s.replace(/[\s:.\-–—_…]+$/g, '').trim();
const isLeader = (s: string) => /^[\s._\-–—:…]{1,}$/.test(s);
const isColon = (s: string) => /^:\s*$/.test(s.trim());
const num = (s: string) => { const m = s.replace(',', '.').match(/^-?\d+(\.\d+)?$/); return m ? Number(m[0]) : null; };

// Candidate label strings for a segment: the text before any colon, and each "/"-separated part
// ("Année scolaire/ Academic year" -> both), because bulletins print bilingual labels.
function labelCandidates(seg: Seg): string[] {
  const head = seg.norm.includes(':') ? seg.norm.slice(0, seg.norm.indexOf(':')) : seg.norm;
  const base = clean(noPunctTail(head));
  const parts = base.split('/').map(p => clean(noPunctTail(p))).filter(Boolean);
  return [...new Set([base, ...parts])].filter(Boolean);
}

// ── column roles ────────────────────────────────────────────────────────────
type HeaderRole = GridRole | 'subject' | 'competences';
const ROLE_PATTERNS: [HeaderRole, RegExp][] = [
  ['subject', /^(subjects?|matieres?|disciplines?)$/],
  ['competences', /^competen/],
  ['nc', /^(n ?[*x×] ?c|note ?x ?coef\w*)$/],
  ['mark', /^(notes?|marks?|score|points?)$/],
  ['coef', /^(coef|coeff|coefficient)s?$/],
  ['rank', /^(rang|rank)$/],
  ['grade', /^(cotes?|grade|mention)$/],
  ['min', /^(min|minimum)$/],
  ['max', /^(max|maximum)$/],
  ['remark', /^(appreciations?|remarks?|observations?)$/],
  ['visa', /^(visa|signature)$/],
];

function roleOf(seg: Seg): HeaderRole | null {
  for (const cand of labelCandidates(seg)) {
    for (const [role, re] of ROLE_PATTERNS) if (re.test(cand)) return role;
  }
  return null;
}

// ── student / summary labels ────────────────────────────────────────────────
type LabelKey = SimpleFieldKey | 'repeater' | 'photo';
const LABELS: { key: LabelKey; re: RegExp; deny?: RegExp }[] = [
  { key: 'student_name', re: /^(name and surname|nom et prenoms?|noms? (et|&) prenoms?|nom complet|full name|student name|name)$/ },
  { key: 'student_number', re: /^(matricule|admission (no|number)|adm no|student (id|number))$/ },
  { key: 'nui', re: /^(identifiant unique|unique identifier|unique id|nui|matricule national)$/ },
  { key: 'sex', re: /^(sexe|sex|gender|genre)$/ },
  { key: 'date_of_birth', re: /^(nee? le|nee? e le|date of birth|born on|date de naissance|dob|date naissance)$/ },
  { key: 'class_name', re: /^(classe|class)$/ },
  { key: 'class_master', re: /^(class master|class teacher|professeur principal|prof principal|titulaire|main teacher)$/ },
  { key: 'enrollment', re: /^(effectifs?|enrollment|class size)$/ },
  { key: 'academic_year', re: /^(annee scolaire|annee academique|academic year|school year)$/ },
  { key: 'repeater', re: /^(redoublant|repeater)$/ },
  { key: 'total_marks', re: /^(total marks?|total points?|total des points)$/ },
  { key: 'total_coef', re: /^(total coef(f|ficients?)?|total des coefficients)$/ },
  { key: 'student_average', re: /^(student (e|a)verage|moyenne de l eleve|moyenne generale|student avg)$/ },
  { key: 'grade', re: /^(grade|mention)$/ },
  { key: 'rank', re: /^(rank|rang)$/ },
  { key: 'class_highest', re: /(highest average|plus forte moyenne|moyenne la plus forte)/ },
  { key: 'class_lowest', re: /(lowest average|plus faible moyenne|moyenne la plus faible)/ },
  { key: 'class_average', re: /^(class (e|a)verage|moyenne de la classe|moyenne classe)$/ },
  { key: 'class_presents', re: /^(presents?|present students)$/ },
  { key: 'class_passed', re: /^(number passed|nombre de recus|passed|nombre d admis)$/ },
  { key: 'success_rate', re: /^(success rate|taux de reussite|pass rate)$/ },
  { key: 'absences_justified', re: /^justified absences?$/ },
  { key: 'absences_unjustified', re: /^unjustified absences?$/ },
  { key: 'general_observation', re: /^(general observations?|observations? generales?)$/ },
  { key: 'photo', re: /^(photo|picture|passport)$/ },
];

// Sections the application has no data for: left blank and listed for the administrator.
const UNSUPPORTED: { re: RegExp; label: string }[] = [
  { re: /^discipline warning$/, label: 'Discipline warning' },
  { re: /^serious discipline/, label: 'Serious discipline warning' },
  { re: /^exclusion/, label: 'Exclusion (days)' },
  { re: /^performance warning$/, label: 'Council: performance warning' },
  { re: /^honou?r roll$/, label: 'Council: honour roll' },
];

const SEQUENCE_TITLE = /\b(first|second|third|fourth|fifth|sixth|premiere|deuxieme|troisieme|quatrieme|cinquieme|sixieme)\s+sequence\b/;

// ── geometry (all in PDF space, y up) ───────────────────────────────────────
const dedupe = (vals: number[], tol: number) => {
  const out: number[] = [];
  for (const v of [...vals].sort((a, b) => a - b)) if (!out.length || v - out[out.length - 1] > tol) out.push(v);
  return out;
};

export function detectStructure(input: StructureInput): StructureResult | null {
  const { lines, hRules, vRules, pageW, pageH, subjects } = input;
  const allSegs: Seg[] = lines.flatMap(l => l.segs);
  const fx = (x: number) => x / pageW;
  const fy = (y: number) => (pageH - y) / pageH; // PDF y (up) -> fraction from the top

  // 1. Header band: the line with the most recognisable column words, plus the lines just below it.
  let headerIdx = -1; let best = 0;
  lines.forEach((line, i) => {
    const roles = new Set(line.segs.map(roleOf).filter(Boolean));
    if (roles.has('subject') && (roles.has('mark') || roles.has('coef')) && roles.size > best) { best = roles.size; headerIdx = i; }
  });
  if (headerIdx < 0 || best < 3) return null;
  const headerLines = [lines[headerIdx]];
  for (let k = headerIdx + 1; k < lines.length && headerLines[headerLines.length - 1].y - lines[k].y <= 14; k++) {
    const roles = lines[k].segs.map(roleOf).filter(Boolean).length + lines[k].segs.filter(s => /^evaluated$|^evalue/.test(clean(s.norm))).length;
    if (roles === 0) break;
    headerLines.push(lines[k]);
  }
  const headerSegs = headerLines.flatMap(l => l.segs);
  const headerTop = Math.max(...headerSegs.map(s => s.y + s.fs));
  const headerBottom = Math.min(...headerSegs.map(s => s.y)) - 2;

  // 2. Column boundaries: long vertical borders that cross the header band.
  const crossing = vRules.filter(v => v.y0 <= headerBottom + 4 && v.y1 >= headerTop - 4 && v.y1 - v.y0 >= 100 && v.y1 - v.y0 < pageH * 0.9 && v.x > 3 && v.x < pageW - 3);
  const bounds = dedupe(crossing.map(v => v.x), 3);
  if (bounds.length < 4) return null; // no table borders: leave it to the sequential-table fallback
  const tableLeft = bounds[0], tableRight = bounds[bounds.length - 1];
  const cellOf = (cx: number) => { for (let i = 0; i < bounds.length - 1; i++) if (cx >= bounds[i] && cx < bounds[i + 1]) return i; return -1; };

  const cols: GridColumn[] = [];
  let subjectCell = -1, coefCell = -1;
  for (let i = 0; i < bounds.length - 1; i++) {
    const inCell = headerSegs.filter(s => cellOf((s.x + s.right) / 2) === i).sort((a, b) => b.y - a.y);
    const roles: HeaderRole[] = [];
    for (const s of inCell) { const r = roleOf(s); if (r && !roles.includes(r)) roles.push(r); }
    if (roles.includes('subject')) { subjectCell = i; continue; }
    if (roles.includes('competences')) continue;
    const gridRoles = roles.filter((r): r is GridRole => r !== 'subject' && r !== 'competences');
    if (!gridRoles.length) continue;
    if (gridRoles.includes('coef')) coefCell = i;
    const left = bounds[i], right = bounds[i + 1];
    cols.push({ roles: gridRoles, x: fx(left), width: fx(right - left), align: gridRoles.includes('remark') ? 'left' : 'center' });
  }
  if (subjectCell < 0 || !cols.some(c => c.roles.includes('mark'))) return null;
  const subjectL = bounds[subjectCell], subjectR = bounds[subjectCell + 1];

  // 3. Table bottom: the lowest end of the inner column borders.
  const inner = crossing.filter(v => v.x > tableLeft + 3 && v.x < tableRight - 3);
  // borders drawn per group are separate segments; look at every inner border line's lowest point
  const innerAll = vRules.filter(v => v.x > tableLeft + 3 && v.x < tableRight - 3 && v.y1 > headerTop && bounds.some(b => Math.abs(b - v.x) < 3));
  let tableBottom = Math.min(...(innerAll.length ? innerAll : inner).map(v => v.y0));

  // Full-width horizontal rules = row borders.
  const rowRules = dedupe(
    hRules.filter(r => r.x0 <= tableLeft + 8 && r.x1 >= tableRight - 8 && r.y < headerBottom && r.y >= tableBottom - 4).map(r => r.y), 1,
  ).sort((a, b) => b - a);
  const ruleAbove = (y: number) => rowRules.filter(r => r > y).pop();   // smallest rule above
  const ruleBelow = (y: number) => rowRules.find(r => r < y);            // largest rule below

  // 4. Group-total lines: a line holding "Total" and "Average".
  const inTable = (s: Seg) => s.y < headerBottom + 1 && s.y > tableBottom - 4 && s.x >= tableLeft - 2 && s.right <= tableRight + 2;
  let tableSegs = allSegs.filter(inTable);
  const totalSegs = tableSegs.filter(s => /^total\b/.test(clean(s.norm)) && !/marks|coef/.test(s.norm));
  const totalLines = totalSegs
    .filter(t => tableSegs.some(s => /^(average|moyenne)/.test(clean(s.norm)) && Math.abs(s.y - t.y) <= 7))
    .sort((a, b) => b.y - a.y);
  if (totalLines.length) {
    // The table ends with its last total line: everything below it is a different section of the page.
    const last = totalLines[totalLines.length - 1];
    tableBottom = (ruleBelow(last.y) ?? last.y - 6) - 1;
    tableSegs = allSegs.filter(inTable);
  }

  // 5. Subject rows: printed names inside the subject column, above/below the total lines.
  const groupTitles = totalLines.map(t => {
    const near = tableSegs.filter(s => s.x >= subjectL - 2 && s.x < subjectR && Math.abs(s.y - t.y) <= 7).sort((a, b) => a.x - b.x);
    return near[0] ?? t;
  });
  const titleSet = new Set<Seg>(groupTitles);
  const candidates = tableSegs
    .filter(s => (s.x + s.right) / 2 >= subjectL && (s.x + s.right) / 2 <= subjectR)
    .filter(s => !titleSet.has(s) && (s.text.match(/[A-Za-zÀ-ÿ]/g) ?? []).length >= 3)
    .filter(s => !/^(total|average|moyenne|rank|rang|subjects?)\b/.test(clean(s.norm)))
    .sort((a, b) => b.y - a.y);
  if (candidates.length < 3) return null;

  const rowsRaw = candidates.map(seg => {
    const top = ruleAbove(seg.y), bottom = ruleBelow(seg.y);
    return { seg, top: top ?? seg.y + 9, bottom: bottom ?? seg.y - 6 };
  });

  // groups: total lines in top-down order; a row belongs to the first total line below it
  const totalYs = totalLines.map(t => t.y);
  const groupOfRow = (y: number) => { const i = totalYs.findIndex(ty => ty < y + 0.1); return i; };

  const rows: GridRow[] = rowsRaw.map(({ seg, top, bottom }) => {
    const m = matchSubject(seg.text, subjects);
    const coefLeft = coefCell >= 0 ? bounds[coefCell] : 0, coefRight = coefCell >= 0 ? bounds[coefCell + 1] : 0;
    const printed = coefCell >= 0
      ? tableSegs.find(s => s.x >= coefLeft - 1 && s.right <= coefRight + 1 && s.y <= top + 1 && s.y >= bottom - 1 && num(s.text) !== null)
      : undefined;
    let g = groupOfRow(seg.y);
    if (g < 0) g = totalYs.length; // below the last total line: an implicit trailing group
    return {
      label: seg.text, subjectId: m.subjectId, subjectName: m.subjectName, confidence: m.confidence, group: g,
      confirmed: m.subjectId != null && m.confidence >= MATCH_AUTO,
      yTop: fy(top), height: (top - bottom) / pageH, printedCoef: printed ? num(printed.text) : null,
    };
  });

  // printed coefficients: the column is "printed" if most rows already carry one
  const printedShare = rows.filter(r => r.printedCoef != null).length / rows.length;
  const coefCol = cols.find(c => c.roles.includes('coef'));
  if (coefCol && printedShare >= 0.5) coefCol.printed = true;

  // 6. Group total slots (average / rank values to fill)
  const groups: GridGroup[] = totalLines.map((t, gi) => {
    const band = tableSegs.filter(s => Math.abs(s.y - t.y) <= 7).sort((a, b) => a.x - b.x);
    const top = ruleAbove(t.y) ?? t.y + 9, bottom = ruleBelow(t.y) ?? t.y - 6;
    const slots: GridSlot[] = [];
    const avgSeg = band.find(s => /^(average|moyenne)/.test(clean(s.norm)));
    if (avgSeg) {
      let right = avgSeg.right; let idx = band.indexOf(avgSeg) + 1;
      while (idx < band.length && (isColon(band[idx].text) || /^[:\s]*(n ?[*x] ?c|[σΣ]|\/|c)[\s/σΣ*xcn]*$/i.test(band[idx].text))) { right = band[idx].right; idx++; }
      const nextX = band[idx]?.x ?? tableRight;
      slots.push({ kind: 'avg', x: fx(right + 3), width: fx(Math.max(12, Math.min(nextX - right - 6, 46))) });
    }
    const rankSeg = band.find(s => /^(rank|rang)\b/.test(clean(s.norm)));
    if (rankSeg) {
      const colon = band.find(s => isColon(s.text) && s.x >= rankSeg.right - 2 && s.x - rankSeg.right < 12);
      const startX = (colon?.right ?? rankSeg.right) + 3;
      const under = hRules.find(r => r.x1 - r.x0 >= 15 && r.x1 - r.x0 <= 120 && r.y < t.y + 4 && r.y > t.y - 8 && r.x0 >= rankSeg.x - 3);
      const x0 = under ? Math.max(startX, under.x0 + 2) : startX;
      const x1 = under ? under.x1 - 2 : tableRight - 4;
      slots.push({ kind: 'rank', x: fx(x0), width: fx(Math.max(12, x1 - x0)) });
    }
    // Σ cells of the Total row: under NOTES / N*C (and COEF when the coefficients are not printed), only where the cell is empty
    const empty = (c: GridColumn) => !band.some(s => s.right > c.x * pageW + 1 && s.x < (c.x + c.width) * pageW - 1);
    for (const c of cols) {
      if (c.roles.length !== 1) continue;
      const kind = c.roles[0] === 'mark' ? 'notes' : c.roles[0] === 'nc' ? 'nc' : c.roles[0] === 'coef' && !c.printed ? 'coef' : null;
      if (kind && empty(c)) slots.push({ kind, x: c.x, width: c.width });
    }
    const totalNumSeg = band.find(s => num(s.text) !== null && s.x > t.right && s.x < (avgSeg?.x ?? t.right + 120));
    return { name: groupTitles[gi].text, yTop: fy(top), height: (top - bottom) / pageH, slots, printedTotalCoef: totalNumSeg ? num(totalNumSeg.text) : null };
  });
  if (rows.some(r => r.group >= groups.length)) groups.push({ name: '', yTop: 0, height: 0, slots: [], printedTotalCoef: null });

  const fsRows = Math.min(9, Math.max(6.5, median(rowsRaw.map(r => (r.top - r.bottom) * 0.5))));
  const grid: SubjectGridField = { type: 'subject_grid', key: 'subject_grid', columns: cols, rows, groups, fontSize: Math.round(fsRows * 10) / 10 };

  // 7. Everything outside the table: labelled student / summary fields, photo box, tick boxes, notes.
  const fields: TemplateField[] = [grid];
  const labelsFound: SimpleFieldKey[] = [];
  const found = new Set<string>();
  const unsupported = new Set<string>();
  const printedInfo: InfoField[] = [];
  const outside = allSegs.filter(s => !(s.y < headerTop + 2 && s.y > tableBottom - 2 && s.x >= tableLeft - 2 && s.right <= tableRight + 2));
  const sorted = [...outside].sort((a, b) => b.y - a.y || a.x - b.x);

  const labelLike = (s: Seg) => labelCandidates(s).some(c => LABELS.some(l => l.re.test(c)) || UNSUPPORTED.some(u => u.re.test(c))) || /:\s*$/.test(s.text);
  const rightVBoundary = (x: number, y: number) => vRules.filter(v => v.x > x + 2 && v.y0 <= y + 4 && v.y1 >= y - 4).map(v => v.x).sort((a, b) => a - b)[0] ?? pageW - 12;

  // Vertical borders crossing a text line, merged when drawn as double lines: [{ min, max }] left to right.
  const borderClusters = (y: number) => {
    const xs = vRules.filter(v => v.y0 <= y + 4 && v.y1 >= y - 4).map(v => v.x).sort((a, b) => a - b);
    const out: { min: number; max: number }[] = [];
    for (const x of xs) { const last = out[out.length - 1]; if (last && x - last.max <= 6) last.max = x; else out.push({ min: x, max: x }); }
    return out;
  };
  // The cell to the right of a label cell: [closing border of the label cell, next border], if the label
  // cell border sits right after the label (tables printed as  | LABEL | value |).
  const valueCell = (seg: Seg): { x0: number; x1: number } | null => {
    const cl = borderClusters(seg.y);
    const closing = cl.findIndex(c => c.min >= seg.right - 2 && c.min - seg.right <= 100);
    if (closing < 0 || closing + 1 >= cl.length) return null;
    const x0 = cl[closing].max + 1, x1 = cl[closing + 1].min - 1;
    return x1 - x0 >= 12 && x1 - x0 <= 160 ? { x0, x1 } : null;
  };

  for (const seg of sorted) {
    const cands = labelCandidates(seg);
    if (!cands.length) continue;

    const un = UNSUPPORTED.find(u => cands.some(c => u.re.test(c)));
    if (un) { unsupported.add(un.label); continue; }
    const seqTitle = SEQUENCE_TITLE.exec(seg.norm);
    if (seqTitle) { printedInfo.push({ type: 'info', kind: 'warning', label: 'Sequence title is printed on the template', detail: `"${seg.text}" is part of the PDF, so it appears on every card (use a template per sequence, or edit the PDF).` }); }

    const def = LABELS.find(l => cands.some(c => l.re.test(c)) && !(l.deny && l.deny.test(seg.norm)));
    if (!def || found.has(def.key)) continue;

    // an unlabelled caption inside the table area (e.g. a header word repeated) is not a field
    const colonIdx = seg.text.indexOf(':');
    const afterColon = colonIdx >= 0 ? seg.text.slice(colonIdx + 1).trim() : '';
    const rightSegs = outside.filter(s => s !== seg && Math.abs(s.y - seg.y) <= 3 && s.x >= seg.right - 1).sort((a, b) => a.x - b.x);
    const next = rightSegs[0];

    if (def.key === 'photo') {
      const cx = (seg.x + seg.right) / 2;
      const left = vRules.filter(v => v.x < cx && v.y0 <= seg.y && v.y1 >= seg.y).map(v => v.x).sort((a, b) => b - a)[0];
      const right = vRules.filter(v => v.x > cx && v.y0 <= seg.y && v.y1 >= seg.y).map(v => v.x).sort((a, b) => a - b)[0];
      const top = hRules.filter(r => r.y > seg.y && r.x0 <= cx && r.x1 >= cx).map(r => r.y).sort((a, b) => a - b)[0];
      const bottom = hRules.filter(r => r.y < seg.y && r.x0 <= cx && r.x1 >= cx).map(r => r.y).sort((a, b) => b - a)[0];
      if ([left, right, top, bottom].some(v => v === undefined)) continue;
      const pad = 2;
      fields.push({ type: 'image', key: 'photo', x: fx(left! + pad), y: fy(top! - pad), width: fx(right! - left! - pad * 2), height: (top! - bottom! - pad * 2) / pageH } as ImageField);
      found.add('photo');
      continue;
    }

    if (def.key === 'repeater') {
      const yes = rightSegs.find(s => /^(yes|oui)$/.test(clean(s.norm)));
      const no = rightSegs.find(s => /^(no|non)$/.test(clean(s.norm)));
      if (!yes || !no) continue;
      // a small square drawn next to the word is the box to tick; otherwise tick right after the word
      const boxFor = (w: Seg) => {
        const sq = hRules.filter(r => r.x1 - r.x0 >= 4 && r.x1 - r.x0 <= 14 && Math.abs(r.y - w.y) <= 12 && (Math.abs(r.x1 - w.x) <= 10 || Math.abs(r.x0 - w.right) <= 10))
          .sort((a, b) => Math.abs(a.x0 - w.x) - Math.abs(b.x0 - w.x))[0];
        return sq ? { x: (sq.x0 + sq.x1) / 2, y: w.y + w.fs * 0.35 } : { x: w.right + 7, y: w.y + w.fs * 0.35 };
      };
      const yb = boxFor(yes), nb = boxFor(no);
      fields.push({ type: 'tick', key: 'repeater', yes: { x: fx(yb.x), y: fy(yb.y) }, no: { x: fx(nb.x), y: fy(nb.y) } } as TickField);
      found.add('repeater');
      continue;
    }

    // A value already printed on the template (e.g. "Class: FORM 3") is left exactly as printed.
    const printedHere = afterColon.length > 0
      || (next && !isLeader(next.text) && !isColon(next.text) && !labelLike(next) && next.x - seg.right < 16 && !colonOnlyTrail(seg));
    if (printedHere && def.key !== 'general_observation') {
      printedInfo.push({ type: 'info', kind: 'printed', label: seg.text.replace(/\s*:\s*$/, ''), detail: afterColon || next?.text || '' });
      found.add(def.key);
      continue;
    }

    const key = def.key as SimpleFieldKey;
    const size = Math.min(Math.max(seg.fs, 7), 10);
    const colonSeg = rightSegs.find(s => isColon(s.text) && s.x - seg.right < 14);
    const startX = (colonSeg?.right ?? seg.right) + 4;

    if (key === 'general_observation' || key === 'class_teacher_comment' || key === 'head_teacher_comment') {
      const left = vRules.filter(v => v.x <= seg.x + 2 && v.y0 <= seg.y && v.y1 >= seg.y).map(v => v.x).sort((a, b) => b - a)[0] ?? seg.x - 4;
      const right = vRules.filter(v => v.x >= seg.right - 2 && v.y0 <= seg.y && v.y1 >= seg.y).map(v => v.x).sort((a, b) => a - b)[0] ?? seg.right + 120;
      fields.push({ type: 'text', key, x: fx(left + 4), y: fy(seg.y - 5), fontSize: 8, align: 'left', boxWidth: fx(right - left - 8), maxLines: 4 } as SimpleField);
      labelsFound.push(key); found.add(key);
      continue;
    }

    // Value box: a short underline right of the label, otherwise up to the next label / vertical border.
    const under = hRules
      .filter(r => r.x1 - r.x0 >= 15 && r.x1 - r.x0 <= 220 && r.y <= seg.y + 2 && r.y >= seg.y - 6 && r.x0 >= seg.right - 3 && r.x0 <= seg.right + 40 && (!next || r.x0 < next.x))
      .sort((a, b) => a.x0 - b.x0)[0];
    const cell = !under ? valueCell(seg) : null;
    const x0 = cell ? cell.x0 + 1 : under ? Math.max(startX, under.x0 + 2) : startX;
    const limit = cell ? cell.x1 - 1 : under ? under.x1 - 2 : Math.min(next && labelLike(next) ? next.x - 3 : pageW, rightVBoundary(seg.right, seg.y) - 3);
    const width = limit - x0;
    if (width < 14) continue;
    fields.push({ type: 'text', key, x: fx(x0), y: fy(seg.y + size), fontSize: size, align: 'left', boxWidth: fx(width) } as SimpleField);
    labelsFound.push(key); found.add(key);
  }

  // Discipline "TOTAL" under "Unjustified absences" = total absences
  const unj = outside.find(s => /^unjustified absences?$/.test(labelCandidates(s)[0] ?? ''));
  if (unj) {
    const tot = outside.find(s => /^total$/.test(clean(noPunctTail(s.norm))) && Math.abs(s.x - unj.x) <= 6 && s.y < unj.y && unj.y - s.y <= 24);
    if (tot) {
      const x0 = tot.right + 4; const limit = rightVBoundary(tot.right, tot.y) - 3;
      if (limit - x0 >= 12) { fields.push({ type: 'text', key: 'absences_total', x: fx(x0), y: fy(tot.y + 8), fontSize: 8, align: 'left', boxWidth: fx(limit - x0) } as SimpleField); labelsFound.push('absences_total'); found.add('absences_total'); }
    }
  }

  // Info rows for the review screen (not drawn)
  const notes: InfoField[] = [
    ...printedInfo,
    ...[...unsupported].map<InfoField>(label => ({ type: 'info', kind: 'unsupported', label, detail: 'No data for this in the application — left blank.' })),
  ];
  const seen = new Set<string>();
  for (const n of notes) { const k = `${n.kind}|${n.label}`; if (!seen.has(k)) { seen.add(k); fields.push(n); } }

  return { fields, gridDetected: true, labels: labelsFound };
}

function colonOnlyTrail(seg: Seg): boolean { return /:\s*$/.test(seg.text); }
function median(a: number[]): number { if (!a.length) return 8; const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; }

export { MATCH_AUTO };
