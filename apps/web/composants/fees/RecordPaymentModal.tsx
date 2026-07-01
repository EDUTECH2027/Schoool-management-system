import { useState } from 'react';
import { X, Banknote, CheckCircle } from 'lucide-react';
import type { FeeRecord, Payment } from '../../types';
import { useLanguage } from '../../i18n/LanguageContext';

interface Props {
  records: FeeRecord[];
  initialRecordId?: string;
  onClose: () => void;
  onSubmit: (recordId: string, payment: Payment) => void;
}

const METHODS = ['Cash', 'Bank Transfer', 'Mobile Money', 'Cheque'];

export default function RecordPaymentModal({ records, initialRecordId, onClose, onSubmit }: Props) {
  const { lang } = useLanguage();
  const lbl = (en: string, fr: string) => lang === 'fr' ? fr : en;

  const payable = records.filter(r => r.balance > 0);

  const [recordId, setRecordId] = useState(initialRecordId ?? payable[0]?.id ?? '');
  const [amount, setAmount]     = useState('');
  const [method, setMethod]     = useState('Cash');
  const [reference, setRef]     = useState('');
  const [date, setDate]         = useState(new Date().toISOString().split('T')[0]);
  const [errors, setErrors]     = useState<Record<string, string>>({});
  const [done, setDone]         = useState(false);

  const record = payable.find(r => r.id === recordId);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!recordId) e.recordId = lbl('Select a student', 'Sélectionnez un élève');
    const amt = Number(amount);
    if (!amount || isNaN(amt) || amt <= 0)
      e.amount = lbl('Enter a valid amount', 'Montant invalide');
    else if (record && amt > record.balance)
      e.amount = lbl(`Max balance: ${record.balance.toLocaleString()} FCFA`, `Max solde: ${record.balance.toLocaleString()} FCFA`);
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate() || !record) return;
    const payment: Payment = {
      id:            `p-${Date.now()}`,
      amount:        Number(amount),
      method,
      reference:     reference.trim(),
      paymentDate:   date,
      receiptNumber: `RCP-${Date.now().toString().slice(-6)}`,
    };
    onSubmit(record.id, payment);
    setDone(true);
    setTimeout(onClose, 1400);
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
              <Banknote size={16} className="text-indigo-600" />
            </div>
            <h2 className="font-semibold text-slate-800">{lbl('Record Payment', 'Enregistrer un paiement')}</h2>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
            <X size={17} className="text-slate-500" />
          </button>
        </div>

        {done ? (
          <div className="flex flex-col items-center justify-center py-10 text-center px-5">
            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mb-3">
              <CheckCircle size={28} className="text-green-500" />
            </div>
            <p className="font-semibold text-slate-800">{lbl('Payment recorded!', 'Paiement enregistré !')}</p>
            {record && (
              <p className="text-slate-400 text-sm mt-1">
                {record.studentName} — {Number(amount).toLocaleString()} FCFA
              </p>
            )}
          </div>
        ) : (
          <div className="px-5 py-5 space-y-4">

            {/* Student / fee selector */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                {lbl('Student / Fee', 'Élève / Frais')}<span className="text-red-500 ml-0.5">*</span>
              </label>
              <select
                value={recordId}
                onChange={e => { setRecordId(e.target.value); setAmount(''); }}
                disabled={!!initialRecordId}
                className={`w-full py-2.5 px-3 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${errors.recordId ? 'border-red-300 bg-red-50' : 'border-slate-200'}`}
              >
                {payable.length === 0 && (
                  <option value="">{lbl('No outstanding fees', 'Aucun frais impayé')}</option>
                )}
                {payable.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.studentName} — {r.feeName} ({r.balance.toLocaleString()} FCFA {lbl('balance', 'solde')})
                  </option>
                ))}
              </select>
              {errors.recordId && <p className="text-red-500 text-xs mt-1">{errors.recordId}</p>}
            </div>

            {/* Summary bar */}
            {record && (
              <div className="bg-slate-50 rounded-xl p-3.5 grid grid-cols-3 gap-2 text-center">
                {[
                  { label: lbl('Billed', 'Facturé'), val: record.amountDue.toLocaleString() + ' FCFA', color: 'text-slate-700' },
                  { label: lbl('Paid', 'Payé'),      val: record.amountPaid.toLocaleString() + ' FCFA', color: 'text-green-600' },
                  { label: lbl('Balance', 'Solde'),  val: record.balance.toLocaleString() + ' FCFA',    color: 'text-orange-600 font-bold' },
                ].map(row => (
                  <div key={row.label}>
                    <p className="text-xs text-slate-400 mb-0.5">{row.label}</p>
                    <p className={`text-sm font-medium ${row.color}`}>{row.val}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Amount */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                {lbl('Amount (FCFA)', 'Montant (FCFA)')}<span className="text-red-500 ml-0.5">*</span>
              </label>
              <input
                type="number"
                min={1}
                max={record?.balance}
                value={amount}
                onChange={e => { setAmount(e.target.value); setErrors(prev => ({ ...prev, amount: '' })); }}
                placeholder={record ? `Max ${record.balance.toLocaleString()} FCFA` : ''}
                className={`w-full py-2.5 px-3 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${errors.amount ? 'border-red-300 bg-red-50' : 'border-slate-200'}`}
              />
              {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount}</p>}
              {record && (
                <button
                  type="button"
                  onClick={() => setAmount(String(record.balance))}
                  className="text-xs text-indigo-600 hover:underline mt-1"
                >
                  {lbl('Pay full balance', 'Payer le solde entier')} ({record.balance.toLocaleString()} FCFA)
                </button>
              )}
            </div>

            {/* Method */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                {lbl('Payment Method', 'Mode de paiement')}<span className="text-red-500 ml-0.5">*</span>
              </label>
              <select
                value={method}
                onChange={e => setMethod(e.target.value)}
                className="w-full py-2.5 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {METHODS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>

            {/* Reference */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                {lbl('Reference (optional)', 'Référence (optionnel)')}
              </label>
              <input
                type="text"
                value={reference}
                onChange={e => setRef(e.target.value)}
                placeholder={lbl('Transaction ID, cheque no...', 'N° de transaction, chèque...')}
                className="w-full py-2.5 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Date */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                {lbl('Payment Date', 'Date du paiement')}<span className="text-red-500 ml-0.5">*</span>
              </label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full py-2.5 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        )}

        {!done && (
          <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-slate-200">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              {lbl('Cancel', 'Annuler')}
            </button>
            <button
              onClick={handleSubmit}
              disabled={payable.length === 0}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
            >
              <Banknote size={15} />
              {lbl('Record Payment', 'Enregistrer')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
