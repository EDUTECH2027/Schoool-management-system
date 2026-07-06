import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import type { PlatformSettings as PlatformSettingsType } from '../../api/client';

export default function PlatformSettings() {
  const [settings, setSettings] = useState<PlatformSettingsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.platform.getSettings().then(setSettings).catch(console.error).finally(() => setLoading(false));
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    setSaved(false);
    try {
      const updated = await api.platform.updateSettings(settings);
      setSettings(updated);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  if (loading || !settings) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-lg space-y-4">
      <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Platform Settings</h2>
      <form onSubmit={save} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-5 space-y-4">
        {saved && <p className="text-green-600 text-xs">Settings saved.</p>}
        <div>
          <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Platform Name</label>
          <input value={settings.platform_name} onChange={e => setSettings({ ...settings, platform_name: e.target.value })}
            className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Support Email</label>
          <input type="email" value={settings.support_email ?? ''} onChange={e => setSettings({ ...settings, support_email: e.target.value })}
            className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Logo URL</label>
          <input value={settings.logo_url ?? ''} onChange={e => setSettings({ ...settings, logo_url: e.target.value })}
            className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <button disabled={saving} type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-medium text-sm py-2.5 rounded-lg transition-colors">
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </form>
    </div>
  );
}
