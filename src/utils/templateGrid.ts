/*
 * Copyright (c) 2026 [COMPANY LEGAL NAME]. All rights reserved.
 * Proprietary and confidential. Unauthorized copying, distribution or
 * modification of this file, via any medium, is strictly prohibited.
 */
// Structured report-card templates: a PDF whose subject rows, columns and group totals are
// already printed (NOTES / COEF / N*C / RANG / COTES / MIN-MAX / APPRECIATION / VISA ...).
// The analyser (reportCardTemplateAnalysis.ts) produces these field types; the filler
// (reportCardTemplate.ts) draws values into them. Everything here is overlay-only: the uploaded PDF
// stays the base document and nothing printed on it is moved or redrawn.
//
// All coordinates are fractions of the page (x of width, y of height, y measured from the TOP).
import type { TemplateReportCard, TemplateEntry } from './reportCardTemplate';
import { gradeFor } from './sequenceReportCards';

export type GridRole = 'mark' | 'coef' | 'nc' | 'rank' | 'grade' | 'min' | 'max' | 'remark' | 'visa';

export interface GridColumn {
  roles: GridRole[];       // one role per stacked line of the cell (MIN over MAX => ['min','max'])
  x: number; width: number;
  align: 'left' | 'center';
  printed?: boolean;       // the template already prints this column's values (e.g. COEF) — don't overprint
}

export interface GridRow {
  label: string;                 // the subject name as printed on the template
  subjectId: string | null;      // the application subject this row is bound to (null = unmapped, left blank)
  subjectName: string | null;
  confidence: number;            // 0..1 of the label -> subject match
  confirmed?: boolean;           // false = uncertain match: NOT filled until the administrator confirms it
  group: number;                 // index into groups[]
  yTop: number; height: number;
  printedCoef: number | null;    // coefficient printed on the template, if any
}

// notes / nc / coef = the Σ cells of a group's "Total" row (Σ NOTES, Σ N*C, Σ COEF); avg = Σ N*C / Σ COEF
export interface GridSlot { kind: 'avg' | 'rank' | 'notes' | 'nc' | 'coef'; x: number; width: number }

export interface GridGroup {
  name: string;                  // "ART SUBJECTS"
  yTop: number; height: number;  // the total line
  slots: GridSlot[];
  printedTotalCoef: number | null;
}

export interface SubjectGridField {
  type: 'subject_grid';
  key: 'subject_grid';
  columns: GridColumn[];
  rows: GridRow[];
  groups: GridGroup[];
  fontSize: number;
}

export type TickKey = 'repeater';
export interface TickField {
  type: 'tick';
  key: TickKey;
  yes: { x: number; y: number };   // centre of the mark to draw for YES
  no: { x: number; y: number };
}

export interface ImageField {
  type: 'image';
  key: 'photo';
  x: number; y: number; width: number; height: number;
}

// Non-drawing notes stored with the template so the review screen can show them again later.
export interface InfoField {
  type: 'info';
  kind: 'printed' | 'unsupported' | 'warning';
  label: string;
  detail?: string;
}

// ── Subject-name matching ───────────────────────────────────────────────────
const strip = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();

// Common English/French variants and the typos seen on printed bulletins.
const ALIASES: Record<string, string[]> = {
  mathematics: ['maths', 'math', 'mathematiques'],
  'english language': ['english', 'anglais', 'english lang'],
  'french language': ['french', 'francais', 'french lang'],
  'physical education': ['sport', 'sports', 'eps', 'sport physical education', 'physical education and sports', 'p e'],
  chemistry: ['chemestry', 'chimie'],
  physics: ['physique'],
  biology: ['svt', 'life science', 'life sciences'],
  'computer science': ['ict', 'informatique', 'computer studies'],
  'social studies': ['social science'],
  'general science': ['science', 'sciences'],
  citizenship: ['civics', 'civic education', 'ecm'],
  'art craft': ['art and craft', 'artistic education', 'arts', 'art'],
  'manual labour': ['manual labor', 'tm', 'travail manuel'],
  'food and nutrition': ['nutrition', 'home economics'],
  history: ['histoire'],
  geography: ['geographie'],
  economics: ['economie'],
  literature: ['literature in english', 'litterature'],
};

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (!m) return n; if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[n];
}

// 0..1 similarity between a printed label and an application subject name.
export function subjectSimilarity(label: string, subject: string): number {
  const a = strip(label), b = strip(subject);
  if (!a || !b) return 0;
  if (a === b) return 1;
  const aliasHit = (x: string, y: string) => (ALIASES[x] ?? []).includes(y) || (ALIASES[y] ?? []).includes(x);
  if (aliasHit(a, b)) return 0.95;
  // an alias of either side matching the other side (e.g. "chemestry" typo listed as alias of chemistry)
  for (const [canon, list] of Object.entries(ALIASES)) {
    const set = new Set([canon, ...list]);
    if (set.has(a) && set.has(b)) return 0.95;
  }
  const ta = a.split(' '), tb = b.split(' ');
  // printed labels are often truncated ("EDUCATI"): a word matches if it is equal or a prefix of the other (>= 4 letters)
  const sameWord = (x: string, y: string) => x === y || (Math.min(x.length, y.length) >= 4 && (x.startsWith(y) || y.startsWith(x)));
  const inter = ta.filter(t => tb.some(u => sameWord(t, u))).length;
  const tokenScore = inter ? inter / Math.max(ta.length, tb.length) : 0;
  const contains = (a.includes(b) || b.includes(a)) && Math.min(a.length, b.length) >= 4 ? 0.85 : 0;
  const lev = 1 - levenshtein(a, b) / Math.max(a.length, b.length);
  return Math.max(tokenScore * 0.9, contains, lev >= 0.8 ? lev * 0.95 : 0);
}

export const MATCH_AUTO = 0.8;   // at or above: mapped automatically
export const MATCH_REVIEW = 0.5; // between the two: mapped but flagged for the administrator

export function matchSubject(label: string, subjects: { id: string; name: string }[]): { subjectId: string | null; subjectName: string | null; confidence: number } {
  let best: { id: string; name: string } | null = null; let bestScore = 0;
  for (const s of subjects) {
    const score = subjectSimilarity(label, s.name);
    if (score > bestScore) { bestScore = score; best = s; }
  }
  if (!best || bestScore < MATCH_REVIEW) return { subjectId: null, subjectName: null, confidence: bestScore };
  return { subjectId: best.id, subjectName: best.name, confidence: Math.round(bestScore * 100) / 100 };
}

// ── Class-wide statistics (same population and ranking rule as the report-card engine) ─────────
const round1 = (n: number) => Math.round(n * 10) / 10;
const round2 = (n: number) => Math.round(n * 100) / 100;

// Standard competition ranking, 1 = best (ties share a rank: 1, 1, 3).
export function competitionRank(values: number[], mine: number): number {
  return values.filter(v => v > mine).length + 1;
}

export interface FillContext {
  classCards: TemplateReportCard[]; // every card of the class + period, for ranks / min / max / class profile
  grid?: SubjectGridField;          // the template's grid: its printed coefficients override the subject's own
  passMark: number;                 // average at or above which a student passes (the end-of-year pass mark)
}

// The coefficient printed on the template row is authoritative (N*C and totals must agree with what the sheet shows).
const coefOf = (e: TemplateEntry, row?: GridRow): number => row?.printedCoef ?? e.coefficient;

// A row is only filled when it is bound to a subject AND that binding is trusted (confirmed !== false).
const entryFor = (card: TemplateReportCard, row: GridRow): TemplateEntry | undefined =>
  row.subjectId && row.confirmed !== false ? card.entries.find(e => e.subject_id === row.subjectId) : undefined;

// Σ(mark × coef) / Σ coef over the rows of one group the student actually has a mark for.
export function groupAverage(card: TemplateReportCard, grid: SubjectGridField, group: number): number | null {
  let nc = 0, coef = 0;
  for (const row of grid.rows) {
    if (row.group !== group) continue;
    const e = entryFor(card, row);
    if (!e) continue;
    const c = coefOf(e, row);
    nc += e.total_score * c; coef += c;
  }
  return coef > 0 ? round2(nc / coef) : null;
}

export interface GroupTotals { notes: number; nc: number; coef: number }

// Σ NOTES, Σ (NOTES × COEF) and Σ COEF over the rows of one group that carry a mark.
export function groupTotals(card: TemplateReportCard, grid: SubjectGridField, group: number): GroupTotals | null {
  let notes = 0, nc = 0, coef = 0, n = 0;
  for (const row of grid.rows) {
    if (row.group !== group) continue;
    const e = entryFor(card, row);
    if (!e) continue;
    const c = coefOf(e, row);
    notes += e.total_score; nc += e.total_score * c; coef += c; n++;
  }
  return n ? { notes: round2(notes), nc: round2(nc), coef } : null;
}

export interface RowValues { mark: number; coef: number; nc: number; rank: number; grade: string; min: number; max: number; remark: string }

export function rowValues(card: TemplateReportCard, row: GridRow, ctx: FillContext): RowValues | null {
  const e = entryFor(card, row);
  if (!e) return null;
  const peers = ctx.classCards
    .map(c => entryFor(c, row))
    .filter((x): x is TemplateEntry => !!x)
    .map(x => x.total_score);
  return {
    mark: round2(e.total_score), coef: coefOf(e, row), nc: round2(e.total_score * coefOf(e, row)),
    rank: competitionRank(peers, e.total_score),
    grade: e.grade || gradeFor(e.total_score).grade,
    min: peers.length ? Math.min(...peers) : e.total_score,
    max: peers.length ? Math.max(...peers) : e.total_score,
    remark: e.remark || '',
  };
}

export function groupRank(card: TemplateReportCard, grid: SubjectGridField, group: number, ctx: FillContext): number | null {
  const mine = groupAverage(card, grid, group);
  if (mine == null) return null;
  const peers = ctx.classCards.map(c => groupAverage(c, grid, group)).filter((v): v is number => v != null);
  return competitionRank(peers, mine);
}

// ── Whole-card summary values (student performance, class profile) ─────────────────────────────
export interface CardSummary {
  totalMarks: number; totalCoef: number; average: number; grade: string;
  rank: number | null; enrollment: number;
  classHighest: number | null; classLowest: number | null; classAverage: number | null;
  presents: number; passed: number; successRate: number | null;
}

export function cardSummary(card: TemplateReportCard, ctx: FillContext): CardSummary {
  const printed = new Map((ctx.grid?.rows ?? []).filter(r => r.subjectId && r.printedCoef != null && r.confirmed !== false).map(r => [r.subjectId as string, r.printedCoef as number]));
  const cf = (e: TemplateEntry) => (e.subject_id ? printed.get(e.subject_id) : undefined) ?? e.coefficient;
  const totalCoef = card.entries.reduce((s, e) => s + cf(e), 0);
  const totalMarks = card.entries.reduce((s, e) => s + e.total_score * cf(e), 0);
  const avgs = ctx.classCards.map(c => c.percentage);
  const passed = avgs.filter(a => a >= ctx.passMark).length;
  return {
    totalMarks: round2(totalMarks), totalCoef,
    average: card.percentage, grade: gradeFor(card.percentage).grade,
    rank: card.class_position, enrollment: card.out_of ?? ctx.classCards.length,
    classHighest: avgs.length ? round1(Math.max(...avgs)) : null,
    classLowest: avgs.length ? round1(Math.min(...avgs)) : null,
    classAverage: avgs.length ? round1(avgs.reduce((s, a) => s + a, 0) / avgs.length) : null,
    presents: avgs.length, passed,
    successRate: avgs.length ? round1((passed / avgs.length) * 100) : null,
  };
}
