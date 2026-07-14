import { useRef, useState, type ElementType, type KeyboardEvent, type FocusEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { Award, Shield, Star, BadgeCheck } from 'lucide-react';

export interface CertificateData {
  schoolName: string;
  schoolMotto?: string;
  schoolAddress?: string;
  logoUrl?: string | null;
  docLabel: string;
  bodyHtml: string;
  recipientName: string;
  issueDate: string;
  certNumber: string;
  signatoryName: string;
  signatoryTitle: string;
  kind: 'certificate' | 'attestation';
}

export type EditableField =
  | 'docLabel' | 'recipientName'
  | 'signatoryName' | 'signatoryTitle' | 'issueDate' | 'certNumber';

export type FontPairing = 'serif' | 'sans' | 'mono-accent';
export type ElementKey = 'logo' | 'seal' | 'signature';

export interface StyleOverride {
  accentColor?: string;
  bgColor?: string;
  font?: FontPairing;
  corners?: 'diamond' | 'triangle' | 'none';
  seal?: 'ring-gold' | 'flat-indigo' | 'ring-emerald' | 'stamp-navy' | 'star-copper' | 'none';
  rule?: 'double' | 'single' | 'none';
  bgImage?: string;
  customLogo?: string;
  positions?: Partial<Record<ElementKey, { x: number; y: number }>>;
}

const FONT_PAIRINGS: Record<FontPairing, { heading: string; body: string }> = {
  serif:       { heading: "Georgia, 'Times New Roman', serif", body: "Georgia, 'Times New Roman', serif" },
  sans:        { heading: "'Segoe UI', system-ui, sans-serif", body: "'Segoe UI', system-ui, sans-serif" },
  'mono-accent': { heading: "ui-monospace, 'SF Mono', Consolas, monospace", body: "system-ui, 'Segoe UI', sans-serif" },
};

function lighten(hex: string, amt: number): string {
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean;
  const num = parseInt(full, 16);
  if (Number.isNaN(num)) return hex;
  let r = (num >> 16) & 255, g = (num >> 8) & 255, b = num & 255;
  r = Math.round(r + (255 - r) * amt); g = Math.round(g + (255 - g) * amt); b = Math.round(b + (255 - b) * amt);
  return `#${[r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')}`;
}

interface EditableTextProps {
  value: string;
  editable?: boolean;
  multiline?: boolean;
  as?: ElementType;
  className?: string;
  style?: React.CSSProperties;
  onCommit?: (value: string) => void;
}

function EditableText({ value, editable, multiline, as: Tag = 'p', className, style, onCommit }: EditableTextProps) {
  const ref = useRef<HTMLElement>(null);

  const handleBlur = (e: FocusEvent<HTMLElement>) => {
    const text = e.currentTarget.innerText.trim();
    if (onCommit && text !== value) onCommit(text || value);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (!multiline && e.key === 'Enter') { e.preventDefault(); (e.currentTarget as HTMLElement).blur(); }
  };

  return (
    <Tag
      ref={ref}
      contentEditable={!!editable}
      suppressContentEditableWarning
      spellCheck={false}
      onBlur={editable ? handleBlur : undefined}
      onKeyDown={editable ? handleKeyDown : undefined}
      className={className}
      style={{
        ...style,
        outline: 'none',
        whiteSpace: multiline ? 'pre-wrap' : style?.whiteSpace,
        cursor: editable ? 'text' : undefined,
        boxShadow: editable ? 'inset 0 0 0 1px transparent' : undefined,
      }}
      onMouseEnter={editable ? (e: React.MouseEvent<HTMLElement>) => { e.currentTarget.style.boxShadow = 'inset 0 0 0 1px currentColor'; e.currentTarget.style.opacity = '0.85'; } : undefined}
      onMouseLeave={editable ? (e: React.MouseEvent<HTMLElement>) => { e.currentTarget.style.boxShadow = 'inset 0 0 0 1px transparent'; e.currentTarget.style.opacity = '1'; } : undefined}
    >
      {value}
    </Tag>
  );
}

interface ThemeSpec {
  bg: string;
  ink: string;
  sub: string;
  accent: string;
  accentSoft: string;
  headingFont: string;
  bodyFont: string;
  border: (accent: string) => React.CSSProperties;
  corners: 'diamond' | 'triangle' | 'none';
  seal: 'ring-gold' | 'flat-indigo' | 'ring-emerald' | 'stamp-navy' | 'star-copper' | 'none';
  rule: 'double' | 'single' | 'none';
}

const THEME_SPECS: Record<string, ThemeSpec> = {
  'classic-gold': {
    bg: '#fdf8ec', ink: '#3b2f0b', sub: '#8a6d1f', accent: '#b8860b', accentSoft: '#e9d9a8',
    headingFont: "Georgia, 'Times New Roman', serif", bodyFont: "Georgia, 'Times New Roman', serif",
    border: accent => ({ border: `3px solid ${accent}`, boxShadow: `inset 0 0 0 5px ${accent}22, inset 0 0 0 6px ${accent}` }),
    corners: 'diamond', seal: 'ring-gold', rule: 'double',
  },
  'modern-indigo': {
    bg: '#ffffff', ink: '#1e1b4b', sub: '#6366f1', accent: '#4f46e5', accentSoft: '#e0e7ff',
    headingFont: "'Segoe UI', system-ui, sans-serif", bodyFont: "'Segoe UI', system-ui, sans-serif",
    border: accent => ({ border: `2px solid ${accent}` }),
    corners: 'none', seal: 'flat-indigo', rule: 'single',
  },
  'elegant-emerald': {
    bg: '#f7fbf8', ink: '#0b3d2a', sub: '#0f7a52', accent: '#0f7a52', accentSoft: '#cdeade',
    headingFont: "Georgia, 'Times New Roman', serif", bodyFont: "Georgia, 'Times New Roman', serif",
    border: accent => ({ border: `1px solid ${accent}`, boxShadow: `inset 0 0 0 4px #ffffff, inset 0 0 0 5px #c9a227` }),
    corners: 'none', seal: 'ring-emerald', rule: 'double',
  },
  'formal-navy': {
    bg: '#ffffff', ink: '#0e1f33', sub: '#1e3a5f', accent: '#1e3a5f', accentSoft: '#d7e2ee',
    headingFont: "Georgia, 'Times New Roman', serif", bodyFont: "Georgia, 'Times New Roman', serif",
    border: accent => ({ border: `4px solid ${accent}` }),
    corners: 'triangle', seal: 'stamp-navy', rule: 'single',
  },
  'warm-copper': {
    bg: '#fff8f0', ink: '#5c3410', sub: '#b45309', accent: '#b45309', accentSoft: '#fde3c7',
    headingFont: "system-ui, 'Segoe UI', sans-serif", bodyFont: "system-ui, 'Segoe UI', sans-serif",
    border: accent => ({ border: `3px solid ${accent}`, borderRadius: '18px' }),
    corners: 'none', seal: 'star-copper', rule: 'none',
  },
  'minimalist-mono': {
    bg: '#ffffff', ink: '#18181b', sub: '#71717a', accent: '#18181b', accentSoft: '#f4f4f5',
    headingFont: "system-ui, 'Segoe UI', sans-serif", bodyFont: "system-ui, 'Segoe UI', sans-serif",
    border: accent => ({ border: `1px solid ${accent}` }),
    corners: 'none', seal: 'none', rule: 'single',
  },
};

function resolveSpec(theme: string, override?: StyleOverride): ThemeSpec {
  const base = THEME_SPECS[theme] ?? THEME_SPECS['modern-indigo'];
  if (!override) return base;
  const pairing = override.font ? FONT_PAIRINGS[override.font] : null;
  return {
    ...base,
    accent: override.accentColor || base.accent,
    accentSoft: override.accentColor ? lighten(override.accentColor, 0.8) : base.accentSoft,
    bg: override.bgColor || base.bg,
    headingFont: pairing?.heading || base.headingFont,
    bodyFont: pairing?.body || base.bodyFont,
    corners: override.corners ?? base.corners,
    seal: override.seal ?? base.seal,
    rule: override.rule ?? base.rule,
  };
}

function Seal({ variant, accent, accentSoft }: { variant: ThemeSpec['seal']; accent: string; accentSoft: string }) {
  if (variant === 'none') return null;
  if (variant === 'flat-indigo') {
    return (
      <div className="w-16 h-16 rounded-full flex items-center justify-center shrink-0" style={{ background: accent }}>
        <BadgeCheck size={26} color="#fff" />
      </div>
    );
  }
  if (variant === 'star-copper') {
    return (
      <div className="w-16 h-16 rounded-full flex items-center justify-center shrink-0" style={{ background: accentSoft, border: `2px solid ${accent}` }}>
        <Star size={24} color={accent} fill={accent} />
      </div>
    );
  }
  if (variant === 'stamp-navy') {
    return (
      <div
        className="w-[68px] h-[68px] rounded-full flex items-center justify-center shrink-0"
        style={{ border: `2px solid ${accent}`, boxShadow: `inset 0 0 0 4px #fff, inset 0 0 0 5px ${accent}` }}
      >
        <Shield size={24} color={accent} />
      </div>
    );
  }
  // ring-gold / ring-emerald
  return (
    <div
      className="w-[70px] h-[70px] rounded-full flex items-center justify-center shrink-0"
      style={{ border: `3px double ${accent}`, background: accentSoft }}
    >
      <Award size={26} color={accent} />
    </div>
  );
}

function CornerMarks({ variant, accent }: { variant: ThemeSpec['corners']; accent: string }) {
  if (variant === 'none') return null;
  const positions = [
    { top: '10mm', left: '10mm' },
    { top: '10mm', right: '10mm' },
    { bottom: '10mm', left: '10mm' },
    { bottom: '10mm', right: '10mm' },
  ];
  return (
    <>
      {positions.map((pos, i) =>
        variant === 'diamond' ? (
          <div key={i} className="absolute w-3 h-3" style={{ ...pos, background: accent, transform: 'rotate(45deg)' }} />
        ) : (
          <div
            key={i}
            className="absolute w-4 h-4"
            style={{
              ...pos,
              borderTop: pos.top ? `3px solid ${accent}` : undefined,
              borderBottom: pos.bottom ? `3px solid ${accent}` : undefined,
              borderLeft: pos.left ? `3px solid ${accent}` : undefined,
              borderRight: pos.right ? `3px solid ${accent}` : undefined,
            }}
          />
        )
      )}
    </>
  );
}

const CANVAS_W_MM = 297;
const CANVAS_H_MM = 210;

// Anchors a draggable block at its themed default position until the admin
// drags it, at which point it switches to an absolute mm coordinate captured
// from wherever it visually was — so the handoff from flow-anchored to
// dragged never jumps.
function Draggable({
  elKey, editable, position, defaultStyle, containerRef, onDragEnd, children,
}: {
  elKey: ElementKey;
  editable?: boolean;
  position?: { x: number; y: number };
  defaultStyle: React.CSSProperties;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onDragEnd?: (key: ElementKey, x: number, y: number) => void;
  children: ReactNode;
}) {
  const elRef = useRef<HTMLDivElement>(null);
  const [live, setLive] = useState<{ x: number; y: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  const handlePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!editable) return;
    e.preventDefault();
    const container = containerRef.current;
    const el = elRef.current;
    if (!container || !el) return;
    const containerRect = container.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    const mmPerPx = CANVAS_W_MM / containerRect.width;
    const startX = (elRect.left - containerRect.left) * mmPerPx;
    const startY = (elRect.top - containerRect.top) * mmPerPx;
    const startPointerX = e.clientX;
    const startPointerY = e.clientY;
    setDragging(true);
    setLive({ x: startX, y: startY });

    const handleMove = (ev: PointerEvent) => {
      const dx = (ev.clientX - startPointerX) * mmPerPx;
      const dy = (ev.clientY - startPointerY) * mmPerPx;
      setLive({ x: startX + dx, y: startY + dy });
    };
    const handleUp = (ev: PointerEvent) => {
      const dx = (ev.clientX - startPointerX) * mmPerPx;
      const dy = (ev.clientY - startPointerY) * mmPerPx;
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      setDragging(false);
      setLive(null);
      onDragEnd?.(elKey, Math.max(0, startX + dx), Math.max(0, startY + dy));
    };
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
  };

  const style: React.CSSProperties = live
    ? { position: 'absolute', left: `${live.x}mm`, top: `${live.y}mm` }
    : position
      ? { position: 'absolute', left: `${position.x}mm`, top: `${position.y}mm` }
      : { position: 'absolute', ...defaultStyle };

  return (
    <div
      ref={elRef}
      onPointerDown={handlePointerDown}
      style={{
        ...style,
        cursor: editable ? (dragging ? 'grabbing' : 'grab') : undefined,
        outline: editable && !dragging ? '1px dashed transparent' : undefined,
        transition: dragging ? 'none' : undefined,
        touchAction: editable ? 'none' : undefined,
        zIndex: dragging ? 20 : 10,
      }}
      onMouseEnter={editable ? (e: React.MouseEvent<HTMLDivElement>) => { e.currentTarget.style.outline = '1px dashed currentColor'; } : undefined}
      onMouseLeave={editable ? (e: React.MouseEvent<HTMLDivElement>) => { e.currentTarget.style.outline = '1px dashed transparent'; } : undefined}
    >
      {children}
    </div>
  );
}

interface CertificateDesignProps {
  theme: string;
  data: CertificateData;
  editable?: boolean;
  onFieldChange?: (field: EditableField, value: string) => void;
  style?: StyleOverride;
  onPositionChange?: (key: ElementKey, x: number, y: number) => void;
  onBodyClick?: () => void;
  bodyFocused?: boolean;
}

export default function CertificateDesign({
  theme, data, editable, onFieldChange, style: override, onPositionChange, onBodyClick, bodyFocused,
}: CertificateDesignProps) {
  const spec = resolveSpec(theme, override);
  const commit = (field: EditableField) => (value: string) => onFieldChange?.(field, value);
  const containerRef = useRef<HTMLDivElement>(null);
  const effectiveLogo = override?.customLogo || data.logoUrl;
  const positions = override?.positions;

  return (
    <div
      ref={containerRef}
      className="relative shrink-0"
      style={{
        width: `${CANVAS_W_MM}mm`, height: `${CANVAS_H_MM}mm`, background: spec.bg, color: spec.ink,
        fontFamily: spec.bodyFont, boxSizing: 'border-box', overflow: 'hidden',
        ...(override?.bgImage ? { backgroundImage: `url(${override.bgImage})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}),
      }}
    >
      <div className="absolute inset-[6mm]" style={spec.border(spec.accent)} />
      <CornerMarks variant={spec.corners} accent={spec.accent} />

      {/* Centered flow content: rule / title / intro / name / clause */}
      <div
        className="absolute inset-[12mm] flex flex-col items-center text-center px-10"
        style={{ paddingTop: '30mm', paddingBottom: '38mm', justifyContent: 'center' }}
      >
        {/* Rule */}
        {spec.rule !== 'none' && (
          <div className="mb-4" style={{
            width: '90px',
            borderBottom: spec.rule === 'double' ? `3px double ${spec.accent}` : `1.5px solid ${spec.accent}`,
          }} />
        )}

        {/* Doc title */}
        <EditableText
          editable={editable} onCommit={commit('docLabel')} value={data.docLabel}
          className="font-bold uppercase"
          style={{ fontFamily: spec.headingFont, fontSize: '30px', letterSpacing: '2.5px', color: spec.accent }}
        />

        <p className="uppercase mt-1" style={{ fontSize: '10px', letterSpacing: '3px', color: spec.sub }}>
          {data.kind === 'attestation' ? 'Official Attestation' : 'Certificate'}
        </p>

        {/* Recipient name */}
        <EditableText
          editable={editable} onCommit={commit('recipientName')} value={data.recipientName}
          className="font-bold mt-8"
          style={{ fontFamily: spec.headingFont, fontSize: '34px', color: spec.ink, borderBottom: `1.5px solid ${spec.accent}`, paddingBottom: '4px', minWidth: '260px' }}
        />

        {/* Rich-text body, edited from the document panel */}
        <div
          onClick={editable ? onBodyClick : undefined}
          className="mt-6 max-w-107.5 leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_a]:underline [&_img]:max-w-full [&_img]:inline-block [&_table]:border-collapse [&_table]:mx-auto [&_td]:border [&_th]:border [&_td]:px-2 [&_td]:py-1 [&_th]:px-2 [&_th]:py-1"
          style={{
            fontSize: '12.5px', color: spec.ink,
            cursor: editable ? 'text' : undefined,
            outline: bodyFocused ? `2px solid ${spec.accent}88` : '2px solid transparent',
            outlineOffset: '6px', borderRadius: '4px', transition: 'outline-color 150ms',
          }}
          dangerouslySetInnerHTML={{ __html: data.bodyHtml }}
        />
      </div>

      {/* Draggable: school header / logo */}
      <Draggable
        elKey="logo" editable={editable} position={positions?.logo} containerRef={containerRef}
        onDragEnd={onPositionChange}
        defaultStyle={{ top: '14mm', left: '50%', transform: 'translateX(-50%)' }}
      >
        <div className="flex items-center gap-3">
          {effectiveLogo && <img src={effectiveLogo} alt="" className="w-10 h-10 object-contain" />}
          <div className="text-center">
            <p className="font-bold tracking-wide" style={{ fontFamily: spec.headingFont, fontSize: '13px', color: spec.ink }}>
              {data.schoolName.toUpperCase()}
            </p>
            {data.schoolMotto && <p className="italic" style={{ fontSize: '9px', color: spec.sub }}>{data.schoolMotto}</p>}
            {data.schoolAddress && <p style={{ fontSize: '8px', color: spec.sub }}>{data.schoolAddress}</p>}
          </div>
        </div>
      </Draggable>

      {/* Draggable: seal */}
      <Draggable
        elKey="seal" editable={editable} position={positions?.seal} containerRef={containerRef}
        onDragEnd={onPositionChange}
        defaultStyle={{ bottom: '14mm', left: '50%', transform: 'translateX(-50%)' }}
      >
        <Seal variant={spec.seal} accent={spec.accent} accentSoft={spec.accentSoft} />
      </Draggable>

      {/* Draggable: signature block */}
      <Draggable
        elKey="signature" editable={editable} position={positions?.signature} containerRef={containerRef}
        onDragEnd={onPositionChange}
        defaultStyle={{ bottom: '14mm', left: '22mm' }}
      >
        <div className="text-left" style={{ width: '160px' }}>
          <EditableText
            editable={editable} onCommit={commit('signatoryName')} value={data.signatoryName}
            style={{ fontSize: '11px', borderTop: `1px solid ${spec.sub}`, paddingTop: '4px' }}
          />
          <EditableText
            editable={editable} onCommit={commit('signatoryTitle')} value={data.signatoryTitle}
            style={{ fontSize: '9px', color: spec.sub }}
          />
        </div>
      </Draggable>

      {/* Date issued (fixed, mirrors signature) */}
      <div className="absolute text-right" style={{ bottom: '14mm', right: '22mm', width: '160px' }}>
        <EditableText
          editable={editable} onCommit={commit('issueDate')} value={data.issueDate}
          style={{ fontSize: '11px', borderTop: `1px solid ${spec.sub}`, paddingTop: '4px' }}
        />
        <p style={{ fontSize: '9px', color: spec.sub }}>Date Issued</p>
      </div>

      {/* Certificate number */}
      <EditableText
        editable={editable} onCommit={commit('certNumber')} value={data.certNumber}
        className="absolute" style={{ bottom: '8mm', right: '10mm', fontSize: '8px', color: spec.sub, fontFamily: 'ui-monospace, Consolas, monospace' }}
      />
    </div>
  );
}
