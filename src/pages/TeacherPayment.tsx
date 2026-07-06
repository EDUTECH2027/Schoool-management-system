import { useState, useEffect, useMemo } from 'react';
import {
  Clock, UserX, AlarmClock, Edit2, X, Check, Download,
  FileDown, Search, Wallet, TrendingUp, AlertCircle,
  CheckCircle2, ReceiptText, Settings2,
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { useBranding } from '../context/BrandingContext';
import { api } from '../api/client';
import type { PayrollRecord } from '../api/client';

// ── Helpers ────────────────────────────────────────────────────────────────
const computeLocal = (r: PayrollRecord) => {
  const gross           = r.hours_worked  * r.hourly_rate;
  const absenceDeduct   = r.absences      * r.absence_deduction;
  const lateDeduct      = r.late_coming   * r.late_deduction;
  const totalDeductions = absenceDeduct   + lateDeduct;
  const netPay          = gross + r.base_allowance + r.bonus - totalDeductions;
  return { gross, absenceDeduct, lateDeduct, totalDeductions, netPay };
};

const getSubject = (r: PayrollRecord): string => {
  const s = r.teacher?.subjects;
  if (Array.isArray(s) && s.length > 0) return s[0];
  if (typeof s === 'string') {
    try { const arr = JSON.parse(s); return Array.isArray(arr) ? arr[0] ?? '' : ''; }
    catch { return s; }
  }
  return '';
};

// ── Static data ────────────────────────────────────────────────────────────
const MONTHS = [
  { key: '2026-06', label: 'June 2026'     },
  { key: '2026-05', label: 'May 2026'      },
  { key: '2026-04', label: 'April 2026'    },
  { key: '2026-03', label: 'March 2026'    },
  { key: '2026-02', label: 'February 2026' },
  { key: '2026-01', label: 'January 2026'  },
];

// ── Status config ──────────────────────────────────────────────────────────
const statusCfg: Record<string, { label: string; bg: string; dot: string }> = {
  draft:   { label: 'Draft',   bg: 'bg-slate-100 text-slate-600',    dot: 'bg-slate-400'   },
  pending: { label: 'Pending', bg: 'bg-amber-50 text-amber-700',     dot: 'bg-amber-500'   },
  paid:    { label: 'Paid',    bg: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
};

// ── Payslip HTML printer ────────────────────────────────────────────────────
const openPayslip = (r: PayrollRecord, monthLabel: string, schoolName: string, schoolSub: string) => {
  const t        = r.teacher;
  const fullName = `${t?.first_name ?? ''} ${t?.last_name ?? ''}`.trim();
  const subject  = getSubject(r);
  const calc     = computeLocal(r);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>Payslip — ${fullName} — ${monthLabel}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Segoe UI',Arial,sans-serif;background:#f1f5f9;padding:32px;color:#1e293b}
  .page{max-width:680px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,.12)}
  .hdr{background:linear-gradient(135deg,#312e81 0%,#4f46e5 100%);padding:28px 32px;display:flex;align-items:center;justify-content:space-between}
  .hdr-left h1{color:#fff;font-size:18px;font-weight:800;letter-spacing:-.3px}
  .hdr-left p{color:#c7d2fe;font-size:12px;margin-top:3px}
  .badge{background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.3);color:#fff;font-size:11px;font-weight:700;padding:6px 16px;border-radius:99px;letter-spacing:.08em}
  .meta{display:grid;grid-template-columns:repeat(4,1fr);gap:0;background:#f8fafc;border-bottom:1px solid #e2e8f0}
  .meta-cell{padding:14px 20px;border-right:1px solid #e2e8f0}
  .meta-cell:last-child{border-right:none}
  .meta-cell label{display:block;font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:#94a3b8;font-weight:700;margin-bottom:3px}
  .meta-cell p{font-size:13px;font-weight:700;color:#1e293b}
  .status-paid{color:#065f46;background:#d1fae5;padding:2px 10px;border-radius:99px;font-size:11px;font-weight:700}
  .status-pending{color:#92400e;background:#fef3c7;padding:2px 10px;border-radius:99px;font-size:11px;font-weight:700}
  .status-draft{color:#475569;background:#f1f5f9;padding:2px 10px;border-radius:99px;font-size:11px;font-weight:700}
  .body{padding:28px 32px}
  .sec-title{font-size:10px;text-transform:uppercase;letter-spacing:.1em;font-weight:800;color:#6366f1;margin:24px 0 10px;padding-bottom:7px;border-bottom:2px solid #e0e7ff}
  .sec-title:first-child{margin-top:0}
  .crit-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
  .crit-item{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:10px 12px}
  .crit-item label{display:block;font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:#94a3b8;font-weight:600;margin-bottom:2px}
  .crit-item p{font-size:13px;font-weight:700;color:#334155}
  table.det{width:100%;border-collapse:collapse}
  table.det td{padding:8px 4px;font-size:13px;color:#475569;border-bottom:1px solid #f1f5f9}
  table.det td:last-child{text-align:right;font-weight:700}
  .plus{color:#059669}.minus{color:#ef4444}
  tr.sub td{border-top:2px solid #e2e8f0;border-bottom:none;padding-top:12px;color:#1e293b;font-weight:800!important}
  .net{background:linear-gradient(135deg,#eef2ff,#e0e7ff);border:2px solid #a5b4fc;border-radius:12px;padding:20px 28px;display:flex;align-items:center;justify-content:space-between;margin:24px 0 0}
  .net label{font-size:12px;text-transform:uppercase;letter-spacing:.08em;font-weight:800;color:#3730a3}
  .net span{font-size:28px;font-weight:900;color:#3730a3}
  .note-box{background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:12px 16px;font-size:12px;color:#78350f;margin-top:16px}
  .sigs{display:flex;gap:24px;margin-top:36px;padding-top:16px;border-top:1px solid #e2e8f0}
  .sig{flex:1;border-top:1.5px solid #94a3b8;padding-top:8px}
  .sig p{font-size:11px;color:#94a3b8}
  .footer{background:#f8fafc;border-top:1px solid #e2e8f0;padding:12px 32px;text-align:center;font-size:11px;color:#94a3b8}
  @media print{body{background:#fff;padding:0}.page{box-shadow:none;border-radius:0}}
</style>
</head>
<body>
<div class="page">
  <div class="hdr">
    <div class="hdr-left"><h1>${schoolName}</h1><p>${schoolSub}</p></div>
    <div class="badge">PAYSLIP</div>
  </div>
  <div class="meta">
    <div class="meta-cell"><label>Employee</label><p>${fullName}</p></div>
    <div class="meta-cell"><label>Subject</label><p>${subject}</p></div>
    <div class="meta-cell"><label>Period</label><p>${monthLabel}</p></div>
    <div class="meta-cell"><label>Status</label><span class="status-${r.status}">${r.status.toUpperCase()}</span></div>
  </div>
  <div class="body">
    <div class="sec-title">Payment Criteria</div>
    <div class="crit-grid">
      <div class="crit-item"><label>Hourly Rate</label><p>${r.hourly_rate.toLocaleString('fr-FR')} FCFA / hr</p></div>
      <div class="crit-item"><label>Contracted Hours</label><p>${r.contracted_hours} hrs / month</p></div>
      <div class="crit-item"><label>Base Allowance</label><p>${r.base_allowance.toLocaleString('fr-FR')} FCFA</p></div>
      <div class="crit-item"><label>Absence Deduction</label><p>${r.absence_deduction.toLocaleString('fr-FR')} FCFA / day</p></div>
      <div class="crit-item"><label>Late Deduction</label><p>${r.late_deduction.toLocaleString('fr-FR')} FCFA / occurrence</p></div>
      ${r.bonus > 0 ? `<div class="crit-item"><label>Bonus / Extra</label><p>${r.bonus.toLocaleString('fr-FR')} FCFA</p></div>` : ''}
    </div>
    <div class="sec-title">Earnings</div>
    <table class="det">
      <tr><td>Hours Worked (${r.hours_worked} hrs × ${r.hourly_rate.toLocaleString('fr-FR')} FCFA)</td><td class="plus">+ ${calc.gross.toLocaleString('fr-FR')} FCFA</td></tr>
      <tr><td>Base Allowance (Housing + Transport)</td><td class="plus">+ ${r.base_allowance.toLocaleString('fr-FR')} FCFA</td></tr>
      ${r.bonus > 0 ? `<tr><td>Bonus / Extra Allowance</td><td class="plus">+ ${r.bonus.toLocaleString('fr-FR')} FCFA</td></tr>` : ''}
      <tr class="sub"><td>Gross Total</td><td>+ ${(calc.gross + r.base_allowance + r.bonus).toLocaleString('fr-FR')} FCFA</td></tr>
    </table>
    <div class="sec-title">Deductions</div>
    <table class="det">
      <tr><td>Absences (${r.absences} day${r.absences !== 1 ? 's' : ''} × ${r.absence_deduction.toLocaleString('fr-FR')} FCFA)</td><td class="minus">− ${calc.absenceDeduct.toLocaleString('fr-FR')} FCFA</td></tr>
      <tr><td>Late Coming (${r.late_coming} × ${r.late_deduction.toLocaleString('fr-FR')} FCFA)</td><td class="minus">− ${calc.lateDeduct.toLocaleString('fr-FR')} FCFA</td></tr>
      <tr class="sub"><td>Total Deductions</td><td class="minus">− ${calc.totalDeductions.toLocaleString('fr-FR')} FCFA</td></tr>
    </table>
    <div class="net"><label>Net Pay</label><span>${calc.netPay.toLocaleString('fr-FR')} FCFA</span></div>
    ${r.notes ? `<div class="note-box"><strong>Notes:</strong> ${r.notes}</div>` : ''}
    <div class="sigs">
      <div class="sig"><p>Prepared by / Établi par</p></div>
      <div class="sig"><p>Employee Signature / Signature</p></div>
      <div class="sig"><p>Approved by / Approuvé par</p></div>
    </div>
  </div>
  <div class="footer">Generated by School Management System · ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
</div>
<script>setTimeout(()=>window.print(),350)</script>
</body>
</html>`;

  const win = window.open('', '_blank');
  if (win) { win.document.write(html); win.document.close(); }
};

// ─────────────────────────────────────────────────────────────────────────
export default function TeacherPayment() {
  const { lang }              = useLanguage();
  const { schoolName, schoolSub } = useBranding() as { schoolName: string; schoolSub: string };
  const lbl = (en: string, fr: string) => lang === 'fr' ? fr : en;

  const [month,   setMonth]   = useState('2026-06');
  const [payroll, setPayroll] = useState<PayrollRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [editId,  setEditId]  = useState<string | null>(null);
  const [draft,   setDraft]   = useState<PayrollRecord | null>(null);

  // Ensure all active teachers have a payroll record, then fetch
  useEffect(() => {
    setLoading(true);
    api.initPayroll(month)
      .then(() => api.getPayroll(month))
      .then(setPayroll)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [month]);

  // Filtered rows
  const rows = useMemo(() =>
    payroll.filter(r => {
      if (!search.trim()) return true;
      const q    = search.toLowerCase();
      const name = `${r.teacher?.first_name ?? ''} ${r.teacher?.last_name ?? ''}`.toLowerCase();
      const subj = getSubject(r).toLowerCase();
      return name.includes(q) || subj.includes(q);
    }), [payroll, search]);

  // KPI aggregates
  const kpi = useMemo(() => {
    const totalNet     = payroll.reduce((s, r) => s + (r.netPay ?? computeLocal(r).netPay), 0);
    const avgNet       = payroll.length > 0 ? totalNet / payroll.length : 0;
    const paidCount    = payroll.filter(r => r.status === 'paid').length;
    const pendingCount = payroll.filter(r => r.status === 'pending').length;
    return { totalNet, avgNet, paidCount, pendingCount };
  }, [payroll]);

  // Status helpers
  const updateStatus = async (id: string, status: string) => {
    try {
      const result = await api.setPayrollStatus(id, status);
      setPayroll(prev => prev.map(r => r.id === id ? result : r));
    } catch (err) { console.error(err); }
  };

  const processAll = async () => {
    try {
      const targets = payroll.filter(r => r.status === 'draft');
      const results = await Promise.all(targets.map(r => api.setPayrollStatus(r.id, 'pending')));
      const map = new Map(results.map(r => [r.id, r]));
      setPayroll(prev => prev.map(r => map.get(r.id) ?? r));
    } catch (err) { console.error(err); }
  };

  const markAllPaid = async () => {
    try {
      const targets = payroll.filter(r => r.status === 'pending');
      const results = await Promise.all(targets.map(r => api.setPayrollStatus(r.id, 'paid')));
      const map = new Map(results.map(r => [r.id, r]));
      setPayroll(prev => prev.map(r => map.get(r.id) ?? r));
    } catch (err) { console.error(err); }
  };

  // Edit modal
  const openEdit  = (r: PayrollRecord) => { setDraft({ ...r }); setEditId(r.id); };
  const closeEdit = () => { setEditId(null); setDraft(null); };
  const saveEdit  = async () => {
    if (!draft || !editId) return;
    try {
      const result = await api.updatePayroll(editId, {
        hourlyRate:        draft.hourly_rate,
        contractedHours:   draft.contracted_hours,
        baseAllowance:     draft.base_allowance,
        absenceDeduction:  draft.absence_deduction,
        lateDeduction:     draft.late_deduction,
        hoursWorked:       draft.hours_worked,
        absences:          draft.absences,
        lateComing:        draft.late_coming,
        bonus:             draft.bonus,
        notes:             draft.notes,
      } as Parameters<typeof api.updatePayroll>[1]);
      setPayroll(prev => prev.map(r => r.id === editId ? result : r));
    } catch (err) { console.error('Failed to save payroll:', err); }
    closeEdit();
  };

  const setF = <K extends keyof PayrollRecord>(key: K, val: PayrollRecord[K]) =>
    setDraft(prev => prev ? { ...prev, [key]: val } : prev);

  // Export all CSV
  const exportGlobalCSV = () => {
    const header = [
      'Teacher', 'Subject', 'Hourly Rate', 'Contracted Hrs', 'Base Allowance',
      'Abs. Deduction/day', 'Late Deduction', 'Hrs Worked', 'Absences', 'Late',
      'Gross (FCFA)', 'Deductions (FCFA)', 'Allowance (FCFA)', 'Bonus (FCFA)', 'Net Pay (FCFA)', 'Status',
    ];
    const data = payroll.map(r => {
      const calc = computeLocal(r);
      return [
        `${r.teacher?.first_name ?? ''} ${r.teacher?.last_name ?? ''}`.trim(),
        getSubject(r), r.hourly_rate, r.contracted_hours, r.base_allowance,
        r.absence_deduction, r.late_deduction, r.hours_worked, r.absences, r.late_coming,
        calc.gross, calc.totalDeductions, r.base_allowance, r.bonus, calc.netPay, r.status,
      ];
    });
    const csv = '﻿' + [header, ...data].map(row => row.map(v => `"${v}"`).join(',')).join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `payroll-all-${month}.csv`;
    a.click();
  };

  // Export single teacher CSV
  const exportTeacherCSV = (r: PayrollRecord) => {
    const calc    = computeLocal(r);
    const mLabel  = MONTHS.find(m => m.key === month)?.label ?? month;
    const fullName = `${r.teacher?.first_name ?? ''} ${r.teacher?.last_name ?? ''}`.trim();
    const csvRows = [
      ['PAYSLIP', ''], ['School', schoolName], ['Period', mLabel], ['', ''],
      ['Employee', fullName], ['Subject', getSubject(r)], ['Status', r.status.toUpperCase()], ['', ''],
      ['PAYMENT CRITERIA', ''],
      ['Hourly Rate (FCFA)', r.hourly_rate], ['Contracted Hours / Month', r.contracted_hours],
      ['Base Allowance (FCFA)', r.base_allowance], ['Absence Deduction / day (FCFA)', r.absence_deduction],
      ['Late Deduction / occurrence (FCFA)', r.late_deduction], ['', ''],
      ['MONTHLY DATA', ''],
      ['Hours Worked', r.hours_worked], ['Absences (days)', r.absences],
      ['Late Comings', r.late_coming], ['Bonus / Extra (FCFA)', r.bonus], ['', ''],
      ['CALCULATION', ''],
      ['Gross Pay (FCFA)', calc.gross], ['Allowances + Bonus (FCFA)', r.base_allowance + r.bonus],
      ['Absence Deductions (FCFA)', -calc.absenceDeduct], ['Late Deductions (FCFA)', -calc.lateDeduct],
      ['NET PAY (FCFA)', calc.netPay], ['', ''],
      ...(r.notes ? [['Notes', r.notes]] : []),
    ];
    const csv = '﻿' + csvRows.map(row => row.map(v => `"${v}"`).join(',')).join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `payslip-${fullName.replace(' ', '-')}-${month}.csv`;
    a.click();
  };

  const editRecord  = draft;
  const editCalc    = draft ? computeLocal(draft) : null;
  const editTeacher = draft?.teacher;
  const monthLabel  = MONTHS.find(m => m.key === month)?.label ?? month;

  // ── JSX ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* ── Top bar ────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder={lbl('Search teacher…', 'Rechercher un enseignant…')}
            className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <select
          value={month} onChange={e => setMonth(e.target.value)}
          className="py-2 px-3 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {MONTHS.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
        </select>
        <button onClick={processAll}
          className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-lg transition-colors">
          <ReceiptText size={15} /> {lbl('Process All', 'Traiter tout')}
        </button>
        <button onClick={markAllPaid}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition-colors">
          <Check size={15} /> {lbl('Mark All Paid', 'Tout payer')}
        </button>
        <button onClick={exportGlobalCSV}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded-lg transition-colors">
          <Download size={15} /> {lbl('Export All CSV', 'Export global CSV')}
        </button>
      </div>

      {/* ── KPI cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { icon: Wallet,       label: lbl('Total Payroll', 'Masse salariale'), value: kpi.totalNet.toLocaleString('fr-FR') + ' FCFA', bg: 'bg-indigo-50', ic: 'text-indigo-600', border: 'border-indigo-100' },
          { icon: TrendingUp,   label: lbl('Average Pay',   'Salaire moyen'),   value: Math.round(kpi.avgNet).toLocaleString('fr-FR') + ' FCFA', bg: 'bg-violet-50', ic: 'text-violet-600', border: 'border-violet-100' },
          { icon: CheckCircle2, label: lbl('Paid',          'Payés'),           value: `${kpi.paidCount} / ${payroll.length}`,    bg: 'bg-emerald-50', ic: 'text-emerald-600', border: 'border-emerald-100' },
          { icon: AlertCircle,  label: lbl('Pending',       'En attente'),      value: `${kpi.pendingCount} / ${payroll.length}`, bg: 'bg-amber-50',   ic: 'text-amber-600',   border: 'border-amber-100'   },
        ].map(k => (
          <div key={k.label} className={`bg-white rounded-xl border ${k.border} p-4 flex items-center gap-4 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200`}>
            <div className={`w-11 h-11 ${k.bg} rounded-xl flex items-center justify-center shrink-0`}>
              <k.icon size={20} className={k.ic} />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-slate-500 font-medium">{k.label}</p>
              <p className={`font-bold text-slate-800 leading-tight ${k.value.length > 14 ? 'text-sm' : 'text-lg'}`}>{k.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Payroll table ──────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ReceiptText size={16} className="text-indigo-500" />
            <h3 className="font-semibold text-slate-800 text-sm">
              {lbl('Payroll Sheet', 'Fiche de paie')} — {monthLabel}
            </h3>
          </div>
          <span className="text-xs text-slate-400">{rows.length} {lbl('teachers', 'enseignants')}</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-7 h-7 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-sm">
            {lbl('No teachers found. Add teachers first.', 'Aucun enseignant. Ajoutez des enseignants d\'abord.')}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-255">
              <thead>
                <tr className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  <th className="px-5 py-3 text-left">{lbl('Teacher', 'Enseignant')}</th>
                  <th className="px-3 py-3 text-center"><span className="flex items-center justify-center gap-1"><Clock size={11}/>{lbl('Hrs','Hrs')}</span></th>
                  <th className="px-3 py-3 text-center"><span className="flex items-center justify-center gap-1"><UserX size={11}/>{lbl('Absent','Absent')}</span></th>
                  <th className="px-3 py-3 text-center"><span className="flex items-center justify-center gap-1"><AlarmClock size={11}/>{lbl('Late','Retard')}</span></th>
                  <th className="px-3 py-3 text-right">{lbl('Gross','Brut')}</th>
                  <th className="px-3 py-3 text-right">{lbl('Deductions','Déductions')}</th>
                  <th className="px-3 py-3 text-right">{lbl('Allowance','Allocation')}</th>
                  <th className="px-3 py-3 text-right font-bold text-slate-700">{lbl('Net Pay','Net à payer')}</th>
                  <th className="px-3 py-3 text-center">{lbl('Status','Statut')}</th>
                  <th className="px-3 py-3 text-center">{lbl('Actions','Actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {rows.map(r => {
                  const calc = computeLocal(r);
                  const st   = statusCfg[r.status] ?? statusCfg.draft;
                  const fn   = r.teacher?.first_name ?? '?';
                  const ln   = r.teacher?.last_name  ?? '';
                  return (
                    <tr key={r.teacher_id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 text-indigo-700 font-bold text-xs">
                            {fn[0]}{ln[0]}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800">{fn} {ln}</p>
                            <p className="text-xs text-slate-400 truncate max-w-32.5">{getSubject(r)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3.5 text-center">
                        <span className={`font-semibold ${r.hours_worked < r.contracted_hours ? 'text-amber-600' : 'text-slate-700'}`}>{r.hours_worked}</span>
                        <span className="text-slate-300 text-xs"> /{r.contracted_hours}</span>
                      </td>
                      <td className="px-3 py-3.5 text-center">
                        <span className={`font-semibold ${r.absences > 0 ? 'text-red-500' : 'text-slate-300'}`}>{r.absences}</span>
                      </td>
                      <td className="px-3 py-3.5 text-center">
                        <span className={`font-semibold ${r.late_coming > 0 ? 'text-amber-500' : 'text-slate-300'}`}>{r.late_coming}</span>
                      </td>
                      <td className="px-3 py-3.5 text-right text-slate-700 tabular-nums">{calc.gross.toLocaleString('fr-FR')}</td>
                      <td className="px-3 py-3.5 text-right tabular-nums">
                        <span className={calc.totalDeductions > 0 ? 'text-red-500 font-medium' : 'text-slate-300'}>
                          -{calc.totalDeductions.toLocaleString('fr-FR')}
                        </span>
                      </td>
                      <td className="px-3 py-3.5 text-right text-emerald-600 tabular-nums">
                        +{(r.base_allowance + r.bonus).toLocaleString('fr-FR')}
                      </td>
                      <td className="px-3 py-3.5 text-right">
                        <span className="font-bold text-slate-900 tabular-nums">{calc.netPay.toLocaleString('fr-FR')}</span>
                      </td>
                      <td className="px-3 py-3.5 text-center">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${st.bg}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                          {st.label}
                        </span>
                      </td>
                      <td className="px-3 py-3.5">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => openEdit(r)} title={lbl('Edit', 'Modifier')}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                            <Edit2 size={14} />
                          </button>
                          <button onClick={() => openPayslip(r, monthLabel, schoolName, schoolSub)} title={lbl('Print payslip', 'Imprimer bulletin')}
                            className="p-1.5 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors">
                            <ReceiptText size={14} />
                          </button>
                          <button onClick={() => exportTeacherCSV(r)} title={lbl('Download CSV', 'Télécharger CSV')}
                            className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors">
                            <FileDown size={14} />
                          </button>
                          {r.status === 'draft' && (
                            <button onClick={() => updateStatus(r.id, 'pending')}
                              className="px-2 py-1 text-xs font-semibold bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg transition-colors">
                              {lbl('Process', 'Traiter')}
                            </button>
                          )}
                          {r.status === 'pending' && (
                            <button onClick={() => updateStatus(r.id, 'paid')}
                              className="px-2 py-1 text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg transition-colors">
                              {lbl('Pay', 'Payer')}
                            </button>
                          )}
                          {r.status === 'paid' && (
                            <span className="flex items-center gap-1 px-2 py-1 text-xs font-semibold text-emerald-600">
                              <Check size={12} /> {lbl('Done', 'Fait')}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 border-t-2 border-slate-200 font-bold text-slate-700 text-sm">
                  <td className="px-5 py-3">{lbl('TOTAL', 'TOTAL')} ({payroll.length})</td>
                  <td className="px-3 py-3 text-center">{payroll.reduce((s,r)=>s+r.hours_worked,0)}</td>
                  <td className="px-3 py-3 text-center text-red-500">{payroll.reduce((s,r)=>s+r.absences,0)}</td>
                  <td className="px-3 py-3 text-center text-amber-500">{payroll.reduce((s,r)=>s+r.late_coming,0)}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{payroll.reduce((s,r)=>s+computeLocal(r).gross,0).toLocaleString('fr-FR')}</td>
                  <td className="px-3 py-3 text-right text-red-500 tabular-nums">-{payroll.reduce((s,r)=>s+computeLocal(r).totalDeductions,0).toLocaleString('fr-FR')}</td>
                  <td className="px-3 py-3 text-right text-emerald-600 tabular-nums">+{payroll.reduce((s,r)=>s+r.base_allowance+r.bonus,0).toLocaleString('fr-FR')}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{payroll.reduce((s,r)=>s+computeLocal(r).netPay,0).toLocaleString('fr-FR')}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* ── Edit Modal ─────────────────────────────────────────────────── */}
      {editId && editRecord && editTeacher && editCalc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto"
          onClick={e => { if (e.target === e.currentTarget) closeEdit(); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-4">

            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-800">
                  {editTeacher.first_name} {editTeacher.last_name} — {lbl('Payroll Editor', 'Éditeur de paie')}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">{getSubject(editRecord)} · {monthLabel}</p>
              </div>
              <button onClick={closeEdit} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <X size={16} className="text-slate-500" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-5">
              {/* Criteria */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Settings2 size={14} className="text-indigo-500" />
                  <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                    {lbl('Payment Criteria (this teacher only)', 'Critères de paiement (cet enseignant uniquement)')}
                  </h4>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    { key: 'hourly_rate' as const,       label: lbl('Hourly Rate (FCFA)',      'Taux horaire (FCFA)'),         icon: Wallet     },
                    { key: 'contracted_hours' as const,  label: lbl('Contracted Hrs/Month',    'Heures contractuelles/mois'),  icon: Clock      },
                    { key: 'base_allowance' as const,    label: lbl('Base Allowance (FCFA)',   'Allocation de base (FCFA)'),   icon: Wallet     },
                    { key: 'absence_deduction' as const, label: lbl('Absence Deduct./day',     'Déduction absence/j (FCFA)'),  icon: UserX      },
                    { key: 'late_deduction' as const,    label: lbl('Late Deduction (FCFA)',   'Déduction retard (FCFA)'),     icon: AlarmClock },
                  ].map(f => (
                    <div key={f.key}>
                      <label className="flex items-center gap-1 text-xs font-semibold text-slate-600 mb-1">
                        <f.icon size={11} className="text-slate-400" /> {f.label}
                      </label>
                      <input type="number" min={0}
                        value={editRecord[f.key] as number}
                        onChange={e => setF(f.key, Math.max(0, Number(e.target.value)) as PayrollRecord[typeof f.key])}
                        className="w-full py-2 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-dashed border-slate-200" />

              {/* Monthly data */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Clock size={14} className="text-indigo-500" />
                  <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                    {lbl('Monthly Data', 'Données mensuelles')}
                  </h4>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { key: 'hours_worked' as const, label: lbl('Hours Worked',    'Heures travaillées'), icon: Clock,       max: 300     },
                    { key: 'absences' as const,     label: lbl('Absences (days)', 'Absences (jours)'),   icon: UserX,       max: 30      },
                    { key: 'late_coming' as const,  label: lbl('Late Comings',    'Retards'),            icon: AlarmClock,  max: 30      },
                    { key: 'bonus' as const,        label: lbl('Bonus (FCFA)',    'Bonus (FCFA)'),       icon: Wallet,      max: 9999999 },
                  ].map(f => (
                    <div key={f.key}>
                      <label className="flex items-center gap-1 text-xs font-semibold text-slate-600 mb-1">
                        <f.icon size={11} className="text-slate-400" /> {f.label}
                      </label>
                      <input type="number" min={0} max={f.max}
                        value={editRecord[f.key] as number}
                        onChange={e => setF(f.key, Math.max(0, Number(e.target.value)) as PayrollRecord[typeof f.key])}
                        className="w-full py-2 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  ))}
                </div>
                <div className="mt-3">
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">{lbl('Notes', 'Remarques')}</label>
                  <textarea rows={2} value={editRecord.notes}
                    onChange={e => setF('notes', e.target.value)}
                    placeholder={lbl('Optional note…', 'Note optionnelle…')}
                    className="w-full py-2 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  />
                </div>
              </div>

              {/* Live preview */}
              <div className="bg-linear-to-br from-indigo-50 to-violet-50 border border-indigo-100 rounded-xl p-4">
                <p className="text-[11px] font-bold text-indigo-600 uppercase tracking-wide mb-3">
                  {lbl('Live Calculation', 'Calcul en direct')}
                </p>
                <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-xs">
                  {[
                    { label: lbl('Gross Pay',      'Salaire brut'),  value: `${editCalc.gross.toLocaleString('fr-FR')} FCFA`,                                 color: 'text-slate-700'   },
                    { label: lbl('+ Allowance',    '+ Allocation'),  value: `${(editRecord.base_allowance + editRecord.bonus).toLocaleString('fr-FR')} FCFA`, color: 'text-emerald-600' },
                    { label: lbl('− Absences',     '− Absences'),    value: `${editCalc.absenceDeduct.toLocaleString('fr-FR')} FCFA`,                         color: 'text-red-500'     },
                    { label: lbl('− Late Comings', '− Retards'),     value: `${editCalc.lateDeduct.toLocaleString('fr-FR')} FCFA`,                            color: 'text-amber-600'   },
                  ].map(row => (
                    <div key={row.label} className="flex justify-between">
                      <span className="text-slate-500">{row.label}</span>
                      <span className={`font-semibold tabular-nums ${row.color}`}>{row.value}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-indigo-200 mt-3 pt-3 flex justify-between items-center">
                  <span className="text-sm font-bold text-indigo-700">{lbl('Net Pay', 'Net à payer')}</span>
                  <span className="text-xl font-extrabold text-indigo-700 tabular-nums">
                    {editCalc.netPay.toLocaleString('fr-FR')} FCFA
                  </span>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3">
              <button onClick={closeEdit}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                {lbl('Cancel', 'Annuler')}
              </button>
              <button onClick={saveEdit}
                className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors">
                <Check size={14} /> {lbl('Save', 'Enregistrer')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
