import { useEffect, useState } from 'react';
import { Download, Upload } from 'lucide-react';
import { api } from '../../api/client';
import type { PlatformSchool } from '../../api/client';

export default function BackupRestore() {
  const [schools, setSchools] = useState<PlatformSchool[]>([]);
  const [exporting, setExporting] = useState(false);
  const [restoreSchoolId, setRestoreSchoolId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api.platform.getSchools().then(setSchools).catch(console.error);
  }, []);

  const exportBackup = async () => {
    setExporting(true);
    try {
      const blob = await api.platform.exportBackup();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup-${Date.now()}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  const restore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restoreSchoolId || !file) return;
    setRestoring(true);
    setError('');
    setMessage('');
    try {
      const res = await api.platform.restoreBackup(restoreSchoolId, file);
      setMessage(res.message);
      setFile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Restore failed');
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Backup & Restore</h2>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-2">Export Full Backup</h3>
        <p className="text-sm text-slate-500 mb-4">Downloads a zip containing every school's database file plus the platform registry.</p>
        <button onClick={exportBackup} disabled={exporting}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-medium text-sm px-4 py-2.5 rounded-lg transition-colors">
          <Download size={16} /> {exporting ? 'Preparing export...' : 'Download Backup (.zip)'}
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-2">Restore a School's Database</h3>
        <p className="text-sm text-slate-500 mb-4">Uploads a .db file to overwrite one school's database. This cannot be undone.</p>
        {error && <p className="text-red-600 text-xs mb-3">{error}</p>}
        {message && <p className="text-green-600 text-xs mb-3">{message}</p>}
        <form onSubmit={restore} className="space-y-3">
          <div>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300">School</label>
            <select required value={restoreSchoolId} onChange={e => setRestoreSchoolId(e.target.value)}
              className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">Select school</option>
              {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Database File (.db)</label>
            <input required type="file" accept=".db" onChange={e => setFile(e.target.files?.[0] ?? null)}
              className="w-full mt-1 text-sm text-slate-600 dark:text-slate-300" />
          </div>
          <button type="submit" disabled={restoring}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-medium text-sm px-4 py-2.5 rounded-lg transition-colors">
            <Upload size={16} /> {restoring ? 'Restoring...' : 'Restore School Database'}
          </button>
        </form>
      </div>
    </div>
  );
}
