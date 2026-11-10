/*
 * Copyright (c) 2026 [COMPANY LEGAL NAME]. All rights reserved.
 * Proprietary and confidential. Unauthorized copying, distribution or
 * modification of this file, via any medium, is strictly prohibited.
 */
import { Home, UserRound, Users, ClipboardList } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import BottomNav from './BottomNav';

export default function TeacherBottomNav({ onMore }: { onMore: () => void }) {
  const fr = useLanguage().lang === 'fr';
  return (
    <BottomNav onMore={onMore} tabs={[
      { label: fr ? 'Accueil' : 'Home',    to: '/teacher/dashboard', icon: Home },
      { label: fr ? 'Profil' : 'Profile',  to: '/teacher/profile',   icon: UserRound },
      { label: fr ? 'Classes' : 'Classes', to: '/teacher/my-class',  icon: Users },
      { label: fr ? 'Notes' : 'Marks',     to: '/teacher/marks',     icon: ClipboardList },
    ]} />
  );
}
