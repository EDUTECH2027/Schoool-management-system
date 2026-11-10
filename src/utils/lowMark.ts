/*
 * Copyright (c) 2026 [COMPANY LEGAL NAME]. All rights reserved.
 * Proprietary and confidential. Unauthorized copying, distribution or
 * modification of this file, via any medium, is strictly prohibited.
 */
// A mark below the pass average (the end-of-year "pass average", default 10/20) is printed in red on every
// report-card output: built-in layout, PDF-template overlay, HTML template and the jsPDF fallback.
export const DEFAULT_PASS_MARK = 10;
export const LOW_MARK_HEX = '#dc2626';
export const LOW_MARK_RGB: [number, number, number] = [220, 38, 38];
export const LOW_MARK_CLASS = 'rc-low';

// Blank / non-numeric values are never "low": only a real mark under the pass average is.
export function isLowMark(value: unknown, passMark: number | null | undefined): boolean {
  if (value == null || value === '') return false;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) && n < (passMark ?? DEFAULT_PASS_MARK);
}
