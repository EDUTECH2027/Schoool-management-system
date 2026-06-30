import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { api } from '../../api/client';
import type { ClassRecord, Student } from '../../api/client';

type Status = 'present' | 'absent' | 'late' | 'excused';

export default function TeacherAttendance() {
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [classId, setClassId] = useState('');
  const [className, setClassName] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [statuses, setStatuses] = useState<Record<string, Status>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.portalTeacherClasses().then(cls => {
      setClasses(cls);
      if (cls[0]) { setClassId(cls[0].id); setClassName(cls[0].name); }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!classId) return;
    Promise.all([api.getClassStudents(classId), api.portalTeacherStudentAttendance(classId, date)])
      .then(([sts, att]) => {
        setStudents(sts);
        const map: Record<string, Status> = {};
        sts.forEach(s => { map[s.id] = 'present'; });
        att.forEach(a => { map[a.student_id] = a.status as Status; });
        setStatuses(map);
      }).catch(() => {});
  }, [classId, date]);

  const save = async () => {
    setSaving(true);
    try {
      const records = students.map(s => ({ student_id: s.id, student_name: `${s.first_name} ${s.last_name}`, student_number: s.student_number, class_name: className, status: statuses[s.id] ?? 'present' }));
      await api.portalTeacherSaveAttendance(classId, date, records);
      setSaved(true); setTimeout(() => setSaved(false), 2000);
    } finally { setSaving(false); }
  };

  const STATUS_COLORS: Record<Status, string> = {
    present: 'bg-emerald-100 text-emerald-700 border-emerald-300',
    absent:  'bg-red-100 text-red-700 border-red-300',
    late:    'bg-amber-100 text-amber-700 border-amber-300',
    excused: 'bg-blue-100 text-blue-700 border-blue-300',
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Student Attendance</h1>

      <div className="flex flex-wrap gap-3">
        <select value={classId} onChange={e => { const el = e.target; setClassId(el.value); setClassName(el.options[el.selectedIndex].text); }}
          className="border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300">
          {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          className="border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300" />
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-700/50">
            <tr>
              {['Student', 'No.', 'Status'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {students.map(s => (
              <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{s.first_name} {s.last_name}</td>
                <td className="px-4 py-3 text-slate-500">{s.student_number}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    {(['present','absent','late','excused'] as Status[]).map(st => (
                      <button key={st} onClick={() => setStatuses(prev => ({ ...prev, [s.id]: st }))}
                        className={`px-2.5 py-1 rounded border text-xs font-medium capitalize transition-all ${statuses[s.id] === st ? STATUS_COLORS[st] : 'border-slate-200 text-slate-400 hover:border-slate-300'}`}>
                        {st}
                      </button>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button onClick={save} disabled={saving || students.length === 0}
        className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
        <Save size={15} /> {saving ? 'Saving…' : saved ? 'Saved!' : 'Save Attendance'}
      </button>
    </div>
  );
}
