import { useState, useRef, useEffect } from 'react';
import { Bell, Search, Globe, LogOut, ChevronDown, Sun, Moon, Menu } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

interface HeaderProps {
  onMenuToggle?: () => void;
}

export default function Header({ onMenuToggle }: HeaderProps) {
  const { pathname }         = useLocation();
  const { lang, setLang, t } = useLanguage();
  const { user, logout }     = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const titles: Record<string, string> = {
    '/dashboard':         t.header.dashboard,
    '/students':          t.header.students,
    '/classes':           t.header.classes,
    '/teachers':          t.header.teachers,
    '/attendance':        t.header.attendance,
    '/assessments':       t.header.assessments,
    '/report-cards':      t.header.reportCards,
    '/fees':              t.header.fees,
    '/timetable':         t.header.timetable,
    '/parents':           t.header.parents,
    '/settings':          t.header.settings,
    '/announcements':     t.header.announcements,
    '/email-alerts':      t.header.emailAlerts,
    '/discussion-forums': t.header.discussionForums,
    '/teacher-payment':   t.header.teacherPayment,
    '/platform/dashboard':          'Super Admin Dashboard',
    '/platform/schools':            'Schools',
    '/platform/users':              'Users',
    '/platform/subscriptions':      'Subscriptions',
    '/platform/reports':            'Reports',
    '/platform/system-logs':        'System Logs',
    '/platform/plans-billing':      'Plans & Billing',
    '/platform/features':           'Features',
    '/platform/announcements':      'Announcements',
    '/platform/roles-permissions':  'Roles & Permissions',
    '/platform/settings':           'Platform Settings',
    '/platform/backup-restore':     'Backup & Restore',
  };

  const title = titles[pathname] ?? 'School Management';

  return (
    <header className="min-h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-4 py-3 sm:px-6 shrink-0">
      <div className="flex items-center gap-2 w-full">
        {onMenuToggle && (
          <button
            type="button"
            onClick={onMenuToggle}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 lg:hidden"
            aria-label="Toggle navigation"
          >
            <Menu size={18} />
          </button>
        )}
        <h1 className="truncate text-slate-800 dark:text-slate-100 font-semibold text-base sm:text-lg">{title}</h1>

        <div className="ml-auto flex items-center gap-2 sm:hidden">
          <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center shrink-0">
            <span className="text-white font-semibold text-xs">{user?.initials ?? '??'}</span>
          </div>
          <div className="hidden md:block text-left">
            <p className="text-sm font-medium text-slate-800 dark:text-slate-100 leading-tight">{user?.name ?? ''}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{user?.role ?? ''}</p>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setLang(lang === 'en' ? 'fr' : 'en')}
              className="inline-flex h-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 text-slate-600 px-2 text-xs font-semibold transition hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              title={lang === 'en' ? 'Switch to French' : 'Basculer en anglais'}
            >
              {lang === 'en' ? 'FR' : 'EN'}
            </button>
            <button
              type="button"
              onClick={toggleTheme}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 text-slate-600 transition hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? <Sun size={16} className="text-amber-400" /> : <Moon size={16} className="text-slate-600" />}
            </button>
          </div>
        </div>
      </div>

      <div className="hidden sm:flex flex-wrap items-center justify-end gap-2 sm:gap-3 w-full">
        {/* Search */}
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder={t.header.search}
            className="w-52 pl-9 pr-4 py-1.5 text-sm bg-slate-100 dark:bg-slate-800 dark:text-slate-200 dark:placeholder-slate-500 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        {/* Language switcher */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 gap-0.5">
          <button
            onClick={() => setLang('en')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
              lang === 'en'
                ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-400 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <Globe size={11} /> EN
          </button>
          <button
            onClick={() => setLang('fr')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
              lang === 'fr'
                ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-400 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <Globe size={11} /> FR
          </button>
        </div>

        {/* Dark / light toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark'
            ? <Sun size={18} className="text-amber-400" />
            : <Moon size={18} className="text-slate-600" />
          }
        </button>

        {/* Notifications */}
        <button className="relative hidden sm:inline-flex p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
          <Bell size={18} className="text-slate-600 dark:text-slate-300" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        {/* User avatar + dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(v => !v)}
            className="hidden sm:flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center shrink-0">
              <span className="text-white font-semibold text-xs">{user?.initials ?? '??'}</span>
            </div>
            <div className="hidden md:block text-left">
              <p className="text-sm font-medium text-slate-800 dark:text-slate-100 leading-tight">{user?.name ?? ''}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{user?.role ?? ''}</p>
            </div>
            <ChevronDown size={14} className={`text-slate-400 dark:text-slate-500 transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown */}
          {menuOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-52 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg py-1 z-50">
              <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{user?.name}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 truncate">{user?.email}</p>
                <span className="inline-block mt-1.5 text-[10px] font-medium bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full">
                  {user?.role}
                </span>
              </div>
              <button
                onClick={() => { setMenuOpen(false); logout(); }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
              >
                <LogOut size={15} />
                {lang === 'fr' ? 'Se déconnecter' : 'Sign out'}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
