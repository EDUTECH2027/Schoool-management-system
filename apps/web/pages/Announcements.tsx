import { useState, useEffect } from 'react';
import { Megaphone, Plus, Pin, ChevronDown, Search, X, Trash2, Loader2 } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { api, type Announcement } from '../api/client';

const typeStyle = {
  info:    { bar: 'bg-indigo-500', badge: 'bg-indigo-50 text-indigo-700 border-indigo-100' },
  warning: { bar: 'bg-amber-400',  badge: 'bg-amber-50  text-amber-700  border-amber-100'  },
  success: { bar: 'bg-emerald-500',badge: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
};

export default function Announcements() {
  const { t, lang } = useLanguage();
  const lbl = (en: string, fr: string) => lang === 'fr' ? fr : en;

  const [items, setItems]       = useState<Announcement[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showNew, setShowNew]   = useState(false);
  const [saving, setSaving]     = useState(false);
  const [draft, setDraft]       = useState({ title: '', body: '', audience: 'all', type: 'info' as Announcement['type'] });

  useEffect(() => {
    api.getAnnouncements()
      .then(setItems)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = items.filter(a =>
    a.title.toLowerCase().includes(search.toLowerCase()) ||
    a.body.toLowerCase().includes(search.toLowerCase()),
  );

  const pinned  = filtered.filter(a => a.is_pinned);
  const regular = filtered.filter(a => !a.is_pinned);

  const addAnnouncement = async () => {
    if (!draft.title.trim()) return;
    setSaving(true);
    try {
      const created = await api.createAnnouncement({
        title: draft.title.trim(),
        body: draft.body.trim(),
        audience: draft.audience,
        type: draft.type,
        isPinned: false,
      } as Parameters<typeof api.createAnnouncement>[0]);
      setItems(prev => [created, ...prev]);
      setDraft({ title: '', body: '', audience: 'all', type: 'info' });
      setShowNew(false);
    } catch (err) {
      console.error(err);
    }
    setSaving(false);
  };

  const togglePin = async (a: Announcement) => {
    try {
      const updated = await api.updateAnnouncement(a.id, {
        title: a.title,
        body: a.body,
        audience: a.audience,
        type: a.type,
        isPinned: !a.is_pinned,
      } as Parameters<typeof api.updateAnnouncement>[1]);
      setItems(prev => prev.map(x => x.id === a.id ? updated : x));
    } catch (err) {
      console.error(err);
    }
  };

  const deleteAnnouncement = async (id: string) => {
    try {
      await api.deleteAnnouncement(id);
      setItems(prev => prev.filter(x => x.id !== id));
      if (expanded === id) setExpanded(null);
    } catch (err) {
      console.error(err);
    }
  };

  const Card = ({ a }: { a: Announcement }) => {
    const st   = typeStyle[a.type ?? 'info'];
    const open = expanded === a.id;
    return (
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className={`h-1 ${st.bar}`} />
        <div
          className="flex items-start justify-between gap-3 px-5 py-4 cursor-pointer hover:bg-slate-50 transition-colors"
          onClick={() => setExpanded(open ? null : a.id)}
        >
          <div className="flex items-start gap-3 min-w-0">
            {a.is_pinned ? <Pin size={14} className="text-indigo-400 mt-0.5 shrink-0" /> : null}
            <div className="min-w-0">
              <p className="font-semibold text-slate-800 text-sm">{a.title}</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {a.audience} · {new Date(a.created_at).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`text-xs font-medium px-2 py-0.5 rounded border ${st.badge}`}>{a.type ?? 'info'}</span>
            <ChevronDown size={15} className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
          </div>
        </div>
        {open && (
          <div className="px-5 pb-4 text-sm text-slate-600 border-t border-slate-100 pt-3">
            <p className="mb-3">{a.body}</p>
            {a.author && <p className="text-xs text-slate-400">{lbl('Posted by', 'Publié par')} {a.author}</p>}
            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={e => { e.stopPropagation(); togglePin(a); }}
                className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-colors ${
                  a.is_pinned
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Pin size={11} />
                {a.is_pinned ? lbl('Unpin', 'Désépingler') : lbl('Pin', 'Épingler')}
              </button>
              <button
                onClick={e => { e.stopPropagation(); deleteAnnouncement(a.id); }}
                className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
              >
                <Trash2 size={11} />
                {lbl('Delete', 'Supprimer')}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={28} className="text-indigo-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-52">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={lbl('Search announcements…', 'Rechercher des annonces…')}
              className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <button
            onClick={() => setShowNew(v => !v)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <Plus size={14} />
            {lbl('New Announcement', 'Nouvelle Annonce')}
          </button>
        </div>

        {showNew && (
          <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
            <input
              value={draft.title}
              onChange={e => setDraft(d => ({ ...d, title: e.target.value }))}
              placeholder={lbl('Title', 'Titre')}
              className="w-full py-2 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <textarea
              rows={3}
              value={draft.body}
              onChange={e => setDraft(d => ({ ...d, body: e.target.value }))}
              placeholder={lbl('Message…', 'Message…')}
              className="w-full py-2 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
            <div className="flex gap-3">
              <select
                value={draft.audience}
                onChange={e => setDraft(d => ({ ...d, audience: e.target.value }))}
                className="py-2 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {[
                  { value: 'all',     label: lbl('All', 'Tout le monde') },
                  { value: 'students',label: lbl('All Students', 'Tous les élèves') },
                  { value: 'parents', label: lbl('All Parents', 'Tous les parents') },
                  { value: 'staff',   label: lbl('All Staff', 'Tout le personnel') },
                ].map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
              </select>
              <select
                value={draft.type}
                onChange={e => setDraft(d => ({ ...d, type: e.target.value as Announcement['type'] }))}
                className="py-2 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="success">Success</option>
              </select>
              <button
                onClick={addAnnouncement}
                disabled={saving || !draft.title.trim()}
                className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                {saving ? <Loader2 size={13} className="animate-spin" /> : null}
                {lbl('Post', 'Publier')}
              </button>
              <button onClick={() => setShowNew(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                <X size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: lbl('Total', 'Total'),  value: items.length,                color: 'text-indigo-600' },
          { label: lbl('Pinned', 'Épinglés'), value: items.filter(a => a.is_pinned).length,  color: 'text-amber-600'  },
          { label: lbl('This Month', 'Ce mois'), value: items.filter(a => a.created_at?.startsWith(new Date().toISOString().slice(0, 7))).length, color: 'text-emerald-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-4 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-sm text-slate-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Pinned */}
      {pinned.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
            <Pin size={11} /> {lbl('Pinned', 'Épinglés')}
          </p>
          {pinned.map(a => <Card key={a.id} a={a} />)}
        </div>
      )}

      {/* Regular */}
      {regular.length > 0 && (
        <div className="space-y-2">
          {pinned.length > 0 && (
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
              <Megaphone size={11} /> {lbl('All Notices', 'Toutes les Annonces')}
            </p>
          )}
          {regular.map(a => <Card key={a.id} a={a} />)}
        </div>
      )}

      {filtered.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200 py-14 text-center text-slate-400">
          <Megaphone size={36} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">{t.common.noResults}</p>
        </div>
      )}
    </div>
  );
}
