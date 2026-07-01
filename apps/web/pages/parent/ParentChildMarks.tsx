import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { api } from '../../api/client';
import type { Mark, Term } from '../../api/client';

export default function ParentChildMarks() {
  const { studentId } = useParams<{ studentId: string }>();
  const [terms, setTerms] = useState<Term[]>([]);
  const [termId, setTermId] = useState('');
  const [marks, setMarks] = useState<Mark[]>([]);

  useEffect(() => {
    api.getTerms().then(t => { setTerms(t); if (t[0]) setTermId(t[0].id); }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!termId || !studentId) return;
    api.portalParentChildMarks(studentId, termId).then(setMarks).catch(() => {});
  }, [termId, studentId]);

  const avg = marks.length ? Math.round(marks.reduce((s, m) => s + m.total_score, 0) / marks.length) : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link to="/parent/children" className="text-slate-400 hover:text-slate-600"><ChevronLeft size={20} /></Link>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Academic Marks</h1>
        <select value={termId} onChange={e => setTermId(e.target.value)}
          className="ml-auto border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300">
          {terms.map(t => <option key={t.id} value={t.id}>{t.name} {t.is_current ? '(current)' : ''}</option>)}
        </select>
      </div>

      {avg !== null && (
        <div className="bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 rounded-xl p-4">
          <p className="text-2xl font-bold text-violet-600">{avg}% Overall Average</p>
          <p className="text-sm text-violet-600 dark:text-violet-400">{marks.length} subjects</p>
        </div>
      )}

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-700/50">
            <tr>
              {['Subject', 'CA', 'Exam', 'Total', 'Grade'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {marks.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">No marks for this term.</td></tr>}
            {marks.map(m => (
              <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{m.subject_name}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{m.ca_score}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{m.exam_score}</td>
                <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">{m.total_score}</td>
                <td className="px-4 py-3 font-bold text-violet-600">{m.grade ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
