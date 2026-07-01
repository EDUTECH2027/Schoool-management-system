import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, UserRound, Users, FileText, ClipboardCheck,
  Calendar, MessageSquare, BadgeDollarSign, GraduationCap,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useLanguage } from '../../i18n/LanguageContext';
import { useBranding } from '../../context/BrandingContext';

const ACCENT = 'bg-indigo-600';

export default function TeacherSidebar() {
  const { t } = useLanguage();
  const { logoUrl, schoolName, schoolSub } = useBranding();

  const nav = [
    { label: t.nav.dashboard,          to: '/teacher/dashboard',     icon: LayoutDashboard  },
    { label: t.portal.myProfile,        to: '/teacher/profile',       icon: UserRound        },
    { label: t.portal.myClass,          to: '/teacher/my-class',      icon: Users            },
    { label: t.portal.markEntry,        to: '/teacher/marks',         icon: FileText         },
    { label: t.portal.studentBehavior,  to: '/teacher/behavior',      icon: MessageSquare    },
    { label: t.nav.attendance,          to: '/teacher/attendance',    icon: ClipboardCheck   },
    { label: t.portal.myAttendance,     to: '/teacher/my-attendance', icon: ClipboardCheck   },
    { label: t.nav.timetable,           to: '/teacher/timetable',     icon: Calendar         },
    { label: t.portal.salary,           to: '/teacher/salary',        icon: BadgeDollarSign  },
  ];

  return (
    <aside className="w-64 bg-slate-900 flex flex-col h-screen shrink-0">
      <div className="px-6 py-5 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center overflow-hidden shrink-0">
            {logoUrl
              ? <img src={logoUrl} alt="logo" className="w-full h-full object-contain p-0.5" />
              : <GraduationCap size={20} className="text-white" />
            }
          </div>
          <div className="min-w-0">
            <p className="text-white font-semibold text-sm leading-tight truncate">{schoolName}</p>
            <p className="text-slate-400 text-xs truncate">{schoolSub}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="text-slate-500 text-[10px] font-semibold uppercase tracking-widest px-3 mb-2">
          {t.nav.mainMenu}
        </p>
        {nav.map(({ label, to, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive ? `${ACCENT} text-white` : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              )
            }
          >
            <Icon size={17} />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
