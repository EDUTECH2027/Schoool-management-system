import { useState, useEffect, useRef } from 'react';
import type { Editor } from '@tiptap/react';
import {
  Search, Printer, FileBadge, Stamp, Save, CheckCircle, FolderOpen, Trash2,
  Palette, Image as ImageIcon, X, RotateCcw, Move,
} from 'lucide-react';
import type { Student, Class } from '../types';
import { useLanguage } from '../i18n/LanguageContext';
import { useBranding } from '../context/BrandingContext';
import { api, type SavedCertificate } from '../api/client';
import { mapStudent, mapClass } from '../api/mappers';
import { DOCUMENT_TYPES, DESIGN_THEMES, fillTemplate, type DocumentType } from '../data/certificateTemplates';
import CertificateDesign, {
  type CertificateData, type EditableField, type StyleOverride, type ElementKey, type FontPairing,
} from '../composants/certificates/CertificateDesign';
import RichTextEditor from '../composants/certificates/RichTextEditor';

function readImageAsDataUrl(file: File, maxDim: number, quality: number): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) { reject(new Error('Not an image')); return; }
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const ratio = Math.min(maxDim / img.width, maxDim / img.height, 1);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * ratio);
        canvas.height = Math.round(img.height * ratio);
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/webp', quality));
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const PREVIEW_SCALE = 0.58;

interface Fields {
  docLabel: string; recipientName: string;
  signatoryName: string; signatoryTitle: string; issueDate: string; certNumber: string;
}

function genCertNumber() {
  const year = new Date().getFullYear();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `CERT-${year}-${rand}`;
}

function todayDisplay(lang: 'en' | 'fr') {
  return new Date().toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-GB', { year: 'numeric', month: 'long', day: 'numeric' });
}

export default function Certificates() {
  const { lang } = useLanguage();
  const lbl = (en: string, fr: string) => lang === 'fr' ? fr : en;
  const { schoolName, schoolInfo, logoUrl } = useBranding();

  const [studentList, setStudentList] = useState<Student[]>([]);
  const [classes,     setClasses]     = useState<Class[]>([]);
  const [savedCerts,  setSavedCerts]  = useState<SavedCertificate[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [academicYear, setAcademicYear] = useState(String(new Date().getFullYear()));

  const [studentId, setStudentId] = useState('');
  const [studentMeta, setStudentMeta] = useState<{ name: string; number: string; className: string } | null>(null);
  const [docTypeId, setDocTypeId] = useState(DOCUMENT_TYPES[0].id);
  const [themeId,   setThemeId]   = useState(DESIGN_THEMES[0].id);
  const [savedId,   setSavedId]   = useState<string | null>(null);

  const [fields, setFields] = useState<Fields>({
    docLabel: DOCUMENT_TYPES[0].label.en,
    recipientName: lbl('Recipient Name', 'Nom du Bénéficiaire'),
    signatoryName: '', signatoryTitle: lbl('Head Teacher', 'Directeur/Directrice'),
    issueDate: todayDisplay(lang), certNumber: genCertNumber(),
  });
  const [bodyHtml, setBodyHtml] = useState(`<p>${DOCUMENT_TYPES[0].body[lang]}</p>`);
  const [bodyFocused, setBodyFocused] = useState(false);
  const editorRef = useRef<Editor | null>(null);

  const [styleOverride, setStyleOverride] = useState<StyleOverride>({});
  const [showCustomize, setShowCustomize] = useState(false);
  const bgFileRef  = useRef<HTMLInputElement>(null);
  const logoFileRef = useRef<HTMLInputElement>(null);

  const [printing, setPrinting] = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);

  const loadSavedCerts = () => api.getCertificates().then(setSavedCerts).catch(console.error);

  useEffect(() => {
    Promise.all([api.getStudents(), api.getClasses(), api.getYears()])
      .then(([sts, cls, yrs]) => {
        setStudentList(sts.map(mapStudent));
        setClasses(cls.map(mapClass));
        const current = yrs.find(y => y.is_current) ?? yrs[0];
        if (current) setAcademicYear(current.label);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
    loadSavedCerts();
  }, []);

  useEffect(() => {
    setFields(f => f.signatoryName ? f : { ...f, signatoryName: schoolInfo.headTeacher || '' });
  }, [schoolInfo.headTeacher]);

  // Pushes new HTML into both the state (drives the preview) and the live
  // TipTap instance (emitUpdate: false avoids bouncing straight back into
  // handleBodyChange and re-triggering this same reset).
  const resetBody = (html: string) => {
    setBodyHtml(html);
    editorRef.current?.commands.setContent(html, { emitUpdate: false });
  };

  // Switching student: only the recipient name and the class-dependent body
  // text should change — signatory/date/cert number and the chosen document
  // type's own text are independent of who the certificate is for.
  const pickStudent = (s: Student) => {
    const isFirstPick = !studentId;
    setStudentId(s.id);
    setStudentMeta({ name: `${s.firstName} ${s.lastName}`, number: s.studentNumber, className: s.className });
    const d = DOCUMENT_TYPES.find(x => x.id === docTypeId)!;
    resetBody(`<p>${fillTemplate(d.body[lang], { class: s.className, school: schoolName, year: academicYear })}</p>`);
    setFields(f => ({
      ...f, recipientName: `${s.firstName} ${s.lastName}`,
      signatoryName: isFirstPick ? (schoolInfo.headTeacher || f.signatoryName) : f.signatoryName,
    }));
    setSavedId(null);
  };

  // Switching document type: only the type's own label/body change — the
  // recipient, signatory and date the admin already set should survive.
  const pickDocType = (d: DocumentType) => {
    setDocTypeId(d.id);
    const student = studentList.find(s => s.id === studentId) ?? null;
    const body = fillTemplate(d.body[lang], { class: student?.className ?? '', school: schoolName, year: academicYear });
    resetBody(`<p>${body}</p>`);
    setFields(f => ({ ...f, docLabel: d.label[lang] }));
    setSavedId(null);
  };

  const loadSavedCert = (cert: SavedCertificate) => {
    setStudentId(cert.student_id);
    setStudentMeta({ name: cert.student_name ?? '', number: cert.student_number ?? '', className: cert.class_name ?? '' });
    setDocTypeId(cert.doc_type_id);
    setThemeId(cert.theme_id);
    setFields({
      docLabel: cert.doc_label, recipientName: cert.recipient_name,
      signatoryName: cert.signatory_name ?? '', signatoryTitle: cert.signatory_title ?? '',
      issueDate: cert.issue_date, certNumber: cert.cert_number,
    });
    resetBody(cert.body_html);
    setStyleOverride((cert.style as StyleOverride) ?? {});
    setSavedId(cert.id);
  };

  // Picking a base theme resets colors/fonts/ornaments back to that preset,
  // but keeps any custom drag positions — repositioning is independent of
  // which color scheme is applied on top.
  const pickTheme = (id: string) => {
    setThemeId(id);
    setStyleOverride(s => ({ positions: s.positions }));
  };

  const updateStyle = (patch: Partial<StyleOverride>) => setStyleOverride(s => ({ ...s, ...patch }));

  const handlePositionChange = (key: ElementKey, x: number, y: number) => {
    setStyleOverride(s => ({ ...s, positions: { ...s.positions, [key]: { x, y } } }));
  };

  const resetCustomization = () => setStyleOverride(s => ({ positions: s.positions }));
  const resetPositions = () => setStyleOverride(s => ({ ...s, positions: undefined }));

  const handleBgImageUpload = async (file: File) => {
    try { updateStyle({ bgImage: await readImageAsDataUrl(file, 1400, 0.82) }); }
    catch (err) { console.error('Failed to load background image:', err); }
  };
  const handleLogoUpload = async (file: File) => {
    try { updateStyle({ customLogo: await readImageAsDataUrl(file, 300, 0.9) }); }
    catch (err) { console.error('Failed to load logo image:', err); }
  };

  const deleteSavedCert = async (id: string) => {
    try {
      await api.deleteCertificate(id);
      setSavedCerts(prev => prev.filter(c => c.id !== id));
      if (savedId === id) setSavedId(null);
    } catch (err) { console.error('Failed to delete certificate:', err); }
  };

  const filteredStudents = studentList.filter(s => {
    const name = `${s.firstName} ${s.lastName} ${s.studentNumber}`.toLowerCase();
    const matchSearch = name.includes(search.toLowerCase());
    const matchClass  = filterClass ? s.classId === filterClass : true;
    return matchSearch && matchClass;
  });

  const docType = DOCUMENT_TYPES.find(d => d.id === docTypeId)!;

  const certData: CertificateData = {
    schoolName, schoolMotto: schoolInfo.motto, schoolAddress: schoolInfo.address, logoUrl,
    docLabel: fields.docLabel, bodyHtml, recipientName: fields.recipientName,
    issueDate: fields.issueDate, certNumber: fields.certNumber,
    signatoryName: fields.signatoryName || '—', signatoryTitle: fields.signatoryTitle,
    kind: docType.kind,
  };

  const handleFieldChange = (field: EditableField, value: string) => {
    setFields(f => ({ ...f, [field]: value }));
    setSaved(false);
  };

  const handleBodyChange = (html: string) => {
    setBodyHtml(html);
    setSaved(false);
  };

  const handlePrint = () => {
    if (!studentId) return;
    setPrinting(true);
    setTimeout(() => {
      window.print();
      setPrinting(false);
    }, 200);
  };

  const handleSave = async () => {
    if (!studentId) return;
    setSaving(true);
    const payload = {
      studentId, studentName: studentMeta?.name, studentNumber: studentMeta?.number, className: studentMeta?.className,
      docTypeId, themeId, kind: docType.kind,
      docLabel: fields.docLabel, bodyHtml, recipientName: fields.recipientName,
      issueDate: fields.issueDate, certNumber: fields.certNumber,
      signatoryName: fields.signatoryName, signatoryTitle: fields.signatoryTitle,
      style: Object.keys(styleOverride).length > 0 ? styleOverride : undefined,
    };
    try {
      if (savedId) {
        const updated = await api.updateCertificate(savedId, payload);
        setSavedCerts(prev => prev.map(c => c.id === savedId ? updated : c));
      } else {
        const created = await api.createCertificate(payload);
        setSavedId(created.id);
        setSavedCerts(prev => [created, ...prev]);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error('Failed to save certificate:', err);
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Print-only landscape overlay */}
      {printing && (
        <>
          <style>{'@page { size: A4 landscape; margin: 0; }'}</style>
          <div className="print-only">
            <CertificateDesign theme={themeId} data={certData} style={styleOverride} />
          </div>
        </>
      )}

      <div className="no-print space-y-5">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">{lbl('Certificates & Attestations', 'Certificats & Attestations')}</h2>
          <p className="text-slate-500 text-sm">{lbl('Pick a student and a starting design, then edit the document directly like a document — save it, print it, or come back to it later.', 'Choisissez un élève et un modèle, puis modifiez le document directement — enregistrez-le, imprimez-le ou revenez-y plus tard.')}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* 1. Student picker */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col">
            <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wide mb-3">
              {lbl('1. Choose Student', '1. Choisir un Élève')}
            </p>
            <div className="relative mb-2">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder={lbl('Search students…', 'Rechercher…')}
                className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <select
              value={filterClass} onChange={e => setFilterClass(e.target.value)}
              className="w-full mb-3 py-2 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">{lbl('All classes', 'Toutes les classes')}</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <div className="flex-1 overflow-y-auto max-h-72 space-y-1 -mx-1 px-1">
              {filteredStudents.map(s => (
                <button
                  key={s.id}
                  onClick={() => pickStudent(s)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    studentId === s.id ? 'bg-indigo-600 text-white' : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <p className="font-medium">{s.firstName} {s.lastName}</p>
                  <p className={`text-xs ${studentId === s.id ? 'text-indigo-100' : 'text-slate-400'}`}>
                    {s.studentNumber} · {s.className || lbl('No class', 'Aucune classe')}
                  </p>
                </button>
              ))}
              {filteredStudents.length === 0 && (
                <p className="text-slate-400 text-sm text-center py-6">{lbl('No students found', 'Aucun élève trouvé')}</p>
              )}
            </div>
          </div>

          {/* 2. Document type */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wide mb-3">
              {lbl('2. Choose Document Type', '2. Choisir le Type de Document')}
            </p>
            <div className="space-y-1.5 max-h-96 overflow-y-auto -mx-1 px-1">
              {DOCUMENT_TYPES.map(d => (
                <button
                  key={d.id}
                  onClick={() => pickDocType(d)}
                  className={`w-full flex items-center gap-2.5 text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${
                    docTypeId === d.id ? 'bg-indigo-600 text-white' : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  {d.kind === 'certificate'
                    ? <FileBadge size={15} className={docTypeId === d.id ? 'text-white' : 'text-indigo-400'} />
                    : <Stamp size={15} className={docTypeId === d.id ? 'text-white' : 'text-indigo-400'} />}
                  <span className="flex-1">{d.label[lang]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 3. Design theme */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wide mb-3">
              {lbl('3. Choose Design', '3. Choisir le Modèle')}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {DESIGN_THEMES.map(th => (
                <button
                  key={th.id}
                  onClick={() => pickTheme(th.id)}
                  className={`rounded-lg border p-2.5 text-left transition-all ${
                    themeId === th.id ? 'border-indigo-500 ring-2 ring-indigo-200' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div
                    className="h-10 rounded mb-1.5 border"
                    style={{ background: th.swatch[0], borderColor: th.swatch[1] }}
                  >
                    <div className="h-1.5 w-8 mt-1.5 ml-1.5 rounded-full" style={{ background: th.swatch[1] }} />
                  </div>
                  <p className="text-xs font-medium text-slate-700 leading-tight">{th.label[lang]}</p>
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowCustomize(v => !v)}
              className="w-full flex items-center justify-center gap-1.5 mt-3 py-2 text-xs font-medium text-indigo-600 border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
            >
              <Palette size={13} /> {showCustomize ? lbl('Hide Customization', 'Masquer Personnalisation') : lbl('Customize Colors, Fonts & Images', 'Personnaliser Couleurs, Polices & Images')}
            </button>

            {showCustomize && (
              <div className="mt-3 space-y-3 border-t border-slate-100 pt-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 mb-1">{lbl('Accent Color', 'Couleur Accent')}</label>
                    <input type="color" value={styleOverride.accentColor ?? '#4f46e5'}
                      onChange={e => updateStyle({ accentColor: e.target.value })}
                      className="w-full h-8 rounded-lg border border-slate-200 cursor-pointer" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 mb-1">{lbl('Background Color', 'Couleur de Fond')}</label>
                    <input type="color" value={styleOverride.bgColor ?? '#ffffff'}
                      onChange={e => updateStyle({ bgColor: e.target.value })}
                      className="w-full h-8 rounded-lg border border-slate-200 cursor-pointer" />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">{lbl('Font Pairing', 'Police')}</label>
                  <select
                    value={styleOverride.font ?? ''}
                    onChange={e => updateStyle({ font: (e.target.value || undefined) as FontPairing | undefined })}
                    className="w-full py-1.5 px-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">{lbl('Theme default', 'Par défaut')}</option>
                    <option value="serif">{lbl('Serif (formal)', 'Serif (formel)')}</option>
                    <option value="sans">{lbl('Sans (modern)', 'Sans (moderne)')}</option>
                    <option value="mono-accent">{lbl('Mono accent', 'Accent mono')}</option>
                  </select>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 mb-1">{lbl('Corners', 'Coins')}</label>
                    <select value={styleOverride.corners ?? ''} onChange={e => updateStyle({ corners: (e.target.value || undefined) as StyleOverride['corners'] })}
                      className="w-full py-1.5 px-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
                      <option value="">{lbl('Default', 'Défaut')}</option>
                      <option value="diamond">{lbl('Diamond', 'Losange')}</option>
                      <option value="triangle">{lbl('Bracket', 'Crochet')}</option>
                      <option value="none">{lbl('None', 'Aucun')}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 mb-1">{lbl('Seal', 'Sceau')}</label>
                    <select value={styleOverride.seal ?? ''} onChange={e => updateStyle({ seal: (e.target.value || undefined) as StyleOverride['seal'] })}
                      className="w-full py-1.5 px-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
                      <option value="">{lbl('Default', 'Défaut')}</option>
                      <option value="ring-gold">{lbl('Ring', 'Anneau')}</option>
                      <option value="flat-indigo">{lbl('Flat', 'Plat')}</option>
                      <option value="stamp-navy">{lbl('Stamp', 'Tampon')}</option>
                      <option value="star-copper">{lbl('Star', 'Étoile')}</option>
                      <option value="none">{lbl('None', 'Aucun')}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 mb-1">{lbl('Rule', 'Ligne')}</label>
                    <select value={styleOverride.rule ?? ''} onChange={e => updateStyle({ rule: (e.target.value || undefined) as StyleOverride['rule'] })}
                      className="w-full py-1.5 px-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
                      <option value="">{lbl('Default', 'Défaut')}</option>
                      <option value="double">{lbl('Double', 'Double')}</option>
                      <option value="single">{lbl('Single', 'Simple')}</option>
                      <option value="none">{lbl('None', 'Aucune')}</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 mb-1">{lbl('Background Image', 'Image de Fond')}</label>
                    <input ref={bgFileRef} type="file" accept="image/*" className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleBgImageUpload(f); e.target.value = ''; }} />
                    {styleOverride.bgImage ? (
                      <button onClick={() => updateStyle({ bgImage: undefined })}
                        className="w-full flex items-center justify-center gap-1 py-1.5 text-xs border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg">
                        <X size={12} /> {lbl('Remove', 'Retirer')}
                      </button>
                    ) : (
                      <button onClick={() => bgFileRef.current?.click()}
                        className="w-full flex items-center justify-center gap-1 py-1.5 text-xs border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg">
                        <ImageIcon size={12} /> {lbl('Upload', 'Téléverser')}
                      </button>
                    )}
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 mb-1">{lbl('Custom Logo', 'Logo Personnalisé')}</label>
                    <input ref={logoFileRef} type="file" accept="image/*" className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleLogoUpload(f); e.target.value = ''; }} />
                    {styleOverride.customLogo ? (
                      <button onClick={() => updateStyle({ customLogo: undefined })}
                        className="w-full flex items-center justify-center gap-1 py-1.5 text-xs border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg">
                        <X size={12} /> {lbl('Remove', 'Retirer')}
                      </button>
                    ) : (
                      <button onClick={() => logoFileRef.current?.click()}
                        className="w-full flex items-center justify-center gap-1 py-1.5 text-xs border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg">
                        <ImageIcon size={12} /> {lbl('Upload', 'Téléverser')}
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button onClick={resetCustomization}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 rounded-lg">
                    <RotateCcw size={12} /> {lbl('Reset Style', 'Réinitialiser Style')}
                  </button>
                  <button onClick={resetPositions}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 rounded-lg">
                    <Move size={12} /> {lbl('Reset Positions', 'Réinitialiser Positions')}
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  {lbl('Drag the logo, seal or signature directly on the document below to reposition them.', "Glissez le logo, le sceau ou la signature directement sur le document ci-dessous pour les repositionner.")}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Word-style editor (left) + live design preview (right) */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div>
              <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wide">{lbl('4. Edit & Print', '4. Modifier & Imprimer')}</p>
              {studentId && (
                <p className="text-slate-400 text-xs mt-0.5">
                  {lbl('Format the document body on the left — the design updates live on the right. The name, signature, date and number can still be edited directly on the document.', 'Mettez en forme le corps du document à gauche — le modèle se met à jour en direct à droite. Le nom, la signature, la date et le numéro restent modifiables directement sur le document.')}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSave}
                disabled={!studentId || saving}
                className={`flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed ${
                  saved ? 'bg-green-600 text-white' : 'bg-slate-700 hover:bg-slate-800 text-white'
                }`}
              >
                {saved ? <CheckCircle size={15} /> : <Save size={15} />}
                {saved ? lbl('Saved', 'Enregistré') : savedId ? lbl('Update', 'Mettre à jour') : lbl('Save', 'Enregistrer')}
              </button>
              <button
                onClick={handlePrint}
                disabled={!studentId}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                <Printer size={15} /> {lbl('Print / Save as PDF', 'Imprimer / PDF')}
              </button>
            </div>
          </div>
          {!studentId && (
            <p className="text-amber-600 text-xs bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mb-3">
              {lbl('Select a student to start editing.', 'Sélectionnez un élève pour commencer.')}
            </p>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-[38%_1fr] gap-4 items-start">
            {/* Left: rich-text document editor */}
            <div className="border border-slate-200 rounded-lg overflow-hidden shadow-sm" style={{ height: '520px' }}>
              <RichTextEditor
                initialContent={bodyHtml}
                editable={!!studentId}
                onChange={handleBodyChange}
                onFocus={() => setBodyFocused(true)}
                onBlur={() => setBodyFocused(false)}
                onEditorReady={ed => { editorRef.current = ed; }}
              />
            </div>

            {/* Right: live certificate preview */}
            <div className="overflow-auto border border-slate-200 rounded-lg shadow-sm bg-slate-50" style={{ height: '520px' }}>
              <div
                className="overflow-hidden mx-auto my-auto"
                style={{ width: `${297 * PREVIEW_SCALE}mm`, height: `${210 * PREVIEW_SCALE}mm` }}
              >
                <div style={{ transform: `scale(${PREVIEW_SCALE})`, transformOrigin: 'top left' }}>
                  <CertificateDesign
                    theme={themeId} data={certData} editable={!!studentId}
                    onFieldChange={handleFieldChange} style={styleOverride} onPositionChange={handlePositionChange}
                    bodyFocused={bodyFocused}
                    onBodyClick={() => editorRef.current?.chain().focus('end').run()}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Saved certificates */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <FolderOpen size={15} className="text-indigo-500" />
            <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wide">{lbl('Saved Certificates', 'Certificats Enregistrés')}</p>
          </div>
          {savedCerts.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-6">{lbl('Nothing saved yet — design a certificate above and save it to see it here.', "Rien d'enregistré pour l'instant.")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                    <th className="text-left px-3 py-2 font-medium">{lbl('Recipient', 'Bénéficiaire')}</th>
                    <th className="text-left px-3 py-2 font-medium">{lbl('Document', 'Document')}</th>
                    <th className="text-left px-3 py-2 font-medium">{lbl('Saved', 'Enregistré')}</th>
                    <th className="px-3 py-2 text-right font-medium">{lbl('Actions', 'Actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {savedCerts.map(c => (
                    <tr key={c.id} className={savedId === c.id ? 'bg-indigo-50' : ''}>
                      <td className="px-3 py-2.5">
                        <p className="font-medium text-slate-800">{c.recipient_name}</p>
                        <p className="text-xs text-slate-400">{c.class_name || '—'}</p>
                      </td>
                      <td className="px-3 py-2.5 text-slate-600">{c.doc_label}</td>
                      <td className="px-3 py-2.5 text-slate-500">{new Date(c.created_at).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-GB')}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => loadSavedCert(c)}
                            className="p-1.5 rounded-lg text-indigo-500 hover:bg-indigo-50 transition-colors"
                            title={lbl('Open', 'Ouvrir')}
                          >
                            <FolderOpen size={14} />
                          </button>
                          <button
                            onClick={() => deleteSavedCert(c.id)}
                            className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 transition-colors"
                            title={lbl('Delete', 'Supprimer')}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
