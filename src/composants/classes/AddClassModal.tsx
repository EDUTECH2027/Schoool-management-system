import { useState, useEffect } from 'react';
import { X, BookOpen, CheckCircle } from 'lucide-react';
import type { Class, Teacher } from '../../types';
import { useLanguage } from '../../i18n/LanguageContext';
import { api, type GradeLevel } from '../../api/client';
import { mapTeacher } from '../../api/mappers';

interface Props {
  onClose: () => void;
  onAdd: (cls: Class) => void;
}

type FormState = {
  name: string;
  gradeLevelId: string;
  room: string;
  capacity: string;
  classTeacherId: string;
};

type Errors = Partial<Record<keyof FormState, string>>;

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

export default function AddClassModal({ onClose, onAdd }: Props) {
  const { t, lang } = useLanguage();

  const [teachers, setTeachers]       = useState<Teacher[]>([]);
  const [gradeLevels, setGradeLevels] = useState<GradeLevel[]>([]);
  const [form, setForm] = useState<FormState>({
    name: '',
    gradeLevelId: '',
    room: '',
    capacity: '40',
    classTeacherId: '',
  });
  const [errors, setErrors] = useState<Errors>({});
  const [done, setDone] = useState(false);

  useEffect(() => {
    api.getTeachers({ isActive: 'true' })
      .then(data => setTeachers(data.map(mapTeacher)))
      .catch(console.error);
    api.getGradeLevels()
      .then(data => {
        setGradeLevels(data);
        setForm(prev => prev.gradeLevelId ? prev : { ...prev, gradeLevelId: data[2]?.id ?? data[0]?.id ?? '' });
      })
      .catch(console.error);
  }, []);

  const set = (field: keyof FormState, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  // Auto-suggest class name when grade changes
  const handleGradeChange = (gradeId: string) => {
    const gl = gradeLevels.find(g => g.id === gradeId);
    if (gl && !form.name) {
      setForm(prev => ({ ...prev, gradeLevelId: gradeId, name: `${gl.name} ` }));
    } else {
      set('gradeLevelId', gradeId);
    }
  };

  const validate = (): boolean => {
    const e: Errors = {};
    if (!form.name.trim())          e.name     = t.students.required;
    if (!form.gradeLevelId)         e.gradeLevelId = t.students.required;
    if (!form.room.trim())          e.room     = t.students.required;
    if (!form.capacity || isNaN(Number(form.capacity)) || Number(form.capacity) < 1)
                                    e.capacity = lang === 'fr' ? 'Entrez un nombre valide' : 'Enter a valid number';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    const gl      = gradeLevels.find(g => g.id === form.gradeLevelId)!;
    const teacher = teachers.find(tc => tc.id === form.classTeacherId);

    const newClass: Class = {
      id:               `c-${Date.now()}`,
      gradeLevelId:     gl.id,
      gradeLevelName:   gl.name,
      name:             form.name.trim(),
      capacity:         Number(form.capacity),
      room:             form.room.trim(),
      classTeacherId:   teacher?.id ?? '',
      classTeacherName: teacher ? `${teacher.firstName} ${teacher.lastName}` : '',
      enrolled:         0,
    };

    onAdd(newClass);
    setDone(true);
    setTimeout(onClose, 1100);
  };

  const selectedGrade = gradeLevels.find(g => g.id === form.gradeLevelId);
  const selectedTeacher = teachers.find(tc => tc.id === form.classTeacherId);

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
              <BookOpen size={16} className="text-indigo-600" />
            </div>
            <h2 className="font-semibold text-slate-800">{t.classes.addTitle}</h2>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
            <X size={17} className="text-slate-500" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          {done ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mb-3">
                <CheckCircle size={28} className="text-green-500" />
              </div>
              <p className="font-semibold text-slate-800">{t.classes.classAdded}</p>
              <p className="text-slate-400 text-sm mt-1">{form.name}</p>
            </div>
          ) : (
            <>
              {/* Grade level */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  {t.classes.gradeLevel}<span className="text-red-500 ml-0.5">*</span>
                </label>
                <select
                  value={form.gradeLevelId}
                  onChange={e => handleGradeChange(e.target.value)}
                  className="w-full py-2.5 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {gradeLevels.map(gl => (
                    <option key={gl.id} value={gl.id}>{gl.name}</option>
                  ))}
                </select>
              </div>

              {/* Class name */}
              <Field
                label={t.classes.className} required
                value={form.name} onChange={v => set('name', v)}
                placeholder={selectedGrade ? `${selectedGrade.name} A` : ''}
                error={errors.name}
              />

              {/* Room + Capacity */}
              <div className="grid grid-cols-2 gap-4">
                <Field
                  label={t.classes.room} required
                  value={form.room} onChange={v => set('room', v)}
                  placeholder="Room 1"
                  error={errors.room}
                />
                <Field
                  label={t.classes.capacity} required type="number"
                  value={form.capacity} onChange={v => set('capacity', v)}
                  error={errors.capacity}
                />
              </div>

              {/* Class teacher */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  {t.classes.classTeacher}<span className="text-red-500 ml-0.5">*</span>
                </label>
                <select
                  value={form.classTeacherId}
                  onChange={e => set('classTeacherId', e.target.value)}
                  className="w-full py-2.5 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {teachers.filter(tc => tc.isActive).map(tc => (
                    <option key={tc.id} value={tc.id}>
                      {tc.firstName} {tc.lastName} — {tc.subjects.join(', ')}
                    </option>
                  ))}
                </select>
              </div>

              {/* Live preview card */}
              {form.name && (
                <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 space-y-2 text-sm">
                  <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wide mb-1">
                    {lang === 'fr' ? 'Aperçu' : 'Preview'}
                  </p>
                  {[
                    { label: t.classes.className,   value: form.name             },
                    { label: t.classes.gradeLevel,  value: selectedGrade?.name ?? '—' },
                    { label: t.classes.room,        value: form.room || '—'      },
                    { label: t.classes.capacity,    value: form.capacity || '—'  },
                    { label: t.classes.classTeacher,value: selectedTeacher ? `${selectedTeacher.firstName} ${selectedTeacher.lastName}` : '—' },
                  ].map(row => (
                    <div key={row.label} className="flex justify-between text-xs">
                      <span className="text-indigo-500">{row.label}</span>
                      <span className="font-semibold text-indigo-800">{row.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!done && (
          <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-slate-200 shrink-0">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              {t.common.cancel}
            </button>
            <button
              onClick={handleSubmit}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
            >
              <BookOpen size={14} />
              {t.classes.addClass}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
