import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { api } from '../../api/client';
import type { FeeRecord } from '../../api/client';

const STATUS_CHIP: Record<string, string> = {
  paid:    'bg-emerald-100 text-emerald-700',
  partial: 'bg-amber-100 text-amber-700',
  pending: 'bg-slate-100 text-slate-600',
  overdue: 'bg-red-100 text-red-700',
  waived:  'bg-blue-100 text-blue-700',
};

export default function ParentChildFees() {
  const { studentId } = useParams<{ studentId: string }>();
  const [fees, setFees] = useState<FeeRecord[]>([]);

  useEffect(() => {
    if (!studentId) return;
    api.portalParentChildFees(studentId).then(setFees).catch(() => {});
  }, [studentId]);

  const totalDue = fees.reduce((s, f) => s + f.amount_due, 0);
  const totalPaid = fees.reduce((s, f) => s + f.amount_paid, 0);
  const totalBalance = fees.reduce((s, f) => s + f.balance, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link to="/parent/children" className="text-slate-400 hover:text-slate-600"><ChevronLeft size={20} /></Link>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Fee Records</h1>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Billed', value: totalDue, color: 'text-slate-800 dark:text-slate-100' },
          { label: 'Paid', value: totalPaid, color: 'text-emerald-600' },
          { label: 'Balance', value: totalBalance, color: totalBalance > 0 ? 'text-red-600' : 'text-slate-500' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 text-center">
            <p className={`text-2xl font-bold ${color}`}>{value.toLocaleString()}</p>
            <p className="text-xs text-slate-500 mt-1">{label} (FCFA)</p>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-700/50">
            <tr>
              {['Fee', 'Due', 'Paid', 'Balance', 'Status'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {fees.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">No fee records found.</td></tr>}
            {fees.map(f => (
              <tr key={f.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{f.fee_name}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{f.amount_due.toLocaleString()}</td>
                <td className="px-4 py-3 text-emerald-600">{f.amount_paid.toLocaleString()}</td>
                <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">{f.balance.toLocaleString()}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${STATUS_CHIP[f.status] ?? 'bg-slate-100 text-slate-600'}`}>{f.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
