/*
 * Copyright (c) 2026 [COMPANY LEGAL NAME]. All rights reserved.
 * Proprietary and confidential. Unauthorized copying, distribution or
 * modification of this file, via any medium, is strictly prohibited.
 */
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, setSession, clearSession, type SessionPayload } from '../api/client';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'super_admin' | 'head_teacher' | 'teacher' | 'student' | 'parent' | 'platform_owner' | 'platform_admin';
  initials: string;
  teacher_id?: string | null;
  student_id?: string | null;
  parent_id?: string | null;
  must_change_password?: boolean;
  totp_enabled?: boolean;
}

export type LoginOutcome = 'ok' | 'mfa' | 'enroll' | 'error';

interface AuthContextValue {
  user: AuthUser | null;
  /** Password step. Returns what the caller must do next. */
  login: (email: string, password: string) => Promise<LoginOutcome>;
  /** Second step when login() returned 'mfa'. */
  submitTwoFactor: (code: string) => Promise<boolean>;
  /** Called by the enrolment screen once /enroll/verify hands back a session. */
  applySession: (session: SessionPayload) => void;
  logout: () => void;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  clearMustChangePassword: () => void;

  mfaToken: string | null;
  enrollToken: string | null;

  // Known-default temp password for the student silent first login (never persisted).
  pendingTempPassword: string | null;
  setPendingTempPassword: (password: string | null) => void;
}

const noop = () => {};
const AuthContext = createContext<AuthContextValue>({
  user: null,
  login: async () => 'error',
  submitTwoFactor: async () => false,
  applySession: noop,
  logout: noop,
  changePassword: async () => {},
  clearMustChangePassword: noop,
  mfaToken: null,
  enrollToken: null,
  pendingTempPassword: null,
  setPendingTempPassword: noop,
});

const storedUser = (): AuthUser | null => {
  try { return JSON.parse(localStorage.getItem('auth_user') ?? 'null'); }
  catch { return null; }
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(storedUser);
  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const [enrollToken, setEnrollToken] = useState<string | null>(null);
  const [pendingTempPassword, setPendingTempPassword] = useState<string | null>(null);

  // The api client fires these when it silently refreshes or gives up.
  useEffect(() => {
    const onSession = (e: Event) => {
      const detail = (e as CustomEvent<AuthUser>).detail;
      if (detail) setUser(detail);
    };
    const onLost = () => {
      setUser(null);
      setMfaToken(null);
      setEnrollToken(null);
      setPendingTempPassword(null);
    };
    window.addEventListener('edutech:session', onSession);
    window.addEventListener('edutech:auth-lost', onLost);
    return () => {
      window.removeEventListener('edutech:session', onSession);
      window.removeEventListener('edutech:auth-lost', onLost);
    };
  }, []);

  const login = async (email: string, password: string): Promise<LoginOutcome> => {
    try {
      const res = await api.login(email, password);
      if ('mfa_required' in res && res.mfa_required) {
        setMfaToken(res.mfa_token);
        setEnrollToken(null);
        return 'mfa';
      }
      if ('mfa_enroll_required' in res && res.mfa_enroll_required) {
        setEnrollToken(res.enroll_token);
        setMfaToken(null);
        return 'enroll';
      }
      setSession(res);
      if (res.user) setUser(res.user);
      return 'ok';
    } catch {
      return 'error';
    }
  };

  const submitTwoFactor = async (code: string): Promise<boolean> => {
    if (!mfaToken) return false;
    const res = await api.loginTwoFactor(mfaToken, code);
    setSession(res);
    if (res.user) setUser(res.user);
    setMfaToken(null);
    return true;
  };

  const applySession = (session: SessionPayload) => {
    setSession(session);
    if (session.user) setUser(session.user);
    setMfaToken(null);
    setEnrollToken(null);
  };

  const logout = () => {
    let rt: string | null = null;
    try { rt = localStorage.getItem('edutech_refresh'); } catch { /* ignore */ }
    api.logout(rt ?? undefined).catch(() => {});
    clearSession();
    setUser(null);
    setMfaToken(null);
    setEnrollToken(null);
    setPendingTempPassword(null);
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    const res = await api.changePassword(currentPassword, newPassword);
    setSession(res);
    if (res.user) setUser(res.user);
    else setUser(prev => (prev ? { ...prev, must_change_password: false } : prev));
    setPendingTempPassword(null);
  };

  const clearMustChangePassword = () => {
    setPendingTempPassword(null);
    setUser(prev => {
      if (!prev) return prev;
      const updated = { ...prev, must_change_password: false };
      try { localStorage.setItem('auth_user', JSON.stringify(updated)); } catch { /* ignore */ }
      return updated;
    });
  };

  return (
    <AuthContext.Provider value={{
      user, login, submitTwoFactor, applySession, logout, changePassword,
      clearMustChangePassword, mfaToken, enrollToken,
      pendingTempPassword, setPendingTempPassword,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
