/*
 * Copyright (c) 2026 [COMPANY LEGAL NAME]. All rights reserved.
 * Proprietary and confidential. Unauthorized copying, distribution or
 * modification of this file, via any medium, is strictly prohibited.
 */
import { Home, Users, BookOpen, FileText } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import BottomNav from './BottomNav';

export default function AdminBottomNav({ onMore }: { onMore: () => void }) {
  const fr = useLanguage().lang === 'fr';
  return (
    <BottomNav onMore={onMore} tabs={[
      { label: fr ? 'Accueil' : 'Home',      to: '/dashboard',   icon: Home },
      { label: fr ? 'Élèves' : 'Students',   to: '/students',    icon: Users },
      { label: fr ? 'Classes' : 'Classes',   to: '/classes',     icon: BookOpen },
      { label: fr ? 'Notes' : 'Assessments', to: '/assessments', icon: FileText },
    ]} />
  );
}
