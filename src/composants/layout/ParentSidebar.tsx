import { NavLink } from 'react-router-dom';
import { LayoutDashboard, UserRound, Users, GraduationCap, LogOut } from 'lucide-react';
import { clsx } from 'clsx';
import { useLanguage } from '../../i18n/LanguageContext';
import { useBranding } from '../../context/BrandingContext';
import { useAuth } from '../../context/AuthContext';

const ACCENT = 'bg-violet-600';

export default function ParentSidebar() {
  const { t, lang } = useLanguage();
  const { logoUrl, schoolName, schoolSub } = useBranding();
  const { logout } = useAuth();

  const nav = [
    { label: t.nav.dashboard,   to: '/parent/dashboard', icon: LayoutDashboard },
    { label: t.portal.myProfile, to: '/parent/profile',   icon: UserRound       },
    { label: t.portal.myChildren,to: '/parent/children',  icon: Users           },
  ];

  return (
    <aside className="w-[86vw] max-w-72 bg-slate-900 flex flex-col h-screen shrink-0 lg:w-64">
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

      <div className="px-3 py-4 border-t border-slate-700">
        <button
          type="button"
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-red-950/40 hover:text-red-400 transition-colors"
        >
          <LogOut size={17} />
          {lang === 'fr' ? 'Se déconnecter' : 'Sign out'}
        </button>
      </div>
    </aside>
  );
}
