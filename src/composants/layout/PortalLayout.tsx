import { Outlet } from 'react-router-dom';
import Header from './Header';
import type { ReactNode } from 'react';

interface Props {
  sidebar: ReactNode;
}

export default function PortalLayout({ sidebar }: Props) {
  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden">
      {sidebar}
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 overflow-y-auto p-6 dark:bg-slate-950">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
