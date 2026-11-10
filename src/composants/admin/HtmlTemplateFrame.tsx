/*
 * Copyright (c) 2026 [COMPANY LEGAL NAME]. All rights reserved.
 * Proprietary and confidential. Unauthorized copying, distribution or
 * modification of this file, via any medium, is strictly prohibited.
 */
// Shows a generated HTML document at its true page size (pt → CSS px), scaled to fit the available width.
// The scale is applied with a transform, so the document's own layout is never reflowed.
import { useEffect, useRef, useState } from 'react';

interface Props {
  html: string;
  pageWidthPt: number;
  title: string;
  className?: string;
  style?: React.CSSProperties;
}

export default function HtmlTemplateFrame({ html, pageWidthPt, title, className, style }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [avail, setAvail] = useState(0);
  const [contentH, setContentH] = useState(1123);
  const px = pageWidthPt * 96 / 72;

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setAvail(el.clientWidth));
    ro.observe(el);
    setAvail(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const k = avail > 0 ? Math.min(1, avail / px) : 1;
  return (
    <div ref={wrapRef} className={className} style={{ width: '100%', ...style }}>
      <div style={{ width: px * k, height: contentH * k, margin: '0 auto', overflow: 'hidden' }}>
        <iframe
          title={title}
          srcDoc={html}
          // same-origin so the page can be measured; the document carries a CSP that forbids any network access
          sandbox="allow-same-origin allow-scripts"
          onLoad={e => {
            const d = e.currentTarget.contentDocument;
            if (d) setContentH(Math.max(d.documentElement.scrollHeight, d.body.scrollHeight));
          }}
          style={{ width: px, height: contentH, border: 0, background: '#fff', transform: `scale(${k})`, transformOrigin: '0 0', display: 'block' }}
        />
      </div>
    </div>
  );
}
