import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import type { Student } from '../../api/client';

export default function ParentDashboard() {
  const [children, setChildren] = useState<Student[]>([]);

  useEffect(() => { api.portalParentChildren().then(setChildren).catch(() => {}); }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Parent Dashboard</h1>
      <p className="text-slate-500 text-sm">{new Date().toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}</p>

      {children.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-8 text-center text-slate-400">
          No children linked to your account yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {children.map(child => (
            <div key={child.id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 space-y-3">
              <div>
                <p className="font-semibold text-slate-800 dark:text-slate-200">{child.first_name} {child.last_name}</p>
                <p className="text-xs text-slate-500">{child.class_name} · {child.student_number}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: 'Marks', to: `/parent/children/${child.id}/marks` },
                  { label: 'Attendance', to: `/parent/children/${child.id}/attendance` },
                  { label: 'Fees', to: `/parent/children/${child.id}/fees` },
                ].map(({ label, to }) => (
                  <Link key={to} to={to}
                    className="px-3 py-1.5 rounded-lg bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300 text-xs font-medium hover:bg-violet-100 transition-colors">
                    {label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <Link to="/parent/children" className="px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700">
          View All Children
        </Link>
        <Link to="/parent/profile" className="px-4 py-2 rounded-lg border border-slate-300 text-slate-600 dark:text-slate-400 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800">
          My Profile
        </Link>
      </div>
    </div>
  );
}
