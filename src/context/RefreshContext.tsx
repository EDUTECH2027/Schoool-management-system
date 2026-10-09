/*
 * Copyright (c) 2026 [COMPANY LEGAL NAME]. All rights reserved.
 * Proprietary and confidential. Unauthorized copying, distribution or
 * modification of this file, via any medium, is strictly prohibited.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, Fragment, type ReactNode } from 'react';
import { Outlet } from 'react-router-dom';
import { clearApiCache } from '../api/client';

// One "refresh" for every page of a layout. Pages load their data in effects when they mount, so
// remounting the current page re-runs those loads against the server. The API's own cache of reference
// data (subjects, grade levels) is cleared first, otherwise the remount would just reuse the old copy.
// No page needs to change, and normal navigation is unaffected (the key only changes on a refresh).

interface RefreshValue {
  /** false outside a layout that supports refreshing — the button hides itself */
  available: boolean;
  refreshing: boolean;
  refresh: () => void;
  version: number;
}

const RefreshContext = createContext<RefreshValue>({ available: false, refreshing: false, refresh: () => {}, version: 0 });

export function RefreshProvider({ children }: { children: ReactNode }) {
  const [version, setVersion] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  const refresh = useCallback(() => {
    clearApiCache();
    setVersion(v => v + 1);
    setRefreshing(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setRefreshing(false), 800);
  }, []);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const value = useMemo(() => ({ available: true, refreshing, refresh, version }), [refreshing, refresh, version]);
  return <RefreshContext.Provider value={value}>{children}</RefreshContext.Provider>;
}

export const useRefresh = () => useContext(RefreshContext);

/** Drop-in replacement for <Outlet />: remounts the current page whenever a refresh is requested. */
export function RefreshableOutlet() {
  const { version } = useRefresh();
  return <Fragment key={version}><Outlet /></Fragment>;
}
