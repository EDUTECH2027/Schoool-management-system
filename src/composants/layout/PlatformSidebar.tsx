import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Building2, Users, CreditCard, BarChart3, ScrollText,
  Package, ShieldCheck, Megaphone, ShieldQuestion, Settings, DatabaseBackup, ShieldEllipsis,
} from 'lucide-react';
import { clsx } from 'clsx';

const mainNav = [
  { label: 'Dashboard',      to: '/platform/dashboard',      icon: LayoutDashboard },
  { label: 'Schools',        to: '/platform/schools',        icon: Building2 },
  { label: 'Users',          to: '/platform/users',          icon: Users },
  { label: 'Subscriptions',  to: '/platform/subscriptions',  icon: CreditCard },
  { label: 'Reports',        to: '/platform/reports',        icon: BarChart3 },
  { label: 'System Logs',    to: '/platform/system-logs',    icon: ScrollText },
];

const managementNav = [
  { label: 'Plans & Billing', to: '/platform/plans-billing', icon: Package },
  { label: 'Features',        to: '/platform/features',      icon: ShieldQuestion },
  { label: 'Announcements',   to: '/platform/announcements', icon: Megaphone },
];

const systemNav = [
  { label: 'Roles & Permissions', to: '/platform/roles-permissions', icon: ShieldCheck },
  { label: 'Settings',            to: '/platform/settings',          icon: Settings },
  { label: 'Backup & Restore',    to: '/platform/backup-restore',    icon: DatabaseBackup },
];

function NavGroup({ title, items }: { title: string; items: typeof mainNav }) {
  return (
    <div className="pt-4 first:pt-0">
      <p className="text-slate-500 text-[10px] font-semibold uppercase tracking-widest px-3 mb-2">{title}</p>
      {items.map(({ label, to, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            clsx(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
              isActive ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            )
          }
        >
          <Icon size={17} />
          {label}
        </NavLink>
      ))}
    </div>
  );
}

export default function PlatformSidebar() {
  return (
    <aside className="w-[86vw] max-w-72 bg-slate-900 flex flex-col h-screen shrink-0 lg:w-64">
      <div className="px-6 py-5 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0">
            <ShieldEllipsis size={20} className="text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-white font-semibold text-sm leading-tight truncate">School Management System</p>
            <p className="text-slate-400 text-xs truncate">Super Admin</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <NavGroup title="Main" items={mainNav} />
        <NavGroup title="Management" items={managementNav} />
        <NavGroup title="System" items={systemNav} />
      </nav>
    </aside>
  );
}
