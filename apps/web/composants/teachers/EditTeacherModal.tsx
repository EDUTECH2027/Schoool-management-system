import { useState, useEffect } from 'react';
import { X, Save, CheckCircle } from 'lucide-react';
import type { Teacher } from '../../types';
import { subjects } from '../../data/mockData';
import { api, type ClassRecord } from '../../api/client';
import { useLanguage } from '../../i18n/LanguageContext';

interface Props {
  teacher: Teacher;
  onClose: () => void;
  onSave: (updated: Teacher) => void;
}

const QUALIFICATIONS = [
  'B.Ed Primary', 'B.Ed Mathematics', 'B.Ed Physical Education',
  'B.Sc Education', 'Diploma in Education', 'M.Ed', 'PGCE',
];

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
          error ? 'border-red-300 focus:ring-red-400 bg-red-50'
                : 'border-slate-200 focus:ring-indigo-500 bg-white'
        }`}
      />
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
}

export default function EditTeacherModal({ teacher, onClose, onSave }: Props) {
  const { t } = useLanguage();

  const initialQual = QUALIFICATIONS.includes(teacher.qualification) ? teacher.qualification : 'Other';
  const initialCustom = QUALIFICATIONS.includes(teacher.qualification) ? '' : teacher.qualification;

  const [classList, setClassList] = useState<ClassRecord[]>([]);

  useEffect(() => {
    api.getClasses().then(setClassList).catch(console.error);
  }, []);

  const [form, setForm] = useState({
    firstName:           teacher.firstName,
    lastName:            teacher.lastName,
    email:               teacher.email,
    phone:               teacher.phone,
    gender:              teacher.gender,
    qualification:       initialQual,
    customQualification: initialCustom,
    selectedSubjects:    [...teacher.subjects],
    classAssigned:       teacher.classAssigned ?? '',
    joinDate:            teacher.joinDate,
    isActive:            teacher.isActive,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saved,  setSaved]  = useState(false);

  const set = <K extends keyof typeof form>(field: K, value: (typeof form)[K]) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => { const e = { ...prev }; delete e[field]; return e; });
  };

  const toggleSubject = (name: string) => {
    setForm(prev => ({
      ...prev,
      selectedSubjects: prev.selectedSubjects.includes(name)
        ? prev.selectedSubjects.filter(s => s !== name)
        : [...prev.selectedSubjects, name],
    }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.firstName.trim())  e.firstName = t.students.required;
    if (!form.lastName.trim())   e.lastName  = t.students.required;
    if (!form.email.trim() || !form.email.includes('@')) e.email = t.students.required;
    if (!form.phone.trim())      e.phone     = t.students.required;
    if (form.selectedSubjects.length === 0) e.subjects = t.teachers.noSubjectsSelected;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    const qual = form.qualification === 'Other' ? form.customQualification : form.qualification;
    onSave({
      ...teacher,
      firstName:     form.firstName.trim(),
      lastName:      form.lastName.trim(),
      email:         form.email.trim().toLowerCase(),
      phone:         form.phone.trim(),
      gender:        form.gender,
      subjects:      form.selectedSubjects,
      classAssigned: form.classAssigned || undefined,
      qualification: qual.trim(),
      joinDate:      form.joinDate,
      isActive:      form.isActive,
    });
    setSaved(true);
    setTimeout(onClose, 900);
  };

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
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold
              ${teacher.gender === 'female' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'}`}>
              {teacher.firstName[0]}{teacher.lastName[0]}
            </div>
            <div>
              <h2 className="font-semibold text-slate-800 text-sm">{t.teachers.editTitle}</h2>
              <p className="text-xs text-slate-400">{teacher.firstName} {teacher.lastName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
            <X size={17} className="text-slate-500" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-5 py-5 space-y-5">

          {/* Personal */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              {t.students.personalInfo}
            </p>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label={t.students.firstName} required value={form.firstName}
                  onChange={v => set('firstName', v)} error={errors.firstName} />
                <Field label={t.students.lastName} required value={form.lastName}
                  onChange={v => set('lastName', v)} error={errors.lastName} />
              </div>
              <Field label="Email" required type="email" value={form.email}
                onChange={v => set('email', v)} error={errors.email} />
              <div className="grid grid-cols-2 gap-3">
                <Field label={t.settings.phone} required value={form.phone}
                  onChange={v => set('phone', v)} error={errors.phone} />
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">{t.students.gender}</label>
                  <div className="flex gap-2">
                    {(['male', 'female'] as const).map(g => (
                      <button key={g} type="button" onClick={() => set('gender', g)}
                        className={`flex-1 py-2 text-sm font-medium rounded-lg border transition-all ${
                          form.gender === g
                            ? g === 'male' ? 'bg-blue-50 border-blue-400 text-blue-700 ring-1 ring-blue-400'
                                           : 'bg-pink-50 border-pink-400 text-pink-700 ring-1 ring-pink-400'
                            : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                        }`}>
                        {g === 'male' ? t.common.male : t.common.female}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Professional */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              {t.teachers.professionalInfo}
            </p>
            <div className="space-y-4">

              {/* Qualification */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">{t.teachers.qualification}</label>
                <select value={form.qualification} onChange={e => set('qualification', e.target.value)}
                  className="w-full py-2.5 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  {QUALIFICATIONS.map(q => <option key={q} value={q}>{q}</option>)}
                  <option value="Other">Other…</option>
                </select>
                {form.qualification === 'Other' && (
                  <input value={form.customQualification}
                    onChange={e => set('customQualification', e.target.value)}
                    placeholder="Enter qualification…"
                    className="mt-2 w-full py-2.5 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                )}
              </div>

              {/* Subjects */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-2">
                  {t.teachers.subjects}<span className="text-red-500 ml-0.5">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {subjects.map(sub => {
                    const isSelected = form.selectedSubjects.includes(sub.name);
                    const colorCls   = subjectColors[sub.name] ?? 'border-slate-300 bg-slate-50 text-slate-700';
                    return (
                      <button key={sub.id} type="button" onClick={() => toggleSubject(sub.name)}
                        className={`flex items-center justify-between px-3 py-2 rounded-xl border text-xs font-medium text-left transition-all ${colorCls} ${isSelected ? 'ring-2 ring-offset-1' : 'opacity-55 hover:opacity-100'}`}>
                        <span>{sub.name}</span>
                        {isSelected && (
                          <div className="w-4 h-4 rounded-full bg-current opacity-70 flex items-center justify-center shrink-0">
                            <span className="text-white text-[9px] font-bold">✓</span>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
                {errors.subjects && <p className="text-red-500 text-xs mt-1">{errors.subjects}</p>}
              </div>

              {/* Class + Join date + Active */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">{t.teachers.optionalClass}</label>
                  <select value={form.classAssigned} onChange={e => set('classAssigned', e.target.value)}
                    className="w-full py-2.5 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="">— {t.teachers.none} —</option>
                    {classList.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
                <Field label={t.teachers.joinDate} type="date" value={form.joinDate}
                  onChange={v => set('joinDate', v)} />
              </div>

              {/* Active toggle */}
              <div className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-slate-700">{t.common.active}</p>
                  <p className="text-xs text-slate-400">{form.isActive ? t.common.active : t.common.inactive}</p>
                </div>
                <button type="button" onClick={() => set('isActive', !form.isActive)}
                  className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${form.isActive ? 'bg-indigo-500' : 'bg-slate-300'}`}>
                  <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${form.isActive ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-slate-200 shrink-0">
          <button onClick={onClose}
            className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
            {t.common.cancel}
          </button>
          <button onClick={handleSave} disabled={saved}
            className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg font-medium transition-colors ${
              saved ? 'bg-green-500 text-white cursor-default'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
            }`}>
            {saved ? <CheckCircle size={14} /> : <Save size={14} />}
            {saved ? t.common.saved : t.common.save}
          </button>
        </div>
      </div>
    </div>
  );
}
