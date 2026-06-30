import { useState } from 'react';
import { X, UserPlus, CheckCircle, ChevronRight } from 'lucide-react';
import type { Student, Class } from '../../types';
import { useLanguage } from '../../i18n/LanguageContext';
import PhoneInput, { isPhoneValid } from '../ui/PhoneInput';

export interface FeeData {
  feeName: string;
  amountDue: number;
  dueDate?: string;
  academicYear?: string;
}

interface Props {
  onClose: () => void;
  onAdd: (student: Student, fee?: FeeData) => void;
  totalExisting: number;
  classes: Class[];
}

type Step = 'personal' | 'school' | 'guardian' | 'fees';

const STEPS: Step[] = ['personal', 'school', 'guardian', 'fees'];

const empty = {
  firstName: '', lastName: '', dateOfBirth: '', gender: 'male' as const,
  address: '', classId: '', guardianName: '', guardianPhone: '',
  guardianRelationship: 'father' as const,
};

type FormState = typeof empty;
type Errors = Partial<Record<keyof FormState, string>>;

function generateStudentNumber(count: number): string {
  const year = new Date().getFullYear();
  return `BSPS-${year}-${String(count + 1).padStart(3, '0')}`;
}

function Field({
  label, value, onChange, type = 'text', error, required,
}: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; error?: string; required?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        className={`w-full py-2.5 px-3 text-sm border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
          error
            ? 'border-red-300 focus:ring-red-400 bg-red-50'
            : 'border-slate-200 focus:ring-indigo-500 bg-white'
        }`}
      />
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
}

export default function StudentAddModal({ onClose, onAdd, totalExisting, classes }: Props) {
  const { t } = useLanguage();
  const currentYear = new Date().getFullYear();

  const [step, setStep]     = useState<Step>('personal');
  const [form, setForm]     = useState<FormState>({ ...empty, classId: classes[0]?.id ?? '' });
  const [errors, setErrors] = useState<Errors>({});
  const [done, setDone]     = useState(false);

  const [feeForm, setFeeForm] = useState(() => {
    const defaults = { feeName: '', amountDue: '', dueDate: '', academicYear: `${currentYear}-${currentYear + 1}` };
    try {
      const stored = localStorage.getItem('default_student_fee');
      if (stored) {
        const s = JSON.parse(stored) as { feeName?: string; amount?: string; academicYear?: string };
        return {
          ...defaults,
          feeName:      s.feeName      ?? '',
          amountDue:    s.amount       ?? '',
          academicYear: s.academicYear ?? defaults.academicYear,
        };
      }
    } catch { /* ignore */ }
    return defaults;
  });
  const [feeErrors, setFeeErrors] = useState<Record<string, string>>({});

  const set = (field: keyof FormState, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  const stepIndex = STEPS.indexOf(step);

  const stepLabels: Record<Step, string> = {
    personal: t.students.personalInfo,
    school:   t.students.schoolInfo,
    guardian: t.students.guardianInfo,
    fees:     t.fees.fee ?? 'Fees',
  };

  // Validate fields for each step
  const validate = (): boolean => {
    const e: Errors = {};
    if (step === 'personal') {
      if (!form.firstName.trim())   e.firstName   = t.students.required;
      if (!form.lastName.trim())    e.lastName    = t.students.required;
      if (!form.dateOfBirth)        e.dateOfBirth = t.students.required;
    }
    if (step === 'school') {
      if (!form.classId)            e.classId     = t.students.required;
    }
    if (step === 'guardian') {
      if (!form.guardianName.trim()) e.guardianName = t.students.required;
      if (!form.guardianPhone || !isPhoneValid(form.guardianPhone))
        e.guardianPhone = t.students.required;
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => {
    if (!validate()) return;
    if (step === 'personal') setStep('school');
    else if (step === 'school') setStep('guardian');
    else if (step === 'guardian') setStep('fees');
  };

  const buildStudent = (): Student | null => {
    const cls = classes.find(c => c.id === form.classId);
    if (!cls) return null;
    return {
      id:                   `st-${Date.now()}`,
      studentNumber:        generateStudentNumber(totalExisting),
      firstName:            form.firstName.trim(),
      lastName:             form.lastName.trim(),
      dateOfBirth:          form.dateOfBirth,
      gender:               form.gender,
      classId:              cls.id,
      className:            cls.name,
      gradeLevelName:       cls.gradeLevelName,
      address:              form.address.trim(),
      guardianName:         form.guardianName.trim(),
      guardianPhone:        form.guardianPhone.trim(),
      guardianRelationship: form.guardianRelationship,
      admissionDate:        new Date().toISOString().split('T')[0],
      isActive:             true,
    };
  };

  const handleSkipFees = () => {
    const student = buildStudent();
    if (!student) return;
    onAdd(student, undefined);
    setDone(true);
    setTimeout(onClose, 1200);
  };

  const handleSubmitWithFees = () => {
    const e: Record<string, string> = {};
    if (!feeForm.feeName.trim()) e.feeName = t.students.required;
    const amt = Number(feeForm.amountDue);
    if (!feeForm.amountDue || isNaN(amt) || amt <= 0) e.amountDue = t.students.required;
    setFeeErrors(e);
    if (Object.keys(e).length > 0) return;

    const student = buildStudent();
    if (!student) return;
    onAdd(student, {
      feeName:      feeForm.feeName.trim(),
      amountDue:    Number(feeForm.amountDue),
      dueDate:      feeForm.dueDate || undefined,
      academicYear: feeForm.academicYear.trim() || undefined,
    });
    setDone(true);
    setTimeout(onClose, 1200);
  };

  const relationships = ['mother', 'father', 'guardian', 'grandparent', 'sibling', 'other'];

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[92vh]"
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

        {/* Step indicator */}
        <div className="flex items-center gap-0 px-5 pt-4 shrink-0">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center flex-1 last:flex-none">
              <button
                onClick={() => { if (i < stepIndex) setStep(s); }}
                className="flex items-center gap-2 text-xs font-medium"
                disabled={i > stepIndex}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  i < stepIndex
                    ? 'bg-green-500 text-white'
                    : i === stepIndex
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-200 text-slate-400'
                }`}>
                  {i < stepIndex ? '✓' : i + 1}
                </div>
                <span className={i === stepIndex ? 'text-indigo-600' : i < stepIndex ? 'text-green-600' : 'text-slate-400'}>
                  {stepLabels[s]}
                </span>
              </button>
              {i < STEPS.length - 1 && (
                <div className="flex-1 h-px bg-slate-200 mx-2" />
              )}
            </div>
          ))}
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-5 py-5">

          {/* ── Step 1: Personal ─────────────────────────────── */}
          {step === 'personal' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field
                  label={t.students.firstName} required
                  value={form.firstName} onChange={v => set('firstName', v)}
                  error={errors.firstName}
                />
                <Field
                  label={t.students.lastName} required
                  value={form.lastName} onChange={v => set('lastName', v)}
                  error={errors.lastName}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field
                  label={t.students.dateOfBirth} required type="date"
                  value={form.dateOfBirth} onChange={v => set('dateOfBirth', v)}
                  error={errors.dateOfBirth}
                />
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    {t.students.gender}<span className="text-red-500 ml-0.5">*</span>
                  </label>
                  <select
                    value={form.gender}
                    onChange={e => set('gender', e.target.value)}
                    className="w-full py-2.5 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="male">{t.common.male}</option>
                    <option value="female">{t.common.female}</option>
                  </select>
                </div>
              </div>
              <Field
                label={t.students.address}
                value={form.address} onChange={v => set('address', v)}
              />
            </div>
          )}

          {/* ── Step 2: School ───────────────────────────────── */}
          {step === 'school' && (
            <div className="space-y-4">
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
                    ? <option value="" disabled>No classes yet — add a class first</option>
                    : classes.map(c => (
                        <option key={c.id} value={c.id}>{c.name} — {c.gradeLevelName}</option>
                      ))
                  }
                </select>
                {errors.classId && <p className="text-red-500 text-xs mt-1">{errors.classId}</p>}
              </div>

              {/* Preview of chosen class */}
              {form.classId && (() => {
                const cls = classes.find(c => c.id === form.classId);
                return cls ? (
                  <div className="bg-indigo-50 rounded-xl p-4 text-sm space-y-1.5">
                    <p className="font-semibold text-indigo-800">{cls.name}</p>
                    <div className="grid grid-cols-2 gap-2 text-xs text-indigo-700">
                      <span>Grade: {cls.gradeLevelName}</span>
                      <span>Room: {cls.room}</span>
                      <span>Teacher: {cls.classTeacherName}</span>
                      <span>Capacity: {cls.enrolled}/{cls.capacity}</span>
                    </div>
                  </div>
                ) : null;
              })()}

              {/* Auto-generated student number preview */}
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-xs text-slate-500 mb-1">{t.students.admNo} ({t.common.active === 'Active' ? 'auto-generated' : 'généré automatiquement'})</p>
                <p className="font-mono text-indigo-700 font-semibold">
                  {generateStudentNumber(totalExisting)}
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">{t.students.admissionDate}</label>
                <input
                  type="date"
                  defaultValue={new Date().toISOString().split('T')[0]}
                  className="w-full py-2.5 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  readOnly
                />
              </div>
            </div>
          )}

          {/* ── Step 3: Guardian ─────────────────────────────── */}
          {step === 'guardian' && (
            <div className="space-y-4">
              <Field
                label={`${t.students.guardian} — ${t.common.name}`} required
                value={form.guardianName} onChange={v => set('guardianName', v)}
                error={errors.guardianName}
              />
              <div className="grid grid-cols-2 gap-4">
                <PhoneInput
                  label={`${t.students.guardian} — ${t.settings?.phone ?? 'Phone'}`}
                  required
                  value={form.guardianPhone}
                  onChange={v => set('guardianPhone', v)}
                  error={errors.guardianPhone}
                />
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">{t.students.relationship}</label>
                  <select
                    value={form.guardianRelationship}
                    onChange={e => set('guardianRelationship', e.target.value)}
                    className="w-full py-2.5 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {relationships.map(r => (
                      <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Summary before submitting */}
              <div className="bg-slate-50 rounded-xl p-4 text-sm space-y-1.5">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                  {t.common.active === 'Active' ? 'Summary' : 'Récapitulatif'}
                </p>
                {[
                  { label: t.common.name,         value: `${form.firstName} ${form.lastName}` },
                  { label: t.students.dateOfBirth, value: form.dateOfBirth ? new Date(form.dateOfBirth).toLocaleDateString('en-GB') : '—' },
                  { label: t.common.class,         value: classes.find(c => c.id === form.classId)?.name ?? '—' },
                ].map(row => (
                  <div key={row.label} className="flex justify-between">
                    <span className="text-slate-500">{row.label}</span>
                    <span className="font-medium text-slate-800">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Step 4: Fees ─────────────────────────────────── */}
          {step === 'fees' && !done && (
            <div className="space-y-4">
              <div className="bg-indigo-50 rounded-xl p-3.5 text-sm text-indigo-700 font-medium">
                {t.common.active === 'Active'
                  ? 'Add an initial fee record for this student, or skip for now.'
                  : 'Ajoutez un dossier de frais pour cet élève, ou ignorez pour l\'instant.'}
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  {t.fees.fee ?? 'Fee Name'}<span className="text-red-500 ml-0.5">*</span>
                </label>
                <input
                  type="text"
                  value={feeForm.feeName}
                  onChange={e => { setFeeForm(p => ({ ...p, feeName: e.target.value })); setFeeErrors(p => ({ ...p, feeName: '' })); }}
                  placeholder={t.common.active === 'Active' ? 'e.g. School Fees 2025-2026' : 'ex : Scolarité 2025-2026'}
                  className={`w-full py-2.5 px-3 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${feeErrors.feeName ? 'border-red-300 bg-red-50' : 'border-slate-200'}`}
                />
                {feeErrors.feeName && <p className="text-red-500 text-xs mt-1">{feeErrors.feeName}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    {t.common.active === 'Active' ? 'Amount Due (FCFA)' : 'Montant dû (FCFA)'}<span className="text-red-500 ml-0.5">*</span>
                  </label>
                  <input
                    type="number" min={1}
                    value={feeForm.amountDue}
                    onChange={e => { setFeeForm(p => ({ ...p, amountDue: e.target.value })); setFeeErrors(p => ({ ...p, amountDue: '' })); }}
                    placeholder="0"
                    className={`w-full py-2.5 px-3 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${feeErrors.amountDue ? 'border-red-300 bg-red-50' : 'border-slate-200'}`}
                  />
                  {feeErrors.amountDue && <p className="text-red-500 text-xs mt-1">{feeErrors.amountDue}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    {t.common.active === 'Active' ? 'Academic Year' : 'Année académique'}
                  </label>
                  <input
                    type="text"
                    value={feeForm.academicYear}
                    onChange={e => setFeeForm(p => ({ ...p, academicYear: e.target.value }))}
                    className="w-full py-2.5 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  {t.fees.dueDate ?? 'Due Date'} ({t.common.active === 'Active' ? 'optional' : 'optionnel'})
                </label>
                <input
                  type="date"
                  value={feeForm.dueDate}
                  onChange={e => setFeeForm(p => ({ ...p, dueDate: e.target.value }))}
                  className="w-full py-2.5 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          )}

          {/* ── Success state ─────────────────────────────────── */}
          {done && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mb-3">
                <CheckCircle size={28} className="text-green-500" />
              </div>
              <p className="font-semibold text-slate-800">{t.students.studentAdded}</p>
              <p className="text-slate-400 text-sm mt-1">{form.firstName} {form.lastName}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        {!done && (
          <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-slate-200 shrink-0">
            <button
              onClick={() => {
                if (step === 'personal') onClose();
                else setStep(STEPS[stepIndex - 1]);
              }}
              className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              {step === 'personal' ? t.common.cancel : (t.common.active === 'Active' ? '← Back' : '← Retour')}
            </button>

            {step === 'fees' ? (
              <div className="flex gap-2">
                <button
                  onClick={handleSkipFees}
                  className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  {t.common.active === 'Active' ? 'Skip fees' : 'Ignorer les frais'}
                </button>
                <button
                  onClick={handleSubmitWithFees}
                  className="flex items-center gap-2 px-4 py-2 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                >
                  <UserPlus size={15} />
                  {t.common.active === 'Active' ? 'Add student + fees' : 'Élève + frais'}
                </button>
              </div>
            ) : step !== 'guardian' ? (
              <button
                onClick={next}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
              >
                {t.common.active === 'Active' ? 'Next' : 'Suivant'} <ChevronRight size={15} />
              </button>
            ) : (
              <button
                onClick={next}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
              >
                {t.common.active === 'Active' ? 'Next' : 'Suivant'} <ChevronRight size={15} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
