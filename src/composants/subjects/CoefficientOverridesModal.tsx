/*
 * Copyright (c) 2026 [COMPANY LEGAL NAME]. All rights reserved.
 * Proprietary and confidential. Unauthorized copying, distribution or
 * modification of this file, via any medium, is strictly prohibited.
 */
import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { api, type ClassRecord, type GradeLevel } from '../../api/client';
import type { Subject } from '../../types';
import { useLanguage } from '../../i18n/LanguageContext';

interface Props {
  subject: Subject;
  onClose: () => void;
  /** Called with the number of overrides now stored for this subject. */
  onSaved: (count: number) => void;
}

// Per-grade-level and per-class coefficients for one subject. A blank field means "inherit":
// class → grade level → the subject's default coefficient.
export default function CoefficientOverridesModal({ subject, onClose, onSaved }: Props) {
  const { lang } = useLanguage();
  const L = (en: string, fr: string) => (lang === 'fr' ? fr : en);
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [levels, setLevels] = useState<GradeLevel[]>([]);
  const [values, setValues] = useState<Record<string, string>>({}); // "g:<id>" | "c:<id>" → text
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api.getClasses(), api.getGradeLevels(), api.getCoefficientOverrides()])
      .then(([cs, gl, ov]) => {
        setClasses(cs);
        setLevels(gl);
        const v: Record<string, string> = {};
        ov.filter(o => o.subjectId === subject.id).forEach(o => {
          v[o.classId ? `c:${o.classId}` : `g:${o.gradeLevelId}`] = String(o.coefficient);
        });
        setValues(v);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [subject.id]);

  const set = (key: string, text: string) => setValues(prev => ({ ...prev, [key]: text }));

  const save = async () => {
    const overrides: { classId?: string; gradeLevelId?: string; coefficient: number }[] = [];
    for (const [key, text] of Object.entries(values)) {
      if (text.trim() === '') continue;
      const coefficient = Number(text);
      if (!Number.isFinite(coefficient) || coefficient <= 0) {
        setError(L('Coefficients must be positive numbers (leave blank to inherit).', 'Les coefficients doivent être positifs (laisser vide pour hériter).'));
        return;
      }
      overrides.push(key.startsWith('c:') ? { classId: key.slice(2), coefficient } : { gradeLevelId: key.slice(2), coefficient });
    }
    setSaving(true); setError('');
    try {
      await api.saveCoefficientOverrides(subject.id, overrides);
      onSaved(overrides.length);
      onClose();
    } catch (e) { setError((e as Error).message); } finally { setSaving(false); }
  };

  const inputCls = 'w-24 py-1.5 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-center';
  // What a class would use if its own field were blank.
  const inherited = (c: ClassRecord) => {
    const g = c.grade_level_id ? values[`g:${c.grade_level_id}`] : '';
    return g && Number(g) > 0 ? g : String(subject.coefficient);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between px-6 pt-5 pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-semibold text-slate-800">{subject.name} — {L('coefficients by class', 'coefficients par classe')}</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {L('Default coefficient', 'Coefficient par défaut')}: <b>{subject.coefficient}</b>. {L('Leave a field blank to inherit (class → grade level → default).', 'Laisser vide pour hériter (classe → niveau → défaut).')}
            </p>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>

        <div className="px-6 py-4 overflow-y-auto space-y-5">
          {loading && <p className="text-sm text-slate-400">{L('Loading…', 'Chargement…')}</p>}
          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

          {!loading && levels.length > 0 && (
            <section>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">{L('By grade level', 'Par niveau')}</h4>
              <div className="space-y-2">
                {levels.map(g => (
                  <label key={g.id} className="flex items-center justify-between gap-3 text-sm text-slate-700">
                    {g.name}
                    <input type="number" min={0} step="0.5" className={inputCls} value={values[`g:${g.id}`] ?? ''}
                      placeholder={String(subject.coefficient)} onChange={e => set(`g:${g.id}`, e.target.value)} />
                  </label>
                ))}
              </div>
            </section>
          )}

          {!loading && (
            <section>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">{L('By class (overrides its grade level)', 'Par classe (prioritaire sur le niveau)')}</h4>
              <div className="space-y-2">
                {classes.map(c => (
                  <label key={c.id} className="flex items-center justify-between gap-3 text-sm text-slate-700">
                    <span>{c.name}{c.grade_level_name ? <span className="text-xs text-slate-400"> · {c.grade_level_name}</span> : null}</span>
                    <input type="number" min={0} step="0.5" className={inputCls} value={values[`c:${c.id}`] ?? ''}
                      placeholder={inherited(c)} onChange={e => set(`c:${c.id}`, e.target.value)} />
                  </label>
                ))}
                {classes.length === 0 && <p className="text-sm text-slate-400">{L('No classes yet.', 'Aucune classe.')}</p>}
              </div>
            </section>
          )}
        </div>

        <div className="px-6 py-3.5 border-t border-slate-200 flex items-center justify-between bg-slate-50/60 rounded-b-2xl">
          <p className="text-xs text-slate-400">{L('Report cards already generated keep their coefficients until regenerated.', 'Les bulletins déjà générés gardent leurs coefficients jusqu’à régénération.')}</p>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 bg-white rounded-lg hover:bg-slate-50">{L('Cancel', 'Annuler')}</button>
            <button onClick={save} disabled={saving || loading} className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50">{L('Save', 'Enregistrer')}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
