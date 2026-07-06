import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Login from './pages/Login';
import ForcePasswordChange from './pages/ForcePasswordChange';
import AdminRoutes  from './routes/AdminRoutes';
import TeacherRoutes from './routes/TeacherRoutes';
import StudentRoutes from './routes/StudentRoutes';
import ParentRoutes  from './routes/ParentRoutes';
import PlatformRoutes from './routes/PlatformRoutes';

function AppRoutes() {
  const { user } = useAuth();

  if (!user) return <Login />;
  if (user.must_change_password) return <ForcePasswordChange />;

  if (user.role === 'platform_owner' || user.role === 'platform_admin') return <PlatformRoutes />;
  if (user.role === 'super_admin' || user.role === 'head_teacher') return <AdminRoutes />;
  if (user.role === 'teacher')  return <TeacherRoutes />;
  if (user.role === 'student')  return <StudentRoutes />;
  if (user.role === 'parent')   return <ParentRoutes />;

  return <Routes><Route path="*" element={<Login />} /></Routes>;
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
