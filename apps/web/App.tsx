import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Login from './pages/Login';
import AdminRoutes  from './routes/AdminRoutes';
import TeacherRoutes from './routes/TeacherRoutes';
import StudentRoutes from './routes/StudentRoutes';
import ParentRoutes  from './routes/ParentRoutes';

function AppRoutes() {
  const { user } = useAuth();

  if (!user) return <Login />;

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
