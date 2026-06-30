import { useState, useEffect } from 'react';
import { Plus, Mail, Phone, BookOpen, Eye, Pencil, Trash2 } from 'lucide-react';
import type { Teacher, TeacherAttendance, AttendanceStatus } from '../types';
import { useLanguage } from '../i18n/LanguageContext';
import TeacherDetailModal from '../composants/teachers/TeacherDetailModal';
import AddTeacherModal    from '../composants/teachers/AddTeacherModal';
import EditTeacherModal   from '../composants/teachers/EditTeacherModal';
import ConfirmDialog      from '../composants/ui/ConfirmDialog';
import { api } from '../api/client';
import { mapTeacher } from '../api/mappers';

export default function Teachers() {
  const { t } = useLanguage();

  const [teacherList, setTeacherList] = useState<Teacher[]>([]);
  const [selected,          setSelected]          = useState<Teacher | null>(null);
  const [selectedAttendance, setSelectedAttendance] = useState<TeacherAttendance[]>([]);
  const [adding,    setAdding]        = useState(false);
  const [editing,   setEditing]       = useState<Teacher | null>(null);
  const [deleting,  setDeleting]      = useState<Teacher | null>(null);
  const [loading,   setLoading]       = useState(true);

  useEffect(() => {
    api.getTeachers()
      .then(data => setTeacherList(data.map(mapTeacher)))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const open = (tc: Teacher) => {
    setSelected(tc);
    setSelectedAttendance([]);
    api.getTeacherAttendance({ teacherId: tc.id })
      .then(data => setSelectedAttendance(data.map(r => ({
        id: r.id,
        teacherId: r.teacher_id,
        date: r.date,
        status: r.status as AttendanceStatus,
        remarks: r.remarks,
      }))))
      .catch(console.error);
  };
  const close = () => setSelected(null);

  const handleAdd = async (tc: Teacher) => {
    try {
      const result = await api.createTeacher({
        firstName:     tc.firstName,
        lastName:      tc.lastName,
        email:         tc.email,
        phone:         tc.phone,
        gender:        tc.gender,
        subjects:      tc.subjects,
        classAssigned: tc.classAssigned,
        qualification: tc.qualification,
        joinDate:      tc.joinDate,
      });
      setTeacherList(prev => [mapTeacher(result), ...prev]);
    } catch (err) {
      console.error('Failed to create teacher:', err);
    }
  };

  const handleUpdate = async (tc: Teacher) => {
    try {
      const result = await api.updateTeacher(tc.id, {
        firstName:     tc.firstName,
        lastName:      tc.lastName,
        email:         tc.email,
        phone:         tc.phone,
        gender:        tc.gender,
        subjects:      tc.subjects,
        classAssigned: tc.classAssigned,
        qualification: tc.qualification,
        joinDate:      tc.joinDate,
        isActive:      tc.isActive,
      });
      setTeacherList(prev => prev.map(t => t.id === tc.id ? mapTeacher(result) : t));
    } catch (err) {
      console.error('Failed to update teacher:', err);
    }
    setEditing(null);
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await api.deleteTeacher(deleting.id);
      setTeacherList(prev => prev.filter(t => t.id !== deleting.id));
    } catch (err) {
      console.error('Failed to delete teacher:', err);
    }
    setDeleting(null);
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
      <div className="flex items-center justify-between">
        <p className="text-slate-500 text-sm">{teacherList.filter(tc => tc.isActive).length} {t.teachers.activeTeachers}</p>
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={15} /> {t.teachers.addTeacher}
        </button>
      </div>

      {teacherList.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
            <BookOpen size={28} className="text-slate-400" />
          </div>
          <h3 className="text-slate-700 font-semibold text-lg mb-1">{t.teachers.activeTeachers === 'active teachers' ? 'No teachers yet' : 'Aucun enseignant'}</h3>
          <p className="text-slate-400 text-sm">{t.teachers.addTeacher} to get started.</p>
        </div>
      ) : (
        <>
          {/* Teacher cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {teacherList.map(tc => (
              <div
                key={tc.id}
                onClick={() => open(tc)}
                className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold shrink-0
                    ${tc.gender === 'female' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'}`}>
                    {tc.firstName[0]}{tc.lastName[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-800 group-hover:text-indigo-700 transition-colors">
                      {tc.firstName} {tc.lastName}
                    </p>
                    <p className="text-slate-400 text-xs">{tc.qualification}</p>
                  </div>
                  {tc.isActive && (
                    <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-medium shrink-0">
                      {t.common.active}
                    </span>
                  )}
                </div>

                {tc.classAssigned && (
                  <div className="flex items-center gap-2 mb-3">
                    <BookOpen size={13} className="text-indigo-500 shrink-0" />
                    <span className="text-sm text-indigo-600 font-medium">{tc.classAssigned}</span>
                  </div>
                )}

                <div className="flex flex-wrap gap-1.5 mb-4">
                  {tc.subjects.map(sub => (
                    <span key={sub} className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded">{sub}</span>
                  ))}
                </div>

                <div className="border-t border-slate-100 pt-3 flex items-end justify-between">
                  <div className="space-y-1.5">
                    <a href={`mailto:${tc.email}`}
                      onClick={e => e.stopPropagation()}
                      className="flex items-center gap-2 text-xs text-slate-500 hover:text-indigo-600 transition-colors">
                      <Mail size={12} /> {tc.email}
                    </a>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Phone size={12} /> {tc.phone}
                    </div>
                  </div>
                  <span className="text-indigo-400 text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 shrink-0">
                    <Eye size={12} /> {t.common.view}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Staff table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100">
              <h3 className="font-semibold text-slate-800">{t.teachers.staffRegister}</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                    <th className="text-left px-5 py-3 font-medium">{t.common.name}</th>
                    <th className="text-left px-5 py-3 font-medium">{t.teachers.subjects}</th>
                    <th className="text-left px-5 py-3 font-medium">{t.teachers.classAssigned}</th>
                    <th className="text-left px-5 py-3 font-medium">{t.teachers.qualification}</th>
                    <th className="text-left px-5 py-3 font-medium">{t.teachers.joinDate}</th>
                    <th className="text-left px-5 py-3 font-medium">{t.common.status}</th>
                    <th className="px-5 py-3 text-right font-medium">{t.common.actions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {teacherList.map(tc => (
                    <tr
                      key={tc.id}
                      onClick={() => open(tc)}
                      className="hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <td className="px-5 py-3">
                        <p className="font-medium text-slate-800">{tc.firstName} {tc.lastName}</p>
                        <p className="text-xs text-slate-400">{tc.email}</p>
                      </td>
                      <td className="px-5 py-3 text-slate-600">{tc.subjects.join(', ')}</td>
                      <td className="px-5 py-3">
                        {tc.classAssigned
                          ? <span className="bg-indigo-50 text-indigo-700 text-xs px-2 py-0.5 rounded">{tc.classAssigned}</span>
                          : <span className="text-slate-400">{t.teachers.none}</span>}
                      </td>
                      <td className="px-5 py-3 text-slate-600">{tc.qualification}</td>
                      <td className="px-5 py-3 text-slate-500">{tc.joinDate ? new Date(tc.joinDate).toLocaleDateString('en-GB') : '—'}</td>
                      <td className="px-5 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium
                          ${tc.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                          {tc.isActive ? t.common.active : t.common.inactive}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={e => { e.stopPropagation(); open(tc); }}
                            className="p-1.5 rounded-lg text-indigo-500 hover:bg-indigo-50 transition-colors"
                            title={t.common.view}
                          >
                            <Eye size={15} />
                          </button>
                          <button
                            onClick={e => { e.stopPropagation(); setEditing(tc); }}
                            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
                            title={t.common.edit}
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            onClick={e => { e.stopPropagation(); setDeleting(tc); }}
                            className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 transition-colors"
                            title={t.teachers.deleteTeacher}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {selected && (
        <TeacherDetailModal
          teacher={selected}
          attendance={selectedAttendance}
          schedule={[]}
          onClose={close}
        />
      )}

      {adding && (
        <AddTeacherModal
          onClose={() => setAdding(false)}
          onAdd={handleAdd}
        />
      )}

      {editing && (
        <EditTeacherModal
          teacher={editing}
          onClose={() => setEditing(null)}
          onSave={handleUpdate}
        />
      )}

      {deleting && (
        <ConfirmDialog
          title={t.teachers.deleteTeacher}
          message={`${t.teachers.confirmDelete} ${deleting.firstName} ${deleting.lastName}?`}
          sub={t.teachers.cannotUndo}
          confirmLabel={t.teachers.deleteTeacher}
          cancelLabel={t.common.cancel}
          onConfirm={handleDelete}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
