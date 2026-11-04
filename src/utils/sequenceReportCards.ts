/*
 * Copyright (c) 2026 [COMPANY LEGAL NAME]. All rights reserved.
 * Proprietary and confidential. Unauthorized copying, distribution or
 * modification of this file, via any medium, is strictly prohibited.
 */
// Single-sequence report cards (Sequence 1, 3, 5), derived from the stored TERM report cards so
// the term generation logic is untouched. Each term holds two sequences: Seq 1/3/5 are the first
// mark of terms 1/2/3 (stored as `ca_score`; Seq 2/4/6 are `exam_score`).
//
// Same rules as backend/src/utils/reportCardMath.js + routes/reportCards.js:
//   sequence average = Σ(mark × coefficient) / Σ(coefficient), rounded to 1 decimal
//   rank             = standard competition ranking on that average (1, 1, 3, …)
// Coefficients are the ones snapshotted on each card entry when the card was generated.

export const SEQUENCE_OPTIONS = [1, 3, 5] as const;
export type SequenceNumber = typeof SEQUENCE_OPTIONS[number];

export const SEQUENCE_TERM: Record<SequenceNumber, 'first' | 'second' | 'third'> = { 1: 'first', 3: 'second', 5: 'third' };

const round1 = (n: number) => Math.round(n * 10) / 10;

// Mirrors backend/src/utils/grading.js (letter bands on the 0–100 scale).
export function gradeFor(score: number): { grade: string; remark: string } {
  if (score >= 90) return { grade: 'A+', remark: 'Excellent' };
  if (score >= 80) return { grade: 'A',  remark: 'Very Good' };
  if (score >= 70) return { grade: 'B',  remark: 'Good' };
  if (score >= 60) return { grade: 'C',  remark: 'Average' };
  if (score >= 50) return { grade: 'D',  remark: 'Below Average' };
  return { grade: 'F', remark: 'Fail' };
}

interface SeqEntry { ca_score: number; exam_score: number; total_score: number; coefficient: number; grade: string; remark: string }
interface SeqCard<E extends SeqEntry> {
  entries: E[];
  percentage: number; sequence1_average: number; sequence2_average: number;
  total_marks_obtained: number; total_marks_possible: number;
  class_position: number | null; out_of: number | null;
}

export function toSequenceCards<E extends SeqEntry, C extends SeqCard<E>>(cards: C[], sequence: SequenceNumber): (C & { sequence: number })[] {
  const averageOf = (c: C) => {
    const totalCoef = c.entries.reduce((s, e) => s + (e.coefficient ?? 1), 0);
    if (totalCoef <= 0) return 0;
    return round1(c.entries.reduce((s, e) => s + (e.ca_score || 0) * (e.coefficient ?? 1), 0) / totalCoef);
  };

  const averages = cards.map(averageOf);
  const sorted = [...averages].sort((a, b) => b - a);
  const rankOf = (avg: number) => sorted.indexOf(avg) + 1; // first index of a tied value = shared rank

  return cards.map((c, i) => {
    const avg = averages[i];
    const entries = c.entries.map(e => {
      const mark = e.ca_score || 0;
      return { ...e, exam_score: 0, total_score: mark, ...gradeFor(mark) };
    });
    return {
      ...c,
      entries,
      sequence,
      percentage: avg, sequence1_average: avg, sequence2_average: 0,
      total_marks_obtained: entries.reduce((s, e) => s + e.total_score, 0),
      total_marks_possible: entries.length * 100,
      class_position: rankOf(avg),
      out_of: c.out_of ?? cards.length,
    };
  });
}
