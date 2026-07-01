import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import type { Student } from '../../api/client';

export default function StudentProfile() {
  const [student, setStudent] = useState<Student | null>(null);

  useEffect(() => { api.portalStudentProfile().then(setStudent).catch(() => {}); }, []);

  if (!student) return <div className="text-slate-500">Loading…</div>;

  const rows: [string, string][] = [
    ['Student No.', student.student_number],
    ['Full Name', `${student.first_name} ${student.last_name}`],
    ['Date of Birth', student.date_of_birth ?? '—'],
    ['Gender', student.gender ?? '—'],
    ['Class', student.class_name ?? '—'],
    ['Grade Level', student.grade_level_name ?? '—'],
    ['Admission Date', student.admission_date ?? '—'],
    ['Address', student.address ?? '—'],
    ['Guardian', student.guardian_name ?? '—'],
    ['Guardian Phone', student.guardian_phone ?? '—'],
    ['Relationship', student.guardian_relationship ?? '—'],
  ];

  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">My Profile</h1>
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center px-5 py-3.5">
            <span className="w-44 text-sm text-slate-500 shrink-0">{label}</span>
            <span className="text-sm text-slate-800 dark:text-slate-200">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
