import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { QrCode, CheckCircle2, Clock, AlertTriangle, Camera } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { api } from '../../api/client';
import type { TeacherAttendanceRecord } from '../../api/client';

const READER_ID = 'attendance-qr-reader';

type Phase = 'starting' | 'scanning' | 'processing' | 'result' | 'camera-error';

export default function TeacherScanAttendance() {
  const { lang } = useLanguage();
  const lbl = (en: string, fr: string) => (lang === 'fr' ? fr : en);

  const [phase, setPhase] = useState<Phase>('starting');
  const [result, setResult] = useState<TeacherAttendanceRecord | null>(null);
  const [error, setError] = useState('');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const busyRef = useRef(false); // guards against double-fire while a scan is being submitted

  const stopCamera = async () => {
    const scanner = scannerRef.current;
    if (!scanner) return;
    try { await scanner.stop(); } catch { /* already stopped */ }
    try { scanner.clear(); } catch { /* ignore */ }
  };

  const startCamera = async () => {
    setError('');
    setPhase('starting');
    try {
      const scanner = new Html5Qrcode(READER_ID);
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        onDecoded,
        () => { /* per-frame "no QR found yet" — expected, ignore */ },
      );
      setPhase('scanning');
    } catch {
      setPhase('camera-error');
      setError(lbl(
        'Could not access the camera. Check camera permission and try again.',
        'Impossible d’accéder à la caméra. Vérifiez la permission et réessayez.',
      ));
    }
  };

  const onDecoded = async (decodedText: string) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setPhase('processing');
    await stopCamera();
    try {
      const saved = await api.attendanceQr.scan(decodedText);
      setResult(saved);
      setPhase('result');
    } catch (err) {
      setError(err instanceof Error ? err.message : lbl('Could not record your attendance.', 'Impossible d’enregistrer votre présence.'));
      setResult(null);
      setPhase('result');
    } finally {
      busyRef.current = false;
    }
  };

  useEffect(() => {
    startCamera();
    return () => { stopCamera(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scanAgain = () => {
    setResult(null);
    setError('');
    startCamera();
  };

  const isLate = result?.status === 'late';

  return (
    <div className="max-w-md mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center shrink-0">
          <QrCode size={20} className="text-indigo-600 dark:text-indigo-400" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
            {lbl('Scan Attendance', 'Scanner la présence')}
          </h1>
          <p className="text-xs text-slate-400">
            {lbl('Scan the QR code posted at school to record your arrival.', 'Scannez le QR code affiché à l’école pour enregistrer votre arrivée.')}
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
        {(phase === 'starting' || phase === 'scanning' || phase === 'processing') && (
          <>
            <div id={READER_ID} className="rounded-lg overflow-hidden bg-slate-950" />
            {phase === 'starting' && (
              <p className="text-center text-sm text-slate-400 mt-3">{lbl('Starting camera…', 'Démarrage de la caméra…')}</p>
            )}
            {phase === 'scanning' && (
              <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-3">
                {lbl('Point your camera at the QR code.', 'Pointez votre caméra vers le QR code.')}
              </p>
            )}
            {phase === 'processing' && (
              <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-3">{lbl('Recording your attendance…', 'Enregistrement en cours…')}</p>
            )}
          </>
        )}

        {phase === 'camera-error' && (
          <div className="text-center py-6 space-y-3">
            <AlertTriangle size={28} className="text-amber-500 mx-auto" />
            <p className="text-sm text-slate-600 dark:text-slate-300">{error}</p>
            <button onClick={startCamera}
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg">
              <Camera size={15} /> {lbl('Try again', 'Réessayer')}
            </button>
          </div>
        )}

        {phase === 'result' && (
          <div className="text-center py-6 space-y-3">
            {result ? (
              <>
                {isLate
                  ? <Clock size={32} className="text-amber-500 mx-auto" />
                  : <CheckCircle2 size={32} className="text-emerald-500 mx-auto" />}
                <p className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                  {isLate ? lbl('Marked Late', 'Marqué en retard') : lbl('Marked On Time', 'Marqué à l’heure')}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {result.scan_time ? new Date(result.scan_time).toLocaleTimeString(lang === 'fr' ? 'fr-FR' : 'en-GB', { hour: '2-digit', minute: '2-digit' }) : ''}
                  {' · '}{result.date}
                </p>
              </>
            ) : (
              <>
                <AlertTriangle size={28} className="text-red-500 mx-auto" />
                <p className="text-sm text-slate-600 dark:text-slate-300">{error}</p>
              </>
            )}
            {!result && (
              <button onClick={scanAgain}
                className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg">
                <Camera size={15} /> {lbl('Scan again', 'Scanner à nouveau')}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
