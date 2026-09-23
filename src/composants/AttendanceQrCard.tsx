import { useEffect, useState } from 'react';
import { QrCode, RefreshCcw, Printer, Ban, Clock } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { useBranding } from '../context/BrandingContext';
import { api, type AttendanceQrCode } from '../api/client';
import ConfirmDialog from './ui/ConfirmDialog';

function printPoster(qr: AttendanceQrCode, schoolName: string) {
  const w = window.open('', '_blank', 'width=480,height=640');
  if (!w) return;
  w.document.write(`<!DOCTYPE html><html><head><title>Attendance QR — ${qr.month}</title>
    <style>
      body{font-family:'Segoe UI',Arial,sans-serif;text-align:center;padding:48px 24px;color:#1e293b}
      h1{font-size:20px;margin-bottom:4px}
      p{color:#64748b;font-size:13px;margin-top:0}
      img{width:280px;height:280px;margin:24px 0;border:1px solid #e2e8f0;border-radius:12px;padding:12px}
      .month{font-size:15px;font-weight:600;color:#4f46e5}
    </style></head><body>
      <h1>${schoolName}</h1>
      <p>Teacher Attendance QR Code</p>
      <p class="month">${qr.month}</p>
      <img src="${qr.qr}" alt="Attendance QR" />
      <p>Scan from the Teacher Portal on arrival each working day.</p>
    </body></html>`);
  w.document.close();
  w.focus();
  w.print();
}

export default function AttendanceQrCard() {
  const { lang } = useLanguage();
  const { schoolName } = useBranding();
  const lbl = (en: string, fr: string) => (lang === 'fr' ? fr : en);

  const [qr, setQr] = useState<AttendanceQrCode | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirmRegen, setConfirmRegen] = useState(false);

  const [threshold, setThreshold] = useState('07:30');
  const [thresholdSaved, setThresholdSaved] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([
      api.attendanceQr.getCurrent().catch(() => null),
      api.attendanceQr.getSettings().catch(() => null),
    ]).then(([current, settings]) => {
      setQr(current);
      if (settings) setThreshold(settings.arrival_threshold);
    }).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const generate = async () => {
    setBusy(true); setError(''); setConfirmRegen(false);
    try {
      const created = await api.attendanceQr.generate();
      setQr(created);
    } catch (e) {
      setError(e instanceof Error ? e.message : lbl('Could not generate the code.', 'Échec de la génération.'));
    } finally { setBusy(false); }
  };

  const revoke = async () => {
    setBusy(true); setError('');
    try {
      await api.attendanceQr.revoke();
      setQr(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : lbl('Could not revoke the code.', 'Échec de la révocation.'));
    } finally { setBusy(false); }
  };

  const saveThreshold = async () => {
    try {
      await api.attendanceQr.updateSettings(threshold);
      setThresholdSaved(true);
      setTimeout(() => setThresholdSaved(false), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : lbl('Could not save.', 'Échec de la sauvegarde.'));
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
          <QrCode size={18} className="text-indigo-500" />
          {lbl('Teacher Attendance QR Code', 'QR Code de Présence Enseignants')}
        </h3>
        {qr && (
          <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded font-medium">
            {lbl('Active for', 'Actif pour')} {qr.month}
          </span>
        )}
      </div>

      <p className="text-sm text-slate-500">
        {lbl(
          'Generate a monthly code, print it, and post it where teachers arrive. Teachers scan it from the portal to record their arrival time automatically.',
          'Générez un code mensuel, imprimez-le et affichez-le à l’entrée. Les enseignants le scannent depuis le portail pour enregistrer automatiquement leur heure d’arrivée.'
        )}
      </p>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {loading ? (
        <div className="h-40 flex items-center justify-center">
          <div className="w-6 h-6 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : qr ? (
        <div className="flex flex-col sm:flex-row items-center gap-5">
          <img src={qr.qr} alt="Attendance QR" className="w-40 h-40 rounded-lg border border-slate-200 p-2 shrink-0" />
          <div className="flex-1 space-y-2 text-sm text-slate-500">
            <p>{lbl('Generated', 'Généré')}: {new Date(qr.created_at).toLocaleString()}</p>
            <p>{lbl('Expires', 'Expire')}: {new Date(qr.expires_at).toLocaleDateString()}</p>
            <div className="flex flex-wrap gap-2 pt-1">
              <button onClick={() => printPoster(qr, schoolName)}
                className="flex items-center gap-1.5 text-sm border border-slate-200 px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-50">
                <Printer size={14} /> {lbl('Print', 'Imprimer')}
              </button>
              <button disabled={busy} onClick={() => setConfirmRegen(true)}
                className="flex items-center gap-1.5 text-sm border border-slate-200 px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-60">
                <RefreshCcw size={14} /> {lbl('Regenerate', 'Régénérer')}
              </button>
              <button disabled={busy} onClick={revoke}
                className="flex items-center gap-1.5 text-sm border border-red-200 text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-50 disabled:opacity-60">
                <Ban size={14} /> {lbl('Revoke', 'Révoquer')}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button disabled={busy} onClick={generate}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          {busy ? lbl('Generating…', 'Génération…') : lbl('Generate this month’s code', 'Générer le code de ce mois')}
        </button>
      )}

      <div className="pt-2 border-t border-slate-100">
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
          <Clock size={14} className="text-slate-400" />
          {lbl('Arrival cutoff time', 'Heure limite d’arrivée')}
        </label>
        <div className="flex items-center gap-2">
          <input type="time" value={threshold} onChange={e => setThreshold(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          <button onClick={saveThreshold}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors">
            {thresholdSaved ? lbl('Saved ✓', 'Enregistré ✓') : lbl('Save', 'Enregistrer')}
          </button>
        </div>
        <p className="text-xs text-slate-400 mt-1.5">
          {lbl('Scans at or before this time are On Time; after it, Late.', 'Les scans avant ou à cette heure sont "à l’heure" ; après, "en retard".')}
        </p>
      </div>

      {confirmRegen && (
        <ConfirmDialog
          title={lbl('Regenerate the QR code?', 'Régénérer le QR code ?')}
          message={lbl(
            'The code currently posted at school will stop working immediately. Print and post the new one before removing the old poster.',
            'Le code actuellement affiché cessera de fonctionner immédiatement. Imprimez et affichez le nouveau avant de retirer l’ancien.'
          )}
          confirmLabel={lbl('Regenerate', 'Régénérer')}
          cancelLabel={lbl('Cancel', 'Annuler')}
          danger
          onConfirm={generate}
          onCancel={() => setConfirmRegen(false)}
        />
      )}
    </div>
  );
}
