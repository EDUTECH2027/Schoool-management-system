import { useState, useEffect } from 'react';
import { Users, BookOpen, Eye, Settings } from 'lucide-react';
import type { Class } from '../types';
import { useLanguage } from '../i18n/LanguageContext';
import { useNavigate } from 'react-router-dom';
import ClassDetailModal from '../composants/classes/ClassDetailModal';
import { api } from '../api/client';
import { mapClass, mapStudent } from '../api/mappers';

export default function Classes() {
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [classList, setClassList] = useState<Class[]>([]);
  const [selected,  setSelected]  = useState<Class | null>(null);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    api.getClasses()
      .then(data => setClassList(data.map(mapClass)))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const [selectedStudents, setSelectedStudents] = useState<ReturnType<typeof mapStudent>[]>([]);

  const openDetail = async (cls: Class) => {
    setSelected(cls);
    try {
      const students = await api.getClassStudents(cls.id);
      setSelectedStudents(students.map(mapStudent));
    } catch {
      setSelectedStudents([]);
    }
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

      {/* Top bar */}
      <div className="flex items-center justify-between">
        <p className="text-slate-500 text-sm">{classList.length} {t.classes.activeThisTerm}</p>
        <button
          onClick={() => navigate('/settings')}
          className="flex items-center gap-2 border border-slate-200 hover:bg-slate-50 text-slate-600 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Settings size={15} /> Manage in Settings
        </button>
      </div>

      {classList.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
            <BookOpen size={28} className="text-slate-400" />
          </div>
          <h3 className="text-slate-700 font-semibold text-lg mb-1">No classes yet</h3>
          <p className="text-slate-400 text-sm max-w-xs">Go to Settings to create your first class.</p>
        </div>
      ) : (
        <>
          {/* Class cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {classList.map(cls => {
              const pct = cls.capacity > 0 ? Math.round((cls.enrolled / cls.capacity) * 100) : 0;
              return (
                <div
                  key={cls.id}
                  onClick={() => openDetail(cls)}
                  className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-slate-800 group-hover:text-indigo-700 transition-colors">
                        {cls.name}
                      </h3>
                      <p className="text-slate-400 text-xs">{cls.gradeLevelName} · {cls.room}</p>
                    </div>
                    <div className="w-9 h-9 rounded-lg bg-indigo-50 group-hover:bg-indigo-100 flex items-center justify-center transition-colors">
                      <BookOpen size={17} className="text-indigo-600" />
                    </div>
                  </div>

                  <div className="mb-3">
                    <div className="flex justify-between text-xs text-slate-500 mb-1">
                      <span>{t.classes.enrollment}</span>
                      <span>{cls.enrolled}/{cls.capacity}</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${pct >= 90 ? 'bg-red-400' : pct >= 75 ? 'bg-yellow-400' : 'bg-green-400'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-3 space-y-1.5">
                    <div className="flex items-center gap-2 text-sm">
                      <Users size={13} className="text-slate-400" />
                      <span className="text-slate-600 truncate">{cls.classTeacherName || '—'}</span>
                    </div>
                    <div className="flex items-center justify-end">
                      <span className="text-indigo-400 text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                        <Eye size={12} /> View
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Summary table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100">
              <h3 className="font-semibold text-slate-800">{t.classes.classDetails}</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                    <th className="text-left px-5 py-3 font-medium">{t.common.class}</th>
                    <th className="text-left px-5 py-3 font-medium">{t.classes.gradeLevel}</th>
                    <th className="text-left px-5 py-3 font-medium">{t.classes.classTeacher}</th>
                    <th className="text-left px-5 py-3 font-medium">{t.classes.room}</th>
                    <th className="text-center px-5 py-3 font-medium">{t.classes.enrolled}</th>
                    <th className="text-center px-5 py-3 font-medium">{t.classes.capacity}</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {classList.map(cls => (
                    <tr
                      key={cls.id}
                      className="hover:bg-slate-50 cursor-pointer"
                      onClick={() => openDetail(cls)}
                    >
                      <td className="px-5 py-3 font-medium text-slate-800">{cls.name}</td>
                      <td className="px-5 py-3 text-slate-600">{cls.gradeLevelName}</td>
                      <td className="px-5 py-3 text-slate-600">{cls.classTeacherName || '—'}</td>
                      <td className="px-5 py-3 text-slate-500">{cls.room}</td>
                      <td className="px-5 py-3 text-center font-semibold text-slate-800">{cls.enrolled}</td>
                      <td className="px-5 py-3 text-center text-slate-500">{cls.capacity}</td>
                      <td className="px-5 py-3 text-right">
                        <button
                          onClick={e => { e.stopPropagation(); openDetail(cls); }}
                          className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
                        >
                          <Eye size={13} /> {t.common.view}
                        </button>
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
        <ClassDetailModal
          cls={selected}
          students={selectedStudents}
          teacher={undefined}
          onClose={() => { setSelected(null); setSelectedStudents([]); }}
        />
      )}

    </div>
  );
}
