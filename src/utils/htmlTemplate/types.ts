/*
 * Copyright (c) 2026 [COMPANY LEGAL NAME]. All rights reserved.
 * Proprietary and confidential. Unauthorized copying, distribution or
 * modification of this file, via any medium, is strictly prohibited.
 */
// Data model of a PDF → HTML report-card template. Everything is expressed in PDF points (1/72 in)
// with the origin at the TOP-LEFT of the page (the PDF's bottom-left origin is already flipped), so
// the same numbers drive the HTML, the metadata and the designer overlay.

export interface TemplateAsset {
  id: string;
  mime: string;
  dataUrl: string;                  // the extracted image, lossless (PNG) unless it was already a JPEG stream
  width: number; height: number;    // natural pixel size
  origin: 'extracted_from_pdf';
  sourceReference: { pageNumber: number; pdfObjectReference: string };
}

export type ElementType = 'text' | 'image' | 'shape' | 'dynamic';

export interface BaseElement {
  id: string;
  type: ElementType;
  page: number;
  x: number; y: number; width: number; height: number; // pt, top-left origin
  dynamic: boolean;
  z: number;                                            // paint order within the page
}

export interface TextElement extends BaseElement {
  type: 'text';
  text: string;
  font: { family: string; pdfName: string; size: number; weight: number; italic: boolean };
  color: string;
  rotation: number;                                     // degrees, clockwise
  dynamic: false;
}

export interface ImageElement extends BaseElement {
  type: 'image';
  assetId: string;
  aspectRatio: number;
  rotation: number;
  matrix?: [number, number, number, number, number, number]; // only for skewed / rotated placements
  dynamic: false;
}

export interface ShapeElement extends BaseElement {
  type: 'shape';
  kind: 'rect' | 'path';
  fill: string | null;
  stroke: string | null;
  strokeWidth: number;
  dynamic: false;
}

export interface DynamicElement extends BaseElement {
  type: 'dynamic';
  dynamic: true;
  fieldKey: string;                 // the existing field key (student_name, subject_grid.row, ...)
  label: string;                    // human description shown in the validation UI
  dataBinding: string;              // placeholder path, e.g. student.fullName
  kind: 'text' | 'photo' | 'tick' | 'grid_cell' | 'group_total' | 'table';
  confidence?: 'high' | 'review';
  note?: string;
  align?: 'left' | 'center' | 'right';
  fontSize?: number;
  bold?: boolean;
  maxLines?: number;
}

export type TemplateElement = TextElement | ImageElement | ShapeElement | DynamicElement;

export interface TemplatePage {
  pageNumber: number;
  width: number; height: number;
  scanned: boolean;
  fidelity: 'full' | 'partial';
  elements: TemplateElement[];
  warnings: string[];
}

export interface HtmlTemplateMetadata {
  templateId: string;
  generator: { name: string; version: number };
  sourceDocument: { fileName: string | null; pageCount: number };
  pageSettings: { width: number; height: number; unit: 'pt'; widthMm: number; heightMm: number; orientation: 'portrait' | 'landscape' };
  pages: TemplatePage[];
  assets: Omit<TemplateAsset, 'dataUrl'>[];
  warnings: string[];
  stats: { texts: number; images: number; shapes: number; dynamic: number };
  createdAt: string;
}

export interface HtmlTemplate {
  html: string;                                  // static page reconstruction, assets inlined, with a dynamic-fields marker
  htmlWithRefs: string;                          // same, but images are {{asset:id}} references (what gets stored)
  css: string;                                   // also inlined in <head>; kept separately for editing
  metadata: HtmlTemplateMetadata;
  assets: Record<string, TemplateAsset>;
}

export const HTML_TEMPLATE_VERSION = 1;
