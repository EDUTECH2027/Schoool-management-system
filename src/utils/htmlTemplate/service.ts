/*
 * Copyright (c) 2026 [COMPANY LEGAL NAME]. All rights reserved.
 * Proprietary and confidential. Unauthorized copying, distribution or
 * modification of this file, via any medium, is strictly prohibited.
 */
// Glue between the PDF → HTML converter and the application: runs the conversion in the browser (pdf.js is
// already loaded there), stores the result per school, loads it back, and measures how closely the generated
// HTML reproduces the original PDF.
import { api, type HtmlTemplateDocument } from '../../api/client';
import type { TemplateField } from '../reportCardTemplate';
import { convertPdfToHtml } from './pdfToHtml';
import type { HtmlTemplate, HtmlTemplateMetadata } from './types';

async function loadPdfjs() {
  const [pdfjsLib, { default: workerUrl }] = await Promise.all([
    import('pdfjs-dist'),
    import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
  ]);
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
  return pdfjsLib;
}

export interface ConversionSummary {
  stats: HtmlTemplateMetadata['stats'];
  pages: number;
  warnings: string[];
  partialPages: number[];
  scannedPages: number[];
}

// Converts the PDF and stores the result. The analyser's fields stay the single source of truth for the dynamic areas.
export async function convertAndStoreTemplate(
  bytes: ArrayBuffer, fields: TemplateField[], fileName: string | null,
  onProgress?: (done: number, total: number) => void,
): Promise<ConversionSummary & { template: HtmlTemplate }> {
  const pdfjs = await loadPdfjs();
  const template = await convertPdfToHtml({
    pdfjs, bytes, fields, fileName,
    onProgress: (_stage, done, total) => onProgress?.(done, total),
  });
  await api.saveReportCardHtmlTemplate({ html: template.htmlWithRefs, css: template.css, assets: template.assets, metadata: template.metadata });
  return { template, ...summarize(template.metadata) };
}

export function summarize(meta: HtmlTemplateMetadata): ConversionSummary {
  return {
    stats: meta.stats, pages: meta.pages.length, warnings: meta.warnings,
    partialPages: meta.pages.filter(p => p.fidelity === 'partial').map(p => p.pageNumber),
    scannedPages: meta.pages.filter(p => p.scanned).map(p => p.pageNumber),
  };
}

// One in-memory copy per session; invalidated whenever the template is converted again.
let cache: Promise<HtmlTemplateDocument> | null = null;
export function loadHtmlTemplate(force = false): Promise<HtmlTemplateDocument & { metadata: HtmlTemplateMetadata }> {
  if (!cache || force) {
    cache = api.getReportCardHtmlTemplate();
    cache.catch(() => { cache = null; });
  }
  return cache as Promise<HtmlTemplateDocument & { metadata: HtmlTemplateMetadata }>;
}
export function invalidateHtmlTemplateCache() { cache = null; }

// ── Similarity between the original PDF and the generated HTML ─────────────────────────────────────
// The static part of every page is a single inline SVG, so it can be rasterised without a browser engine for
// the whole document: serialise it (with the shared image definitions) into an <img>, draw it to a canvas,
// and compare it pixel by pixel with pdf.js's own rendering of the same page.
export const SIMILARITY_TARGET = 0.95;

export interface PageSimilarity { page: number; similarity: number; differingPixels: number; ok: boolean }

function staticPageSvgs(html: string): string[] {
  const defs = /<svg class="rc-defs"[^>]*>(<defs>[\s\S]*?<\/defs>)<\/svg>/.exec(html)?.[1] ?? '';
  const out: string[] = [];
  const re = /<section class="rc-page"[^>]*style="width:([\d.]+)pt;height:([\d.]+)pt">\s*<svg class="rc-layer"[^>]*>([\s\S]*?)<\/svg>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    out.push(`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${m[1]}" height="${m[2]}" viewBox="0 0 ${m[1]} ${m[2]}">${defs}<rect width="100%" height="100%" fill="#fff"/>${m[3]}</svg>`);
  }
  return out;
}

export async function measureSimilarity(pdfBytes: ArrayBuffer, templateHtml: string, scale = 1.5): Promise<PageSimilarity[]> {
  const pdfjs = await loadPdfjs();
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(pdfBytes.slice(0)) }).promise;
  const svgs = staticPageSvgs(templateHtml);
  const results: PageSimilarity[] = [];
  for (let n = 1; n <= pdf.numPages && n <= svgs.length; n++) {
    const page = await pdf.getPage(n);
    const vp = page.getViewport({ scale });
    const w = Math.round(vp.width), h = Math.round(vp.height);
    const ref = document.createElement('canvas'); ref.width = w; ref.height = h;
    const rctx = ref.getContext('2d', { willReadFrequently: true });
    if (!rctx) throw new Error('Canvas not supported');
    rctx.fillStyle = '#fff'; rctx.fillRect(0, 0, w, h);
    await page.render({ canvas: ref, canvasContext: rctx, viewport: vp }).promise;

    const img = new Image();
    const url = URL.createObjectURL(new Blob([svgs[n - 1]], { type: 'image/svg+xml' }));
    await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = () => rej(new Error('The generated page could not be rasterised')); img.src = url; });
    const gen = document.createElement('canvas'); gen.width = w; gen.height = h;
    const gctx = gen.getContext('2d', { willReadFrequently: true });
    if (!gctx) throw new Error('Canvas not supported');
    gctx.fillStyle = '#fff'; gctx.fillRect(0, 0, w, h);
    gctx.drawImage(img, 0, 0, w, h);
    URL.revokeObjectURL(url);

    // a light blur on both sides makes the score insensitive to sub-pixel anti-aliasing differences between the two
    // renderers, while a missing shape / image or text that moved still shows up clearly
    const soften = (src: HTMLCanvasElement) => {
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      const g = c.getContext('2d', { willReadFrequently: true });
      if (!g) return src.getContext('2d', { willReadFrequently: true })!;
      g.fillStyle = '#fff'; g.fillRect(0, 0, w, h);
      g.filter = `blur(${(scale * 0.9).toFixed(2)}px)`;
      g.drawImage(src, 0, 0);
      return g;
    };
    const a = soften(ref).getImageData(0, 0, w, h).data, b = soften(gen).getImageData(0, 0, w, h).data;
    let sum = 0, bad = 0;
    for (let i = 0; i < a.length; i += 4) {
      const d = (Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2])) / 3;
      sum += d; if (d > 64) bad++;
    }
    const similarity = 1 - sum / (a.length / 4) / 255;
    results.push({ page: n, similarity, differingPixels: bad / (w * h), ok: similarity >= SIMILARITY_TARGET });
  }
  return results;
}
