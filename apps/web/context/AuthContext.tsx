import { createContext, useContext, useState, type ReactNode } from 'react';
import { api } from '../api/client';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'super_admin' | 'head_teacher' | 'teacher' | 'student' | 'parent';
  initials: string;
  teacher_id?: string | null;
  student_id?: string | null;
  parent_id?: string | null;
  token?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null, login: async () => false, logout: () => {},
});

const stored = (): AuthUser | null => {
  try { return JSON.parse(localStorage.getItem('auth_user') ?? 'null'); }
  catch { return null; }
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(stored);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const res = await api.login(email, password);
      const authUser: AuthUser = {
        id:         res.user.id,
        name:       res.user.name,
        email:      res.user.email,
        role:       res.user.role,
        initials:   res.user.initials,
        teacher_id: res.user.teacher_id ?? null,
        student_id: res.user.student_id ?? null,
        parent_id:  res.user.parent_id  ?? null,
        token:      res.token,
      };
      setUser(authUser);
      localStorage.setItem('auth_user', JSON.stringify(authUser));
      return true;
    } catch {
      return false;
    }
  };

  const logout = () => {
    api.logout().catch(() => {});
    setUser(null);
    localStorage.removeItem('auth_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
