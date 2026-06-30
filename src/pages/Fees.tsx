import { useState, useEffect } from 'react';
import { Search, Banknote, Plus, Receipt, X, CheckCircle } from 'lucide-react';
import { StatusBadge } from '../composants/ui/Badge';
import type { FeeStatus, FeeRecord, Payment, Student } from '../types';
import { useLanguage } from '../i18n/LanguageContext';
import RecordPaymentModal from '../composants/fees/RecordPaymentModal';
import { api, type ClassRecord } from '../api/client';
import { mapFeeRecord, mapStudent } from '../api/mappers';

// ── Add-Fee inline modal ──────────────────────────────────────────────────
interface AddFeeProps {
  onClose: () => void;
  onCreated: (rec: FeeRecord) => void;
}

function AddFeeModal({ onClose, onCreated }: AddFeeProps) {
  const { lang } = useLanguage();
  const lbl = (en: string, fr: string) => lang === 'fr' ? fr : en;

  const [students,    setStudents]   = useState<Student[]>([]);
  const [studentId,   setStudentId]  = useState('');
  const [feeName,     setFeeName]    = useState('');
  const [amountDue,   setAmountDue]  = useState('');
  const [dueDate,     setDueDate]    = useState('');
  const [academicYear,setAcYear]     = useState(`${new Date().getFullYear()}-${new Date().getFullYear() + 1}`);
  const [saving,      setSaving]     = useState(false);
  const [done,        setDone]       = useState(false);
  const [errors,      setErrors]     = useState<Record<string, string>>({});

  useEffect(() => {
    api.getStudents({ isActive: 'true' })
      .then(data => {
        const mapped = data.map(mapStudent).filter(s => s.isActive);
        setStudents(mapped);
        if (mapped.length > 0) setStudentId(mapped[0].id);
      })
      .catch(console.error);
  }, []);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!studentId)              e.studentId  = lbl('Select a student',     'Sélectionnez un élève');
    if (!feeName.trim())         e.feeName    = lbl('Enter a fee name',     'Saisissez un nom de frais');
    const amt = Number(amountDue);
    if (!amountDue || isNaN(amt) || amt <= 0) e.amountDue = lbl('Enter a valid amount', 'Montant invalide');
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const result = await api.createFee({
        studentId,
        feeName:      feeName.trim(),
        academicYear: academicYear.trim() || undefined,
        amountDue:    Number(amountDue),
        dueDate:      dueDate || undefined,
      } as Parameters<typeof api.createFee>[0]);
      onCreated(mapFeeRecord(result));
      setDone(true);
      setTimeout(onClose, 1300);
    } catch (err) {
      console.error('Failed to create fee record:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
              <Plus size={16} className="text-indigo-600" />
            </div>
            <h2 className="font-semibold text-slate-800">{lbl('Create Fee Record', 'Créer un dossier de frais')}</h2>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
            <X size={17} className="text-slate-500" />
          </button>
        </div>

        {done ? (
          <div className="flex flex-col items-center justify-center py-10 px-5 text-center">
            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mb-3">
              <CheckCircle size={28} className="text-green-500" />
            </div>
            <p className="font-semibold text-slate-800">{lbl('Fee record created!', 'Dossier créé !')}</p>
          </div>
        ) : (
          <div className="px-5 py-5 space-y-4">
            {/* Student */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                {lbl('Student', 'Élève')}<span className="text-red-500 ml-0.5">*</span>
              </label>
              <select
                value={studentId}
                onChange={e => setStudentId(e.target.value)}
                className={`w-full py-2.5 px-3 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${errors.studentId ? 'border-red-300 bg-red-50' : 'border-slate-200'}`}
              >
                {students.length === 0
                  ? <option value="" disabled>{lbl('No students yet', 'Aucun élève')}</option>
                  : students.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.firstName} {s.lastName} — {s.className}
                      </option>
                    ))
                }
              </select>
              {errors.studentId && <p className="text-red-500 text-xs mt-1">{errors.studentId}</p>}
            </div>

            {/* Fee name */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                {lbl('Fee Name', 'Nom des frais')}<span className="text-red-500 ml-0.5">*</span>
              </label>
              <input
                type="text"
                value={feeName}
                onChange={e => { setFeeName(e.target.value); setErrors(p => ({ ...p, feeName: '' })); }}
                placeholder={lbl('e.g. School Fees 2025', 'ex : Scolarité 2025')}
                className={`w-full py-2.5 px-3 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${errors.feeName ? 'border-red-300 bg-red-50' : 'border-slate-200'}`}
              />
              {errors.feeName && <p className="text-red-500 text-xs mt-1">{errors.feeName}</p>}
            </div>

            {/* Amount due */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                {lbl('Amount Due (FCFA)', 'Montant dû (FCFA)')}<span className="text-red-500 ml-0.5">*</span>
              </label>
              <input
                type="number"
                min={1}
                value={amountDue}
                onChange={e => { setAmountDue(e.target.value); setErrors(p => ({ ...p, amountDue: '' })); }}
                placeholder="0"
                className={`w-full py-2.5 px-3 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${errors.amountDue ? 'border-red-300 bg-red-50' : 'border-slate-200'}`}
              />
              {errors.amountDue && <p className="text-red-500 text-xs mt-1">{errors.amountDue}</p>}
            </div>

            {/* Academic year */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                {lbl('Academic Year', 'Année académique')}
              </label>
              <input
                type="text"
                value={academicYear}
                onChange={e => setAcYear(e.target.value)}
                placeholder="2025-2026"
                className="w-full py-2.5 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Due date */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                {lbl('Due Date (optional)', 'Date limite (optionnel)')}
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="w-full py-2.5 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        )}

        {!done && (
          <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-slate-200">
            <button onClick={onClose}
              className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
              {lbl('Cancel', 'Annuler')}
            </button>
            <button onClick={handleSubmit} disabled={saving || students.length === 0}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg font-medium transition-colors">
              <Plus size={15} />
              {saving ? lbl('Creating…', 'Création…') : lbl('Create Fee Record', 'Créer')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────
export default function Fees() {
  const { t, lang } = useLanguage();

  const [records,     setRecords]   = useState<FeeRecord[]>([]);
  const [loading,     setLoading]   = useState(true);
  const [search,      setSearch]    = useState('');
  const [statusFilter, setStatus]   = useState<FeeStatus | ''>('');
  const [selected,    setSelected]  = useState<string | null>(null);
  const [payModal,    setPayModal]  = useState<{ open: boolean; recordId?: string }>({ open: false });
  const [addFeeOpen,  setAddFeeOpen] = useState(false);
  const [classFilter, setClassFilter] = useState('');
  const [classes,     setClasses]     = useState<ClassRecord[]>([]);

  useEffect(() => {
    Promise.all([api.getFees(), api.getClasses()])
      .then(([fees, cls]) => {
        setRecords(fees.map(mapFeeRecord));
        setClasses(cls.sort((a, b) => a.name.localeCompare(b.name)));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const statusFilters: { label: string; value: FeeStatus | '' }[] = [
    { label: t.common.all,     value: ''        },
    { label: t.common.paid,    value: 'paid'    },
    { label: t.common.partial, value: 'partial' },
    { label: t.common.pending, value: 'pending' },
    { label: t.common.overdue, value: 'overdue' },
  ];

  const handlePayment = async (recordId: string, payment: Payment) => {
    try {
      const result = await api.addPayment(recordId, {
        amount:        payment.amount,
        method:        payment.method,
        reference:     payment.reference,
        paymentDate:   payment.paymentDate,
        receiptNumber: payment.receiptNumber,
      } as Parameters<typeof api.addPayment>[1]);
      setRecords(prev => prev.map(r => r.id === recordId ? mapFeeRecord(result) : r));
    } catch (err) {
      console.error('Failed to record payment:', err);
    }
  };


  // Apply search + class filter first (used for status badge counts)
  const baseFiltered = records.filter(f => {
    const matchSearch = `${f.studentName} ${f.studentNumber}`.toLowerCase().includes(search.toLowerCase());
    const matchClass  = classFilter ? f.className === classFilter : true;
    return matchSearch && matchClass;
  });

  // Then apply the status filter on top
  const filtered = baseFiltered.filter(f =>
    statusFilter ? f.status === statusFilter : true
  );

  // Summary tiles reflect all active filters
  const totals = {
    due:       filtered.reduce((s, f) => s + f.amountDue,  0),
    collected: filtered.reduce((s, f) => s + f.amountPaid, 0),
    balance:   filtered.reduce((s, f) => s + f.balance,    0),
  };
  const pct = totals.due > 0 ? Math.round((totals.collected / totals.due) * 100) : 0;
  const selectedRecord = records.find(f => f.id === selected);

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5 transition-transform duration-200 hover:-translate-y-1 hover:shadow-md cursor-default">
          <div className="flex items-center gap-3 mb-1">
            <Banknote size={16} className="text-slate-400" />
            <p className="text-slate-500 text-sm">{t.fees.totalBilled}</p>
          </div>
          <p className="text-2xl font-bold text-slate-800">{totals.due.toLocaleString()} FCFA</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5 transition-transform duration-200 hover:-translate-y-1 hover:shadow-md cursor-default">
          <div className="flex items-center gap-3 mb-1">
            <Banknote size={16} className="text-green-500" />
            <p className="text-slate-500 text-sm">{t.fees.collected}</p>
          </div>
          <p className="text-2xl font-bold text-green-600">{totals.collected.toLocaleString()} FCFA</p>
          <div className="mt-2">
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-green-500 rounded-full" style={{ width: `${pct}%` }} />
            </div>
            <p className="text-xs text-slate-400 mt-1">{pct}{t.fees.collectedPct}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5 transition-transform duration-200 hover:-translate-y-1 hover:shadow-md cursor-default">
          <div className="flex items-center gap-3 mb-1">
            <Banknote size={16} className="text-orange-500" />
            <p className="text-slate-500 text-sm">{t.fees.outstanding}</p>
          </div>
          <p className="text-2xl font-bold text-orange-600">{totals.balance.toLocaleString()} FCFA</p>
        </div>
      </div>

      {/* Filters + actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t.students.searchPlaceholder}
              className="pl-9 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-lg w-52 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {classes.length > 0 && (
            <select
              value={classFilter}
              onChange={e => setClassFilter(e.target.value)}
              className="py-2 px-3 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-600"
            >
              <option value="">{lang === 'fr' ? 'Toutes les classes' : 'All classes'}</option>
              {classes.map(cls => (
                <option key={cls.id} value={cls.name}>
                  {cls.name} — {cls.enrolled} {lang === 'fr' ? 'élève(s)' : 'student(s)'}
                </option>
              ))}
            </select>
          )}

          <div className="flex gap-1.5">
            {statusFilters.map(f => (
              <button
                key={f.value}
                onClick={() => setStatus(f.value)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${statusFilter === f.value ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
              >
                {f.label}
                <span className="ml-1 text-xs opacity-70">
                  ({f.value === '' ? baseFiltered.length : baseFiltered.filter(r => r.status === f.value).length})
                </span>
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setAddFeeOpen(true)}
            className="flex items-center gap-2 bg-white border border-indigo-200 hover:bg-indigo-50 text-indigo-700 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <Plus size={15} /> {t.fees.addFeeRecord ?? 'Add Fee Record'}
          </button>
          <button
            onClick={() => setPayModal({ open: true })}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <Banknote size={15} /> {t.fees.recordPayment}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-7 h-7 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="flex gap-5">
          {/* Table */}
          <div className="flex-1 bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                    <th className="text-left px-5 py-3 font-medium">{t.common.name}</th>
                    <th className="text-left px-5 py-3 font-medium">{t.common.class}</th>
                    <th className="text-left px-5 py-3 font-medium">{t.fees.fee}</th>
                    <th className="text-right px-5 py-3 font-medium">{t.fees.billed}</th>
                    <th className="text-right px-5 py-3 font-medium">{t.fees.paid}</th>
                    <th className="text-right px-5 py-3 font-medium">{t.fees.balance}</th>
                    <th className="text-left px-5 py-3 font-medium">{t.common.status}</th>
                    <th className="text-left px-5 py-3 font-medium">{t.fees.dueDate}</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map(f => (
                    <tr
                      key={f.id}
                      onClick={() => setSelected(selected === f.id ? null : f.id)}
                      className={`hover:bg-slate-50 cursor-pointer transition-colors ${selected === f.id ? 'bg-indigo-50' : ''}`}
                    >
                      <td className="px-5 py-3">
                        <p className="font-medium text-slate-800">{f.studentName}</p>
                        <p className="text-xs text-slate-400 font-mono">{f.studentNumber}</p>
                      </td>
                      <td className="px-5 py-3">
                        <span className="bg-indigo-50 text-indigo-700 text-xs font-medium px-2 py-0.5 rounded">{f.className}</span>
                      </td>
                      <td className="px-5 py-3 text-slate-600 text-xs">{f.feeName}</td>
                      <td className="px-5 py-3 text-right font-medium text-slate-800">{f.amountDue.toLocaleString()} FCFA</td>
                      <td className="px-5 py-3 text-right font-medium text-green-600">{f.amountPaid.toLocaleString()} FCFA</td>
                      <td className={`px-5 py-3 text-right font-bold ${f.balance > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                        {f.balance.toLocaleString()} FCFA
                      </td>
                      <td className="px-5 py-3"><StatusBadge status={f.status} /></td>
                      <td className="px-5 py-3 text-slate-500 text-xs">
                        {f.dueDate ? new Date(f.dueDate).toLocaleDateString('en-GB') : '—'}
                      </td>
                      <td className="px-5 py-3">
                        <button
                          onClick={e => { e.stopPropagation(); setPayModal({ open: true, recordId: f.id }); }}
                          className="p-1.5 hover:bg-indigo-100 rounded-lg text-indigo-600 transition-colors"
                          title="Record payment"
                        >
                          <Receipt size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtered.length === 0 && (
                <div className="text-center py-12 text-slate-400">
                  {records.length === 0
                    ? (t.fees.noRecords ?? 'No fee records yet — click "Add Fee Record" to create one.')
                    : t.fees.noRecords}
                </div>
              )}
            </div>
          </div>

          {/* Side panel */}
          {selectedRecord && (
            <div className="w-72 shrink-0 bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="font-semibold text-slate-800 mb-1">{selectedRecord.studentName}</h3>
              <p className="text-xs text-slate-400 mb-4">{selectedRecord.studentNumber} · {selectedRecord.className}</p>

              <div className="space-y-2 text-sm mb-4">
                {[
                  { label: t.fees.amountDue,  val: `${selectedRecord.amountDue.toLocaleString()} FCFA`,  color: 'text-slate-800' },
                  { label: t.fees.amountPaid, val: `${selectedRecord.amountPaid.toLocaleString()} FCFA`, color: 'text-green-600' },
                  { label: t.fees.balance,    val: `${selectedRecord.balance.toLocaleString()} FCFA`,    color: selectedRecord.balance > 0 ? 'text-orange-600' : 'text-green-600' },
                ].map(row => (
                  <div key={row.label} className="flex justify-between">
                    <span className="text-slate-500">{row.label}</span>
                    <span className={`font-semibold ${row.color}`}>{row.val}</span>
                  </div>
                ))}
              </div>

              {selectedRecord.payments.length > 0 && (
                <>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">{t.fees.paymentHistory}</p>
                  <div className="space-y-2">
                    {selectedRecord.payments.map(p => (
                      <div key={p.id} className="bg-slate-50 rounded-lg p-2.5 text-xs">
                        <div className="flex justify-between font-medium">
                          <span className="text-slate-700">{p.method}</span>
                          <span className="text-green-600">{p.amount.toLocaleString()} FCFA</span>
                        </div>
                        <div className="flex justify-between text-slate-400 mt-0.5">
                          <span>{p.paymentDate ? new Date(p.paymentDate).toLocaleDateString('en-GB') : '—'}</span>
                          <span>{p.receiptNumber}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {selectedRecord.balance > 0 && (
                <button
                  onClick={() => setPayModal({ open: true, recordId: selectedRecord.id })}
                  className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium py-2 rounded-lg transition-colors"
                >
                  {t.fees.recordPayment}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Add fee modal */}
      {addFeeOpen && (
        <AddFeeModal
          onClose={() => setAddFeeOpen(false)}
          onCreated={rec => setRecords(prev => [rec, ...prev])}
        />
      )}

      {/* Record payment modal */}
      {payModal.open && (
        <RecordPaymentModal
          records={records}
          initialRecordId={payModal.recordId}
          onClose={() => setPayModal({ open: false })}
          onSubmit={handlePayment}
        />
      )}
    </div>
  );
}
