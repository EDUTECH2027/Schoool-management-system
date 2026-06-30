import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import type { ClassRecord, Student } from '../../api/client';

export default function TeacherMyClass() {
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.portalTeacherClasses().then(cls => {
      setClasses(cls);
      if (cls[0]) setSelectedClass(cls[0].id);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedClass) return;
    setLoading(true);
    api.getClassStudents(selectedClass).then(setStudents).catch(() => {}).finally(() => setLoading(false));
  }, [selectedClass]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">My Class</h1>
        {classes.length > 1 && (
          <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)}
            className="border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
          >
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading…</div>
        ) : students.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No students found.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-700/50">
              <tr>
                {['#', 'Name', 'Student No.', 'Gender', 'Guardian', 'Phone'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {students.map((s, i) => (
                <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                  <td className="px-4 py-3 text-slate-500">{i + 1}</td>
                  <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{s.first_name} {s.last_name}</td>
                  <td className="px-4 py-3 text-slate-500">{s.student_number}</td>
                  <td className="px-4 py-3 text-slate-500 capitalize">{s.gender}</td>
                  <td className="px-4 py-3 text-slate-500">{s.guardian_name}</td>
                  <td className="px-4 py-3 text-slate-500">{s.guardian_phone}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
