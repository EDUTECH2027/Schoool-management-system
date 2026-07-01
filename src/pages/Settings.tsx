import { useState, useRef, useEffect } from 'react';
import { Upload, X, CalendarDays, AlertTriangle, CheckCircle2, BookOpen, Trash2, Plus, Pencil, Check, Download, Database, FileUp, DollarSign } from 'lucide-react';
import type { Subject } from '../types';
import { api, type ClassRecord, type Teacher as TeacherRaw, type AcademicYear, type Term } from '../api/client';
import { useLanguage } from '../i18n/LanguageContext';
import { useBranding } from '../context/BrandingContext';

interface FeeInstallment {
  label:   string;
  dueDate: string;
  amount:  number;
}

const DEFAULT_INSTALLMENTS: FeeInstallment[] = [
  { label: '', dueDate: '2025-02-15', amount: 25000 },
  { label: '', dueDate: '2025-04-15', amount: 25000 },
  { label: '', dueDate: '2025-06-15', amount: 25000 },
  { label: '', dueDate: '2025-09-15', amount: 25000 },
];

function loadInstallments(): FeeInstallment[] {
  try {
    const s = localStorage.getItem('fee_installments');
    if (s) return JSON.parse(s) as FeeInstallment[];
  } catch { /* ignore */ }
  return DEFAULT_INSTALLMENTS;
}

// ── Backup helpers ─────────────────────────────────────────────────────────
function toCSV(headers: string[], rows: (string | number | boolean | null | undefined)[][]): string {
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  return [headers.map(esc), ...rows.map(r => r.map(esc))].join('\r\n');
}

function downloadFile(filename: string, content: string, mime = 'text/csv') {
  const bom  = mime.includes('csv') ? '﻿' : '';
  const blob = new Blob([bom + content], { type: `${mime};charset=utf-8;` });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function Settings() {
  const { t, lang } = useLanguage();
  const { logoUrl, schoolName, schoolSub, schoolInfo, setLogoUrl, setSchoolName, setSchoolSub, setSchoolInfo } = useBranding();
  const lbl = (en: string, fr: string) => lang === 'fr' ? fr : en;

  const [name, setName]         = useState(schoolName);
  const [sub,  setSub]          = useState(schoolSub);
  const [info, setInfo]         = useState(schoolInfo);
  const [installments, setInstallments] = useState<FeeInstallment[]>(loadInstallments);

  // Default student fee (auto-populated when adding a new student)
  const [defaultFee, setDefaultFee] = useState<{ feeName: string; amount: string; academicYear: string }>(() => {
    try {
      const s = localStorage.getItem('default_student_fee');
      if (s) return JSON.parse(s) as { feeName: string; amount: string; academicYear: string };
    } catch { /* ignore */ }
    const yr = new Date().getFullYear();
    return { feeName: '', amount: '100000', academicYear: `${yr}-${yr + 1}` };
  });
  const [defaultFeeSaved, setDefaultFeeSaved] = useState(false);

  const [brandSaved,   setBrandSaved]   = useState(false);
  const [infoSaved,    setInfoSaved]    = useState(false);
  const [gradeSaved,   setGradeSaved]   = useState(false);
  const [feeSaved,     setFeeSaved]     = useState(false);
  const [dragging, setDragging]     = useState(false);
  const [dragImport, setDragImport] = useState(false);
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [importMsg, setImportMsg]   = useState('');
  const fileRef   = useRef<HTMLInputElement>(null);
  const importRef = useRef<HTMLInputElement>(null);

  // Subjects state (loaded from API)
  const [subjectList,  setSubjectList]  = useState<Subject[]>([]);
  const [subjectSaved, setSubjectSaved] = useState(false);
  const [newSubName,   setNewSubName]   = useState('');
  const [newSubCode,   setNewSubCode]   = useState('');
  const [editingSubId, setEditingSubId] = useState<string | null>(null);
  const [editSubName,  setEditSubName]  = useState('');
  const [editSubCode,  setEditSubCode]  = useState('');

  // Classes state
  type ClassFormState = { name: string; room: string; capacity: string; teacherId: string };
  const [classList,      setClassList]      = useState<ClassRecord[]>([]);
  const [teachersList,   setTeachersList]   = useState<TeacherRaw[]>([]);
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [editCls,  setEditCls]  = useState<ClassFormState>({ name: '', room: '', capacity: '40', teacherId: '' });
  const [newCls,   setNewCls]   = useState<ClassFormState>({ name: '', room: '', capacity: '40', teacherId: '' });
  const [classError, setClassError] = useState<string | null>(null);

  // Academic years & terms state
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [allTerms,      setAllTerms]      = useState<Term[]>([]);
  const yr = new Date().getFullYear();
  const [newYear, setNewYear] = useState({ label: `${yr}/${yr + 1}`, start_date: `${yr}-01-01`, end_date: `${yr}-12-31`, is_current: true });
  const [newTerm, setNewTerm] = useState({ academic_year_id: '', name: 'first' as 'first'|'second'|'third', start_date: '', end_date: '', is_current: false });
  const [calSaving, setCalSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      api.getClasses(),
      api.getTeachers({ isActive: 'true' }),
      api.getYears(),
      api.getTerms(),
      api.getSubjects(),
      api.getSchool().catch(() => null),
    ]).then(([classes, teachers, years, terms, subjects, school]) => {
      setClassList(classes);
      setTeachersList(teachers);
      setAcademicYears(years);
      setAllTerms(terms);
      if (years.length > 0) setNewTerm(prev => ({ ...prev, academic_year_id: years[0].id }));
      setSubjectList(subjects);
      if (school) {
        const mapped = {
          name:        school.name        ?? '',
          code:        school.code        ?? '',
          address:     school.address     ?? '',
          phone:       school.phone       ?? '',
          email:       school.email       ?? '',
          headTeacher: school.head_teacher ?? '',
          motto:       school.motto       ?? '',
        };
        setInfo(mapped);
        setSchoolInfo(mapped);
        if (school.name) setSchoolName(school.name);
      }
    }).catch(console.error);
  }, [setSchoolInfo, setSchoolName]);

  const setCurrentYear = async (id: string) => {
    const found = academicYears.find(y => y.id === id);
    if (!found) return;
    try {
      await api.updateYear(id, { ...found, is_current: 1 });
      const updated = await api.getYears();
      setAcademicYears(updated);
    } catch (err) { console.error(err); }
  };

  const addYear = async () => {
    if (!newYear.label.trim() || !newYear.start_date || !newYear.end_date) return;
    setCalSaving(true);
    try {
      const created = await api.createYear(newYear);
      setAcademicYears(prev => [...prev, created]);
      setNewTerm(prev => ({ ...prev, academic_year_id: created.id }));
      setNewYear(prev => ({ ...prev, name: 'first', start_date: '', end_date: '' }));
    } catch (err) { console.error(err); }
    setCalSaving(false);
  };

  const setCurrentTerm = async (id: string) => {
    const found = allTerms.find(t => t.id === id);
    if (!found) return;
    try {
      await api.updateTerm(id, { ...found, is_current: 1 });
      const updated = await api.getTerms();
      setAllTerms(updated);
    } catch (err) { console.error(err); }
  };

  const addTerm = async () => {
    if (!newTerm.academic_year_id || !newTerm.start_date || !newTerm.end_date) return;
    setCalSaving(true);
    try {
      const created = await api.createTerm({ ...newTerm });
      setAllTerms(prev => [...prev, created]);
      setNewTerm(prev => ({ ...prev, name: 'first', start_date: '', end_date: '', is_current: false }));
    } catch (err) { console.error(err); }
    setCalSaving(false);
  };

  const addClassEntry = async () => {
    setClassError(null);
    if (!newCls.name.trim()) {
      setClassError('Class name is required.');
      return;
    }
    const teacher = teachersList.find(tc => tc.id === newCls.teacherId);
    try {
      const created = await api.createClass({
        name:               newCls.name.trim(),
        capacity:           Math.max(1, Number(newCls.capacity) || 40),
        room:               newCls.room.trim() || undefined,
        class_teacher_id:   teacher?.id,
        class_teacher_name: teacher ? `${teacher.first_name} ${teacher.last_name}` : undefined,
      });
      setClassList(prev => [...prev, created]);
      setNewCls(prev => ({ ...prev, name: '', room: '', capacity: '40', teacherId: '' }));
    } catch (err) {
      console.error('Failed to create class:', err);
      setClassError(err instanceof Error ? err.message : 'Failed to create class.');
    }
  };

  const deleteClassEntry = async (id: string) => {
    try {
      await api.deleteClass(id);
      setClassList(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      console.error('Failed to delete class:', err);
    }
  };

  const startEditClass = (c: ClassRecord) => {
    setEditingClassId(c.id);
    setEditCls({ name: c.name, room: c.room, capacity: String(c.capacity), teacherId: c.class_teacher_id ?? '' });
  };

  const commitEditClass = async () => {
    if (!editingClassId) return;
    const existing = classList.find(c => c.id === editingClassId);
    const teacher  = teachersList.find(tc => tc.id === editCls.teacherId);
    try {
      const updated = await api.updateClass(editingClassId, {
        grade_level_id:     existing?.grade_level_id,
        grade_level_name:   existing?.grade_level_name,
        name:               editCls.name.trim() || undefined,
        capacity:           Math.max(1, Number(editCls.capacity) || 40),
        room:               editCls.room.trim() || undefined,
        class_teacher_id:   teacher?.id,
        class_teacher_name: teacher ? `${teacher.first_name} ${teacher.last_name}` : undefined,
      });
      setClassList(prev => prev.map(c => c.id === editingClassId ? updated : c));
      setEditingClassId(null);
    } catch (err) {
      console.error('Failed to update class:', err);
    }
  };

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const max = 256;
        const ratio = Math.min(max / img.width, max / img.height, 1);
        canvas.width  = Math.round(img.width  * ratio);
        canvas.height = Math.round(img.height * ratio);
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
        setLogoUrl(canvas.toDataURL('image/webp', 0.85));
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const saveBranding = () => {
    setSchoolName(name.trim() || schoolName);
    setSchoolSub(sub.trim());
    setBrandSaved(true);
    setTimeout(() => setBrandSaved(false), 2000);
  };

  const fields: { label: string; key: keyof typeof info; span?: boolean }[] = [
    { label: t.settings.schoolName,  key: 'name'        },
    { label: t.settings.schoolCode,  key: 'code'        },
    { label: t.settings.address,     key: 'address',     span: true },
    { label: t.settings.phone,       key: 'phone'       },
    { label: t.settings.email,       key: 'email'       },
    { label: t.settings.headTeacher, key: 'headTeacher' },
    { label: t.settings.motto,       key: 'motto',       span: true },
  ];

  const addSubject = async () => {
    const name = newSubName.trim();
    const code = newSubCode.trim().toUpperCase();
    if (!name || !code) return;
    try {
      const created = await api.createSubject({ name, code });
      setSubjectList(prev => [...prev, created]);
      setSubjectSaved(true);
      setTimeout(() => setSubjectSaved(false), 2000);
      setNewSubName('');
      setNewSubCode('');
    } catch (err) { console.error(err); }
  };

  const deleteSubject = async (id: string) => {
    try {
      await api.deleteSubject(id);
      setSubjectList(prev => prev.filter(s => s.id !== id));
    } catch (err) { console.error(err); }
  };

  const startEdit = (s: Subject) => {
    setEditingSubId(s.id);
    setEditSubName(s.name);
    setEditSubCode(s.code);
  };

  const commitEdit = async () => {
    if (!editingSubId) return;
    const orig = subjectList.find(s => s.id === editingSubId);
    if (!orig) return;
    try {
      const updated = await api.updateSubject(editingSubId, {
        name: editSubName.trim() || orig.name,
        code: editSubCode.trim().toUpperCase() || orig.code,
      });
      setSubjectList(prev => prev.map(s => s.id === editingSubId ? updated : s));
      setSubjectSaved(true);
      setTimeout(() => setSubjectSaved(false), 2000);
    } catch (err) { console.error(err); }
    setEditingSubId(null);
  };

  // ── CSV / JSON exports ──────────────────────────────────────────────────
  const exportStudentsCSV = async () => {
    const data = await api.getStudents({ limit: '10000' }).catch(console.error);
    if (!data) return;
    downloadFile('students.csv', toCSV(
      ['Student Number','First Name','Last Name','Date of Birth','Gender','Class','Grade Level','Guardian Name','Guardian Phone','Admission Date','Active'],
      data.map(s => [s.student_number,s.first_name,s.last_name,s.date_of_birth,s.gender,s.class_name,s.grade_level_name,s.guardian_name,s.guardian_phone,s.admission_date,s.is_active ? 'Yes' : 'No']),
    ));
  };

  const exportTeachersCSV = async () => {
    const data = await api.getTeachers().catch(console.error);
    if (!data) return;
    downloadFile('teachers.csv', toCSV(
      ['First Name','Last Name','Email','Phone','Gender','Subjects','Class Assigned','Qualification','Join Date','Active'],
      data.map(t => [t.first_name,t.last_name,t.email,t.phone,t.gender,t.subjects.join('; '),t.class_assigned ?? '',t.qualification,t.join_date,t.is_active ? 'Yes' : 'No']),
    ));
  };

  const exportClassesCSV = async () => {
    const data = await api.getClasses().catch(console.error);
    if (!data) return;
    downloadFile('classes.csv', toCSV(
      ['Class Name','Grade Level','Room','Capacity','Enrolled','Class Teacher'],
      data.map(c => [c.name,c.grade_level_name,c.room,c.capacity,c.enrolled,c.class_teacher_name ?? '']),
    ));
  };

  const exportMarksCSV = async () => {
    const data = await api.getMarks().catch(console.error);
    if (!data) return;
    downloadFile('marks.csv', toCSV(
      ['Student Name','Subject','CA Score','Exam Score','Total Score','Grade','Remark'],
      data.map(m => [m.student_name,m.subject_name,m.ca_score,m.exam_score,m.total_score,m.grade,m.remark]),
    ));
  };

  const exportFeesCSV = async () => {
    const data = await api.getFees().catch(console.error);
    if (!data) return;
    downloadFile('fees.csv', toCSV(
      ['Student Name','Student Number','Class','Fee Name','Academic Year','Amount Due','Amount Paid','Balance','Status','Due Date'],
      data.map(f => [f.student_name,f.student_number,f.class_name,f.fee_name,f.academic_year,f.amount_due,f.amount_paid,f.balance,f.status,f.due_date ?? '']),
    ));
  };

  const exportFullBackup = async () => {
    const [students, teachers, classes, marks, feeRecords] = await Promise.all([
      api.getStudents({ limit: '10000' }),
      api.getTeachers(),
      api.getClasses(),
      api.getMarks(),
      api.getFees(),
    ]).catch(err => { console.error(err); return null; }) ?? [[], [], [], [], []];
    if (!students) return;
    const backup = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      branding: { schoolName: name, schoolSub: sub, logoUrl, schoolInfo: info },
      feeInstallments: installments,
      subjects: subjectList,
      students,
      teachers,
      classes,
      marks,
      feeRecords,
    };
    downloadFile('school-backup.json', JSON.stringify(backup, null, 2), 'application/json');
  };

  const handleImportFile = (file: File) => {
    setImportStatus('idle');
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const backup = JSON.parse(e.target?.result as string);
        if (backup.version !== '1.0') throw new Error('unsupported version');

        const restored: string[] = [];
        if (backup.subjects && Array.isArray(backup.subjects)) {
          // Keep localStorage copy for legacy compatibility
          localStorage.setItem('subjects', JSON.stringify(backup.subjects));
          setSubjectList(backup.subjects);
          restored.push(`${backup.subjects.length} ${lbl('subjects', 'matières')}`);
        }
        if (backup.feeInstallments) {
          localStorage.setItem('fee_installments', JSON.stringify(backup.feeInstallments));
          setInstallments(backup.feeInstallments);
          restored.push(lbl('fee schedule', 'calendrier des frais'));
        }
        if (backup.branding) {
          const b = backup.branding;
          if (b.schoolName)  { setSchoolName(b.schoolName);  setName(b.schoolName); }
          if (b.schoolSub !== undefined) { setSchoolSub(b.schoolSub); setSub(b.schoolSub); }
          if (b.logoUrl !== undefined)   setLogoUrl(b.logoUrl);
          if (b.schoolInfo)  { setSchoolInfo(b.schoolInfo);  setInfo(b.schoolInfo); }
          restored.push(lbl('branding & school info', 'identité & infos école'));
        }
        setImportStatus('success');
        setImportMsg(lbl(`Restored: ${restored.join(', ')}`, `Restauré : ${restored.join(', ')}`));
      } catch {
        setImportStatus('error');
        setImportMsg(lbl('Invalid file. Please use a .json backup exported from this app.', 'Fichier invalide. Utilisez un fichier .json exporté depuis cette application.'));
      }
    };
    reader.readAsText(file);
  };

  const gradingScale = [
    { grade: 'A+', min: 90, max: 100, remarkEn: 'Excellent',     remarkFr: 'Excellent'   },
    { grade: 'A',  min: 80, max: 89,  remarkEn: 'Very Good',     remarkFr: 'Très bien'   },
    { grade: 'B',  min: 70, max: 79,  remarkEn: 'Good',          remarkFr: 'Bien'        },
    { grade: 'C',  min: 60, max: 69,  remarkEn: 'Average',       remarkFr: 'Assez bien'  },
    { grade: 'D',  min: 50, max: 59,  remarkEn: 'Below Average', remarkFr: 'Insuffisant' },
    { grade: 'F',  min: 0,  max: 49,  remarkEn: 'Fail',          remarkFr: 'Échec'       },
  ];

  return (
    <div className="space-y-6">

      {/* ── Top row: Branding + School Info ───────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

        {/* Branding */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col">
          <h3 className="font-semibold text-slate-800 mb-5">
            {lbl('Application Branding', "Identité de l'application")}
          </h3>

          {/* Upload zone */}
          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => {
              e.preventDefault(); setDragging(false);
              const f = e.dataTransfer.files[0];
              if (f) handleFile(f);
            }}
            className={`relative mx-auto w-32 h-32 rounded-2xl border-2 border-dashed cursor-pointer flex items-center justify-center overflow-hidden transition-colors mb-1 ${
              dragging
                ? 'border-indigo-400 bg-indigo-50'
                : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50'
            }`}
          >
            {logoUrl ? (
              <>
                <img src={logoUrl} alt="logo" className="w-full h-full object-contain p-1" />
                <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1">
                  <Upload size={18} className="text-white" />
                  <span className="text-white text-xs">{lbl('Change', 'Changer')}</span>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center gap-2 text-slate-400 px-3 text-center">
                <Upload size={22} />
                <span className="text-xs leading-snug">
                  {lbl('Click or drag\nto upload logo', 'Cliquer ou\nglisser logo')}
                </span>
              </div>
            )}
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = '';
            }}
          />

          {logoUrl ? (
            <button
              onClick={() => setLogoUrl(null)}
              className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600 mx-auto mb-4 mt-2"
            >
              <X size={11} /> {lbl('Remove logo', 'Supprimer le logo')}
            </button>
          ) : (
            <p className="text-xs text-slate-400 text-center mb-4 mt-2">
              {lbl('PNG, JPG or SVG — max 256px', 'PNG, JPG ou SVG — max 256px')}
            </p>
          )}

          <div className="space-y-3 flex-1">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                {lbl('School name (sidebar)', 'Nom école (barre latérale)')}
                <span className="text-red-500 ml-0.5">*</span>
              </label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full py-2 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                {lbl('Subtitle (sidebar)', 'Sous-titre (barre latérale)')}
              </label>
              <input
                value={sub}
                onChange={e => setSub(e.target.value)}
                className="w-full py-2 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <button
            onClick={saveBranding}
            className="mt-5 w-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            {brandSaved ? t.common.saved : t.settings.saveChanges}
          </button>
        </div>

        {/* School Information */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-800 mb-5">{t.settings.schoolInformation}</h3>
          <div className="grid grid-cols-2 gap-4">
            {fields.map(f => (
              <div key={f.key} className={f.span ? 'col-span-2' : ''}>
                <label className="block text-xs font-medium text-slate-500 mb-1">{f.label}</label>
                <input
                  value={info[f.key]}
                  onChange={e => setInfo(prev => ({ ...prev, [f.key]: e.target.value }))}
                  className="w-full py-2 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            ))}
          </div>
          <button
            onClick={async () => {
              try {
                await api.updateSchool({
                  name:        info.name,
                  code:        info.code,
                  address:     info.address,
                  phone:       info.phone,
                  email:       info.email,
                  head_teacher: info.headTeacher,
                  motto:       info.motto,
                });
                setSchoolInfo(info);
                if (info.name) setSchoolName(info.name);
                setInfoSaved(true);
                setTimeout(() => setInfoSaved(false), 2000);
              } catch (err) { console.error(err); }
            }}
            className="mt-5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            {infoSaved ? t.common.saved : t.settings.saveChanges}
          </button>
        </div>
      </div>

      {/* ── Default Student Fee ───────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
            <DollarSign size={16} className="text-indigo-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800">
              {lbl('Default Student Fee', 'Frais par défaut (élève)')}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {lbl(
                'Pre-filled automatically when registering a new student.',
                'Pré-rempli automatiquement lors de l\'inscription d\'un nouvel élève.'
              )}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-1">
            <label className="block text-xs font-medium text-slate-500 mb-1">
              {lbl('Fee Label', 'Libellé des frais')}
            </label>
            <input
              value={defaultFee.feeName}
              onChange={e => setDefaultFee(p => ({ ...p, feeName: e.target.value }))}
              placeholder={lbl('e.g. School Fees 2025-2026', 'ex : Scolarité 2025-2026')}
              className="w-full py-2 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              {lbl('Total Amount (FCFA)', 'Montant total (FCFA)')}
            </label>
            <input
              type="number"
              min={0}
              value={defaultFee.amount}
              onChange={e => setDefaultFee(p => ({ ...p, amount: e.target.value }))}
              className="w-full py-2 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              {lbl('Academic Year', 'Année académique')}
            </label>
            <input
              value={defaultFee.academicYear}
              onChange={e => setDefaultFee(p => ({ ...p, academicYear: e.target.value }))}
              placeholder="2025-2026"
              className="w-full py-2 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {Number(defaultFee.amount) > 0 && (
          <div className="mt-3 flex items-center gap-2 text-xs text-indigo-600 bg-indigo-50 border border-indigo-100 px-3 py-2 rounded-lg">
            <CheckCircle2 size={13} />
            {lbl(
              `New students will have a fee of ${Number(defaultFee.amount).toLocaleString()} FCFA applied automatically.`,
              `Les nouveaux élèves auront des frais de ${Number(defaultFee.amount).toLocaleString()} FCFA appliqués automatiquement.`
            )}
          </div>
        )}

        <button
          onClick={() => {
            localStorage.setItem('default_student_fee', JSON.stringify(defaultFee));
            setDefaultFeeSaved(true);
            setTimeout(() => setDefaultFeeSaved(false), 2000);
          }}
          className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          {defaultFeeSaved ? t.common.saved : t.settings.saveChanges}
        </button>
      </div>

      {/* ── Fee Payment Schedule ──────────────────────────────── */}
      {(() => {
        const target   = Math.max(0, Number(defaultFee.amount) || 0);
        const total    = installments.reduce((s, i) => s + i.amount, 0);
        const isValid  = target > 0 && total === target;
        const today    = new Date().toISOString().split('T')[0];

        const ordinal = (n: number) => {
          if (lang === 'fr') return `${n}${n === 1 ? 'er' : 'e'}`;
          return `${n}${['th','st','nd','rd'][Math.min(n % 10 > 3 || Math.floor(n / 10) % 10 === 1 ? 0 : n % 10, 3)]}`;
        };

        const updateField = <K extends keyof FeeInstallment>(idx: number, key: K, value: FeeInstallment[K]) =>
          setInstallments(prev => prev.map((item, i) => i === idx ? { ...item, [key]: value } : item));

        const saveSchedule = () => {
          localStorage.setItem('fee_installments', JSON.stringify(installments));
          setFeeSaved(true);
          setTimeout(() => setFeeSaved(false), 2000);
        };

        return (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                <CalendarDays size={16} className="text-indigo-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800">{t.settings.feeSchedule}</h3>
                <p className="text-xs text-slate-400 mt-0.5">{t.settings.feeScheduleHint}</p>
              </div>
            </div>

            <div className="space-y-3">
              {installments.map((inst, idx) => {
                const isOverdue = inst.dueDate && inst.dueDate < today;
                const defaultLabel = `${ordinal(idx + 1)} ${t.settings.installment}`;
                return (
                  <div key={idx} className="grid grid-cols-12 gap-3 items-center p-3 rounded-xl bg-slate-50 border border-slate-100">
                    {/* Number badge */}
                    <div className="col-span-1 flex items-center justify-center">
                      <span className="w-7 h-7 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">
                        {idx + 1}
                      </span>
                    </div>

                    {/* Label */}
                    <div className="col-span-4">
                      <label className="block text-xs font-medium text-slate-500 mb-1">
                        {lbl('Label', 'Libellé')}
                      </label>
                      <input
                        value={inst.label}
                        onChange={e => updateField(idx, 'label', e.target.value)}
                        placeholder={defaultLabel}
                        className="w-full py-2 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                      />
                    </div>

                    {/* Due date */}
                    <div className="col-span-4">
                      <label className="block text-xs font-medium text-slate-500 mb-1">
                        {t.fees.dueDate}
                      </label>
                      <div className="relative">
                        <input
                          type="date"
                          value={inst.dueDate}
                          onChange={e => updateField(idx, 'dueDate', e.target.value)}
                          className={`w-full py-2 px-3 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white ${
                            isOverdue ? 'border-orange-300 text-orange-600' : 'border-slate-200'
                          }`}
                        />
                        {isOverdue && (
                          <span className="absolute -top-2 right-2 bg-orange-100 text-orange-600 text-[10px] font-semibold px-1.5 py-0.5 rounded">
                            {lbl('past', 'échu')}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Amount */}
                    <div className="col-span-3">
                      <label className="block text-xs font-medium text-slate-500 mb-1">
                        {lbl('Amount (FCFA)', 'Montant (FCFA)')}
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={inst.amount}
                        onChange={e => updateField(idx, 'amount', Math.max(0, Number(e.target.value)))}
                        className="w-full py-2 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Total row */}
            <div className={`mt-4 flex items-center justify-between px-4 py-3 rounded-xl border ${
              isValid ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'
            }`}>
              <div className="flex items-center gap-2">
                {isValid
                  ? <CheckCircle2 size={16} className="text-green-600" />
                  : <AlertTriangle size={16} className="text-orange-500" />
                }
                <span className={`text-sm font-medium ${isValid ? 'text-green-700' : 'text-orange-600'}`}>
                  {t.settings.totalAmount}: {total.toLocaleString()} FCFA
                  {!isValid && target > 0 && ` — ${Math.abs(target - total).toLocaleString()} FCFA ${total < target ? lbl('missing', 'manquant') : lbl('excess', 'en trop')}`}
                </span>
              </div>
              {isValid && (
                <span className="text-xs text-green-600 font-medium">
                  {lbl('✓ Balanced', '✓ Équilibré')}
                </span>
              )}
            </div>

            <button
              onClick={saveSchedule}
              disabled={!isValid}
              className="mt-5 flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              {feeSaved ? t.common.saved : t.settings.saveChanges}
            </button>
          </div>
        );
      })()}

      {/* ── Subjects ──────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
            <BookOpen size={16} className="text-indigo-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800">{t.settings.subjects}</h3>
            <p className="text-xs text-slate-400 mt-0.5">{t.settings.subjectsHint}</p>
          </div>
        </div>

        {/* Subject list */}
        <div className="space-y-2 mb-4">
          {subjectList.length === 0 && (
            <p className="text-sm text-slate-400 py-2">{t.settings.noSubjects}</p>
          )}
          {subjectList.map(s => (
            <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
              {editingSubId === s.id ? (
                <>
                  <input
                    value={editSubName}
                    onChange={e => setEditSubName(e.target.value)}
                    placeholder={t.settings.subjectName}
                    className="flex-1 py-1.5 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  />
                  <input
                    value={editSubCode}
                    onChange={e => setEditSubCode(e.target.value)}
                    placeholder={t.settings.subjectCode}
                    className="w-28 py-1.5 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white uppercase"
                  />
                  <button
                    onClick={commitEdit}
                    className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                    title={t.common.save}
                  >
                    <Check size={15} />
                  </button>
                  <button
                    onClick={() => setEditingSubId(null)}
                    className="p-1.5 text-slate-400 hover:bg-slate-200 rounded-lg transition-colors"
                    title={t.common.cancel}
                  >
                    <X size={15} />
                  </button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm text-slate-800 font-medium">{s.name}</span>
                  <span className="w-16 text-xs font-mono text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md text-center">{s.code}</span>
                  <button
                    onClick={() => startEdit(s)}
                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    title={t.common.edit}
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => deleteSubject(s.id)}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title={t.settings.deleteSubject}
                  >
                    <Trash2 size={14} />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>

        {/* Add new subject */}
        <div className="flex items-center gap-3 p-3 rounded-xl border-2 border-dashed border-slate-200">
          <Plus size={16} className="text-slate-400 shrink-0" />
          <input
            value={newSubName}
            onChange={e => setNewSubName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addSubject(); }}
            placeholder={t.settings.subjectName}
            className="flex-1 py-1.5 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          />
          <input
            value={newSubCode}
            onChange={e => setNewSubCode(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addSubject(); }}
            placeholder={t.settings.subjectCode}
            className="w-28 py-1.5 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white uppercase"
          />
          <button
            onClick={addSubject}
            disabled={!newSubName.trim() || !newSubCode.trim()}
            className="shrink-0 flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors"
          >
            <Plus size={14} />
            {t.settings.addSubject}
          </button>
        </div>

        {subjectSaved && (
          <p className="mt-3 text-sm text-green-600 font-medium flex items-center gap-1.5">
            <CheckCircle2 size={15} /> {t.common.saved}
          </p>
        )}
      </div>

      {/* ── Classes ──────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
            <BookOpen size={16} className="text-indigo-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800">{lbl('Classes', 'Classes')}</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {lbl('Create and manage classes — they appear automatically on the Classes page.', 'Créez et gérez les classes — elles apparaissent automatiquement sur la page Classes.')}
            </p>
          </div>
        </div>

        {/* Class list */}
        <div className="space-y-2 mb-4">
          {classList.length === 0 && (
            <p className="text-sm text-slate-400 py-2">{lbl('No classes yet. Add one below.', 'Aucune classe pour l\'instant. Ajoutez-en une ci-dessous.')}</p>
          )}
          {classList.map(c => (
            <div key={c.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
              {editingClassId === c.id ? (
                <>
                  <input
                    value={editCls.name}
                    onChange={e => setEditCls(prev => ({ ...prev, name: e.target.value }))}
                    placeholder={lbl('Class name', 'Nom de la classe')}
                    className="flex-1 py-1.5 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  />
                  <input
                    value={editCls.room}
                    onChange={e => setEditCls(prev => ({ ...prev, room: e.target.value }))}
                    placeholder={lbl('Room', 'Salle')}
                    className="w-20 py-1.5 px-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  />
                  <input
                    type="number"
                    value={editCls.capacity}
                    onChange={e => setEditCls(prev => ({ ...prev, capacity: e.target.value }))}
                    className="w-16 py-1.5 px-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  />
                  <select
                    value={editCls.teacherId}
                    onChange={e => setEditCls(prev => ({ ...prev, teacherId: e.target.value }))}
                    className="flex-1 py-1.5 px-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    <option value="">{lbl('No teacher', 'Aucun enseignant')}</option>
                    {teachersList.map(tc => <option key={tc.id} value={tc.id}>{tc.first_name} {tc.last_name}</option>)}
                  </select>
                  <button onClick={commitEditClass} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors" title={t.common.save}>
                    <Check size={15} />
                  </button>
                  <button onClick={() => setEditingClassId(null)} className="p-1.5 text-slate-400 hover:bg-slate-200 rounded-lg transition-colors" title={t.common.cancel}>
                    <X size={15} />
                  </button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm text-slate-800 font-medium">{c.name}</span>
                  <span className="text-xs text-slate-500 w-16 text-center">{c.room}</span>
                  <span className="text-xs text-slate-400 w-20 text-center">{c.capacity} {lbl('seats', 'places')}</span>
                  <span className="text-xs text-slate-500 truncate max-w-[130px]">{c.class_teacher_name || '—'}</span>
                  <button onClick={() => startEditClass(c)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title={t.common.edit}>
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => deleteClassEntry(c.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title={t.settings.deleteSubject}>
                    <Trash2 size={14} />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>

        {/* Add new class */}
        <div className="p-4 rounded-xl border-2 border-dashed border-slate-200 space-y-3">
          <div className="flex items-center gap-3">
            <Plus size={16} className="text-slate-400 shrink-0" />
            <input
              value={newCls.name}
              onChange={e => setNewCls(prev => ({ ...prev, name: e.target.value }))}
              onKeyDown={e => { if (e.key === 'Enter') addClassEntry(); }}
              placeholder={lbl('Class name (e.g. Form 1A)', 'Nom de la classe (ex : 6ème A)')}
              className="flex-1 py-1.5 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            />
          </div>
          <div className="flex items-center gap-3 pl-7">
            <input
              value={newCls.room}
              onChange={e => setNewCls(prev => ({ ...prev, room: e.target.value }))}
              onKeyDown={e => { if (e.key === 'Enter') addClassEntry(); }}
              placeholder={lbl('Room', 'Salle')}
              className="w-28 py-1.5 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            />
            <input
              type="number"
              value={newCls.capacity}
              onChange={e => setNewCls(prev => ({ ...prev, capacity: e.target.value }))}
              placeholder="40"
              className="w-20 py-1.5 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            />
            <select
              value={newCls.teacherId}
              onChange={e => setNewCls(prev => ({ ...prev, teacherId: e.target.value }))}
              className="flex-1 py-1.5 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="">{lbl('Class teacher (optional)', 'Enseignant(e) (optionnel)')}</option>
              {teachersList.map(tc => <option key={tc.id} value={tc.id}>{tc.first_name} {tc.last_name}</option>)}
            </select>
            <button
              onClick={addClassEntry}
              disabled={!newCls.name.trim()}
              className="shrink-0 flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors"
            >
              <Plus size={14} />
              {lbl('Add Class', 'Ajouter')}
            </button>
          </div>
          {classError && (
            <p className="mt-2 text-sm text-red-600">{classError}</p>
          )}
        </div>
      </div>

      {/* ── Backup & Restore ─────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
            <Database size={16} className="text-indigo-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800">{lbl('Backup & Restore', 'Sauvegarde & Restauration')}</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {lbl('Export data as CSV files or create a full JSON backup you can restore later.', 'Exportez les données en CSV ou créez une sauvegarde JSON complète pour la restaurer plus tard.')}
            </p>
          </div>
        </div>  

        {/* Export */}
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
            {lbl('Export Data', 'Exporter les données')}
          </p>
          <div className="flex flex-wrap gap-2 mb-3">
            {([
              { label: lbl('Students', 'Élèves'),   fn: exportStudentsCSV },
              { label: lbl('Teachers', 'Enseignants'), fn: exportTeachersCSV },
              { label: lbl('Classes', 'Classes'),   fn: exportClassesCSV  },
              { label: lbl('Marks', 'Notes'),       fn: exportMarksCSV    },
              { label: lbl('Fees', 'Frais'),        fn: exportFeesCSV     },
            ] as const).map(({ label, fn }) => (
              <button
                key={label}
                onClick={fn}
                className="flex items-center gap-1.5 text-sm font-medium text-slate-700 bg-slate-50 border border-slate-200 hover:bg-slate-100 hover:border-slate-300 px-3 py-2 rounded-lg transition-colors"
              >
                <Download size={13} className="text-slate-400" />
                {label} <span className="text-slate-400 font-normal text-xs">.csv</span>
              </button>
            ))}
          </div>
          <button
            onClick={exportFullBackup}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <Download size={14} />
            {lbl('Full Backup (.json)', 'Sauvegarde complète (.json)')}
          </button>
        </div>

        <div className="border-t border-slate-100" />

        {/* Import */}
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
            {lbl('Import / Restore', 'Importer / Restaurer')}
          </p>

          <div
            onClick={() => importRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragImport(true); }}
            onDragLeave={() => setDragImport(false)}
            onDrop={e => {
              e.preventDefault(); setDragImport(false);
              const f = e.dataTransfer.files[0];
              if (f) handleImportFile(f);
            }}
            className={[
              'flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed cursor-pointer py-8 transition-colors',
              dragImport ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50',
            ].join(' ')}
          >
            <FileUp size={24} className={dragImport ? 'text-indigo-500' : 'text-slate-400'} />
            <p className="text-sm font-medium text-slate-600">
              {lbl('Drop a .json backup here, or click to browse', 'Déposez un fichier .json ici, ou cliquez pour parcourir')}
            </p>
            <p className="text-xs text-slate-400">
              {lbl('Restores: subjects, fee schedule, branding & school info', 'Restaure : matières, calendrier des frais, identité & infos école')}
            </p>
          </div>

          <input
            ref={importRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={e => {
              const f = e.target.files?.[0];
              if (f) handleImportFile(f);
              e.target.value = '';
            }}
          />

          {importStatus !== 'idle' && (
            <div className={[
              'mt-3 flex items-start gap-2 text-sm rounded-lg px-4 py-3',
              importStatus === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200',
            ].join(' ')}>
              {importStatus === 'success'
                ? <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
                : <AlertTriangle size={16} className="shrink-0 mt-0.5" />}
              {importMsg}
            </div>
          )}

          <p className="text-xs text-slate-400 mt-3 flex items-center gap-1">
            <AlertTriangle size={11} />
            {lbl('Note: student and teacher records are read-only in the current version.', 'Note : les données élèves et enseignants sont en lecture seule dans cette version.')}
          </p>
        </div>
      </div>

      {/* ── Academic Calendar ─────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6">
        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
          <CalendarDays size={18} className="text-indigo-500" />
          {lbl('Academic Calendar', 'Calendrier académique')}
        </h3>

        {/* Academic Years */}
        <div>
          <p className="text-sm font-medium text-slate-600 mb-2">{lbl('Academic Years', 'Années académiques')}</p>
          {academicYears.length === 0 && (
            <p className="text-sm text-slate-400 mb-3">{lbl('No academic year yet.', 'Aucune année académique.')}</p>
          )}
          <div className="space-y-2 mb-3">
            {academicYears.map(y => (
              <div key={y.id} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2 text-sm">
                <span className="font-medium text-slate-700">{y.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">{y.start_date} → {y.end_date}</span>
                  {y.is_current ? (
                    <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded font-medium">{lbl('Current', 'En cours')}</span>
                  ) : (
                    <button onClick={() => setCurrentYear(y.id)} className="text-xs text-indigo-600 hover:underline">
                      {lbl('Set current', 'Définir actuel')}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <input value={newYear.label} onChange={e => setNewYear(p => ({ ...p, label: e.target.value }))}
              placeholder={lbl('Label e.g. 2025/2026', 'Ex. 2025/2026')}
              className="col-span-2 sm:col-span-1 border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            <input type="date" value={newYear.start_date} onChange={e => setNewYear(p => ({ ...p, start_date: e.target.value }))}
              className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            <input type="date" value={newYear.end_date} onChange={e => setNewYear(p => ({ ...p, end_date: e.target.value }))}
              className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            <button onClick={addYear} disabled={calSaving}
              className="flex items-center justify-center gap-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm px-3 py-1.5 rounded-lg transition-colors">
              <Plus size={14} /> {lbl('Add Year', 'Ajouter')}
            </button>
          </div>
        </div>

        {/* Terms */}
        <div>
          <p className="text-sm font-medium text-slate-600 mb-2">{lbl('Terms', 'Trimestres')}</p>
          {allTerms.length === 0 && (
            <p className="text-sm text-amber-600 bg-amber-50 rounded-lg px-3 py-2 mb-3">
              {lbl('No terms yet — assessments cannot be saved without at least one term.', 'Aucun trimestre — les notes ne peuvent pas être sauvegardées sans trimestre.')}
            </p>
          )}
          <div className="space-y-2 mb-3">
            {allTerms.map(tm => {
              const yearLabel = academicYears.find(y => y.id === tm.academic_year_id)?.label ?? '';
              const termNum = tm.name === 'first' ? 1 : tm.name === 'second' ? 2 : 3;
              return (
                <div key={tm.id} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2 text-sm">
                  <span className="font-medium text-slate-700">{lbl(`Term ${termNum}`, `Trimestre ${termNum}`)} <span className="text-slate-400 font-normal">({yearLabel})</span></span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">{tm.start_date} → {tm.end_date}</span>
                    {tm.is_current ? (
                      <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded font-medium">{lbl('Current', 'En cours')}</span>
                    ) : (
                      <button onClick={() => setCurrentTerm(tm.id)} className="text-xs text-indigo-600 hover:underline">
                        {lbl('Set current', 'Définir actuel')}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            <select value={newTerm.academic_year_id} onChange={e => setNewTerm(p => ({ ...p, academic_year_id: e.target.value }))}
              className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              {academicYears.map(y => <option key={y.id} value={y.id}>{y.label}</option>)}
            </select>
            <select value={newTerm.name} onChange={e => setNewTerm(p => ({ ...p, name: e.target.value as 'first'|'second'|'third' }))}
              className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="first">{lbl('Term 1', 'Trimestre 1')}</option>
              <option value="second">{lbl('Term 2', 'Trimestre 2')}</option>
              <option value="third">{lbl('Term 3', 'Trimestre 3')}</option>
            </select>
            <input type="date" value={newTerm.start_date} onChange={e => setNewTerm(p => ({ ...p, start_date: e.target.value }))}
              className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            <input type="date" value={newTerm.end_date} onChange={e => setNewTerm(p => ({ ...p, end_date: e.target.value }))}
              className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            <button onClick={addTerm} disabled={calSaving || academicYears.length === 0}
              className="flex items-center justify-center gap-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm px-3 py-1.5 rounded-lg transition-colors">
              <Plus size={14} /> {lbl('Add Term', 'Ajouter')}
            </button>
          </div>
        </div>
      </div>

      {/* ── Grading Scale ─────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="font-semibold text-slate-800 mb-5">{t.settings.gradingScale}</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                <th className="text-left px-4 py-2.5 font-medium w-16">{t.assessments.grade}</th>
                <th className="text-left px-4 py-2.5 font-medium w-32">{t.settings.minScore}</th>
                <th className="text-left px-4 py-2.5 font-medium w-32">{t.settings.maxScore}</th>
                <th className="text-left px-4 py-2.5 font-medium">{t.settings.remark}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {gradingScale.map(g => (
                <tr key={g.grade} className="hover:bg-slate-50">
                  <td className="px-4 py-2">
                    <span className="font-bold text-slate-800">{g.grade}</span>
                  </td>
                  <td className="px-4 py-2">
                    <input
                      defaultValue={g.min}
                      type="number"
                      min={0} max={100}
                      className="w-24 py-1.5 px-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      defaultValue={g.max}
                      type="number"
                      min={0} max={100}
                      className="w-24 py-1.5 px-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      defaultValue={lang === 'fr' ? g.remarkFr : g.remarkEn}
                      className="w-full py-1.5 px-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button
          onClick={() => { setGradeSaved(true); setTimeout(() => setGradeSaved(false), 2000); }}
          className="mt-5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          {gradeSaved ? t.common.saved : t.settings.saveChanges}
        </button>
      </div>
    </div>
  );
}
