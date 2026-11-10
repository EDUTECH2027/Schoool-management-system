/*
 * Copyright (c) 2026 [COMPANY LEGAL NAME]. All rights reserved.
 * Proprietary and confidential. Unauthorized copying, distribution or
 * modification of this file, via any medium, is strictly prohibited.
 */
// Fills a generated HTML template with student data. A deliberately tiny template language:
//   {{path}}  escaped value      {{{path}}}  raw HTML (photo only)
//   {{#each list as item}}…{{/each}}  (exposes {{index}})      {{#if path}}…{{/if}}
// Dynamic values are always escaped, so a student name can never inject markup.
import type { TemplateReportCard, TemplateSchoolInfo, TemplateField, FillContext } from '../reportCardTemplate';
import { buildTemplateData } from './bindings';
import { composeDynamicHtml, DYNAMIC_MARKER, FIT_SCRIPT } from './pdfToHtml';
import type { HtmlTemplate } from './types';

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

function lookup(scope: Record<string, unknown>, path: string): unknown {
  let cur: unknown = scope;
  for (const part of path.split('.')) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur;
}

const truthy = (v: unknown) => Array.isArray(v) ? v.length > 0 : !!v && v !== '0';

export function renderTemplate(tpl: string, scope: Record<string, unknown>): string {
  let out = tpl.replace(/\{\{#each ([\w.]+) as (\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g, (_m, listPath: string, as: string, body: string) => {
    const list = lookup(scope, listPath);
    if (!Array.isArray(list)) return '';
    return list.map((item, index) => renderTemplate(body, { ...scope, [as]: item, index })).join('');
  });
  out = out.replace(/\{\{#if ([\w.]+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (_m, path: string, body: string) =>
    truthy(lookup(scope, path)) ? renderTemplate(body, scope) : '');
  out = out.replace(/\{\{\{([\w.]+)\}\}\}/g, (_m, path: string) => {
    const v = lookup(scope, path);
    return v == null ? '' : String(v);
  });
  out = out.replace(/\{\{([\w.]+)\}\}/g, (_m, path: string) => {
    const v = lookup(scope, path);
    return v == null || typeof v === 'object' ? '' : escapeHtml(String(v));
  });
  return out;
}

const BODY_START = '<!--rc:body-->';
const BODY_END = '<!--/rc:body-->';

// The template document with its dynamic fields placed from the CURRENT field definitions (placeholders unfilled).
export function composeTemplateHtml(template: Pick<HtmlTemplate, 'html' | 'metadata'>, fields: TemplateField[]): string {
  const { width, height } = template.metadata.pageSettings;
  return template.html.replace(DYNAMIC_MARKER, () => composeDynamicHtml(fields, width, height));
}

// One finished HTML document holding every card (each card = all template pages with its own data).
export function fillHtmlTemplate(
  template: Pick<HtmlTemplate, 'html' | 'metadata'>,
  cards: TemplateReportCard[],
  opts: { school: TemplateSchoolInfo; lang: 'en' | 'fr'; ctx: FillContext; fields: TemplateField[] },
): string {
  const doc = composeTemplateHtml(template, opts.fields);
  const start = doc.indexOf(BODY_START);
  const end = doc.indexOf(BODY_END);
  if (start < 0 || end < 0) throw new Error('The HTML template is damaged (body markers missing). Re-convert the PDF.');
  // The finished document may not touch the network (defence in depth; it only needs inline styles/scripts and data: images).
  const csp = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'; script-src 'unsafe-inline'">`;
  // marks under the pass average are red (added here so stored templates need no re-conversion)
  const lowCss = '<style>.dyn.rc-low,.cell.rc-low{color:#dc2626!important}</style>';
  const head = doc.slice(0, start).replace('<meta charset="utf-8">', () => `<meta charset="utf-8">${csp}`).replace('</head>', () => `${lowCss}</head>`);
  const body = doc.slice(start + BODY_START.length, end);
  const tail = doc.slice(end + BODY_END.length);
  const pages = cards.map(card =>
    `<div class="rc-card">${renderTemplate(body, buildTemplateData({ card, school: opts.school, lang: opts.lang, ctx: opts.ctx, fields: opts.fields }))}</div>`);
  return head + pages.join('') + tail.replace('</body>', () => `${FIT_SCRIPT}</body>`);
}
