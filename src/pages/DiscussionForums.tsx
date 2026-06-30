import { useState, useRef, useEffect, useCallback } from 'react';
import {
  MessageCircle, Mic, MicOff, Send, Search, Plus,
  Image as ImageIcon, Users, MoreVertical, X, Trash2, Loader2,
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { api, type ForumThread, type ForumMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';

const tagColor: Record<string, string> = {
  general:  'bg-slate-100 text-slate-600',
  academic: 'bg-indigo-50 text-indigo-700',
  events:   'bg-emerald-50 text-emerald-700',
  admin:    'bg-blue-50 text-blue-700',
};

const WAVE_HEIGHTS = [40, 65, 80, 55, 90, 45, 75, 85, 60, 70, 50, 80, 65, 45, 72, 55, 85, 62, 75, 40];

function Waveform({ mine }: { mine: boolean }) {
  return (
    <div className="flex items-center gap-[2px]" style={{ height: 24 }}>
      {WAVE_HEIGHTS.map((h, i) => (
        <div key={i} className={`w-[3px] rounded-full ${mine ? 'bg-white opacity-70' : 'bg-indigo-400'}`} style={{ height: `${h}%` }} />
      ))}
    </div>
  );
}

type LocalMsg = {
  id: string;
  author: string;
  type: 'text' | 'image' | 'voice';
  content?: string;
  image_url?: string;
  voice_url?: string;
  voice_duration?: number;
  created_at: string;
  mine: boolean;
};

function toLocalMsg(m: ForumMessage, myName: string): LocalMsg {
  return {
    id: m.id,
    author: m.author,
    type: (m.type ?? 'text') as LocalMsg['type'],
    content: m.content,
    image_url: m.image_url,
    voice_url: m.voice_url,
    voice_duration: m.voice_duration,
    created_at: m.created_at,
    mine: m.author === myName,
  };
}

export default function DiscussionForums() {
  const { lang } = useLanguage();
  const { user } = useAuth();
  const lbl = (en: string, fr: string) => lang === 'fr' ? fr : en;

  const [threads, setThreads]         = useState<ForumThread[]>([]);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [activeId, setActiveId]       = useState<string | null>(null);
  const [msgs, setMsgs]               = useState<LocalMsg[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [text, setText]               = useState('');
  const [search, setSearch]           = useState('');
  const [recording, setRecording]     = useState(false);
  const [recSeconds, setRecSeconds]   = useState(0);
  const [showNewThread, setShowNewThread] = useState(false);
  const [newTitle, setNewTitle]       = useState('');
  const [newTag, setNewTag]           = useState('general');
  const [creating, setCreating]       = useState(false);

  const mediaRef    = useRef<MediaRecorder | null>(null);
  const chunksRef   = useRef<Blob[]>([]);
  const fileRef     = useRef<HTMLInputElement>(null);
  const bottomRef   = useRef<HTMLDivElement>(null);
  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const recStartRef = useRef(0);

  const myName = user?.name ?? 'Me';

  useEffect(() => {
    api.getThreads()
      .then(setThreads)
      .catch(console.error)
      .finally(() => setLoadingThreads(false));
  }, []);

  const loadMessages = useCallback(async (threadId: string) => {
    setLoadingMsgs(true);
    try {
      const data = await api.getMessages(threadId);
      setMsgs(data.map(m => toLocalMsg(m, myName)));
    } catch (err) {
      console.error(err);
    }
    setLoadingMsgs(false);
  }, [myName]);

  useEffect(() => {
    if (!activeId) return;
    loadMessages(activeId);
  }, [activeId, loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs.length]);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const activeThread = threads.find(t => t.id === activeId);
  const filtered     = threads.filter(t => !search || t.title.toLowerCase().includes(search.toLowerCase()));

  const now = () => new Date().toISOString();
  const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  const sendText = async () => {
    if (!text.trim() || !activeId) return;
    const content = text.trim();
    setText('');
    try {
      const saved = await api.sendMessage(activeId, { type: 'text', content });
      setMsgs(prev => [...prev, toLocalMsg(saved, myName)]);
      setThreads(prev => prev.map(t => t.id === activeId ? { ...t, message_count: t.message_count + 1, updated_at: now() } : t));
    } catch (err) {
      console.error(err);
    }
  };

  const handleImageFile = async (file: File) => {
    if (!activeId) return;
    const reader = new FileReader();
    reader.onload = async e => {
      const image_url = e.target?.result as string;
      try {
        const saved = await api.sendMessage(activeId, { type: 'image', image_url });
        setMsgs(prev => [...prev, toLocalMsg(saved, myName)]);
        setThreads(prev => prev.map(t => t.id === activeId ? { ...t, message_count: t.message_count + 1 } : t));
      } catch (err) {
        console.error(err);
      }
    };
    reader.readAsDataURL(file);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      recStartRef.current = Date.now();

      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const duration = Math.round((Date.now() - recStartRef.current) / 1000);
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const voiceUrl = URL.createObjectURL(blob);
        // Voice messages are local-only (no persistent file storage)
        const localMsg: LocalMsg = {
          id: `local-${Date.now()}`,
          author: myName,
          type: 'voice',
          voice_url: voiceUrl,
          voice_duration: duration,
          created_at: now(),
          mine: true,
        };
        setMsgs(prev => [...prev, localMsg]);
        stream.getTracks().forEach(t => t.stop());
        if (timerRef.current) clearInterval(timerRef.current);
        setRecSeconds(0);
      };

      mr.start();
      mediaRef.current = mr;
      setRecording(true);
      timerRef.current = setInterval(() => setRecSeconds(s => s + 1), 1000);
    } catch {
      alert(lbl('Microphone access denied.', 'Accès au microphone refusé.'));
    }
  };

  const stopRecording = () => {
    mediaRef.current?.stop();
    setRecording(false);
  };

  const createThread = async () => {
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      const thread = await api.createThread({ title: newTitle.trim(), tag: newTag });
      setThreads(prev => [thread, ...prev]);
      setActiveId(thread.id);
      setNewTitle('');
      setNewTag('general');
      setShowNewThread(false);
    } catch (err) {
      console.error(err);
    }
    setCreating(false);
  };

  const deleteThread = async (id: string) => {
    try {
      await api.deleteThread(id);
      setThreads(prev => prev.filter(t => t.id !== id));
      if (activeId === id) { setActiveId(null); setMsgs([]); }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex rounded-xl border border-slate-200 overflow-hidden bg-white" style={{ height: 'calc(100vh - 9rem)' }}>

      {/* ── Left: thread list ─────────────────────────────────────── */}
      <div className="w-72 border-r border-slate-200 flex flex-col shrink-0 bg-slate-50">
        <div className="px-4 py-3 bg-white border-b border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-slate-800 text-sm">{lbl('Forums', 'Forums')}</h2>
            <button
              onClick={() => setShowNewThread(v => !v)}
              className="p-1.5 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg transition-colors"
              title={lbl('New thread', 'Nouveau fil')}
            >
              <Plus size={15} className="text-slate-500" />
            </button>
          </div>

          {showNewThread && (
            <div className="mb-3 p-3 bg-indigo-50 border border-indigo-100 rounded-xl space-y-2">
              <input
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') createThread(); }}
                placeholder={lbl('Thread title…', 'Titre du fil…')}
                className="w-full py-1.5 px-2.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                autoFocus
              />
              <div className="flex gap-2">
                <select
                  value={newTag}
                  onChange={e => setNewTag(e.target.value)}
                  className="flex-1 py-1.5 px-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value="general">General</option>
                  <option value="academic">Academic</option>
                  <option value="events">Events</option>
                  <option value="admin">Admin</option>
                </select>
                <button
                  onClick={createThread}
                  disabled={creating || !newTitle.trim()}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg transition-colors"
                >
                  {creating ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />}
                  {lbl('Create', 'Créer')}
                </button>
                <button onClick={() => setShowNewThread(false)} className="p-1.5 text-slate-400 hover:bg-slate-200 rounded-lg">
                  <X size={13} />
                </button>
              </div>
            </div>
          )}

          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={lbl('Search forums…', 'Rechercher…')}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {loadingThreads && (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={20} className="text-indigo-400 animate-spin" />
            </div>
          )}
          {!loadingThreads && filtered.length === 0 && (
            <div className="py-8 text-center text-slate-400 text-xs px-4">
              {lbl('No threads yet. Click + to create one.', 'Aucun fil. Cliquez + pour en créer un.')}
            </div>
          )}
          {filtered.map(thread => (
            <button
              key={thread.id}
              onClick={() => setActiveId(thread.id)}
              className={`w-full text-left px-4 py-3.5 transition-colors ${activeId === thread.id ? 'bg-indigo-50' : 'hover:bg-white'}`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${activeId === thread.id ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-400'}`}>
                  <MessageCircle size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <p className={`text-sm font-medium truncate ${activeId === thread.id ? 'text-indigo-700' : 'text-slate-800'}`}>
                      {thread.title}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${tagColor[thread.tag] ?? tagColor.general}`}>
                      {thread.tag}
                    </span>
                    <span className="flex items-center gap-0.5 text-[10px] text-slate-400">
                      <Users size={9} /> {thread.message_count}
                    </span>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Right: chat area ─────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">

        {!activeThread ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
              <MessageCircle size={28} className="text-slate-400" />
            </div>
            <p className="font-semibold text-slate-700 mb-1">{lbl('Select a forum', 'Sélectionnez un forum')}</p>
            <p className="text-slate-400 text-sm max-w-xs">
              {lbl('Choose a thread from the left, or create a new one.', 'Choisissez un fil à gauche, ou créez-en un.')}
            </p>
          </div>
        ) : (<>

          {/* Chat header */}
          <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-3 bg-white shrink-0">
            <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
              <MessageCircle size={16} className="text-indigo-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-800 text-sm leading-tight">{activeThread.title}</p>
              <p className="text-xs text-slate-400">
                {activeThread.message_count} {lbl('messages', 'messages')} · {activeThread.tag}
              </p>
            </div>
            <button
              onClick={() => deleteThread(activeThread.id)}
              className="p-2 hover:bg-red-50 hover:text-red-500 text-slate-400 rounded-lg transition-colors"
              title={lbl('Delete thread', 'Supprimer le fil')}
            >
              <Trash2 size={16} />
            </button>
            <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
              <MoreVertical size={16} className="text-slate-500" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 bg-slate-50/40">
            {loadingMsgs && (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={20} className="text-indigo-400 animate-spin" />
              </div>
            )}
            {!loadingMsgs && msgs.map(msg => (
              <div key={msg.id} className={`flex gap-2.5 ${msg.mine ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 self-end ${msg.mine ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                  {msg.author?.slice(0, 2).toUpperCase() ?? '??'}
                </div>

                <div className={`flex flex-col max-w-[65%] ${msg.mine ? 'items-end' : 'items-start'}`}>
                  {!msg.mine && (
                    <p className="text-[11px] text-slate-400 mb-1 ml-1">{msg.author}</p>
                  )}

                  {msg.type === 'text' && (
                    <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed break-words ${msg.mine ? 'bg-indigo-600 text-white rounded-br-sm' : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm shadow-sm'}`}>
                      {msg.content}
                    </div>
                  )}

                  {msg.type === 'image' && (
                    <div className={`rounded-2xl overflow-hidden max-w-[240px] shadow-sm ${msg.mine ? 'rounded-br-sm' : 'rounded-bl-sm border border-slate-200'}`}>
                      <img src={msg.image_url} alt="shared" className="w-full max-h-52 object-cover block" />
                    </div>
                  )}

                  {msg.type === 'voice' && (
                    <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl shadow-sm ${msg.mine ? 'bg-indigo-600 text-white rounded-br-sm' : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm'}`}>
                      {msg.voice_url ? (
                        <audio controls src={msg.voice_url} style={{ height: 32, width: 200 }} />
                      ) : (
                        <>
                          <Mic size={15} className="shrink-0 opacity-80" />
                          <Waveform mine={msg.mine} />
                          <span className="text-xs opacity-70 shrink-0 tabular-nums">{msg.voice_duration}s</span>
                        </>
                      )}
                    </div>
                  )}

                  <p className="text-[10px] text-slate-400 mt-1 mx-1">{fmtTime(msg.created_at)}</p>
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input bar */}
          <div className="px-4 py-3 border-t border-slate-100 bg-white shrink-0">
            {recording && (
              <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg mb-2 text-red-600 text-sm">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse shrink-0" />
                <span className="flex-1">{lbl('Recording', 'Enregistrement')} — {recSeconds}s</span>
                <span className="text-xs opacity-70">{lbl('tap mic again to send', 'retap pour envoyer')}</span>
              </div>
            )}
            <div className="flex items-end gap-2">
              <input ref={fileRef} type="file" accept="image/*" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleImageFile(f); e.target.value = ''; }} />
              <button onClick={() => fileRef.current?.click()} title={lbl('Upload image', 'Image')}
                className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors shrink-0">
                <ImageIcon size={20} />
              </button>

              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendText(); } }}
                placeholder={lbl('Type a message… (Enter to send)', 'Écrire… (Entrée pour envoyer)')}
                rows={1}
                style={{ maxHeight: 112, lineHeight: '1.5' }}
                className="flex-1 resize-none py-2.5 px-3.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 overflow-y-auto"
              />

              {text.trim() ? (
                <button onClick={sendText} className="p-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors shrink-0">
                  <Send size={18} />
                </button>
              ) : (
                <button onClick={recording ? stopRecording : startRecording}
                  title={recording ? lbl('Stop & send', 'Arrêter') : lbl('Record voice', 'Vocal')}
                  className={`p-2.5 rounded-xl transition-colors shrink-0 ${recording ? 'bg-red-500 hover:bg-red-600 text-white' : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'}`}>
                  {recording ? <MicOff size={20} /> : <Mic size={20} />}
                </button>
              )}
            </div>
          </div>
        </>)}
      </div>
    </div>
  );
}
