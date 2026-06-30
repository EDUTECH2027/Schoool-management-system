import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import type { ScheduleEntry } from '../../api/client';

const DAYS = ['monday','tuesday','wednesday','thursday','friday'] as const;

export default function StudentTimetable() {
  const [slots, setSlots] = useState<ScheduleEntry[]>([]);

  useEffect(() => { api.portalStudentTimetable().then(setSlots).catch(() => {}); }, []);

  const periods = [...new Set(slots.map(s => s.period_key))].sort();
  const byDayPeriod = (day: string, period: string) => slots.find(s => s.day === day && s.period_key === period);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">My Timetable</h1>
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-x-auto">
        <table className="w-full text-sm min-w-[600px]">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-700/50">
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase w-24">Period</th>
              {DAYS.map(d => (
                <th key={d} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase capitalize">{d}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {(periods.length ? periods : ['p1','p2','p3','p4','p5','p6','p7']).map(period => (
              <tr key={period} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                <td className="px-4 py-3 text-slate-500 font-medium">{period.toUpperCase()}</td>
                {DAYS.map(day => {
                  const slot = byDayPeriod(day, period);
                  return (
                    <td key={day} className="px-4 py-3">
                      {slot ? (
                        <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-2">
                          <p className="font-medium text-emerald-800 dark:text-emerald-200 text-xs">{slot.subject_name}</p>
                          {(slot.first_name || slot.last_name) && <p className="text-emerald-600 dark:text-emerald-400 text-xs">{[slot.first_name, slot.last_name].filter(Boolean).join(' ')}</p>}
                          {slot.time && <p className="text-emerald-500 text-xs">{slot.time}</p>}
                        </div>
                      ) : <span className="text-slate-300 dark:text-slate-600 text-xs">—</span>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
