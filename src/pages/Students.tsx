import { useState, useEffect } from 'react';
import { Search, Plus, Eye, Pencil, Users, User, UserCheck } from 'lucide-react';
import type { Student, Class } from '../types';
import { StatusBadge } from '../composants/ui/Badge';
import { useLanguage } from '../i18n/LanguageContext';
import StudentViewModal from '../composants/students/StudentViewModal';
import StudentEditModal from '../composants/students/StudentEditModal';
import StudentAddModal  from '../composants/students/StudentAddModal';
import type { FeeData } from '../composants/students/StudentAddModal';
import { api } from '../api/client';
import { mapStudent, mapClass } from '../api/mappers';

export default function Students() {
  const { t } = useLanguage();

  const [studentList, setStudentList] = useState<Student[]>([]);
  const [classes,     setClasses]     = useState<Class[]>([]);
  const [,            setLoading]     = useState(true);

  const [search, setSearch]               = useState('');
  const [filterClass, setFilterClass]     = useState('');
  const [filterGender, setFilterGender]   = useState('');
  const [kpiFilter, setKpiFilter]         = useState<'all' | 'male' | 'female' | 'active'>('all');

  const [viewing, setViewing]   = useState<Student | null>(null);
  const [editing, setEditing]   = useState<Student | null>(null);
  const [adding,  setAdding]    = useState(false);

  useEffect(() => {
    Promise.all([api.getStudents(), api.getClasses()])
      .then(([sts, cls]) => {
        setStudentList(sts.map(mapStudent));
        setClasses(cls.map(mapClass));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = studentList.filter(s => {
    const name = `${s.firstName} ${s.lastName} ${s.studentNumber}`.toLowerCase();
    const matchSearch  = name.includes(search.toLowerCase());
    const matchClass   = filterClass  ? s.classId === filterClass  : true;
    const matchGender  = filterGender ? s.gender   === filterGender : true;
    const matchKpi     = kpiFilter === 'male'   ? s.gender === 'male'
                       : kpiFilter === 'female' ? s.gender === 'female'
                       : kpiFilter === 'active' ? s.isActive
                       : true;
    return matchSearch && matchClass && matchGender && matchKpi;
  });

  const handleSave = async (updated: Student) => {
    try {
      const result = await api.updateStudent(updated.id, updated);
      setStudentList(prev => prev.map(s => s.id === updated.id ? mapStudent(result) : s));
    } catch (err) {
      console.error('Failed to update student:', err);
    }
    setEditing(null);
  };

  const handleAdd = async (newStudent: Student, fee?: FeeData) => {
    try {
      const result = await api.createStudent(newStudent);
      const mapped = mapStudent(result);
      setStudentList(prev => [mapped, ...prev]);

      if (fee && fee.feeName && fee.amountDue > 0) {
        await api.createFee({
          studentId:    mapped.id,
          feeName:      fee.feeName,
          amountDue:    fee.amountDue,
          dueDate:      fee.dueDate,
          academicYear: fee.academicYear,
        } as Parameters<typeof api.createFee>[0]);
      }
    } catch (err) {
      console.error('Failed to create student:', err);
    }
  };

  // Open Edit from inside the View modal
  const switchToEdit = () => {
    if (viewing) {
      setEditing(viewing);
      setViewing(null);
    }
  };

  return (
    <div className="space-y-5">

      {/* ── Search & filters ────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">

          {/* Main search bar */}
          <div className="relative flex-1 min-w-52">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t.students.searchPlaceholder}
              className="w-full pl-9 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors"
            />
          </div>

          {/* Class filter */}
          <select
            value={filterClass}
            onChange={e => setFilterClass(e.target.value)}
            className="py-2.5 px-3 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">{t.students.allClasses}</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>

          {/* Gender filter */}
          <select
            value={filterGender}
            onChange={e => setFilterGender(e.target.value)}
            className="py-2.5 px-3 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">{t.students.allGenders}</option>
            <option value="male">{t.common.male}</option>
            <option value="female">{t.common.female}</option>
          </select>

          {/* Clear button — only visible when filtering */}
          {(search || filterClass || filterGender) && (
            <button
              onClick={() => { setSearch(''); setFilterClass(''); setFilterGender(''); setKpiFilter('all'); }}
              className="py-2.5 px-3 text-sm text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              ✕ Clear
            </button>
          )}

          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors ml-auto"
          >
            <Plus size={15} /> {t.students.addStudent}
          </button>
        </div>
      </div>

      {/* ── Summary KPIs ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {([
          {
            key: 'all'    as const,
            label: t.students.totalStudents,
            count: studentList.length,
            Icon: Users,
            activeBg:     'bg-indigo-600 border-indigo-600',
            activeShadow: 'shadow-indigo-200',
            iconActive:   'text-indigo-200',
            numActive:    'text-white',
            labelActive:  'text-indigo-200',
            numDefault:   'text-indigo-600',
            hoverBorder:  'hover:border-indigo-300',
            hoverShadow:  'hover:shadow-indigo-100',
            blob:         'bg-indigo-400',
          },
          {
            key: 'male'   as const,
            label: t.students.male,
            count: studentList.filter(s => s.gender === 'male').length,
            Icon: User,
            activeBg:     'bg-blue-500 border-blue-500',
            activeShadow: 'shadow-blue-200',
            iconActive:   'text-blue-100',
            numActive:    'text-white',
            labelActive:  'text-blue-100',
            numDefault:   'text-blue-600',
            hoverBorder:  'hover:border-blue-300',
            hoverShadow:  'hover:shadow-blue-100',
            blob:         'bg-blue-400',
          },
          {
            key: 'female' as const,
            label: t.students.female,
            count: studentList.filter(s => s.gender === 'female').length,
            Icon: User,
            activeBg:     'bg-pink-500 border-pink-500',
            activeShadow: 'shadow-pink-200',
            iconActive:   'text-pink-100',
            numActive:    'text-white',
            labelActive:  'text-pink-100',
            numDefault:   'text-pink-600',
            hoverBorder:  'hover:border-pink-300',
            hoverShadow:  'hover:shadow-pink-100',
            blob:         'bg-pink-400',
          },
          {
            key: 'active' as const,
            label: t.students.activeStudents,
            count: studentList.filter(s => s.isActive).length,
            Icon: UserCheck,
            activeBg:     'bg-emerald-500 border-emerald-500',
            activeShadow: 'shadow-emerald-200',
            iconActive:   'text-emerald-100',
            numActive:    'text-white',
            labelActive:  'text-emerald-100',
            numDefault:   'text-emerald-600',
            hoverBorder:  'hover:border-emerald-300',
            hoverShadow:  'hover:shadow-emerald-100',
            blob:         'bg-emerald-400',
          },
        ] as const).map(({ key, label, count, Icon, activeBg, activeShadow, iconActive, numActive, labelActive, numDefault, hoverBorder, hoverShadow, blob }) => {
          const isActive = kpiFilter === key;
          return (
            <div
              key={key}
              onClick={() => setKpiFilter(f => f === key ? 'all' : key)}
              className={[
                'relative overflow-hidden rounded-xl border p-4 cursor-pointer select-none',
                'transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg group',
                isActive
                  ? `${activeBg} shadow-md ${activeShadow}`
                  : `bg-white border-slate-200 ${hoverBorder} ${hoverShadow}`,
              ].join(' ')}
            >
              <div className={`absolute -right-3 -top-3 w-16 h-16 rounded-full opacity-10 ${isActive ? 'bg-white' : blob}`} />
              <Icon
                size={20}
                className={`mb-2 transition-colors ${isActive ? iconActive : `${numDefault} opacity-80 group-hover:opacity-100`}`}
              />
              <p className={`text-2xl font-bold transition-colors ${isActive ? numActive : numDefault}`}>
                {count}
              </p>
              <p className={`text-sm mt-0.5 font-medium transition-colors ${isActive ? labelActive : 'text-slate-500'}`}>
                {label}
              </p>
            </div>
          );
        })}
      </div>

      {/* ── Table ────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="flex flex-col gap-2 px-5 py-3 border-b border-slate-100 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-600 font-medium">
            {filtered.length} {t.students.studentsFound}
            {search && <span className="text-indigo-600"> — "{search}"</span>}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                <th className="text-left px-5 py-3 font-medium">{t.common.name}</th>
                <th className="text-left px-5 py-3 font-medium">{t.students.admNo}</th>
                <th className="text-left px-5 py-3 font-medium">{t.common.class}</th>
                <th className="text-left px-5 py-3 font-medium">{t.students.gender}</th>
                <th className="text-left px-5 py-3 font-medium">{t.students.guardian}</th>
                <th className="text-left px-5 py-3 font-medium">{t.common.status}</th>
                <th className="text-left px-5 py-3 font-medium">{t.common.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(s => (
                <tr key={s.id} className="hover:bg-slate-50 transition-colors">

                  {/* Name + avatar */}
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0
                        ${s.gender === 'female' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'}`}>
                        {s.firstName[0]}{s.lastName[0]}
                      </div>
                      <div>
                        <p className="font-medium text-slate-800">{s.firstName} {s.lastName}</p>
                        <p className="text-slate-400 text-xs">{new Date(s.dateOfBirth).toLocaleDateString('en-GB')}</p>
                      </div>
                    </div>
                  </td>

                  <td className="px-5 py-3 text-slate-600 font-mono text-xs">{s.studentNumber}</td>

                  <td className="px-5 py-3">
                    <span className="bg-indigo-50 text-indigo-700 text-xs font-medium px-2 py-0.5 rounded">{s.className}</span>
                  </td>

                  <td className="px-5 py-3 text-slate-600">
                    {s.gender === 'male' ? t.common.male : t.common.female}
                  </td>

                  <td className="px-5 py-3">
                    <p className="text-slate-700">{s.guardianName}</p>
                    <p className="text-slate-400 text-xs">{s.guardianPhone}</p>
                  </td>

                  <td className="px-5 py-3">
                    <StatusBadge status={s.isActive ? 'present' : 'absent'} />
                  </td>

                  {/* Actions */}
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setViewing(s)}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                        title={t.common.view}
                      >
                        <Eye size={13} />
                        {t.common.view}
                      </button>
                      <button
                        onClick={() => setEditing(s)}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                        title={t.common.edit}
                      >
                        <Pencil size={13} />
                        {t.common.edit}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <div className="text-center py-14 text-slate-400">
              <Users size={36} className="mx-auto mb-2 opacity-30" />
              <p>{t.students.noStudents}</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Modals ───────────────────────────────────────────── */}
      {viewing && (
        <StudentViewModal
          student={viewing}
          onClose={() => setViewing(null)}
          onEdit={switchToEdit}
        />
      )}

      {editing && (
        <StudentEditModal
          student={editing}
          onClose={() => setEditing(null)}
          onSave={handleSave}
        />
      )}

      {adding && (
        <StudentAddModal
          onClose={() => setAdding(false)}
          onAdd={handleAdd}
          totalExisting={studentList.length}
          classes={classes}
        />
      )}
    </div>
  );
}
