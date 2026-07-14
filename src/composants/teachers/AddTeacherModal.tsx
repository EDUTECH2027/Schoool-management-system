import { useState, useEffect } from 'react';
import { X, GraduationCap, ChevronRight, CheckCircle } from 'lucide-react';
import type { Teacher } from '../../types';
import { api, type ClassRecord, type Subject } from '../../api/client';
import { useLanguage } from '../../i18n/LanguageContext';

interface Props {
  onClose: () => void;
  onAdd: (teacher: Teacher) => void;
}

type Step = 'personal' | 'professional';

const QUALIFICATIONS = [
  'B.Ed Primary',
  'B.Ed Mathematics',
  'B.Ed Physical Education',
  'B.Sc Education',
  'Diploma in Education',
  'M.Ed',
  'PGCE',
];

type FormState = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  gender: 'male' | 'female';
  qualification: string;
  customQualification: string;
  selectedSubjects: string[];
  classAssigned: string;
  joinDate: string;
};

type Errors = Partial<Record<keyof FormState | 'subjects', string>>;

function Field({
  label, value, onChange, type = 'text', error, required, placeholder,
}: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; error?: string; required?: boolean; placeholder?: string;
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
        placeholder={placeholder}
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

export default function AddTeacherModal({ onClose, onAdd }: Props) {
  const { t } = useLanguage();

  const [step, setStep]       = useState<Step>('personal');
  const [done, setDone]       = useState(false);
  const [errors, setErrors]   = useState<Errors>({});
  const [classList, setClassList]     = useState<ClassRecord[]>([]);
  const [subjectList, setSubjectList] = useState<Subject[]>([]);

  useEffect(() => {
    api.getClasses().then(setClassList).catch(console.error);
    api.getSubjects().then(setSubjectList).catch(console.error);
  }, []);

  const [form, setForm] = useState<FormState>({
    firstName: '', lastName: '', email: '', phone: '', gender: 'male',
    qualification: QUALIFICATIONS[0], customQualification: '',
    selectedSubjects: [], classAssigned: '',
    joinDate: new Date().toISOString().split('T')[0],
  });

  const set = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (field in errors) setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  const toggleSubject = (name: string) => {
    setForm(prev => ({
      ...prev,
      selectedSubjects: prev.selectedSubjects.includes(name)
        ? prev.selectedSubjects.filter(s => s !== name)
        : [...prev.selectedSubjects, name],
    }));
    setErrors(prev => ({ ...prev, subjects: undefined }));
  };

  const validate = (): boolean => {
    const e: Errors = {};
    if (step === 'personal') {
      if (!form.firstName.trim()) e.firstName = t.students.required;
      if (!form.lastName.trim())  e.lastName  = t.students.required;
      if (!form.email.trim() || !form.email.includes('@')) e.email = t.students.required;
      if (!form.phone.trim())     e.phone     = t.students.required;
    }
    if (step === 'professional') {
      if (form.selectedSubjects.length === 0) e.subjects = t.teachers.noSubjectsSelected;
      if (!form.joinDate)                     e.joinDate = t.students.required;
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (validate()) setStep('professional');
  };

  const handleSubmit = () => {
    if (!validate()) return;

    const qual = form.qualification === 'Other' ? form.customQualification : form.qualification;

    const newTeacher: Teacher = {
      id:            `tc-${Date.now()}`,
      firstName:     form.firstName.trim(),
      lastName:      form.lastName.trim(),
      email:         form.email.trim().toLowerCase(),
      phone:         form.phone.trim(),
      gender:        form.gender,
      subjects:      form.selectedSubjects,
      classAssigned: form.classAssigned || undefined,
      qualification: qual.trim(),
      joinDate:      form.joinDate,
      isActive:      true,
    };

    onAdd(newTeacher);
    setDone(true);
    setTimeout(onClose, 1100);
  };

  const stepIndex = step === 'personal' ? 0 : 1;
  const stepLabels: Record<Step, string> = {
    personal:     t.students.personalInfo,
    professional: t.teachers.professionalInfo,
  };

  // Subject color map (same as in TeacherDetailModal)
  const subjectColors: Record<string, string> = {
    'English Language':   'border-blue-300 bg-blue-50 text-blue-700',
    'Mathematics':        'border-green-300 bg-green-50 text-green-700',
    'General Science':    'border-emerald-300 bg-emerald-50 text-emerald-700',
    'Social Studies':     'border-orange-300 bg-orange-50 text-orange-700',
    'Shona':              'border-rose-300 bg-rose-50 text-rose-700',
    'Religious & Moral':  'border-purple-300 bg-purple-50 text-purple-700',
    'Art & Craft':        'border-pink-300 bg-pink-50 text-pink-700',
    'Physical Education': 'border-teal-300 bg-teal-50 text-teal-700',
  };
  const selectedColor = 'ring-2 ring-offset-1';

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
              <GraduationCap size={16} className="text-indigo-600" />
            </div>
            <h2 className="font-semibold text-slate-800">{t.teachers.addTitle}</h2>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
            <X size={17} className="text-slate-500" />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-0 px-5 pt-4 shrink-0">
          {(['personal', 'professional'] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center flex-1 last:flex-none">
              <button
                onClick={() => { if (i < stepIndex) setStep(s); }}
                disabled={i > stepIndex}
                className="flex items-center gap-2 text-xs font-medium"
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  i < stepIndex ? 'bg-green-500 text-white'
                  : i === stepIndex ? 'bg-indigo-600 text-white'
                  : 'bg-slate-200 text-slate-400'
                }`}>
                  {i < stepIndex ? '✓' : i + 1}
                </div>
                <span className={
                  i === stepIndex ? 'text-indigo-600'
                  : i < stepIndex ? 'text-green-600'
                  : 'text-slate-400'
                }>
                  {stepLabels[s]}
                </span>
              </button>
              {i < 1 && <div className="flex-1 h-px bg-slate-200 mx-2" />}
            </div>
          ))}
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-5 py-5">

          {done ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mb-3">
                <CheckCircle size={28} className="text-green-500" />
              </div>
              <p className="font-semibold text-slate-800">{t.teachers.teacherAdded}</p>
              <p className="text-slate-400 text-sm mt-1">{form.firstName} {form.lastName}</p>
            </div>
          ) : (

            <>
              {/* ── Step 1: Personal ──────────────────────────── */}
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

                  <Field
                    label="Email" required type="email"
                    value={form.email} onChange={v => set('email', v)}
                    placeholder="firstname.lastname@school.edu"
                    error={errors.email}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <Field
                      label={t.settings.phone} required
                      value={form.phone} onChange={v => set('phone', v)}
                      placeholder="+263 77 000 0000"
                      error={errors.phone}
                    />
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        {t.students.gender}<span className="text-red-500 ml-0.5">*</span>
                      </label>
                      <div className="flex gap-2">
                        {(['male', 'female'] as const).map(g => (
                          <button
                            key={g}
                            type="button"
                            onClick={() => set('gender', g)}
                            className={`flex-1 py-2.5 text-sm font-medium rounded-lg border transition-all ${
                              form.gender === g
                                ? g === 'male'
                                  ? 'bg-blue-50 border-blue-400 text-blue-700 ring-1 ring-blue-400'
                                  : 'bg-pink-50 border-pink-400 text-pink-700 ring-1 ring-pink-400'
                                : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                            }`}
                          >
                            {g === 'male' ? t.common.male : t.common.female}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Step 2: Professional ──────────────────────── */}
              {step === 'professional' && (
                <div className="space-y-5">

                  {/* Qualification */}
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      {t.teachers.qualification}<span className="text-red-500 ml-0.5">*</span>
                    </label>
                    <select
                      value={form.qualification}
                      onChange={e => set('qualification', e.target.value)}
                      className="w-full py-2.5 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {QUALIFICATIONS.map(q => <option key={q} value={q}>{q}</option>)}
                      <option value="Other">Other…</option>
                    </select>
                    {form.qualification === 'Other' && (
                      <input
                        value={form.customQualification}
                        onChange={e => set('customQualification', e.target.value)}
                        placeholder="Enter qualification…"
                        className="mt-2 w-full py-2.5 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    )}
                  </div>

                  {/* Subjects (checkbox grid) */}
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-2">
                      {t.teachers.selectSubjects}<span className="text-red-500 ml-0.5">*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {subjectList.map(sub => {
                        const isSelected = form.selectedSubjects.includes(sub.name);
                        const colorCls   = subjectColors[sub.name] ?? 'border-slate-300 bg-slate-50 text-slate-700';
                        return (
                          <button
                            key={sub.id}
                            type="button"
                            onClick={() => toggleSubject(sub.name)}
                            className={`flex items-center justify-between px-3 py-2.5 rounded-xl border text-sm font-medium text-left transition-all ${colorCls} ${isSelected ? selectedColor : 'opacity-60 hover:opacity-100'}`}
                          >
                            <span>{sub.name}</span>
                            {isSelected && (
                              <div className="w-4 h-4 rounded-full bg-current opacity-70 flex items-center justify-center shrink-0">
                                <span className="text-white text-[10px] leading-none font-bold">✓</span>
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                    {errors.subjects && (
                      <p className="text-red-500 text-xs mt-1">{errors.subjects}</p>
                    )}
                    {form.selectedSubjects.length > 0 && (
                      <p className="text-slate-400 text-xs mt-1.5">
                        {form.selectedSubjects.length} {form.selectedSubjects.length === 1 ? 'subject' : 'subjects'} selected
                      </p>
                    )}
                  </div>

                  {/* Class + Join date */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        {t.teachers.optionalClass}
                      </label>
                      <select
                        value={form.classAssigned}
                        onChange={e => set('classAssigned', e.target.value)}
                        className="w-full py-2.5 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">— {t.teachers.none} —</option>
                        {classList.map(c => (
                          <option key={c.id} value={c.name}>{c.name}</option>
                        ))}
                      </select>
                    </div>

                    <Field
                      label={t.teachers.joinDate} required type="date"
                      value={form.joinDate} onChange={v => set('joinDate', v)}
                      error={errors.joinDate}
                    />
                  </div>

                  {/* Preview */}
                  {form.firstName && form.selectedSubjects.length > 0 && (
                    <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-sm space-y-1.5">
                      <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wide mb-2">
                        Preview
                      </p>
                      {[
                        { label: t.common.name,          value: `${form.firstName} ${form.lastName}` },
                        { label: t.teachers.qualification,value: form.qualification === 'Other' ? form.customQualification : form.qualification },
                        { label: t.teachers.subjects,     value: form.selectedSubjects.join(', ') || '—' },
                        { label: t.teachers.joinDate,     value: form.joinDate ? new Date(form.joinDate).toLocaleDateString('en-GB') : '—' },
                      ].map(row => (
                        <div key={row.label} className="flex justify-between gap-3">
                          <span className="text-indigo-500 shrink-0">{row.label}</span>
                          <span className="font-semibold text-indigo-800 text-right">{row.value}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!done && (
          <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-slate-200 shrink-0">
            <button
              onClick={() => step === 'personal' ? onClose() : setStep('personal')}
              className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              {step === 'personal' ? t.common.cancel : '← Back'}
            </button>

            {step === 'personal' ? (
              <button
                onClick={handleNext}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
              >
                Next <ChevronRight size={15} />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
              >
                <GraduationCap size={15} />
                {t.teachers.addTeacher}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
