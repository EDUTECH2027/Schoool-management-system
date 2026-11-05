/*
 * Copyright (c) 2026 [COMPANY LEGAL NAME]. All rights reserved.
 * Proprietary and confidential. Unauthorized copying, distribution or
 * modification of this file, via any medium, is strictly prohibited.
 */
import { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Login from './pages/Login';
import ForcePasswordChange from './pages/ForcePasswordChange';
import ActivateAccount from './pages/ActivateAccount';
import TwoFactorChallenge from './pages/TwoFactorChallenge';
import TwoFactorEnrollment from './pages/TwoFactorEnrollment';
import LoadingScreen from './composants/ui/LoadingScreen';
import LicenseBanner from './composants/LicenseBanner';

// Each role only ever needs its own route tree — lazy-loading these means a
// parent's session, for example, never downloads the admin/teacher/platform
// page bundles at all, instead of every role's code shipping to every user.
const AdminRoutes    = lazy(() => import('./routes/AdminRoutes'));
const TeacherRoutes  = lazy(() => import('./routes/TeacherRoutes'));
const StudentRoutes  = lazy(() => import('./routes/StudentRoutes'));
const ParentRoutes   = lazy(() => import('./routes/ParentRoutes'));
const PlatformRoutes = lazy(() => import('./routes/PlatformRoutes'));

// While the sign-in form is on screen the browser is idle: fetch the (small) role route trees now so the
// dashboard shows as soon as the login call returns instead of waiting for another download.
function usePrefetchRoutes(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const run = () => {
      void import('./routes/AdminRoutes');
      void import('./routes/TeacherRoutes');
      void import('./routes/StudentRoutes');
      void import('./routes/ParentRoutes');
    };
    const w = window as Window & { requestIdleCallback?: (cb: () => void) => number };
    if (w.requestIdleCallback) w.requestIdleCallback(run); else setTimeout(run, 1500);
  }, [enabled]);
}

function RouteLoadingFallback() {
  return <LoadingScreen variant="screen" />;
}

function AppRoutes() {
  const { user, mfaToken, enrollToken } = useAuth();
  usePrefetchRoutes(!user);

  const activateToken = new URLSearchParams(window.location.search).get('activate');
  if (activateToken && !user) return <ActivateAccount token={activateToken} />;
  if (mfaToken) return <TwoFactorChallenge />;
  if (enrollToken) return <TwoFactorEnrollment />;
  if (!user) return <Login />;
  if (user.must_change_password) return <ForcePasswordChange />;

  let RoleRoutes: typeof AdminRoutes | null = null;
  if (user.role === 'platform_owner' || user.role === 'platform_admin') RoleRoutes = PlatformRoutes;
  else if (user.role === 'super_admin' || user.role === 'head_teacher') RoleRoutes = AdminRoutes;
  else if (user.role === 'teacher') RoleRoutes = TeacherRoutes;
  else if (user.role === 'student') RoleRoutes = StudentRoutes;
  else if (user.role === 'parent')  RoleRoutes = ParentRoutes;

  if (!RoleRoutes) return <Routes><Route path="*" element={<Login />} /></Routes>;

  return (
    <Suspense fallback={<RouteLoadingFallback />}>
      <RoleRoutes />
    </Suspense>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <LicenseBanner />
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
