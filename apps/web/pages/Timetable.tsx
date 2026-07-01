import { useState, useCallback, useEffect, useRef } from 'react';
import {
  Save, CheckCircle, X, Pencil, Plus, RotateCcw, Download,
  Settings2, ChevronDown, ChevronUp, Coffee, Loader2,
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Subject, Class, Teacher } from '../types';
import { useLanguage } from '../i18n/LanguageContext';
import { Calendar } from 'lucide-react';
import { api, type ScheduleEntry } from '../api/client';
import { mapClass, mapTeacher } from '../api/mappers';

// ── Types ─────────────────────────────────────────────────────────
type ScheduleSlot = {
  key:       string;
  type:      'period' | 'break';
  label:     string;       // break: editable name; period: auto-computed "P{n}"
  startTime: string;       // 'HH:MM'
  endTime:   string;       // 'HH:MM'
};

type ScheduleConfig = {
  slots:           ScheduleSlot[];
  includeSaturday: boolean;
};

type Cell      = { subject: string; teacherName: string; teacherId?: string; room: string; apiId?: string };
type DayGrid   = Record<string, Cell | null>;    // slotKey → Cell
type ClassGrid = Record<string, DayGrid>;        // day     → DayGrid
type AllGrids  = Record<string, ClassGrid>;      // classId → ClassGrid

type Editing = {
  day: string; dayLabel: string;
  periodKey: string; periodLabel: string;
  classId: string;
};

// ── Constants ─────────────────────────────────────────────────────
const ALL_DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

const DEFAULT_SCHEDULE: ScheduleConfig = {
  includeSaturday: false,
  slots: [
    { key: 'p1',   type: 'period', label: '',       startTime: '07:30', endTime: '08:10' },
    { key: 'p2',   type: 'period', label: '',       startTime: '08:10', endTime: '08:50' },
    { key: 'brk1', type: 'break',  label: 'Break',  startTime: '08:50', endTime: '09:10' },
    { key: 'p3',   type: 'period', label: '',       startTime: '09:10', endTime: '09:50' },
    { key: 'p4',   type: 'period', label: '',       startTime: '09:50', endTime: '10:30' },
    { key: 'p5',   type: 'period', label: '',       startTime: '10:30', endTime: '11:10' },
    { key: 'brk2', type: 'break',  label: 'Lunch',  startTime: '11:10', endTime: '11:50' },
    { key: 'p6',   type: 'period', label: '',       startTime: '11:50', endTime: '12:30' },
    { key: 'p7',   type: 'period', label: '',       startTime: '12:30', endTime: '13:10' },
  ],
};

const SUBJECT_COLORS: Record<string, string> = {
  'English Language':   'bg-blue-100   text-blue-700   border-blue-200',
  'Mathematics':        'bg-green-100  text-green-700  border-green-200',
  'General Science':    'bg-emerald-100 text-emerald-700 border-emerald-200',
  'Social Studies':     'bg-orange-100 text-orange-700 border-orange-200',
  'Shona':              'bg-rose-100   text-rose-700   border-rose-200',
  'Religious & Moral':  'bg-purple-100 text-purple-700 border-purple-200',
  'Art & Craft':        'bg-pink-100   text-pink-700   border-pink-200',
  'Physical Education': 'bg-teal-100   text-teal-700   border-teal-200',
};
function cellColor(subject: string) {
  return SUBJECT_COLORS[subject] ?? 'bg-slate-100 text-slate-700 border-slate-200';
}

// ── Storage helpers ───────────────────────────────────────────────
function loadSchedule(): ScheduleConfig {
  try { const s = localStorage.getItem('timetable_schedule'); if (s) return JSON.parse(s) as ScheduleConfig; }
  catch { /* ignore */ }
  return DEFAULT_SCHEDULE;
}

function saveScheduleToDisk(cfg: ScheduleConfig) {
  localStorage.setItem('timetable_schedule', JSON.stringify(cfg));
}

function apiSlotToCell(slot: ScheduleEntry): Cell {
  return {
    subject:     slot.subject_name,
    teacherName: slot.first_name && slot.last_name ? `${slot.first_name} ${slot.last_name}` : '',
    teacherId:   slot.teacher_id ?? undefined,
    room:        slot.room ?? '',
    apiId:       slot.id,
  };
}

function buildGridFromApiSlots(slots: ScheduleEntry[], cfg: ScheduleConfig, classList: Class[]): AllGrids {
  const teachingKeys = new Set(getTeachingSlots(cfg.slots).map(s => s.key));
  const days = getActiveDays(cfg);
  const result: AllGrids = {};
  classList.forEach(cls => {
    result[cls.id] = {};
    days.forEach(day => {
      result[cls.id][day] = {};
      teachingKeys.forEach(key => { result[cls.id][day][key] = null; });
    });
  });
  slots.forEach(slot => {
    if (!result[slot.class_id]) return;
    if (!result[slot.class_id][slot.day]) return;
    result[slot.class_id][slot.day][slot.period_key] = apiSlotToCell(slot);
  });
  return result;}

// ── Grid helpers ──────────────────────────────────────────────────
const getActiveDays    = (cfg: ScheduleConfig) => cfg.includeSaturday ? ALL_DAYS : ALL_DAYS.slice(0, 5);
const getTeachingSlots = (slots: ScheduleSlot[]) => slots.filter(s => s.type === 'period');

// Reconcile existing grids against a (possibly changed) schedule.
// Adds missing keys as null, removes obsolete keys, adds/removes days.
function reconcileGrids(grids: AllGrids, cfg: ScheduleConfig, classList: Class[]): AllGrids {
  const teachingKeys = new Set(getTeachingSlots(cfg.slots).map(s => s.key));
  const days = getActiveDays(cfg);
  const result: AllGrids = {};
  classList.forEach(cls => {
    const existing = grids[cls.id] ?? {};
    result[cls.id] = {};
    days.forEach(day => {
      const existingDay = existing[day] ?? {};
      result[cls.id][day] = {};
      teachingKeys.forEach(key => {
        result[cls.id][day][key] = existingDay[key] !== undefined ? existingDay[key] : null;
      });
    });
  });
  return result;
}

// ── Duration hint ─────────────────────────────────────────────────
function minutesBetween(start: string, end: string): number {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  return (eh * 60 + em) - (sh * 60 + sm);
}

function addMinutes(time: string, mins: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + mins;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

// ── Schedule Config Panel ─────────────────────────────────────────
function ScheduleConfigPanel({
  schedule, onChange,
}: {
  schedule: ScheduleConfig;
  onChange: (next: ScheduleConfig) => void;
}) {
  const { lang } = useLanguage();
  const lbl = (en: string, fr: string) => lang === 'fr' ? fr : en;

  const { slots, includeSaturday } = schedule;

  // Compute display number for a period key (count only period-type slots)
  const periodNum = (key: string) => {
    let n = 0;
    for (const s of slots) {
      if (s.type === 'period') n++;
      if (s.key === key) return n;
    }
    return 0;
  };

  const updateSlot = (key: string, field: keyof ScheduleSlot, value: string) =>
    onChange({ ...schedule, slots: slots.map(s => s.key === key ? { ...s, [field]: value } : s) });

  const moveSlot = (key: string, dir: 'up' | 'down') => {
    const idx = slots.findIndex(s => s.key === key);
    if (idx < 0) return;
    const next = [...slots];
    const swap = dir === 'up' ? idx - 1 : idx + 1;
    if (swap < 0 || swap >= next.length) return;
    [next[idx], next[swap]] = [next[swap], next[idx]];
    onChange({ ...schedule, slots: next });
  };

  const deleteSlot = (key: string) =>
    onChange({ ...schedule, slots: slots.filter(s => s.key !== key) });

  const addPeriod = () => {
    const last = slots[slots.length - 1];
    const start = last?.endTime ?? '07:30';
    onChange({
      ...schedule,
      slots: [...slots, {
        key: `p_${Date.now()}`, type: 'period', label: '',
        startTime: start, endTime: addMinutes(start, 40),
      }],
    });
  };

  const addBreak = () => {
    const last = slots[slots.length - 1];
    const start = last?.endTime ?? '10:00';
    onChange({
      ...schedule,
      slots: [...slots, {
        key: `brk_${Date.now()}`, type: 'break',
        label: lbl('Break', 'Pause'),
        startTime: start, endTime: addMinutes(start, 20),
      }],
    });
  };

  const periodCount = slots.filter(s => s.type === 'period').length;
  const breakCount  = slots.filter(s => s.type === 'break').length;

  return (
    <div className="bg-white rounded-xl border border-indigo-200 p-5 shadow-sm">
      {/* Panel header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center">
            <Settings2 size={14} className="text-indigo-600" />
          </div>
          <h3 className="font-semibold text-slate-800">
            {lbl('Configure Schedule', 'Configurer le planning')}
          </h3>
        </div>
        <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded-lg">
          {periodCount} {lbl('periods', 'séances')} · {breakCount} {lbl('breaks', 'pauses')}
        </span>
      </div>

      {/* Saturday toggle */}
      <label className={`flex items-center gap-3 cursor-pointer p-3 rounded-xl border mb-4 transition-colors ${
        includeSaturday
          ? 'bg-indigo-50 border-indigo-200'
          : 'bg-slate-50 border-slate-100 hover:bg-slate-100'
      }`}>
        <div className={`w-11 h-6 rounded-full relative transition-colors ${includeSaturday ? 'bg-indigo-600' : 'bg-slate-300'}`}>
          <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${includeSaturday ? 'translate-x-5' : 'translate-x-0.5'}`} />
          <input
            type="checkbox"
            checked={includeSaturday}
            onChange={e => onChange({ ...schedule, includeSaturday: e.target.checked })}
            className="sr-only"
          />
        </div>
        <div>
          <p className="text-sm font-medium text-slate-700">
            {lbl('Include Saturday classes', 'Inclure les cours du samedi')}
          </p>
          <p className="text-xs text-slate-400">
            {lbl('Adds a Saturday column to the timetable', "Ajoute une colonne samedi à l'emploi du temps")}
          </p>
        </div>
      </label>

      {/* Slot list */}
      <div className="space-y-1.5 mb-4">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide px-1 mb-2">
          {lbl('Schedule slots — drag to reorder', 'Séances — déplacer pour réorganiser')}
        </p>

        {slots.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-6">
            {lbl('No slots yet. Add a period to start.', 'Aucune séance. Ajoutez une séance pour commencer.')}
          </p>
        )}

        {slots.map((slot, idx) => {
          const n = slot.type === 'period' ? periodNum(slot.key) : 0;
          const dur = minutesBetween(slot.startTime, slot.endTime);
          return (
            <div
              key={slot.key}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-colors ${
                slot.type === 'break'
                  ? 'bg-amber-50 border-amber-100'
                  : 'bg-slate-50 border-slate-100'
              }`}
            >
              {/* Up / Down */}
              <div className="flex flex-col shrink-0">
                <button
                  onClick={() => moveSlot(slot.key, 'up')}
                  disabled={idx === 0}
                  className="p-0.5 rounded hover:bg-slate-200 disabled:opacity-20 transition-colors"
                >
                  <ChevronUp size={13} className="text-slate-500" />
                </button>
                <button
                  onClick={() => moveSlot(slot.key, 'down')}
                  disabled={idx === slots.length - 1}
                  className="p-0.5 rounded hover:bg-slate-200 disabled:opacity-20 transition-colors"
                >
                  <ChevronDown size={13} className="text-slate-500" />
                </button>
              </div>

              {/* Type badge / break label input */}
              {slot.type === 'period' ? (
                <span className="w-9 shrink-0 text-center text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-lg py-1">
                  P{n}
                </span>
              ) : (
                <input
                  value={slot.label}
                  onChange={e => updateSlot(slot.key, 'label', e.target.value)}
                  className="w-20 shrink-0 text-xs font-medium text-amber-700 bg-amber-100 border border-amber-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-amber-400"
                />
              )}

              {/* Start time */}
              <input
                type="time"
                value={slot.startTime}
                onChange={e => updateSlot(slot.key, 'startTime', e.target.value)}
                className="w-28 text-sm border border-slate-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <span className="text-slate-300 shrink-0">→</span>
              {/* End time */}
              <input
                type="time"
                value={slot.endTime}
                onChange={e => updateSlot(slot.key, 'endTime', e.target.value)}
                className="w-28 text-sm border border-slate-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />

              {/* Duration */}
              {dur > 0 && (
                <span className="text-xs text-slate-400 hidden sm:block shrink-0">
                  {dur} min
                </span>
              )}

              {/* Delete */}
              <button
                onClick={() => deleteSlot(slot.key)}
                className="ml-auto p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
              >
                <X size={13} />
              </button>
            </div>
          );
        })}
      </div>

      {/* Add buttons */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={addPeriod}
          className="flex items-center gap-1.5 px-3 py-2 text-sm text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg font-medium transition-colors"
        >
          <Plus size={14} /> {lbl('Add Period', 'Ajouter une séance')}
        </button>
        <button
          onClick={addBreak}
          className="flex items-center gap-1.5 px-3 py-2 text-sm text-amber-600 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg font-medium transition-colors"
        >
          <Coffee size={14} /> {lbl('Add Break', 'Ajouter une pause')}
        </button>
      </div>
    </div>
  );
}

// ── Cell Editor Modal ─────────────────────────────────────────────
function CellEditorModal({
  editing, current, classRoom, subjects, teachers, onApply, onClear, onClose,
}: {
  editing: Editing;
  current: Cell | null;
  classRoom: string;
  subjects: Subject[];
  teachers: Teacher[];
  onApply: (cell: Cell) => void;
  onClear: () => void;
  onClose: () => void;
}) {
  const { t } = useLanguage();
  const [subject,    setSubject]    = useState(current?.subject     ?? '');
  const [teacherId,  setTeacherId]  = useState(current?.teacherId   ?? '');
  const [room,       setRoom]       = useState(current?.room        ?? classRoom);

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center">
              <Pencil size={13} className="text-indigo-600" />
            </div>
            <div>
              <p className="font-semibold text-slate-800 text-sm">{t.timetable.editPeriod}</p>
              <p className="text-slate-400 text-xs">{editing.dayLabel} · {editing.periodLabel}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
            <X size={16} className="text-slate-500" />
          </button>
        </div>
        {/* Form */}
        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              {t.common.subject}<span className="text-red-500 ml-0.5">*</span>
            </label>
            <select value={subject} onChange={e => setSubject(e.target.value)}
              className="w-full py-2.5 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
              <option value="">— {t.timetable.selectSubject} —</option>
              {subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
            </select>
            {subject && (
              <div className={`mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${cellColor(subject)}`}>
                {subject}
              </div>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">{t.timetable.selectTeacher}</label>
            <select value={teacherId} onChange={e => setTeacherId(e.target.value)}
              className="w-full py-2.5 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
              <option value="">— {t.teachers.none} —</option>
              {teachers.filter(tc => tc.isActive).map(tc => (
                <option key={tc.id} value={tc.id}>
                  {tc.firstName} {tc.lastName} ({tc.subjects.join(', ')})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">{t.classes.room}</label>
            <input value={room} onChange={e => setRoom(e.target.value)} placeholder="e.g. Room 3"
              className="w-full py-2.5 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
        </div>
        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-200">
          <button onClick={onClear} className="flex items-center gap-1.5 px-3 py-2 text-sm text-red-500 hover:bg-red-50 rounded-lg font-medium transition-colors">
            <X size={14} /> {t.timetable.clearPeriod}
          </button>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-3 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
              {t.common.cancel}
            </button>
            <button
              onClick={() => {
                if (!subject) return;
                const tc = teachers.find(t => t.id === teacherId);
                onApply({
                  subject,
                  teacherName: tc ? `${tc.firstName} ${tc.lastName}` : '',
                  teacherId: teacherId || undefined,
                  room,
                });
              }}
              disabled={!subject}
              className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-lg font-medium transition-colors"
            >
              {t.timetable.apply}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────
export default function Timetable() {
  const { t, lang } = useLanguage();
  const lbl = (en: string, fr: string) => lang === 'fr' ? fr : en;

  const [classes,  setClasses]  = useState<Class[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);

  const [schedule, setScheduleRaw] = useState<ScheduleConfig>(loadSchedule);
  const [allGrids, setAllGrids]    = useState<AllGrids>({});
  const [classId,  setClassId]     = useState('');
  const [editing,  setEditing]     = useState<Editing | null>(null);
  const [saved,    setSaved]       = useState(false);
  const [configOpen, setConfigOpen] = useState(false);

  // Track the raw API slots so we can diff on save
  const apiSlotsRef = useRef<ScheduleEntry[]>([]);

  useEffect(() => {
    Promise.all([
      api.getClasses(),
      api.getTeachers({ isActive: 'true' }),
      api.getSubjects(),
      api.getTimetable(),
    ])
      .then(([cls, tcs, subs, slots]) => {
        const mappedCls = cls.map(mapClass);
        const mappedTcs = tcs.map(mapTeacher);
        setClasses(mappedCls);
        setTeachers(mappedTcs);
        setSubjects(subs);
        apiSlotsRef.current = slots;
        if (mappedCls.length > 0) {
          setClassId(mappedCls[0].id);
          const cfg = loadSchedule();
          setAllGrids(buildGridFromApiSlots(slots, cfg, mappedCls));
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const activeDays    = getActiveDays(schedule);
  const teachingSlots = getTeachingSlots(schedule.slots);

  const cls  = classes.find(c => c.id === classId);
  const grid = allGrids[classId] ?? {};

  // Day display labels
  const DAY_LABELS: Record<string, string> = {
    monday:    t.common.monday,
    tuesday:   t.common.tuesday,
    wednesday: t.common.wednesday,
    thursday:  t.common.thursday,
    friday:    t.common.friday,
    saturday:  t.common.saturday,
  };

  // Period display label ("Period 1", "P1", etc.)
  const slotPeriodNum = useCallback((key: string) => {
    let n = 0;
    for (const s of schedule.slots) {
      if (s.type === 'period') n++;
      if (s.key === key) return n;
    }
    return 0;
  }, [schedule.slots]);

  const getPeriodLabel = useCallback((key: string) => {
    const n = slotPeriodNum(key);
    return `${t.timetable.period} ${n}`;
  }, [slotPeriodNum, t.timetable.period]);

  // Handle schedule config changes — save + reconcile grids
  const handleScheduleChange = useCallback((next: ScheduleConfig) => {
    saveScheduleToDisk(next);
    setScheduleRaw(next);
    setAllGrids(prev => reconcileGrids(prev, next, classes));
  }, [classes]);

  const handleCellClick = (day: string, periodKey: string) => {
    setEditing({
      day, dayLabel: DAY_LABELS[day],
      periodKey, periodLabel: getPeriodLabel(periodKey),
      classId,
    });
    setSaved(false);
  };

  const applyEdit = (cell: Cell) => {
    if (!editing) return;
    setAllGrids(prev => ({
      ...prev,
      [editing.classId]: {
        ...prev[editing.classId],
        [editing.day]: { ...prev[editing.classId][editing.day], [editing.periodKey]: cell },
      },
    }));
    setEditing(null);
  };

  const clearCell = () => {
    if (!editing) return;
    setAllGrids(prev => ({
      ...prev,
      [editing.classId]: {
        ...prev[editing.classId],
        [editing.day]: { ...prev[editing.classId][editing.day], [editing.periodKey]: null },
      },
    }));
    setEditing(null);
  };

  const handleReset = () => {
    const emptyDay: DayGrid = {};
    teachingSlots.forEach(s => { emptyDay[s.key] = null; });
    const emptyClassGrid: ClassGrid = {};
    activeDays.forEach(day => { emptyClassGrid[day] = { ...emptyDay }; });
    setAllGrids(prev => ({ ...prev, [classId]: emptyClassGrid }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const cfg = schedule;
      const cls = classes.find(c => c.id === classId);
      if (!cls) return;

      const days    = getActiveDays(cfg);
      const periods = getTeachingSlots(cfg.slots);

      // Build a flat list of desired slots for the current class
      const desired: { day: string; periodKey: string; cell: Cell; slot: ScheduleSlot }[] = [];
      days.forEach(day => {
        periods.forEach(slot => {
          const cell = allGrids[classId]?.[day]?.[slot.key];
          if (cell?.subject) desired.push({ day, periodKey: slot.key, cell, slot });
        });
      });

      // Delete existing API slots for this class
      const existingForClass = apiSlotsRef.current.filter(s => s.class_id === classId);
      await Promise.all(existingForClass.map(s => api.deleteSlot(s.id).catch(() => {})));

      // Create new slots
      // Backend route destructures: { teacherId, day, periodKey, periodLabel, time, classId, className, subjectName, room }
      // We cast to any because ScheduleEntry uses snake_case but the POST body uses camelCase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const createBody = (day: string, periodKey: string, cell: Cell, slot: ScheduleSlot): any => ({
        teacherId:   cell.teacherId ?? null,
        day,
        periodKey,
        periodLabel: getPeriodLabel(periodKey),
        time:        `${slot.startTime} – ${slot.endTime}`,
        classId,
        className:   cls.name,
        subjectName: cell.subject,
        room:        cell.room,
      });
      const newSlots = await Promise.all(desired.map(({ day, periodKey, cell, slot }) =>
        api.createSlot(createBody(day, periodKey, cell, slot))
      ));

      // Update our apiSlotsRef to reflect the new state
      apiSlotsRef.current = [
        ...apiSlotsRef.current.filter(s => s.class_id !== classId),
        ...newSlots,
      ];

      // Also update the grid's apiId fields so future edits track correctly
      setAllGrids(prev => {
        const next = { ...prev, [classId]: JSON.parse(JSON.stringify(prev[classId] ?? {})) };
        newSlots.forEach(s => {
          if (next[classId]?.[s.day]?.[s.period_key]) {
            next[classId][s.day][s.period_key]!.apiId = s.id;
          }
        });
        return next;
      });

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('Failed to save timetable:', err);
    }
    setSaving(false);
  };

  // Stats
  const totalCells  = activeDays.length * teachingSlots.length;
  const filledCells = activeDays.reduce((n, day) =>
    n + teachingSlots.filter(s => grid[day]?.[s.key] != null).length, 0);

  const termLabel = lbl('Current Timetable', 'Emploi du temps actuel');

  // ── PDF export ────────────────────────────────────────────────
  const handleDownload = () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    doc.setFillColor(49, 46, 129);
    doc.rect(0, 0, 297, 22, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`${t.timetable.weeklyTimetable} — ${cls?.name ?? ''}`, 10, 9);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(termLabel, 10, 16);
    doc.text(`${filledCells}/${totalCells} ${lbl('periods filled', 'séances remplies')}`, 287, 16, { align: 'right' });

    const head = [[t.timetable.period, t.timetable.time, ...activeDays.map(d => DAY_LABELS[d])]];

    const body = schedule.slots.map(slot => {
      if (slot.type === 'break') {
        return [
          { content: slot.label },
          `${slot.startTime} – ${slot.endTime}`,
          ...activeDays.map(() => ({
            content: '—',
            styles: { textColor: [180, 180, 180] as [number, number, number] },
          })),
        ];
      }
      const n = slotPeriodNum(slot.key);
      return [
        `P${n}`,
        `${slot.startTime} – ${slot.endTime}`,
        ...activeDays.map(day => {
          const cell = grid[day]?.[slot.key];
          if (!cell) return { content: '', styles: { textColor: [200, 200, 200] as [number, number, number] } };
          const lines = [cell.subject];
          if (cell.teacherName) lines.push(cell.teacherName);
          if (cell.room)        lines.push(cell.room);
          return { content: lines.join('\n'), styles: { fontStyle: 'normal' as const } };
        }),
      ];
    });

    const SUBJECT_PDF_COLORS: Record<string, [number, number, number]> = {
      'English Language':   [219, 234, 254],
      'Mathematics':        [220, 252, 231],
      'General Science':    [209, 250, 229],
      'Social Studies':     [255, 237, 213],
      'Shona':              [254, 226, 226],
      'Religious & Moral':  [243, 232, 255],
      'Art & Craft':        [252, 231, 243],
      'Physical Education': [204, 251, 241],
    };

    autoTable(doc, {
      head,
      body,
      startY: 26,
      margin: { left: 10, right: 10 },
      styles: {
        fontSize: 7.5,
        cellPadding: { top: 2.5, right: 3, bottom: 2.5, left: 3 },
        valign: 'middle',
        overflow: 'linebreak',
        lineColor: [226, 232, 240],
        lineWidth: 0.3,
      },
      headStyles: {
        fillColor: [79, 70, 229],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center',
        fontSize: 8,
      },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 16, halign: 'center', textColor: [51, 65, 85] },
        1: { cellWidth: 24, halign: 'center', textColor: [100, 116, 139] },
      },
      didParseCell(data) {
        if (data.section !== 'body') return;
        const slot = schedule.slots[data.row.index];
        if (!slot) return;
        if (slot.type === 'break') {
          data.cell.styles.fillColor = [248, 250, 252];
          data.cell.styles.textColor = [148, 163, 184];
          data.cell.styles.fontStyle = 'italic';
        } else if (data.column.index >= 2) {
          const day = activeDays[data.column.index - 2];
          const cell = grid[day]?.[slot.key];
          if (cell?.subject) {
            data.cell.styles.fillColor = SUBJECT_PDF_COLORS[cell.subject] ?? [241, 245, 249];
            data.cell.styles.textColor = [30, 41, 59];
            data.cell.styles.fontStyle = 'bold';
          }
        }
      },
    });

    const pageH = doc.internal.pageSize.getHeight();
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.setFont('helvetica', 'normal');
    doc.text(new Date().toLocaleDateString('en-GB'), 10, pageH - 5);
    if (cls?.classTeacherName) {
      doc.text(`${lbl('Class teacher', 'Prof. principal')}: ${cls.classTeacherName}`, 287, pageH - 5, { align: 'right' });
    }
    doc.save(`${(cls?.name ?? 'timetable').replace(/\s+/g, '-')}-timetable.pdf`);
  };

  // ── Render ────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (classes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
          <Calendar size={28} className="text-slate-400" />
        </div>
        <h3 className="text-slate-700 font-semibold text-lg mb-1">No classes yet</h3>
        <p className="text-slate-400 text-sm max-w-xs">Add classes first before building the timetable.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">

      {/* ── Top bar ────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={classId}
            onChange={e => { setClassId(e.target.value); setSaved(false); }}
            className="py-2 px-3 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <span className="text-slate-500 text-sm">{termLabel}</span>
          <span className="text-slate-400 text-xs bg-slate-100 px-2 py-1 rounded-lg">
            {filledCells}/{totalCells} {lbl('periods filled', 'séances remplies')}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Configure toggle */}
          <button
            onClick={() => setConfigOpen(o => !o)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
              configOpen
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Settings2 size={13} />
            {lbl('Configure', 'Configurer')}
            {configOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>

          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-500 border border-slate-200 bg-white rounded-lg hover:bg-slate-50 transition-colors"
          >
            <Download size={13} /> {t.timetable.downloadTimetable}
          </button>
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-500 border border-slate-200 bg-white rounded-lg hover:bg-slate-50 transition-colors"
          >
            <RotateCcw size={13} /> {t.timetable.resetAll}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all disabled:opacity-70 ${
              saved ? 'bg-green-500 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'
            }`}
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : saved ? <CheckCircle size={14} /> : <Save size={14} />}
            {saving ? lbl('Saving…', 'Enregistrement…') : saved ? t.timetable.timetableSaved : t.timetable.saveTimetable}
          </button>
        </div>
      </div>

      {/* ── Schedule config panel (collapsible) ─────────────────── */}
      {configOpen && (
        <ScheduleConfigPanel schedule={schedule} onChange={handleScheduleChange} />
      )}

      {/* ── Subject legend ──────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-xs text-slate-400">{lbl('Subjects:', 'Matières :')}</span>
        {subjects.map(s => (
          <span key={s.id} className={`text-xs px-2 py-0.5 rounded border font-medium ${cellColor(s.name)}`}>
            {s.name}
          </span>
        ))}
      </div>

      {/* ── Empty schedule warning ──────────────────────────────── */}
      {teachingSlots.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700 flex items-center gap-2">
          <Settings2 size={15} />
          {lbl(
            'No periods configured. Open "Configure" above to add periods.',
            'Aucune séance configurée. Ouvrez "Configurer" ci-dessus pour ajouter des séances.',
          )}
        </div>
      )}

      {/* ── Timetable grid ──────────────────────────────────────── */}
      {teachingSlots.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
            <h3 className="font-semibold text-slate-800">
              {t.timetable.weeklyTimetable} — {cls?.name}
            </h3>
            <p className="text-xs text-slate-400">
              {lbl('Click any cell to edit', 'Cliquer sur une cellule pour modifier')}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-800 text-white">
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide w-20">
                    {t.timetable.period}
                  </th>
                  <th className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wide w-28 text-slate-400">
                    {t.timetable.time}
                  </th>
                  {activeDays.map(day => (
                    <th key={day} className={`text-center px-2 py-3 text-xs font-semibold uppercase tracking-wide ${
                      day === 'saturday' ? 'text-indigo-300' : ''
                    }`}>
                      {DAY_LABELS[day]}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {schedule.slots.map((slot, rowIdx) => {
                  // ── Break row ──────────────────────────────────
                  if (slot.type === 'break') {
                    return (
                      <tr key={slot.key} className="bg-slate-50">
                        <td className="px-4 py-2 text-xs text-slate-400 italic font-medium">
                          {slot.label}
                        </td>
                        <td className="px-3 py-2 text-xs text-slate-300 whitespace-nowrap">
                          {slot.startTime} – {slot.endTime}
                        </td>
                        {activeDays.map(day => (
                          <td key={day} className="px-2 py-2 text-center">
                            <span className="text-slate-200 text-xs">—</span>
                          </td>
                        ))}
                      </tr>
                    );
                  }

                  // ── Period row ─────────────────────────────────
                  const n = slotPeriodNum(slot.key);
                  return (
                    <tr key={slot.key} className={rowIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}>
                      <td className="px-4 py-2 font-semibold text-slate-600 text-sm">
                        P{n}
                      </td>
                      <td className="px-3 py-2 text-slate-400 text-xs whitespace-nowrap">
                        {slot.startTime} – {slot.endTime}
                      </td>

                      {activeDays.map(day => {
                        const cell = grid[day]?.[slot.key] ?? null;
                        return (
                          <td key={day} className="px-2 py-2">
                            <button
                              onClick={() => handleCellClick(day, slot.key)}
                              className="w-full min-h-13 rounded-xl border transition-all group relative"
                              style={{ padding: '6px 8px' }}
                              title={lbl('Click to edit', 'Cliquer pour modifier')}
                            >
                              {cell ? (
                                <div className={`rounded-lg px-2 py-1.5 border ${cellColor(cell.subject)} h-full`}>
                                  <p className="text-xs font-semibold leading-tight truncate">
                                    {cell.subject}
                                  </p>
                                  {cell.teacherName && (
                                    <p className="text-[10px] opacity-65 leading-tight mt-0.5 truncate">
                                      {cell.teacherName.split(' ').pop()}
                                    </p>
                                  )}
                                  {cell.room && (
                                    <p className="text-[10px] opacity-50 leading-tight">{cell.room}</p>
                                  )}
                                  <div className="absolute inset-0 rounded-xl bg-black/0 group-hover:bg-black/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                                    <div className="bg-white rounded-full p-1 shadow-md">
                                      <Pencil size={10} className="text-slate-600" />
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="rounded-xl border-2 border-dashed border-slate-200 group-hover:border-indigo-300 group-hover:bg-indigo-50/50 transition-colors h-full flex items-center justify-center min-h-11">
                                  <Plus size={14} className="text-slate-300 group-hover:text-indigo-400 transition-colors" />
                                </div>
                              )}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Cell editor modal ───────────────────────────────────── */}
      {editing && (
        <CellEditorModal
          editing={editing}
          current={grid[editing.day]?.[editing.periodKey] ?? null}
          classRoom={cls?.room ?? ''}
          subjects={subjects}
          teachers={teachers}
          onApply={applyEdit}
          onClear={clearCell}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
