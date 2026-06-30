import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import type { Mark, Term } from '../../api/client';

const GRADE_COLOR: Record<string, string> = {
  A: 'text-emerald-600', B: 'text-blue-600', C: 'text-amber-600', D: 'text-orange-600', F: 'text-red-600',
};

export default function StudentMarks() {
  const [terms, setTerms] = useState<Term[]>([]);
  const [termId, setTermId] = useState('');
  const [marks, setMarks] = useState<Mark[]>([]);

  useEffect(() => {
    api.getTerms().then(t => { setTerms(t); if (t[0]) setTermId(t[0].id); }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!termId) return;
    api.portalStudentMarks(termId).then(setMarks).catch(() => {});
  }, [termId]);

  const avg = marks.length ? Math.round(marks.reduce((s, m) => s + m.total_score, 0) / marks.length) : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">My Marks</h1>
        <select value={termId} onChange={e => setTermId(e.target.value)}
          className="border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300">
          {terms.map(t => <option key={t.id} value={t.id}>{t.name} {t.is_current ? '(current)' : ''}</option>)}
        </select>
      </div>

      {avg !== null && (
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 flex items-center gap-4">
          <div className="text-center">
            <p className="text-3xl font-bold text-emerald-600">{avg}%</p>
            <p className="text-xs text-emerald-600">Overall Average</p>
          </div>
          <div className="text-sm text-emerald-700 dark:text-emerald-400">
            {marks.length} subject{marks.length !== 1 ? 's' : ''} recorded
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-700/50">
            <tr>
              {['Subject', 'CA (40)', 'Exam (60)', 'Total', 'Grade', 'Remark'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {marks.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No marks for this term.</td></tr>}
            {marks.map(m => (
              <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{m.subject_name}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{m.ca_score}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{m.exam_score}</td>
                <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">{m.total_score}</td>
                <td className="px-4 py-3">
                  <span className={`font-bold ${GRADE_COLOR[m.grade?.[0]] ?? 'text-slate-600'}`}>{m.grade ?? '—'}</span>
                </td>
                <td className="px-4 py-3 text-slate-500">{m.remark ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
