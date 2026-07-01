import { clsx } from 'clsx';
import { useLanguage } from '../../i18n/LanguageContext';

type Variant = 'green' | 'red' | 'yellow' | 'blue' | 'purple' | 'gray' | 'orange';

const variants: Record<Variant, string> = {
  green:  'bg-green-100 text-green-700',
  red:    'bg-red-100 text-red-700',
  yellow: 'bg-yellow-100 text-yellow-700',
  blue:   'bg-blue-100 text-blue-700',
  purple: 'bg-purple-100 text-purple-700',
  gray:   'bg-slate-100 text-slate-600',
  orange: 'bg-orange-100 text-orange-700',
};

interface BadgeProps {
  label: string;
  variant?: Variant;
}

export default function Badge({ label, variant = 'gray' }: BadgeProps) {
  return (
    <span className={clsx('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', variants[variant])}>
      {label}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const { t } = useLanguage();
  const map: Record<string, { label: string; variant: Variant }> = {
    present:   { label: t.common.present,   variant: 'green'  },
    absent:    { label: t.common.absent,     variant: 'red'    },
    late:      { label: t.common.late,       variant: 'yellow' },
    excused:   { label: t.common.excused,    variant: 'blue'   },
    paid:      { label: t.common.paid,       variant: 'green'  },
    partial:   { label: t.common.partial,    variant: 'yellow' },
    pending:   { label: t.common.pending,    variant: 'blue'   },
    overdue:   { label: t.common.overdue,    variant: 'red'    },
    waived:    { label: t.common.waived,     variant: 'purple' },
    draft:     { label: t.common.draft,      variant: 'gray'   },
    finalized: { label: t.common.finalized,  variant: 'blue'   },
    published: { label: t.common.published,  variant: 'green'  },
    printed:   { label: t.common.printed,    variant: 'purple' },
  };
  const cfg = map[status] ?? { label: status, variant: 'gray' as Variant };
  return <Badge label={cfg.label} variant={cfg.variant} />;
}
