import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { api } from '../../api/client';
import type { ClassRecord, Student, Mark, Term } from '../../api/client';

interface MarkRow { student_id: string; student_name: string; student_number: string; subject_id: string; subject_name: string; ca_score: number; exam_score: number; }

export default function TeacherMarks() {
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [classId, setClassId] = useState('');
  const [termId, setTermId] = useState('');
  const [subjectName, setSubjectName] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [rows, setRows] = useState<MarkRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    Promise.all([api.portalTeacherClasses(), api.getTerms(), api.getSubjects()])
      .then(([cls, trm, subj]) => {
        setClasses(cls);
        setTerms(trm);
        if (cls[0]) setClassId(cls[0].id);
        if (trm[0]) setTermId(trm[0].id);
        if (subj[0]) { setSubjectId(subj[0].id); setSubjectName(subj[0].name); }
      }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!classId) return;
    api.getClassStudents(classId).then(setStudents).catch(() => {});
  }, [classId]);

  useEffect(() => {
    if (!classId || !termId || !subjectId) return;
    api.portalTeacherMarks(classId, termId).then((marks: Mark[]) => {
      setRows(students.map(s => {
        const existing = marks.find(m => m.student_id === s.id && m.subject_id === subjectId);
        return { student_id: s.id, student_name: `${s.first_name} ${s.last_name}`, student_number: s.student_number, subject_id: subjectId, subject_name: subjectName, ca_score: existing?.ca_score ?? 0, exam_score: existing?.exam_score ?? 0 };
      }));
    }).catch(() => {});
  }, [classId, termId, subjectId, subjectName, students]);

  const update = (idx: number, field: 'ca_score' | 'exam_score', val: string) => {
    setRows(r => r.map((row, i) => i === idx ? { ...row, [field]: Math.min(100, Math.max(0, Number(val) || 0)) } : row));
  };

  const save = async () => {
    setSaving(true);
    try {
      await api.portalTeacherSaveMarks(classId, termId, rows);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Mark Entry</h1>

      <div className="flex flex-wrap gap-3">
        <select value={classId} onChange={e => setClassId(e.target.value)} className="border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300">
          {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={termId} onChange={e => setTermId(e.target.value)} className="border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300">
          {terms.map(t => <option key={t.id} value={t.id}>{t.name} {t.is_current ? '(current)' : ''}</option>)}
        </select>
        <select value={subjectId} onChange={e => { const el = e.target; setSubjectId(el.value); setSubjectName(el.options[el.selectedIndex].text); }}
          className="border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300">
          {/* Populated via subjects API but teacher's own subjects would be filtered server-side */}
        </select>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-700/50">
            <tr>
              {['Student', 'No.', 'CA (40)', 'Exam (60)', 'Total'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {rows.map((row, i) => (
              <tr key={row.student_id}>
                <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{row.student_name}</td>
                <td className="px-4 py-3 text-slate-500">{row.student_number}</td>
                <td className="px-4 py-2">
                  <input type="number" min={0} max={40} value={row.ca_score} onChange={e => update(i, 'ca_score', e.target.value)}
                    className="w-20 border border-slate-300 dark:border-slate-600 rounded px-2 py-1 text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200" />
                </td>
                <td className="px-4 py-2">
                  <input type="number" min={0} max={60} value={row.exam_score} onChange={e => update(i, 'exam_score', e.target.value)}
                    className="w-20 border border-slate-300 dark:border-slate-600 rounded px-2 py-1 text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200" />
                </td>
                <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">{row.ca_score + row.exam_score}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button onClick={save} disabled={saving || rows.length === 0}
        className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
        <Save size={15} /> {saving ? 'Saving…' : saved ? 'Saved!' : 'Save Marks'}
      </button>
    </div>
  );
}
