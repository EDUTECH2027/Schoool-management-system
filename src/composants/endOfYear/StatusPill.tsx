/*
 * Copyright (c) 2026 [COMPANY LEGAL NAME]. All rights reserved.
 * Proprietary and confidential. Unauthorized copying, distribution or
 * modification of this file, via any medium, is strictly prohibited.
 */
import Badge from '../ui/Badge';
import { useLanguage } from '../../i18n/LanguageContext';
import type { YearEndStatus } from '../../api/client';

const LABELS: Record<YearEndStatus, { en: string; fr: string; variant: 'green' | 'orange' | 'yellow' | 'gray' | 'purple' | 'blue' }> = {
  promoted:       { en: 'Promoted',       fr: 'Admis',           variant: 'green'  },
  repeating:      { en: 'Repeating',      fr: 'Redoublant',      variant: 'orange' },
  pending_review: { en: 'Pending review', fr: 'À examiner',      variant: 'yellow' },
  withdrawn:      { en: 'Withdrawn',      fr: 'Retiré',          variant: 'gray'   },
  transferred:    { en: 'Transferred',    fr: 'Transféré',       variant: 'purple' },
  graduated:      { en: 'Graduated',      fr: 'Diplômé',         variant: 'blue'   },
};

export function statusLabel(status: YearEndStatus, lang: string): string {
  const l = LABELS[status];
  return lang === 'fr' ? l.fr : l.en;
}

/** `proposed` renders a lighter "suggested" marker for statuses the administrator hasn't validated yet. */
export default function StatusPill({ status, proposed = false }: { status: YearEndStatus; proposed?: boolean }) {
  const { lang } = useLanguage();
  const l = LABELS[status];
  return <Badge label={(proposed ? '~ ' : '') + (lang === 'fr' ? l.fr : l.en)} variant={proposed ? 'gray' : l.variant} />;
}
