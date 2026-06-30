import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import type { Student } from '../../api/client';

export default function ParentChildren() {
  const [children, setChildren] = useState<Student[]>([]);

  useEffect(() => { api.portalParentChildren().then(setChildren).catch(() => {}); }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">My Children</h1>
      {children.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-8 text-center text-slate-400">
          No children linked to your account.
        </div>
      ) : (
        <div className="space-y-4">
          {children.map(child => (
            <div key={child.id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-200 text-lg">{child.first_name} {child.last_name}</p>
                  <p className="text-sm text-slate-500">{child.class_name} · {child.grade_level_name} · {child.student_number}</p>
                </div>
                <span className={`px-2.5 py-1 rounded text-xs font-medium ${child.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                  {child.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: 'Academic Marks', to: `/parent/children/${child.id}/marks` },
                  { label: 'Attendance', to: `/parent/children/${child.id}/attendance` },
                  { label: 'Fee Records', to: `/parent/children/${child.id}/fees` },
                ].map(({ label, to }) => (
                  <Link key={to} to={to}
                    className="px-4 py-2 rounded-lg bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300 text-sm font-medium hover:bg-violet-100 transition-colors">
                    {label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
