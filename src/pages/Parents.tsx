import { useState, useEffect, useMemo } from 'react';
import { Search, Phone, Users, AlertTriangle, CheckCircle2, UserCheck, Clock } from 'lucide-react';
import type { GuardianRel, Student, FeeRecord } from '../types';
import { useLanguage } from '../i18n/LanguageContext';
import { api } from '../api/client';
import { mapStudent, mapFeeRecord } from '../api/mappers';

// ── Derived types ─────────────────────────────────────────────────
type FeeStatus = 'paid' | 'partial' | 'overdue' | 'pending' | 'mixed';

type ChildEntry = {
  studentId: string;
  name:      string;
  className: string;
};

type GuardianRow = {
  key:          string;
  name:         string;
  phone:        string;
  relationship: GuardianRel;
  children:     ChildEntry[];
  feeStatus:    FeeStatus;
};

// ── Derive unique guardians from student + fee records ───────────
function deriveGuardians(students: Student[], feeRecords: FeeRecord[]): GuardianRow[] {
  const map = new Map<string, GuardianRow>();

  students.filter(s => s.isActive).forEach(s => {
    if (!s.guardianName || !s.guardianPhone) return;
    const key = `${s.guardianName}__${s.guardianPhone}`;
    if (!map.has(key)) {
      map.set(key, {
        key,
        name:         s.guardianName,
        phone:        s.guardianPhone,
        relationship: s.guardianRelationship,
        children:     [],
        feeStatus:    'pending',
      });
    }
    map.get(key)!.children.push({
      studentId: s.id,
      name:      `${s.firstName} ${s.lastName}`,
      className: s.className,
    });
  });

  map.forEach(guardian => {
    const statuses = guardian.children.map(child => {
      const rec = feeRecords.find(f => f.studentId === child.studentId);
      return rec?.status ?? 'pending';
    });
    const hasOverdue = statuses.some(s => s === 'overdue');
    const hasPartial = statuses.some(s => s === 'partial');
    const allPaid    = statuses.every(s => s === 'paid');
    const unique     = new Set(statuses).size;

    if (hasOverdue)      guardian.feeStatus = 'overdue';
    else if (hasPartial) guardian.feeStatus = 'partial';
    else if (allPaid)    guardian.feeStatus = 'paid';
    else if (unique > 1) guardian.feeStatus = 'mixed';
    else                 guardian.feeStatus = 'pending';
  });

  return Array.from(map.values());
}

// ── Component ─────────────────────────────────────────────────────
export default function Parents() {
  const { t, lang } = useLanguage();
  const lbl = (en: string, fr: string) => lang === 'fr' ? fr : en;

  const [students,  setStudents]  = useState<Student[]>([]);
  const [fees,      setFees]      = useState<FeeRecord[]>([]);
  const [loading,   setLoading]   = useState(true);

  const [search,       setSearch]       = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [multiOnly,    setMultiOnly]    = useState(false);

  useEffect(() => {
    Promise.all([api.getStudents(), api.getFees()])
      .then(([sts, frs]) => {
        setStudents(sts.map(mapStudent));
        setFees(frs.map(mapFeeRecord));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const ALL_GUARDIANS = useMemo(() => deriveGuardians(students, fees), [students, fees]);

  // Stats
  const totalFamilies = ALL_GUARDIANS.length;
  const overdueCount  = ALL_GUARDIANS.filter(g => g.feeStatus === 'overdue').length;
  const paidCount     = ALL_GUARDIANS.filter(g => g.feeStatus === 'paid').length;
  const multiChildren = ALL_GUARDIANS.filter(g => g.children.length > 1).length;

  // Card click → toggle filter; clicking the active card resets it
  const handleCardClick = (type: 'all' | 'overdue' | 'paid' | 'multi') => {
    if (type === 'all') {
      setFilterStatus('all');
      setMultiOnly(false);
    } else if (type === 'multi') {
      const next = !multiOnly;
      setMultiOnly(next);
      if (next) setFilterStatus('all');
    } else {
      setMultiOnly(false);
      setFilterStatus(prev => (prev === type ? 'all' : type));
    }
  };

  const isCardActive = (type: 'all' | 'overdue' | 'paid' | 'multi') => {
    if (type === 'all')     return filterStatus === 'all' && !multiOnly;
    if (type === 'multi')   return multiOnly;
    return filterStatus === type && !multiOnly;
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return ALL_GUARDIANS.filter(g => {
      const matchSearch =
        !q ||
        g.name.toLowerCase().includes(q) ||
        g.phone.includes(q) ||
        g.children.some(
          c => c.name.toLowerCase().includes(q) || c.className.toLowerCase().includes(q)
        );
      const matchFee   = filterStatus === 'all' || g.feeStatus === filterStatus;
      const matchMulti = !multiOnly || g.children.length > 1;
      return matchSearch && matchFee && matchMulti;
    });
  }, [ALL_GUARDIANS, search, filterStatus, multiOnly]);

  const relLabel = (rel: GuardianRel): string => {
    const map: Record<GuardianRel, [string, string]> = {
      mother:      ['Mother',      'Mère'],
      father:      ['Father',      'Père'],
      guardian:    ['Guardian',    'Tuteur'],
      grandparent: ['Grandparent', 'Grand-parent'],
      sibling:     ['Sibling',     'Frère / Sœur'],
      other:       ['Other',       'Autre'],
    };
    return lbl(map[rel][0], map[rel][1]);
  };

  const feeChip = (status: FeeStatus) => {
    const cfg: Record<FeeStatus, { label: string; cls: string }> = {
      paid:    { label: t.common.paid,             cls: 'bg-green-100  text-green-700'  },
      partial: { label: t.common.partial,           cls: 'bg-amber-100  text-amber-700'  },
      overdue: { label: t.common.overdue,           cls: 'bg-red-100    text-red-700'    },
      pending: { label: t.common.pending,           cls: 'bg-slate-100  text-slate-600'  },
      mixed:   { label: lbl('Mixed', 'Mixte'),      cls: 'bg-purple-100 text-purple-700' },
    };
    const { label, cls } = cfg[status];
    return (
      <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${cls}`}>
        {label}
      </span>
    );
  };

  const initials = (name: string) =>
    name.split(' ').map(n => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();

  // KPI card definitions
  const kpiCards: {
    type:     'all' | 'overdue' | 'paid' | 'multi';
    label:    string;
    value:    number;
    sub:      string;
    icon:     React.ElementType;
    gradient: string;
    ring:     string;
    glow:     string;
  }[] = [
    {
      type:     'all',
      label:    lbl('Total Families', 'Total Familles'),
      value:    totalFamilies,
      sub:      lbl('unique guardians', 'tuteurs uniques'),
      icon:     Users,
      gradient: 'from-indigo-500 to-indigo-600',
      ring:     'ring-indigo-300',
      glow:     'hover:shadow-indigo-200',
    },
    {
      type:     'overdue',
      label:    lbl('Overdue Fees', 'Frais Échus'),
      value:    overdueCount,
      sub:      lbl('need follow-up', 'à relancer'),
      icon:     AlertTriangle,
      gradient: 'from-red-500 to-rose-500',
      ring:     'ring-red-300',
      glow:     'hover:shadow-red-200',
    },
    {
      type:     'paid',
      label:    lbl('Fully Paid', 'Entièrement Payé'),
      value:    paidCount,
      sub:      lbl('fees settled', 'frais réglés'),
      icon:     CheckCircle2,
      gradient: 'from-emerald-500 to-green-500',
      ring:     'ring-emerald-300',
      glow:     'hover:shadow-emerald-200',
    },
    {
      type:     'multi',
      label:    lbl('Multiple Children', 'Plusieurs Enfants'),
      value:    multiChildren,
      sub:      lbl('families, 2+ children', 'familles, 2+ enfants'),
      icon:     UserCheck,
      gradient: 'from-purple-500 to-violet-500',
      ring:     'ring-purple-300',
      glow:     'hover:shadow-purple-200',
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* ── KPI cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {kpiCards.map(({ type, label, value, sub, icon: Icon, gradient, ring, glow }) => {
          const active = isCardActive(type);
          return (
            <button
              key={type}
              onClick={() => handleCardClick(type)}
              className={[
                'relative overflow-hidden rounded-xl p-5 text-left',
                'bg-linear-to-br', gradient,
                'text-white cursor-pointer select-none',
                'transition-all duration-200',
                'hover:-translate-y-1.5 hover:shadow-xl', glow,
                active ? `ring-4 ${ring} scale-[1.03] shadow-xl` : 'shadow-md',
              ].join(' ')}
            >
              {/* Decorative blob */}
              <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-white/10 pointer-events-none" />
              <div className="absolute -right-2 -bottom-6 w-16 h-16 rounded-full bg-white/10 pointer-events-none" />

              {/* Icon */}
              <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center mb-3">
                <Icon size={18} className="text-white" />
              </div>

              {/* Value */}
              <p className="text-3xl font-bold leading-none mb-1">{value}</p>

              {/* Label */}
              <p className="text-sm font-semibold text-white/90 leading-tight">{label}</p>
              <p className="text-xs text-white/60 mt-0.5">{sub}</p>

              {/* Active indicator */}
              {active && (
                <div className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-white shadow-sm" />
              )}
            </button>
          );
        })}
      </div>

      {/* ── Directory table ───────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200">

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 border-b border-slate-100">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={lbl('Search by parent name or student…', 'Rechercher par nom ou élève…')}
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <select
            value={filterStatus}
            onChange={e => { setFilterStatus(e.target.value); setMultiOnly(false); }}
            className="py-2 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            <option value="all">{lbl('All Fee Statuses', 'Tous les statuts')}</option>
            <option value="paid">{t.common.paid}</option>
            <option value="partial">{t.common.partial}</option>
            <option value="overdue">{t.common.overdue}</option>
            <option value="pending">{t.common.pending}</option>
          </select>

          <span className="text-sm text-slate-500 shrink-0">
            {filtered.length} {lbl('families', 'familles')}
          </span>
        </div>

        {/* Active filter pills */}
        {(filterStatus !== 'all' || multiOnly) && (
          <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-100 bg-slate-50">
            <span className="text-xs text-slate-400">{lbl('Active filters:', 'Filtres actifs :')}</span>
            {filterStatus !== 'all' && (
              <button
                onClick={() => setFilterStatus('all')}
                className="flex items-center gap-1 text-xs bg-indigo-100 text-indigo-700 px-2.5 py-0.5 rounded-full font-medium hover:bg-indigo-200 transition-colors"
              >
                {filterStatus} ×
              </button>
            )}
            {multiOnly && (
              <button
                onClick={() => setMultiOnly(false)}
                className="flex items-center gap-1 text-xs bg-purple-100 text-purple-700 px-2.5 py-0.5 rounded-full font-medium hover:bg-purple-200 transition-colors"
              >
                {lbl('2+ children', '2+ enfants')} ×
              </button>
            )}
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide border-b border-slate-100">
                <th className="text-left px-5 py-3 font-medium w-64">{lbl('Guardian', 'Tuteur')}</th>
                <th className="text-left px-5 py-3 font-medium w-44">{lbl('Contact', 'Contact')}</th>
                <th className="text-left px-5 py-3 font-medium">{lbl('Children Enrolled', 'Enfants inscrits')}</th>
                <th className="text-left px-5 py-3 font-medium w-36">{lbl('Fee Status', 'Statut des frais')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-12 text-center text-slate-400 text-sm">
                    {t.common.noResults}
                  </td>
                </tr>
              ) : (
                filtered.map(g => (
                  <tr key={g.key} className="hover:bg-slate-50 transition-colors">

                    {/* Guardian */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                          <span className="text-indigo-700 font-bold text-xs">{initials(g.name)}</span>
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800 leading-tight">{g.name}</p>
                          <span className="text-xs text-slate-400">{relLabel(g.relationship)}</span>
                        </div>
                      </div>
                    </td>

                    {/* Contact */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <Phone size={13} className="text-slate-400 shrink-0" />
                        <span className="text-sm tabular-nums">{g.phone}</span>
                      </div>
                    </td>

                    {/* Children */}
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-1.5">
                        {g.children.map(c => (
                          <span
                            key={c.studentId}
                            className="inline-flex items-center gap-1 text-xs bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full font-medium"
                          >
                            {c.name}
                            <span className="text-slate-300 mx-0.5">·</span>
                            <span className="text-slate-500">{c.className}</span>
                          </span>
                        ))}
                      </div>
                    </td>

                    {/* Fee status */}
                    <td className="px-5 py-4">
                      {feeChip(g.feeStatus)}
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        {filtered.length > 0 && (
          <div className="px-5 py-3 border-t border-slate-100 flex items-center gap-1.5 text-xs text-slate-400">
            <Clock size={12} />
            {lbl(
              `Showing ${filtered.length} of ${totalFamilies} families`,
              `Affichage de ${filtered.length} sur ${totalFamilies} familles`
            )}
          </div>
        )}
      </div>
    </div>
  );
}
