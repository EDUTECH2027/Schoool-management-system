import { useEffect, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { api } from '../../api/client';
import type { PayrollRecord, Withdrawal } from '../../api/client';

const STATUS_CHIP: Record<string, string> = {
  pending:  'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
};

export default function TeacherSalary() {
  const [payroll, setPayroll] = useState<PayrollRecord[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ amount: '', reason: '' });
  const [saving, setSaving] = useState(false);
  const [selectedPayroll, setSelectedPayroll] = useState<string>('');

  const load = () => Promise.all([
    api.portalTeacherSalary(month),
    api.portalTeacherWithdrawals(),
  ]).then(([p, w]) => { setPayroll(p); setWithdrawals(w); }).catch(() => {});

  useEffect(() => { load(); }, [month]);

  const current = payroll[0];

  const submit = async () => {
    if (!form.amount) return;
    setSaving(true);
    try {
      await api.portalTeacherRequestWithdrawal({ payroll_id: selectedPayroll || undefined, amount: Number(form.amount), reason: form.reason });
      setShowForm(false);
      setForm({ amount: '', reason: '' });
      load();
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Salary</h1>
        <input type="month" value={month} onChange={e => setMonth(e.target.value)}
          className="border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300" />
      </div>

      {/* Payslip card */}
      {current ? (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-800 dark:text-slate-200">Payslip — {current.month}</h2>
            <span className={`px-2.5 py-1 rounded text-xs font-medium capitalize ${current.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{current.status}</span>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            {[
              ['Base Allowance', current.base_allowance?.toLocaleString()],
              ['Hours Worked', current.hours_worked],
              ['Absences', current.absences],
              ['Late Comings', current.late_coming],
              ['Bonus', current.bonus?.toLocaleString()],
              ['Absence Deduction', `−${current.absence_deduction?.toLocaleString()}`],
              ['Late Deduction', `−${current.late_deduction?.toLocaleString()}`],
            ].map(([label, value]) => (
              <div key={String(label)} className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-700">
                <span className="text-slate-500">{label}</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">{value}</span>
              </div>
            ))}
            <div className="col-span-2 flex justify-between pt-3 border-t-2 border-slate-200 dark:border-slate-600">
              <span className="font-bold text-slate-800 dark:text-slate-100 text-base">Net Pay</span>
              <span className="font-bold text-indigo-600 text-base">{(current.netPay ?? (current.base_allowance + (current.bonus ?? 0) - current.absence_deduction - current.late_deduction))?.toLocaleString()} FCFA</span>
            </div>
          </div>
          <button onClick={() => { setSelectedPayroll(current.id); setShowForm(true); }}
            className="mt-4 flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm hover:bg-indigo-700">
            <Plus size={14} /> Request Withdrawal
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-8 text-center text-slate-400">
          No payroll record for {month}.
        </div>
      )}

      {/* Withdrawal form */}
      {showForm && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-800 dark:text-slate-200">Request Withdrawal</h2>
            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Amount (FCFA)</label>
              <input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0"
                className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200" />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Reason</label>
              <input value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} placeholder="Optional"
                className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200" />
            </div>
          </div>
          <button onClick={submit} disabled={saving || !form.amount}
            className="px-5 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
            {saving ? 'Sending…' : 'Submit Request'}
          </button>
        </div>
      )}

      {/* Withdrawal history */}
      <div>
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Withdrawal Requests</h2>
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-700/50">
              <tr>
                {['Date', 'Amount', 'Reason', 'Status', 'Reviewed'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {withdrawals.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">No requests yet.</td></tr>}
              {withdrawals.map(w => (
                <tr key={w.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                  <td className="px-4 py-3 text-slate-500">{w.created_at?.slice(0, 10)}</td>
                  <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{w.amount.toLocaleString()} FCFA</td>
                  <td className="px-4 py-3 text-slate-500">{w.reason ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${STATUS_CHIP[w.status]}`}>{w.status}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{w.reviewed_at?.slice(0,10) ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
