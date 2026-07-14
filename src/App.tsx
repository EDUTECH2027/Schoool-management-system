import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Login from './pages/Login';
import ForcePasswordChange from './pages/ForcePasswordChange';

// Each role only ever needs its own route tree — lazy-loading these means a
// parent's session, for example, never downloads the admin/teacher/platform
// page bundles at all, instead of every role's code shipping to every user.
const AdminRoutes    = lazy(() => import('./routes/AdminRoutes'));
const TeacherRoutes  = lazy(() => import('./routes/TeacherRoutes'));
const StudentRoutes  = lazy(() => import('./routes/StudentRoutes'));
const ParentRoutes   = lazy(() => import('./routes/ParentRoutes'));
const PlatformRoutes = lazy(() => import('./routes/PlatformRoutes'));

function RouteLoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function AppRoutes() {
  const { user } = useAuth();

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
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
