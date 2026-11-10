/*
 * Copyright (c) 2026 [COMPANY LEGAL NAME]. All rights reserved.
 * Proprietary and confidential. Unauthorized copying, distribution or
 * modification of this file, via any medium, is strictly prohibited.
 */
// Universal PDF → HTML/CSS reconstruction. Nothing here knows about any particular report card: every
// page is read from its own content stream — filled and stroked paths (backgrounds, cell borders),
// embedded images (logos, photos, stamps, scanned pages, with their exact placement matrix), and the
// text runs (position, font, size, colour). The result is a page-accurate, absolutely positioned HTML
// document whose dynamic areas are `{{placeholders}}` taken from the analyser's detected fields.
//
// Layer order inside a page (bottom → top): filled shapes, images, borders, static text, dynamic fields.
// Coordinates are PDF points with a top-left origin; the browser's CSS `pt` is the same unit, so the
// output does not depend on screen resolution.
import type { PDFPageProxy } from 'pdfjs-dist';
import type { TemplateField } from '../reportCardTemplate';
import { buildDynamicElements, legacyTableHtml } from './bindings';
import {
  HTML_TEMPLATE_VERSION,
  type HtmlTemplate, type HtmlTemplateMetadata, type TemplateAsset, type TemplateElement, type TemplatePage,
  type TextElement, type ImageElement, type ShapeElement, type DynamicElement,
} from './types';

type PdfjsModule = typeof import('pdfjs-dist');
type M6 = [number, number, number, number, number, number];

interface Ctx2D {
  fillStyle: unknown;
  canvas: { width: number; height: number };
  fillRect(x: number, y: number, w: number, h: number): void;
  drawImage(img: unknown, x: number, y: number): void;
  createImageData(w: number, h: number): { data: Uint8ClampedArray };
  putImageData(d: unknown, x: number, y: number): void;
  getImageData(x: number, y: number, w: number, h: number): { data: Uint8ClampedArray; width: number; height: number };
}
interface CanvasLike { width: number; height: number; getContext(type: '2d', options?: { willReadFrequently?: boolean }): Ctx2D | null; toDataURL(type?: string, quality?: number): string }
export type CanvasFactory = (w: number, h: number) => CanvasLike;

export interface ConvertInput {
  pdfjs: PdfjsModule;
  bytes: ArrayBuffer | Uint8Array;
  fields: TemplateField[];
  fileName?: string | null;
  createCanvas?: CanvasFactory;
  documentOptions?: Record<string, unknown>;   // extra pdf.js getDocument options (fonts / canvas factory in Node)
  onProgress?: (stage: string, done: number, total: number) => void;
}

const r2 = (n: number) => Math.round(n * 100) / 100;
// `{`/`}` are escaped too: printed text must never be mistaken for a {{placeholder}}
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/{/g, '&#123;').replace(/}/g, '&#125;');
const mul = (m: M6, n: M6): M6 => [
  m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1],
  m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3],
  m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5],
];
const hex2 = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
const rgbHex = (r: number, g: number, b: number) => `#${hex2(r)}${hex2(g)}${hex2(b)}`;

const defaultCanvas: CanvasFactory = (w, h) => {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c as unknown as CanvasLike;
};

// ── fonts ──────────────────────────────────────────────────────────────────────────────────────
interface FontInfo { family: string; pdfName: string; weight: number; italic: boolean }

function fontStack(rawName: string, generic: string): { family: string; weight: number; italic: boolean } {
  const name = rawName.replace(/^[A-Z]{6}\+/, '');
  const low = name.toLowerCase();
  const weight = /(black|heavy|extrabold)/.test(low) ? 800 : /(bold|demi)/.test(low) ? 700 : /semibold/.test(low) ? 600 : 400;
  const italic = /(italic|oblique|-it\b|ital)/.test(low);
  let family: string;
  if (/(arial|helvet|liberation ?sans|nimbus ?sans|arimo)/.test(low)) family = 'Arial, Helvetica, "Liberation Sans", Arimo, sans-serif';
  else if (/(times|tinos|liberation ?serif|nimbus ?rom|georgia)/.test(low)) family = '"Times New Roman", Times, "Liberation Serif", Tinos, serif';
  else if (/(courier|cousine|consolas|mono)/.test(low)) family = '"Courier New", Courier, "Liberation Mono", monospace';
  else if (/(calibri|carlito)/.test(low)) family = 'Calibri, Carlito, "Segoe UI", Arial, sans-serif';
  else if (/(cambria|caladea)/.test(low)) family = 'Cambria, Caladea, "Times New Roman", serif';
  else if (/(verdana|tahoma|trebuchet|segoe|roboto|opensans|open ?sans)/.test(low)) {
    const nice = name.replace(/[-,](bold|italic|regular|oblique).*$/i, '').replace(/MT$/, '');
    family = `"${nice}", Verdana, Arial, sans-serif`;
  } else {
    const nice = name.replace(/[-,](bold|italic|regular|oblique|semibold|light|medium).*$/i, '').replace(/([a-z])([A-Z])/g, '$1 $2');
    const fb = generic === 'serif' ? 'serif' : generic === 'monospace' ? 'monospace' : 'sans-serif';
    family = nice ? `"${nice}", ${fb}` : fb;
  }
  return { family, weight, italic };
}

// ── colour sampling: ink colour of a text run, read from a raster of the page ──────────────────
function sampleInk(img: { data: Uint8ClampedArray; width: number; height: number }): string {
  const { data } = img;
  const counts = new Map<number, { n: number; r: number; g: number; b: number }>();
  const key = (r: number, g: number, b: number) => ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
  for (let i = 0; i < data.length; i += 4) {
    const k = key(data[i], data[i + 1], data[i + 2]);
    const e = counts.get(k);
    if (e) { e.n++; e.r += data[i]; e.g += data[i + 1]; e.b += data[i + 2]; } else counts.set(k, { n: 1, r: data[i], g: data[i + 1], b: data[i + 2] });
  }
  let bg: { n: number; r: number; g: number; b: number } | null = null;
  for (const e of counts.values()) if (!bg || e.n > bg.n) bg = e;
  if (!bg) return '#000000';
  const bgc = [bg.r / bg.n, bg.g / bg.n, bg.b / bg.n];
  // ink = the pixel farthest from the background (anti-aliased edges are always closer to it than the glyph body)
  let ink: [number, number, number] | null = null; let inkD = 40;
  for (let i = 0; i < data.length; i += 4) {
    const d = Math.abs(data[i] - bgc[0]) + Math.abs(data[i + 1] - bgc[1]) + Math.abs(data[i + 2] - bgc[2]);
    if (d > inkD) { inkD = d; ink = [data[i], data[i + 1], data[i + 2]]; }
  }
  if (!ink) return '#000000';
  if (ink[0] < 48 && ink[1] < 48 && ink[2] < 48) return '#000000'; // near-black is black
  return rgbHex(ink[0], ink[1], ink[2]);
}

// ── images ─────────────────────────────────────────────────────────────────────────────────────
interface RawImage { width: number; height: number; kind?: number; data?: Uint8Array | Uint8ClampedArray; bitmap?: unknown; smask?: { width: number; height: number; data: Uint8Array | Uint8ClampedArray } | null }

// Lossless PNG; very large opaque images (scanned pages) are stored as near-lossless JPEG so they stay within the upload limit.
function imageToDataUrl(img: RawImage, createCanvas: CanvasFactory): { url: string; mime: string } | null {
  const w = img.width, h = img.height;
  if (!w || !h) return null;
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const encode = (): { url: string; mime: string } => {
    if (w * h >= 1_500_000) {
      const px = ctx.getImageData(0, 0, w, h).data;
      let opaque = true;
      for (let i = 3; i < px.length; i += 4 * 61) if (px[i] < 255) { opaque = false; break; }
      if (opaque) return { url: canvas.toDataURL('image/jpeg', 0.95), mime: 'image/jpeg' };
    }
    return { url: canvas.toDataURL('image/png'), mime: 'image/png' };
  };
  if (img.bitmap) {
    ctx.drawImage(img.bitmap, 0, 0);
    return encode();
  }
  if (!img.data) return null;
  const out = ctx.createImageData(w, h);
  const d = out.data as Uint8ClampedArray;
  const src = img.data;
  if (img.kind === 3 || src.length === w * h * 4) {
    d.set(src.subarray ? src.subarray(0, w * h * 4) : src);
  } else if (img.kind === 2 || src.length === w * h * 3) {
    for (let i = 0, j = 0; i < w * h; i++, j += 3) { d[i * 4] = src[j]; d[i * 4 + 1] = src[j + 1]; d[i * 4 + 2] = src[j + 2]; d[i * 4 + 3] = 255; }
  } else if (img.kind === 1) {
    const rowBytes = (w + 7) >> 3;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const bit = (src[y * rowBytes + (x >> 3)] >> (7 - (x & 7))) & 1;
      const v = bit ? 255 : 0; const o = (y * w + x) * 4;
      d[o] = d[o + 1] = d[o + 2] = v; d[o + 3] = 255;
    }
  } else if (src.length === w * h) {
    for (let i = 0; i < w * h; i++) { d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = src[i]; d[i * 4 + 3] = 255; }
  } else return null;
  if (img.smask && img.smask.data) {
    const sm = img.smask;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const sx = Math.min(sm.width - 1, Math.floor(x * sm.width / w)), sy = Math.min(sm.height - 1, Math.floor(y * sm.height / h));
      d[(y * w + x) * 4 + 3] = sm.data[sy * sm.width + sx];
    }
  }
  ctx.putImageData(out, 0, 0);
  return encode();
}

// ── per-page conversion ────────────────────────────────────────────────────────────────────────
interface PageResult {
  page: TemplatePage;
  svgBody: string;
  assets: TemplateAsset[];
}

interface Box { x0: number; y0: number; x1: number; y1: number }
interface GState { ctm: M6; fill: string; stroke: string; lw: number; fa: number; sa: number; dash: number[] | null; clip: Box | null }

async function convertPage(
  pdfjs: PdfjsModule, page: PDFPageProxy, pageNumber: number, createCanvas: CanvasFactory, fontClassOf: (f: FontInfo, size: number) => string,
): Promise<PageResult> {
  const { OPS } = pdfjs;
  const vp = page.getViewport({ scale: 1 });
  const W = r2(vp.width), H = r2(vp.height);
  const base = vp.transform as M6;
  const warnings: string[] = [];
  const elements: TemplateElement[] = [];
  const assets: TemplateAsset[] = [];
  const assetByObj = new Map<string, string>();
  let z = 0, shapeN = 0, imgN = 0, textN = 0;
  // Everything that paints is kept in content-stream order so layering (watermarks behind tables, stamps over text) is exact.
  const parts: { seq: number; svg: string }[] = [];
  let curSeq = 0;
  const showOps: { seq: number; n: number }[] = [];
  let unsupported = false;

  const opList = await page.getOperatorList();
  let gs: GState = { ctm: base, fill: '#000000', stroke: '#000000', lw: 1, fa: 1, sa: 1, dash: null, clip: null };
  let pendingClip = false;                    // pdf.js emits the clip operator BEFORE the path it applies to
  const clipDefs: string[] = [];
  const clipIds = new Map<string, string>();
  // clip-path reference for something occupying `box`, or '' when the active clip does not cut it
  const clipRef = (box: Box): string => {
    const c = gs.clip;
    if (!c || (box.x0 >= c.x0 - 0.5 && box.y0 >= c.y0 - 0.5 && box.x1 <= c.x1 + 0.5 && box.y1 <= c.y1 + 0.5)) return '';
    const key = `${r2(c.x0)},${r2(c.y0)},${r2(c.x1)},${r2(c.y1)}`;
    let id = clipIds.get(key);
    if (!id) { id = `c${pageNumber}_${clipIds.size + 1}`; clipIds.set(key, id); clipDefs.push(`<clipPath id="${id}"><rect x="${r2(c.x0)}" y="${r2(c.y0)}" width="${r2(c.x1 - c.x0)}" height="${r2(c.y1 - c.y0)}"/></clipPath>`); }
    return ` clip-path="url(#${id})"`;
  };
  const stack: GState[] = [];
  const pt = (x: number, y: number): [number, number] => [gs.ctm[0] * x + gs.ctm[2] * y + gs.ctm[4], gs.ctm[1] * x + gs.ctm[3] * y + gs.ctm[5]];
  const scaleOf = () => Math.sqrt(Math.abs(gs.ctm[0] * gs.ctm[3] - gs.ctm[1] * gs.ctm[2]));

  const color = (a: unknown[]): string | null => {
    if (typeof a[0] === 'string') return a[0] as string;
    if (typeof a[0] === 'number' && a.length >= 3) return rgbHex(a[0] as number, a[1] as number, a[2] as number);
    return null;
  };

  const paintPath = (paintOp: number, data: ArrayLike<number>) => {
    const doFill = paintOp === OPS.fill || paintOp === OPS.eoFill || paintOp === OPS.fillStroke || paintOp === OPS.eoFillStroke || paintOp === OPS.closeFillStroke || paintOp === OPS.closeEOFillStroke;
    const doStroke = paintOp === OPS.stroke || paintOp === OPS.closeStroke || paintOp === OPS.fillStroke || paintOp === OPS.eoFillStroke || paintOp === OPS.closeFillStroke || paintOp === OPS.closeEOFillStroke;
    const evenOdd = paintOp === OPS.eoFill || paintOp === OPS.eoFillStroke || paintOp === OPS.closeEOFillStroke;
    const pts: [number, number][] = [];
    let d = '';
    for (let k = 0; k < data.length;) {
      const op = data[k++];
      if (op === 0) { const p = pt(data[k++], data[k++]); pts.push(p); d += `M${r2(p[0])} ${r2(p[1])}`; }
      else if (op === 1) { const p = pt(data[k++], data[k++]); pts.push(p); d += `L${r2(p[0])} ${r2(p[1])}`; }
      else if (op === 2) { const a = pt(data[k++], data[k++]), b = pt(data[k++], data[k++]), c = pt(data[k++], data[k++]); pts.push(a, b, c); d += `C${r2(a[0])} ${r2(a[1])} ${r2(b[0])} ${r2(b[1])} ${r2(c[0])} ${r2(c[1])}`; }
      else if (op === 3) { const a = pt(data[k++], data[k++]), b = pt(data[k++], data[k++]); pts.push(a, b); d += `Q${r2(a[0])} ${r2(a[1])} ${r2(b[0])} ${r2(b[1])}`; }
      else if (op === 4) d += 'Z';
      else break;
    }
    if (!pts.length) return;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const [x, y] of pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
    if (pendingClip) {
      const c = gs.clip;
      gs = { ...gs, clip: c ? { x0: Math.max(c.x0, x0), y0: Math.max(c.y0, y0), x1: Math.min(c.x1, x1), y1: Math.min(c.y1, y1) } : { x0, y0, x1, y1 } };
      pendingClip = false;
    }
    if (paintOp === OPS.endPath) return;
    const cp = clipRef({ x0, y0, x1, y1 });
    const sw = Math.max(0.1, gs.lw * scaleOf());
    // a rectangle (move, 3 lines, close) is emitted as <rect> – by far the most common shape
    const isRect = data.length === 13 && data[0] === 0 && data[3] === 1 && data[6] === 1 && data[9] === 1 && data[12] === 4
      && pts.length === 4 && (Math.abs(pts[0][0] - pts[1][0]) < 0.01 || Math.abs(pts[0][1] - pts[1][1]) < 0.01)
      && (Math.abs(pts[1][0] - pts[2][0]) < 0.01 || Math.abs(pts[1][1] - pts[2][1]) < 0.01);
    const geom = isRect ? `<rect x="${r2(x0)}" y="${r2(y0)}" width="${r2(x1 - x0)}" height="${r2(y1 - y0)}"` : `<path d="${d}"`;
    const id = `shape_${String(++shapeN).padStart(4, '0')}`;
    if (doFill) {
      parts.push({ seq: curSeq, svg: `${geom} fill="${gs.fill}"${gs.fa < 1 ? ` fill-opacity="${gs.fa}"` : ''}${evenOdd ? ' fill-rule="evenodd"' : ''}${cp}/>` });
    }
    if (doStroke) {
      parts.push({ seq: curSeq, svg: `${geom} fill="none" stroke="${gs.stroke}" stroke-width="${r2(sw)}"${gs.sa < 1 ? ` stroke-opacity="${gs.sa}"` : ''}${gs.dash?.length ? ` stroke-dasharray="${gs.dash.map(r2).join(' ')}"` : ''}${cp}/>` });
    }
    elements.push({
      id, type: 'shape', page: pageNumber, kind: isRect ? 'rect' : 'path', x: r2(x0), y: r2(y0), width: r2(x1 - x0), height: r2(y1 - y0),
      fill: doFill ? gs.fill : null, stroke: doStroke ? gs.stroke : null, strokeWidth: doStroke ? r2(sw) : 0, dynamic: false, z: ++z,
    } as ShapeElement);
  };

  const placeImage = async (objId: string, inline: RawImage | null) => {
    let assetId = assetByObj.get(objId);
    if (!assetId) {
      let raw: RawImage | null = inline;
      if (!raw) {
        const store = objId.startsWith('g_') ? page.commonObjs : page.objs;
        raw = await new Promise<RawImage | null>(resolve => {
          const t = setTimeout(() => resolve(null), 4000);
          try { store.get(objId, (v: RawImage) => { clearTimeout(t); resolve(v); }); } catch { clearTimeout(t); resolve(null); }
        });
      }
      const enc = raw ? imageToDataUrl(raw, createCanvas) : null;
      if (!raw || !enc) { warnings.push(`Image ${objId} could not be decoded and was left out.`); unsupported = true; return; }
      assetId = `asset_${String(assets.length + 1).padStart(3, '0')}`;
      assets.push({ id: assetId, mime: enc.mime, dataUrl: enc.url, width: raw.width, height: raw.height, origin: 'extracted_from_pdf', sourceReference: { pageNumber, pdfObjectReference: objId } });
      assetByObj.set(objId, assetId);
    }
    const asset = assets.find(a => a.id === assetId)!;
    const [a, b, c, d, e, f] = gs.ctm;
    // unit square (image space, y up) → device; the image's top edge is v = 1
    const upright = Math.abs(b) < 1e-3 && Math.abs(c) < 1e-3 && a > 0 && d < 0;
    const id = `element_image_${String(++imgN).padStart(3, '0')}`;
    let x: number, y: number, w: number, h: number, matrix: M6 | undefined;
    if (upright) { x = e; y = f + d; w = a; h = -d; }
    else {
      matrix = [a, b, -c, -d, c + e, d + f];
      const xs = [e, a + e, c + e, a + c + e], ys = [f, b + f, d + f, b + d + f];
      x = Math.min(...xs); y = Math.min(...ys); w = Math.max(...xs) - x; h = Math.max(...ys) - y;
    }
    const rotation = Math.round(Math.atan2(b, a) * 180 / Math.PI * 100) / 100;
    elements.push({
      id, type: 'image', page: pageNumber, assetId, x: r2(x), y: r2(y), width: r2(w), height: r2(h),
      aspectRatio: r2(asset.width / asset.height), rotation, ...(matrix ? { matrix: matrix.map(r2) as M6 } : {}), dynamic: false, z: ++z,
    } as ImageElement);
    const cp = clipRef({ x0: x, y0: y, x1: x + w, y1: y + h });
    // images are defined once per document (see <defs> below) and placed with <use>, so a bulk run of many
    // cards does not repeat megabytes of image data per card
    const place = upright ? `matrix(${r2(w)} 0 0 ${r2(h)} ${r2(x)} ${r2(y)})` : `matrix(${matrix!.map(v => r2(v)).join(' ')})`;
    parts.push({ seq: curSeq, svg: `<use data-id="${id}" href="#img_{{aid:${assetId}}}" transform="${place}"${cp}/>` });
  };

  for (let i = 0; i < opList.fnArray.length; i++) {
    const fn = opList.fnArray[i];
    const args = (opList.argsArray[i] ?? []) as unknown[];
    curSeq = i;
    switch (fn) {
      case OPS.showText: case OPS.showSpacedText: {
        let n = 0;
        const glyphs = Array.isArray(args[0]) ? (args[0] as unknown[]) : [];
        for (const g of glyphs) if (g && typeof g === 'object') { const u = (g as { unicode?: string }).unicode; if (u && u.trim()) n += u.replace(/\s/g, '').length; }
        showOps.push({ seq: i, n });
        break;
      }
      case OPS.save: stack.push({ ...gs }); break;
      case OPS.restore: gs = stack.pop() ?? gs; break;
      case OPS.transform: gs = { ...gs, ctm: mul(gs.ctm, args as unknown as M6) }; break;
      case OPS.paintFormXObjectBegin: {
        stack.push({ ...gs });
        if (Array.isArray(args[0])) gs = { ...gs, ctm: mul(gs.ctm, args[0] as unknown as M6) };
        break;
      }
      case OPS.paintFormXObjectEnd: gs = stack.pop() ?? gs; break;
      case OPS.clip: case OPS.eoClip:
        pendingClip = true;
        break;
      case OPS.setFillRGBColor: { const c = color(args); if (c) gs = { ...gs, fill: c }; break; }
      case OPS.setStrokeRGBColor: { const c = color(args); if (c) gs = { ...gs, stroke: c }; break; }
      case OPS.setFillGray: { const g = (args[0] as number) * 255; gs = { ...gs, fill: rgbHex(g, g, g) }; break; }
      case OPS.setStrokeGray: { const g = (args[0] as number) * 255; gs = { ...gs, stroke: rgbHex(g, g, g) }; break; }
      case OPS.setFillColorN: case OPS.setStrokeColorN: case OPS.shadingFill:
        if (fn === OPS.shadingFill || (args[0] && typeof args[0] === 'object')) { unsupported = true; if (!warnings.includes('Gradients / patterns are not reconstructed.')) warnings.push('Gradients / patterns are not reconstructed.'); }
        break;
      case OPS.setLineWidth: gs = { ...gs, lw: args[0] as number }; break;
      case OPS.setDash: gs = { ...gs, dash: Array.isArray(args[0]) && (args[0] as number[]).length ? (args[0] as number[]).map(v => v * scaleOf()) : null }; break;
      case OPS.setGState:
        for (const [k, v] of (args[0] as [string, unknown][]) ?? []) {
          if (k === 'ca') gs = { ...gs, fa: v as number }; else if (k === 'CA') gs = { ...gs, sa: v as number };
          else if (k === 'LW') gs = { ...gs, lw: v as number };
          else if (k === 'SMask' && v && v !== 'None' && typeof v === 'object') { unsupported = true; warnings.push('A soft mask (transparency effect) is not reconstructed.'); }
        }
        break;
      case OPS.constructPath: {
        const a = args as [number, ArrayLike<number>[]];
        if (a[1]?.[0]) paintPath(a[0], a[1][0]);
        break;
      }
      case OPS.paintImageXObject: case OPS.paintImageXObjectRepeat:
        await placeImage(args[0] as string, null); break;
      case OPS.paintInlineImageXObject: await placeImage(`inline_${i}`, args[0] as RawImage); break;
      case OPS.paintImageMaskXObject: {
        // stencil mask painted in the current fill colour
        const m = args[0] as RawImage & { data: Uint8Array };
        if (m?.data && m.width && m.height) {
          const w = m.width, h = m.height, rowBytes = (w + 7) >> 3;
          const rgba = new Uint8ClampedArray(w * h * 4);
          const col = gs.fill.match(/^#(..)(..)(..)$/);
          const [cr, cg, cb] = col ? [parseInt(col[1], 16), parseInt(col[2], 16), parseInt(col[3], 16)] : [0, 0, 0];
          const packed = m.data.length >= rowBytes * h;
          for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
            const on = packed ? !((m.data[y * rowBytes + (x >> 3)] >> (7 - (x & 7))) & 1) : m.data[y * w + x] === 0;
            const o = (y * w + x) * 4; rgba[o] = cr; rgba[o + 1] = cg; rgba[o + 2] = cb; rgba[o + 3] = on ? 255 : 0;
          }
          await placeImage(`mask_${i}`, { width: w, height: h, kind: 3, data: rgba });
        } else { unsupported = true; warnings.push('An image mask could not be reconstructed.'); }
        break;
      }
      case OPS.paintSolidColorImageMask: {
        const [x0, y0] = pt(0, 0), [x1, y1] = pt(1, 1);
        parts.push({ seq: i, svg: `<rect x="${r2(Math.min(x0, x1))}" y="${r2(Math.min(y0, y1))}" width="${r2(Math.abs(x1 - x0))}" height="${r2(Math.abs(y1 - y0))}" fill="${gs.fill}"/>` });
        break;
      }
      default: break;
    }
  }

  // ── text runs ──
  const tc = await page.getTextContent();
  const textItems = (tc.items as { str: string; transform: number[]; width: number; height: number; fontName: string }[]).filter(it => it.str && it.str.length > 0 && it.str.trim().length > 0);
  const charCount = textItems.reduce((n, it) => n + it.str.trim().length, 0);

  // raster of the page, only to read each run's ink colour (white-on-dark headers, coloured titles)
  let raster: { ctx: Ctx2D; scale: number } | null = null;
  if (textItems.length) {
    try {
      const scale = 2;
      const rv = page.getViewport({ scale });
      const canvas = createCanvas(Math.ceil(rv.width), Math.ceil(rv.height));
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) throw new Error('no 2d context');
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, viewport: rv, canvas } as never).promise;
      raster = { ctx, scale };
    } catch (err) { console.warn('[pdf-to-html] colour sampling failed', err); warnings.push('Text colours could not be sampled; black was assumed.'); }
  }

  // Paint order of each text run: match it to the showText operators by counting visible characters
  // (both lists are in content-stream order). If the totals disagree the order is unknown: text goes on top.
  const itemSeq: number[] = [];
  {
    const opChars = showOps.reduce((n, o) => n + o.n, 0);
    const itemChars = textItems.reduce((n, it) => n + it.str.replace(/\s/g, '').length, 0);
    if (opChars === itemChars && opChars > 0) {
      let oi = 0, used = 0;
      for (const it of textItems) {
        const need = it.str.replace(/\s/g, '').length;
        while (oi < showOps.length && showOps[oi].n === 0) oi++;
        itemSeq.push(oi < showOps.length ? showOps[oi].seq : Number.MAX_SAFE_INTEGER);
        let got = 0;
        while (oi < showOps.length && got < need) { const avail = showOps[oi].n - used; const take = Math.min(avail, need - got); got += take; used += take; if (used >= showOps[oi].n) { oi++; used = 0; } }
      }
    }
  }
  let ti = -1;
  for (const it of textItems) {
    ti++;
    const m = mul(base, it.transform as unknown as M6);
    const fs = Math.hypot(m[2], m[3]) || it.height || 10;
    const rot = Math.atan2(m[1], m[0]) * 180 / Math.PI;
    const style = (tc.styles as Record<string, { fontFamily: string; ascent: number; descent: number }>)[it.fontName] ?? { fontFamily: 'sans-serif', ascent: 0.9, descent: -0.2 };
    let pdfName = it.fontName;
    try { if (page.commonObjs.has(it.fontName)) pdfName = (page.commonObjs.get(it.fontName) as { name?: string }).name ?? it.fontName; } catch { /* keep the internal name */ }
    const st = fontStack(pdfName, style.fontFamily);
    const font: FontInfo = { family: st.family, pdfName, weight: st.weight, italic: st.italic };

    let ink = '#000000';
    if (raster) {
      const s = raster.scale;
      const bx = Math.max(0, Math.floor((m[4]) * s)), by = Math.max(0, Math.floor((m[5] - fs * 0.9) * s));
      const bw = Math.max(1, Math.min(Math.ceil(Math.abs(it.width) * s), raster.ctx.canvas.width - bx));
      const bh = Math.max(1, Math.min(Math.ceil(fs * 1.1 * s), raster.ctx.canvas.height - by));
      try { ink = sampleInk(raster.ctx.getImageData(bx, by, bw, bh)); } catch { /* keep black */ }
    }

    const id = `element_text_${String(++textN).padStart(4, '0')}`;
    const cls = fontClassOf(font, r2(fs));
    const width = Math.abs(it.width);
    const rotAttr = Math.abs(rot) > 0.5 ? ` transform="rotate(${r2(rot)} ${r2(m[4])} ${r2(m[5])})"` : '';
    parts.push({ seq: itemSeq[ti] ?? Number.MAX_SAFE_INTEGER, svg: `<text class="${cls}" x="${r2(m[4])}" y="${r2(m[5])}" textLength="${r2(width)}" lengthAdjust="spacingAndGlyphs" fill="${ink}"${rotAttr} data-id="${id}">${esc(it.str)}</text>` });
    elements.push({
      id, type: 'text', page: pageNumber, text: it.str, x: r2(m[4]), y: r2(m[5] - fs * 0.85), width: r2(width), height: r2(fs * 1.2),
      font: { family: font.family, pdfName, size: r2(fs), weight: font.weight, italic: font.italic }, color: ink, rotation: r2(rot), dynamic: false, z: ++z,
    } as TextElement);
  }

  // ── scanned page: one big image, no text layer ──
  const pageArea = W * H;
  const bigImg = elements.find(e => e.type === 'image' && e.width * e.height >= pageArea * 0.6);
  const scanned = charCount < 20 && !!bigImg;
  if (scanned) warnings.push('Scanned page: the original page image is kept as the background. No text layer exists, so dynamic areas must be placed manually in the designer.');
  else if (charCount < 20) warnings.push('This page has almost no text and no page-sized image; check the preview.');

  return {
    page: { pageNumber, width: W, height: H, scanned, fidelity: unsupported ? 'partial' : 'full', elements, warnings },
    svgBody: (clipDefs.length ? `<defs>${clipDefs.join('')}</defs>` : '') + parts.map((q, k) => ({ q, k })).sort((a, b) => a.q.seq - b.q.seq || a.k - b.k).map(x => x.q.svg).join(''), assets,
  };
}

// ── public entry point ─────────────────────────────────────────────────────────────────────────
export async function convertPdfToHtml(input: ConvertInput): Promise<HtmlTemplate> {
  const { pdfjs, fields, fileName = null, onProgress } = input;
  const createCanvas = input.createCanvas ?? defaultCanvas;
  const data = input.bytes instanceof Uint8Array ? input.bytes.slice() : new Uint8Array(input.bytes.slice(0)); // pdf.js detaches what it is given
  const pdf = await pdfjs.getDocument({ data, ...(input.documentOptions ?? {}) }).promise;

  const fontClassByKey = new Map<string, string>();
  const fontCss: string[] = [];
  const fontClassOf = (f: FontInfo, size: number) => {
    const key = `${f.family}|${f.weight}|${f.italic}|${size}`;
    let cls = fontClassByKey.get(key);
    if (!cls) {
      cls = `f${fontClassByKey.size + 1}`;
      fontClassByKey.set(key, cls);
      fontCss.push(`.${cls}{font-family:${f.family};font-weight:${f.weight};${f.italic ? 'font-style:italic;' : ''}font-size:${size}px}`);
    }
    return cls;
  };

  const results: PageResult[] = [];
  for (let n = 1; n <= pdf.numPages; n++) {
    onProgress?.('page', n - 1, pdf.numPages);
    results.push(await convertPage(pdfjs, await pdf.getPage(n), n, createCanvas, fontClassOf));
  }
  onProgress?.('assemble', pdf.numPages, pdf.numPages);

  const first = results[0].page;
  const W = first.width, H = first.height;
  const dyn: DynamicElement[] = buildDynamicElements(fields, W, H, 1);
  results[0].page.elements.push(...dyn);

  // body font for dynamic values: the most common static font on page 1
  const fam = new Map<string, number>();
  for (const e of first.elements) if (e.type === 'text') fam.set(e.font.family, (fam.get(e.font.family) ?? 0) + e.text.length);
  const bodyFamily = [...fam.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'Arial, Helvetica, sans-serif';

  // page ids must be unique across pages: asset ids were generated per page, so re-key them
  // (done by prefixing the page number to avoid collisions)
  const uniqueAssets: Record<string, TemplateAsset> = {};
  const pagesHtml: string[] = [];
  results.forEach((r, idx) => {
    const remap = new Map<string, string>();
    for (const a of r.assets) { const nid = `p${idx + 1}_${a.id}`; remap.set(a.id, nid); uniqueAssets[nid] = { ...a, id: nid }; }
    for (const e of r.page.elements) if (e.type === 'image') e.assetId = remap.get(e.assetId) ?? e.assetId;
    const body = r.svgBody.replace(/\{\{aid:(\w+)\}\}/g, (_m, id: string) => remap.get(id) ?? id);
    const dynHtml = idx === 0 ? DYNAMIC_MARKER : '';
    pagesHtml.push(
      `<section class="rc-page" data-page="${r.page.pageNumber}" style="width:${r.page.width}pt;height:${r.page.height}pt">` +
      `<svg class="rc-layer" xmlns="http://www.w3.org/2000/svg" width="${r.page.width}pt" height="${r.page.height}pt" viewBox="0 0 ${r.page.width} ${r.page.height}">${body}</svg>` +
      dynHtml +
      `</section>`);
  });

  const css = [
    `@page{size:${W}pt ${H}pt;margin:0}`,
    'html,body{margin:0;padding:0;background:#fff}',
    '*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}',
    '.rc-card{display:block}',
    '.rc-page{position:relative;overflow:hidden;background:#fff;break-after:page;page-break-after:always}',
    '.rc-card:last-child .rc-page:last-child{break-after:auto;page-break-after:auto}',
    '.rc-layer{position:absolute;left:0;top:0;overflow:visible}',
    '.rc-defs{position:absolute;width:0;height:0;overflow:hidden}',
    '.rc-layer text{white-space:pre}',
    `.dyn{position:absolute;overflow:hidden;white-space:nowrap;color:#0f172a;font-family:${bodyFamily};line-height:1.2}`,
    '.dyn.ml{white-space:normal}',
    '.dyn.photo{padding:0}',
    '.dyn.tick{text-align:center}',
    '.rc-table{position:absolute}',
    '.rc-table .row{position:absolute;left:0;right:0}',
    '.rc-table .cell{position:absolute;top:0;bottom:0;white-space:nowrap;overflow:hidden;padding:0 1.5pt;line-height:1.2}',
    ...fontCss,
  ].join('\n');

  const title = esc(fileName ?? 'Report card template');
  const assetDefs = Object.keys(uniqueAssets).length
    ? `<svg class="rc-defs" xmlns="http://www.w3.org/2000/svg" width="0" height="0" aria-hidden="true"><defs>${Object.values(uniqueAssets).map(a => `<image id="img_${a.id}" width="1" height="1" preserveAspectRatio="none" href="{{asset:${a.id}}}"/>`).join('')}</defs></svg>\n`
    : '';
  const htmlWithRefs = `<!DOCTYPE html>\n<html lang="en"><head><meta charset="utf-8"><title>${title}</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>\n${css}\n</style></head><body>\n${assetDefs}<!--rc:body-->${pagesHtml.join('\n')}<!--/rc:body-->\n</body></html>`;
  const html = resolveAssetRefs(htmlWithRefs, uniqueAssets);

  const stats = {
    texts: results.reduce((n, r) => n + r.page.elements.filter(e => e.type === 'text').length, 0),
    images: results.reduce((n, r) => n + r.page.elements.filter(e => e.type === 'image').length, 0),
    shapes: results.reduce((n, r) => n + r.page.elements.filter(e => e.type === 'shape').length, 0),
    dynamic: dyn.length,
  };
  const warnings = results.flatMap(r => r.page.warnings.map(w => `Page ${r.page.pageNumber}: ${w}`));
  const orient = W > H ? 'landscape' : 'portrait';
  const meta: HtmlTemplateMetadata = {
    templateId: `tpl_${Date.now().toString(36)}`,
    generator: { name: 'veloce-pdf-to-html', version: HTML_TEMPLATE_VERSION },
    sourceDocument: { fileName, pageCount: results.length },
    pageSettings: { width: W, height: H, unit: 'pt', widthMm: r2(W * 25.4 / 72), heightMm: r2(H * 25.4 / 72), orientation: orient },
    pages: results.map(r => r.page),
    assets: Object.values(uniqueAssets).map(a => ({ id: a.id, mime: a.mime, width: a.width, height: a.height, origin: a.origin, sourceReference: a.sourceReference })),
    warnings, stats, createdAt: new Date().toISOString(),
  };
  return { html, htmlWithRefs, css, metadata: meta, assets: uniqueAssets };
}

// Dynamic elements → HTML placeholders.
export const DYNAMIC_MARKER = '<!--rc:dynamic-->';

// Replaces the {{asset:id}} references by the extracted images (data URLs) so the document is self-contained.
export function resolveAssetRefs(html: string, assets: Record<string, { dataUrl: string }>): string {
  return html.replace(/\{\{asset:(\w+)\}\}/g, (_m, id: string) => assets[id]?.dataUrl ?? '');
}

// The placeholder markup of the dynamic fields, built from the template's current field definitions.
export function composeDynamicHtml(fields: TemplateField[], W: number, H: number): string {
  return dynamicHtml(buildDynamicElements(fields, W, H, 1), fields, W, H);
}

function dynamicHtml(dyn: DynamicElement[], fields: TemplateField[], W: number, H: number): string {
  let out = '';
  for (const d of dyn) {
    const pos = `left:${r2(d.x)}pt;top:${r2(d.y)}pt;width:${r2(d.width)}pt;height:${r2(d.height)}pt`;
    const fs = d.fontSize ?? 10;
    if (d.kind === 'table') {
      const t = fields.find(f => f.type === 'table');
      if (t && t.type === 'table') out += `<div class="rc-table" data-field="${d.fieldKey}" data-id="${d.id}" style="${pos}">${legacyTableHtml(t, W, H)}</div>`;
    } else if (d.kind === 'photo') {
      out += `<div class="dyn photo" data-field="${d.fieldKey}" data-id="${d.id}" style="${pos}">{{{${d.dataBinding}}}}</div>`;
    } else {
      const ml = (d.maxLines ?? 1) > 1;
      const style = `${pos};font-size:${r2(fs)}pt;text-align:${d.align ?? 'left'};${d.bold ? 'font-weight:700;' : ''}${ml ? '' : `line-height:${r2(d.height)}pt;`}`;
      // the NOTES column gets a per-student class (red when the mark is under the pass average)
      const low = d.kind === 'grid_cell' && d.dataBinding.endsWith('.mark') ? ` {{${d.dataBinding}Class}}` : '';
      const cls = `dyn ${d.kind === 'tick' ? 'tick' : ''} ${ml ? 'ml' : ''}${low}`.replace(/\s+/g, ' ').trim();
      out += `<div class="${cls}" data-field="${d.fieldKey}" data-id="${d.id}" data-fit="1" data-fs="${r2(fs)}" style="${style}">{{${d.dataBinding}}}</div>`;
    }
  }
  return out;
}

// Shrinks a value that does not fit its box (down to 5.5pt), like the PDF renderer does. Added by the renderer, never stored.
export const FIT_SCRIPT = `<script>(function(){function fit(){var n=document.querySelectorAll('.dyn[data-fit]');for(var i=0;i<n.length;i++){var e=n[i],fs=parseFloat(e.getAttribute('data-fs'))||10,ml=e.classList.contains('ml');e.style.fontSize=fs+'pt';var g=0;while(g++<60&&fs>5.5&&(e.scrollWidth>e.clientWidth+0.5||(ml&&e.scrollHeight>e.clientHeight+0.5))){fs-=0.25;e.style.fontSize=fs+'pt'}}}window.rcFit=fit;if(document.readyState!=='loading')fit();else document.addEventListener('DOMContentLoaded',fit)})();</script>`;
