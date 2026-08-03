import { useEffect, useRef, useState } from 'react';
import { X, UserPlus, CheckCircle, Upload, FileText, Plus, KeyRound } from 'lucide-react';
import type { Student, Class, Gender, GuardianRel } from '../../types';
import type { CreateStudentInput } from '../../api/client';
import { useLanguage } from '../../i18n/LanguageContext';
import PhoneInput, { isPhoneValid } from '../ui/PhoneInput';

// Matches DEFAULT_STUDENT_PASSWORD in backend/src/routes/students.js — every
// student gets a portal login automatically, so this is always the initial
// password until they set their own via the Student-ID first-login flow.
const DEFAULT_STUDENT_PASSWORD = 'Welcome@2025';

export interface FeeData {
  feeName: string;
  amountDue: number;
  dueDate?: string;
  academicYear?: string;
}

interface Props {
  onClose: () => void;
  onAdd: (input: CreateStudentInput, fee?: FeeData) => Promise<Student | void> | Student | void;
  totalExisting: number;
  classes: Class[];
  students: Student[];
}

const empty = {
  firstName: '', middleName: '', lastName: '', dateOfBirth: '', gender: 'male' as Gender,
  classId: '',
  address: '', city: '', state: '', zipCode: '', mobileNumber: '', alternateMobileNumber: '',
  guardianName: '', guardianPhone: '', guardianRelationship: 'father' as GuardianRel,
};

type FormState = typeof empty;
type Errors = Partial<Record<keyof FormState, string>>;

function generateStudentNumber(count: number): string {
  const year = new Date().getFullYear();
  return `BSPS-${year}-${String(count + 1).padStart(3, '0')}`;
}

function SectionTitle({ children }: { children: string }) {
  return <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3 pt-1">{children}</p>;
}

function Field({
  label, value, onChange, type = 'text', error, required, readOnly, placeholder,
}: {
  label: string; value: string; onChange?: (v: string) => void;
  type?: string; error?: string; required?: boolean; readOnly?: boolean; placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        type={type}
        value={value}
        readOnly={readOnly}
        placeholder={placeholder}
        onChange={e => onChange?.(e.target.value)}
        className={`w-full py-2.5 px-3 text-sm border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
          readOnly
            ? 'border-slate-200 bg-slate-100 text-slate-500 cursor-not-allowed'
            : error
              ? 'border-red-300 focus:ring-red-400 bg-red-50'
              : 'border-slate-200 focus:ring-indigo-500 bg-white'
        }`}
      />
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
}

export default function StudentAddModal({ onClose, onAdd, totalExisting, classes, students }: Props) {
  const { t, lang } = useLanguage();
  const lbl = (en: string, fr: string) => (lang === 'fr' ? fr : en);

  const [form, setForm]     = useState<FormState>({ ...empty, classId: classes[0]?.id ?? '' });
  const [errors, setErrors] = useState<Errors>({});
  const [done, setDone]     = useState(false);
  const [createdStudent, setCreatedStudent] = useState<Student | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Classes often load asynchronously after this modal first mounts (e.g. if
  // "Add Student" is clicked before the parent's fetch resolves) — keep the
  // default selection in sync instead of leaving it permanently empty.
  useEffect(() => {
    if (!form.classId && classes.length > 0) {
      setForm(prev => (prev.classId ? prev : { ...prev, classId: classes[0].id }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classes]);

  const [hasSiblings, setHasSiblings] = useState(false);
  const [siblingIds, setSiblingIds]   = useState<string[]>([]);
  const [siblingSearch, setSiblingSearch] = useState('');

  const [photoFile, setPhotoFile]       = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  type DocumentRow = { id: number; title: string; file: File | null };
  const nextDocId = useRef(1);
  const [documentRows, setDocumentRows] = useState<DocumentRow[]>([{ id: 0, title: '', file: null }]);
  const documentInputRefs = useRef(new Map<number, HTMLInputElement>());

  const addDocumentRow = () => setDocumentRows(prev => [...prev, { id: nextDocId.current++, title: '', file: null }]);
  const removeDocumentRow = (id: number) => setDocumentRows(prev =>
    prev.length > 1 ? prev.filter(r => r.id !== id) : prev.map(r => ({ ...r, title: '', file: null }))
  );
  const updateDocumentRow = (id: number, patch: Partial<DocumentRow>) =>
    setDocumentRows(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r));

  useEffect(() => {
    return () => { if (photoPreview) URL.revokeObjectURL(photoPreview); };
  }, [photoPreview]);

  const currentYear = new Date().getFullYear();
  const [feeForm, setFeeForm] = useState(() => {
    const defaults = { feeName: '', amountDue: '', dueDate: '', academicYear: `${currentYear}-${currentYear + 1}` };
    try {
      const stored = localStorage.getItem('default_student_fee');
      if (stored) {
        const s = JSON.parse(stored) as { feeName?: string; amount?: string; academicYear?: string };
        return { ...defaults, feeName: s.feeName ?? '', amountDue: s.amount ?? '', academicYear: s.academicYear ?? defaults.academicYear };
      }
    } catch { /* ignore */ }
    return defaults;
  });
  const [feeErrors, setFeeErrors] = useState<Record<string, string>>({});

  const set = (field: keyof FormState, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  const relationships: GuardianRel[] = ['mother', 'father', 'guardian', 'grandparent', 'sibling', 'other'];

  const siblingMatches = siblingSearch.trim()
    ? students.filter(s =>
        `${s.firstName} ${s.lastName}`.toLowerCase().includes(siblingSearch.toLowerCase()) && !siblingIds.includes(s.id)
      ).slice(0, 8)
    : [];

  const toggleSibling = (id: string) => {
    setSiblingIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    setSiblingSearch('');
  };

  const handlePhotoChange = (file: File | null) => {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoFile(file);
    setPhotoPreview(file ? URL.createObjectURL(file) : null);
  };

  const validate = (): boolean => {
    const e: Errors = {};
    if (!form.firstName.trim())  e.firstName  = t.students.required;
    if (!form.lastName.trim())   e.lastName   = t.students.required;
    if (!form.dateOfBirth)       e.dateOfBirth = t.students.required;
    if (!form.classId)           e.classId    = t.students.required;
    if (!form.address.trim())    e.address    = t.students.required;
    if (!form.city.trim())       e.city       = t.students.required;
    if (!form.mobileNumber || !isPhoneValid(form.mobileNumber)) e.mobileNumber = t.students.required;
    if (!form.guardianName.trim()) e.guardianName = t.students.required;
    if (!form.guardianPhone || !isPhoneValid(form.guardianPhone)) e.guardianPhone = t.students.required;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    const feeAmt = Number(feeForm.amountDue);
    const feeErrs: Record<string, string> = {};
    const wantsFee = feeForm.feeName.trim() || feeForm.amountDue.trim();
    if (wantsFee) {
      if (!feeForm.feeName.trim()) feeErrs.feeName = t.students.required;
      if (!feeForm.amountDue || isNaN(feeAmt) || feeAmt <= 0) feeErrs.amountDue = t.students.required;
    }
    setFeeErrors(feeErrs);
    if (Object.keys(feeErrs).length > 0) return;

    const cls = classes.find(c => c.id === form.classId);
    if (!cls) return;

    const input: CreateStudentInput = {
      firstName: form.firstName.trim(), middleName: form.middleName.trim() || undefined, lastName: form.lastName.trim(),
      dateOfBirth: form.dateOfBirth, gender: form.gender,
      classId: cls.id, className: cls.name, gradeLevelName: cls.gradeLevelName,
      address: form.address.trim(), city: form.city.trim(), state: form.state.trim() || undefined,
      zipCode: form.zipCode.trim() || undefined, mobileNumber: form.mobileNumber, alternateMobileNumber: form.alternateMobileNumber || undefined,
      guardianName: form.guardianName.trim(), guardianPhone: form.guardianPhone, guardianRelationship: form.guardianRelationship,
      admissionDate: new Date().toISOString().split('T')[0],
      siblingIds: hasSiblings && siblingIds.length > 0 ? siblingIds : undefined,
      photoFile: photoFile ?? undefined,
      documents: documentRows
        .filter((r): r is DocumentRow & { file: File } => !!r.file)
        .map(r => ({ title: r.title.trim() || r.file.name, file: r.file })),
    };

    setSubmitting(true);
    try {
      const created = await onAdd(input, wantsFee ? {
        feeName: feeForm.feeName.trim(), amountDue: feeAmt,
        dueDate: feeForm.dueDate || undefined, academicYear: feeForm.academicYear.trim() || undefined,
      } : undefined);
      setCreatedStudent(created ?? null);
      setDone(true);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[92vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
              <UserPlus size={16} className="text-indigo-600" />
            </div>
            <h2 className="font-semibold text-slate-800">{t.students.addTitle}</h2>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
            <X size={17} className="text-slate-500" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-5">
          {done ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mb-3">
                <CheckCircle size={28} className="text-green-500" />
              </div>
              <p className="font-semibold text-slate-800">{t.students.studentAdded}</p>
              <p className="text-slate-400 text-sm mt-1">{form.firstName} {form.lastName}</p>

              <div className="mt-5 w-full max-w-xs bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-left">
                <div className="flex items-center gap-2 mb-2.5">
                  <KeyRound size={14} className="text-indigo-600" />
                  <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wide">
                    {lbl('Student Portal Login', 'Connexion Portail Élève')}
                  </p>
                </div>
                <div className="space-y-1.5 text-sm">
                  <p className="text-slate-600">
                    {lbl('Student ID', 'Matricule')}: <span className="font-mono font-semibold text-slate-800">{createdStudent?.studentNumber ?? generateStudentNumber(totalExisting)}</span>
                  </p>
                  <p className="text-slate-600">
                    {lbl('Default Password', 'Mot de passe par défaut')}: <span className="font-mono font-semibold text-slate-800">{DEFAULT_STUDENT_PASSWORD}</span>
                  </p>
                </div>
                <p className="text-xs text-slate-500 mt-2.5 leading-relaxed">
                  {lbl(
                    'Give these to the student. Entering just the Student ID on the login page will let them in and prompt them to set their own password.',
                    "Communiquez ceci à l'élève. En saisissant uniquement le matricule sur la page de connexion, il pourra se connecter et définir son propre mot de passe."
                  )}
                </p>
              </div>

              <button onClick={onClose} className="mt-5 px-5 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold transition-colors">
                {lbl('Done', 'Terminé')}
              </button>
            </div>
          ) : (
            <div className="space-y-6">

              {/* Personal Information */}
              <div>
                <SectionTitle>{lbl('Personal Information', 'Informations personnelles')}</SectionTitle>
                <div className="grid grid-cols-3 gap-4">
                  <Field label={lbl('Student ID', 'Matricule')} readOnly value={generateStudentNumber(totalExisting)} />
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      {t.common.class}<span className="text-red-500 ml-0.5">*</span>
                    </label>
                    <select
                      value={form.classId}
                      onChange={e => set('classId', e.target.value)}
                      className={`w-full py-2.5 px-3 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${errors.classId ? 'border-red-300 bg-red-50' : 'border-slate-200'}`}
                    >
                      {classes.length === 0
                        ? <option value="" disabled>{lbl('No classes yet — add a class first', "Aucune classe — ajoutez-en une d'abord")}</option>
                        : classes.map(c => <option key={c.id} value={c.id}>{c.name} — {c.gradeLevelName}</option>)}
                    </select>
                    {errors.classId && <p className="text-red-500 text-xs mt-1">{errors.classId}</p>}
                  </div>
                  <Field label={t.students.dateOfBirth} required type="date" value={form.dateOfBirth} onChange={v => set('dateOfBirth', v)} error={errors.dateOfBirth} />
                </div>
                <div className="grid grid-cols-3 gap-4 mt-4">
                  <Field label={t.students.firstName} required value={form.firstName} onChange={v => set('firstName', v)} error={errors.firstName} />
                  <Field label={lbl('Middle Name', 'Deuxième prénom')} value={form.middleName} onChange={v => set('middleName', v)} />
                  <Field label={t.students.lastName} required value={form.lastName} onChange={v => set('lastName', v)} error={errors.lastName} />
                </div>
                <div className="mt-4">
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">
                    {t.students.gender}<span className="text-red-500 ml-0.5">*</span>
                  </label>
                  <div className="flex items-center gap-5">
                    {(['male', 'female', 'other'] as Gender[]).map(g => (
                      <label key={g} className="flex items-center gap-1.5 text-sm text-slate-700 cursor-pointer">
                        <input type="radio" name="gender" checked={form.gender === g} onChange={() => set('gender', g)} className="accent-indigo-600" />
                        {g === 'male' ? t.common.male : g === 'female' ? t.common.female : lbl('Other', 'Autre')}
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div>
                <SectionTitle>{lbl('Contact Information', 'Coordonnées')}</SectionTitle>
                <div className="grid grid-cols-2 gap-4">
                  <Field label={t.students.address} required value={form.address} onChange={v => set('address', v)} error={errors.address} />
                  <Field label={lbl('City', 'Ville')} required value={form.city} onChange={v => set('city', v)} error={errors.city} />
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <Field label={lbl('State', 'Région')} value={form.state} onChange={v => set('state', v)} />
                  <Field label={lbl('Zip Code', 'Code postal')} value={form.zipCode} onChange={v => set('zipCode', v)} />
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <PhoneInput label={lbl('Mobile Number', 'Téléphone mobile')} required value={form.mobileNumber} onChange={v => set('mobileNumber', v)} error={errors.mobileNumber} />
                  <PhoneInput label={lbl('Alternate Mobile Number', 'Autre numéro')} value={form.alternateMobileNumber} onChange={v => set('alternateMobileNumber', v)} />
                </div>
              </div>

              {/* Guardian Information (not in the reference image, but still required elsewhere in the app) */}
              <div>
                <SectionTitle>{t.students.guardianInfo}</SectionTitle>
                <div className="grid grid-cols-2 gap-4">
                  <Field label={`${t.students.guardian} — ${t.common.name}`} required value={form.guardianName} onChange={v => set('guardianName', v)} error={errors.guardianName} />
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">{t.students.relationship}</label>
                    <select
                      value={form.guardianRelationship}
                      onChange={e => set('guardianRelationship', e.target.value)}
                      className="w-full py-2.5 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {relationships.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                    </select>
                  </div>
                </div>
                <div className="mt-4">
                  <PhoneInput label={`${t.students.guardian} — ${t.settings?.phone ?? 'Phone'}`} required value={form.guardianPhone} onChange={v => set('guardianPhone', v)} error={errors.guardianPhone} />
                </div>
              </div>

              {/* Siblings Information */}
              <div>
                <SectionTitle>{lbl('Siblings Information', 'Fratrie')}</SectionTitle>
                <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                  <input type="checkbox" checked={hasSiblings} onChange={e => { setHasSiblings(e.target.checked); if (!e.target.checked) setSiblingIds([]); }} className="accent-indigo-600" />
                  {lbl('In case of any sibling? click here', "En cas de frère ou sœur, cliquez ici")}
                </label>
                {hasSiblings && (
                  <div className="mt-3 space-y-2">
                    {siblingIds.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {siblingIds.map(id => {
                          const s = students.find(x => x.id === id);
                          if (!s) return null;
                          return (
                            <span key={id} className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 text-xs font-medium px-2 py-1 rounded-full">
                              {s.firstName} {s.lastName}
                              <button type="button" onClick={() => toggleSibling(id)} className="hover:text-indigo-900"><X size={12} /></button>
                            </span>
                          );
                        })}
                      </div>
                    )}
                    <input
                      value={siblingSearch}
                      onChange={e => setSiblingSearch(e.target.value)}
                      placeholder={lbl('Search students by name…', 'Rechercher un élève…')}
                      className="w-full py-2.5 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    />
                    {siblingMatches.length > 0 && (
                      <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 overflow-hidden">
                        {siblingMatches.map(s => (
                          <button
                            key={s.id} type="button" onClick={() => toggleSibling(s.id)}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex items-center justify-between"
                          >
                            <span>{s.firstName} {s.lastName}</span>
                            <span className="text-xs text-slate-400">{s.className}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Profile Image */}
              <div>
                <SectionTitle>{lbl('Profile Image', 'Photo de profil')}</SectionTitle>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                    {photoPreview
                      ? <img src={photoPreview} alt="preview" className="w-full h-full object-cover" />
                      : <UserPlus size={22} className="text-slate-300" />}
                  </div>
                  <input ref={photoInputRef} type="file" accept="image/*" className="hidden"
                    onChange={e => handlePhotoChange(e.target.files?.[0] ?? null)} />
                  <button type="button" onClick={() => photoInputRef.current?.click()}
                    className="flex items-center gap-2 px-3.5 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors">
                    <Upload size={14} /> {lbl('Upload Image', 'Téléverser une image')}
                  </button>
                  {photoFile && (
                    <button type="button" onClick={() => handlePhotoChange(null)} className="text-xs text-slate-400 hover:text-red-500">
                      {lbl('Remove', 'Retirer')}
                    </button>
                  )}
                </div>
              </div>

              {/* Document Details */}
              <div>
                <SectionTitle>{lbl('Document Details', 'Détails du document')}</SectionTitle>
                <div className="space-y-3">
                  {documentRows.map((row, i) => (
                    <div key={row.id} className="grid grid-cols-2 gap-4 items-end">
                      <Field
                        label={i === 0 ? lbl('Document Title', 'Titre du document') : ''}
                        value={row.title} onChange={v => updateDocumentRow(row.id, { title: v })}
                        placeholder={lbl('e.g. Birth Certificate', 'ex. Acte de naissance')}
                      />
                      <div>
                        {i === 0 && <label className="block text-xs font-medium text-slate-600 mb-1">{lbl('Document File', 'Fichier')}</label>}
                        <div className="flex items-center gap-2">
                          <input
                            ref={el => { if (el) documentInputRefs.current.set(row.id, el); }}
                            type="file" accept="image/*,.pdf,.doc,.docx" className="hidden"
                            onChange={e => updateDocumentRow(row.id, { file: e.target.files?.[0] ?? null })}
                          />
                          <button type="button" onClick={() => documentInputRefs.current.get(row.id)?.click()}
                            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 shrink-0">
                            <FileText size={13} /> {lbl('Choose File', 'Choisir un fichier')}
                          </button>
                          <span className="text-xs text-slate-400 truncate flex-1">{row.file?.name ?? lbl('No file chosen', 'Aucun fichier')}</span>
                          {(row.file || row.title || documentRows.length > 1) && (
                            <button type="button" onClick={() => removeDocumentRow(row.id)} className="p-1.5 text-slate-400 hover:text-red-500 shrink-0" title={lbl('Remove', 'Retirer')}>
                              <X size={14} />
                            </button>
                          )}
                          {i === documentRows.length - 1 && (
                            <button type="button" onClick={addDocumentRow}
                              className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 shrink-0" title={lbl('Add another document', 'Ajouter un document')}>
                              <Plus size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Initial fee (existing feature, folded into the single-page form) */}
              <div>
                <SectionTitle>{lbl('Initial Fee (optional)', 'Frais initiaux (facultatif)')}</SectionTitle>
                <div className="grid grid-cols-2 gap-4">
                  <Field
                    label={t.fees.fee ?? 'Fee Name'} value={feeForm.feeName}
                    onChange={v => { setFeeForm(p => ({ ...p, feeName: v })); setFeeErrors(p => ({ ...p, feeName: '' })); }}
                    placeholder={lbl('e.g. School Fees 2025-2026', 'ex : Scolarité 2025-2026')}
                    error={feeErrors.feeName}
                  />
                  <Field
                    label={lbl('Amount Due (FCFA)', 'Montant dû (FCFA)')} type="number" value={feeForm.amountDue}
                    onChange={v => { setFeeForm(p => ({ ...p, amountDue: v })); setFeeErrors(p => ({ ...p, amountDue: '' })); }}
                    placeholder="0" error={feeErrors.amountDue}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {!done && (
          <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-slate-200 shrink-0">
            <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
              {t.common.cancel}
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex items-center gap-2 px-5 py-2.5 text-sm bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-lg font-semibold transition-colors"
            >
              <UserPlus size={15} />
              {submitting ? lbl('Adding…', 'Ajout…') : lbl('ADD STUDENT', 'AJOUTER L’ÉLÈVE')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
