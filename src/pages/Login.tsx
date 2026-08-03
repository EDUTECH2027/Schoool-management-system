import { useState, type FormEvent } from 'react';
import {
  Eye, EyeOff, GraduationCap, Lock, Mail, AlertCircle, IdCard,
  ChevronRight, Users, BookOpen, TrendingUp, Shield, Building2, School,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useBranding } from '../context/BrandingContext';
import { useLanguage } from '../i18n/LanguageContext';

const FEATURES = [
  { icon: Users,      en: 'Manage students, teachers & staff',          fr: 'Gérer élèves, enseignants & personnel' },
  { icon: BookOpen,   en: 'Track grades, assessments & report cards',   fr: 'Suivre notes, évaluations & bulletins' },
  { icon: TrendingUp, en: 'Real-time attendance & financial reports',   fr: 'Présences & rapports financiers en direct' },
];

type LoginMode = 'admin' | 'student';

// Matches DEFAULT_PASSWORD in backend/src/routes/migrate.js and the
// fallback used when a student portal account is first created — trying it
// silently on the student tab is what makes the "first login" experience
// skip straight to "create your password" without ever showing this value.
const STUDENT_DEFAULT_PASSWORD = 'Welcome@2025';

// Mirrors the email pattern used server-side (routes/migrate.js,
// routes/students.js) to derive a student's portal login from their
// Student ID, so this stays a normal email+password login under the hood.
function studentEmailFor(studentId: string) {
  return `${studentId.trim().toLowerCase().replace(/-/g, '')}@school.local`;
}

export default function Login() {
  const { login, setPendingTempPassword }               = useAuth();
  const { logoUrl, schoolName, schoolSub, schoolInfo }   = useBranding();
  const { lang }                                         = useLanguage();
  const lbl = (en: string, fr: string) => lang === 'fr' ? fr : en;

  const [mode, setMode] = useState<LoginMode>('admin');

  // Administration & staff (existing flow, unchanged)
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');

  // Student (Student ID based flow)
  const [studentId, setStudentId] = useState('');
  const [studentPassword, setStudentPassword] = useState('');
  const [needsStudentPassword, setNeedsStudentPassword] = useState(false);

  const [showPw, setShowPw]     = useState(false);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const switchMode = (next: LoginMode) => {
    setMode(next);
    setError('');
  };

  const handleAdminSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password) {
      setError(lbl('Please fill in all fields.', 'Veuillez remplir tous les champs.'));
      return;
    }
    setLoading(true);
    const ok = await login(email, password);
    if (!ok) setError(lbl('Invalid email or password.', 'Email ou mot de passe incorrect.'));
    setLoading(false);
  };

  const handleStudentSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!studentId.trim()) {
      setError(lbl('Please enter your Student ID.', 'Veuillez saisir votre matricule.'));
      return;
    }
    setLoading(true);
    const derivedEmail = studentEmailFor(studentId);

    if (!needsStudentPassword) {
      // First attempt for this Student ID: try the known default password
      // silently. If it still works, this really is a first login — the
      // app will redirect into ForcePasswordChange automatically.
      const ok = await login(derivedEmail, STUDENT_DEFAULT_PASSWORD);
      if (ok) {
        setPendingTempPassword(STUDENT_DEFAULT_PASSWORD);
      } else {
        setNeedsStudentPassword(true);
      }
    } else {
      if (!studentPassword) {
        setError(lbl('Please enter your password.', 'Veuillez saisir votre mot de passe.'));
        setLoading(false);
        return;
      }
      const ok = await login(derivedEmail, studentPassword);
      if (!ok) setError(lbl('Invalid Student ID or password.', 'Matricule ou mot de passe incorrect.'));
    }
    setLoading(false);
  };

  return (
    /* ── Full-page dark background ──────────────────────────────── */
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 55%, #0f172a 100%)' }}
    >
      {/* Dot grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(99,102,241,0.18) 1.5px, transparent 1.5px)',
          backgroundSize: '30px 30px',
        }}
      />

      {/* Ambient glow blobs */}
      <div className="absolute top-[-10%] left-[-5%] w-125 h-125 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-5%] w-125 h-125 bg-violet-700/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-[40%] left-[55%] w-64 h-64 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* ── Floating card ───────────────────────────────────────── */}
      <div className="relative z-10 w-full max-w-5xl flex flex-col lg:flex-row rounded-3xl overflow-hidden shadow-[0_32px_80px_rgba(0,0,0,0.6)]">

        {/* ── LEFT PANEL — branding ──────────────────────────────── */}
        <div
          className="hidden lg:flex lg:w-[44%] flex-col justify-between p-10 relative overflow-hidden"
          style={{ background: 'linear-gradient(155deg, #312e81 0%, #3730a3 45%, #2e1065 100%)' }}
        >
          {/* Grid texture */}
          <div
            className="absolute inset-0 pointer-events-none opacity-40"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }}
          />

          {/* Corner blobs */}
          <div className="absolute -top-16 -right-16 w-64 h-64 bg-indigo-400/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute top-1/2 right-4 w-32 h-32 bg-indigo-300/10 rounded-full blur-xl pointer-events-none" />

          {/* ── Logo ── */}
          <div className="relative z-10">
            <div className="flex items-center gap-4">
              {/* Glowing logo ring */}
              <div className="relative shrink-0">
                <div className="absolute inset-0 rounded-2xl bg-indigo-400/40 blur-xl scale-125 pointer-events-none" />
                <div className="relative w-14 h-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center overflow-hidden backdrop-blur-sm">
                  {logoUrl
                    ? <img src={logoUrl} alt="logo" className="w-full h-full object-contain p-1" />
                    : <GraduationCap size={26} className="text-white" />
                  }
                </div>
              </div>
              <div>
                <p className="text-white font-extrabold text-lg leading-tight tracking-tight">{schoolName}</p>
                <p className="text-indigo-300 text-sm font-medium">{schoolSub}</p>
              </div>
            </div>
          </div>

          {/* ── Hero copy + features ── */}
          <div className="relative z-10 space-y-7">
            <div>
              <h2 className="text-white text-[2rem] font-extrabold leading-tight tracking-tight">
                {lbl('Everything you\nneed to run\nyour school.', 'Tout ce qu\'il\nvous faut pour\ngérer votre école.')}
              </h2>
              <p className="text-indigo-300 text-sm mt-3 leading-relaxed">
                {lbl(
                  'A complete management portal for administrators, teachers and staff.',
                  'Un portail de gestion complet pour administrateurs, enseignants et personnel.'
                )}
              </p>
            </div>

            <div className="space-y-3">
              {FEATURES.map(f => (
                <div key={f.en} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/10 border border-white/10 flex items-center justify-center shrink-0">
                    <f.icon size={14} className="text-indigo-200" />
                  </div>
                  <p className="text-indigo-100 text-sm">{lbl(f.en, f.fr)}</p>
                </div>
              ))}
            </div>

            {schoolInfo.motto && (
              <div className="border-l-2 border-indigo-400/60 pl-4">
                <p className="text-indigo-200 italic text-xs leading-relaxed">"{schoolInfo.motto}"</p>
              </div>
            )}
          </div>

          {/* ── Security note ── */}
          <div className="relative z-10 rounded-xl p-4 border border-white/10 backdrop-blur-sm flex items-center gap-3" style={{ background: 'rgba(255,255,255,0.07)' }}>
            <Shield size={18} className="text-indigo-300 shrink-0" />
            <p className="text-indigo-200 text-xs leading-relaxed">
              {lbl('Your data is secured with JWT authentication and encrypted storage.', 'Vos données sont sécurisées par authentification JWT et stockage chiffré.')}
            </p>
          </div>
        </div>

        {/* ── RIGHT PANEL — login form ────────────────────────────── */}
        <div className="flex-1 bg-white flex items-center justify-center px-5 py-8 sm:px-8 sm:py-10">
          <div className="w-full max-w-85">

            {/* Mobile logo */}
            <div className="flex lg:hidden items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center overflow-hidden shrink-0">
                {logoUrl
                  ? <img src={logoUrl} alt="logo" className="w-full h-full object-contain p-0.5" />
                  : <GraduationCap size={20} className="text-white" />
                }
              </div>
              <div>
                <p className="font-extrabold text-slate-800 text-sm">{schoolName}</p>
                <p className="text-slate-400 text-xs">{schoolSub}</p>
              </div>
            </div>

            {/* Heading */}
            <div className="mb-6">
              <span className="inline-flex items-center gap-1.5 bg-indigo-50 border border-indigo-100 text-indigo-600 text-[11px] font-semibold px-3 py-1 rounded-full mb-4">
                <Shield size={11} />
                {lbl('Secure Portal Access', 'Accès Sécurisé au Portail')}
              </span>
              <h1 className="text-[1.6rem] font-extrabold text-slate-900 tracking-tight leading-tight">
                {lbl('Welcome back', 'Bon retour')}
              </h1>
              <p className="text-slate-500 text-sm mt-1.5 leading-relaxed">
                {lbl(
                  'Sign in with your school account to continue.',
                  'Connectez-vous avec votre compte scolaire pour continuer.'
                )}
              </p>
            </div>

            {/* Role toggle */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl mb-6">
              {([
                { key: 'admin' as const,   label: lbl('Administration', 'Administration'), icon: Building2 },
                { key: 'student' as const, label: lbl('Student', 'Élève'),                   icon: School },
              ]).map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => switchMode(key)}
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold transition-all ${
                    mode === key ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Icon size={14} /> {label}
                </button>
              ))}
            </div>

            {/* ── Administration & staff form ─────────────────────── */}
            {mode === 'admin' && (
              <form onSubmit={handleAdminSubmit} className="space-y-5" noValidate>
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide">
                    {lbl('Email address', 'Adresse email')}
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <Mail size={15} className="text-slate-400 group-focus-within:text-indigo-500 transition-colors duration-200" />
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={e => { setEmail(e.target.value); setError(''); }}
                      placeholder="admin@edutech.com"
                      autoComplete="email"
                      className="w-full pl-10 pr-4 py-3 text-sm rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 focus:bg-white transition-all duration-200"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide">
                      {lbl('Password', 'Mot de passe')}
                    </label>
                    <button type="button" className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold transition-colors">
                      {lbl('Forgot password?', 'Mot de passe oublié ?')}
                    </button>
                  </div>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <Lock size={15} className="text-slate-400 group-focus-within:text-indigo-500 transition-colors duration-200" />
                    </div>
                    <input
                      type={showPw ? 'text' : 'password'}
                      value={password}
                      onChange={e => { setPassword(e.target.value); setError(''); }}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      className="w-full pl-10 pr-11 py-3 text-sm rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 focus:bg-white transition-all duration-200"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(v => !v)}
                      tabIndex={-1}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2.5 px-3.5 py-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                    <AlertCircle size={15} className="shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60 hover:-translate-y-0.5 active:translate-y-0"
                  style={{
                    background: 'linear-gradient(135deg, #4f46e5 0%, #6d28d9 100%)',
                    boxShadow: '0 4px 20px rgba(99,102,241,0.45)',
                  }}
                >
                  {loading ? (
                    <>
                      <span className="w-4 h-4 border-[2.5px] border-white/30 border-t-white rounded-full animate-spin" />
                      {lbl('Signing in…', 'Connexion…')}
                    </>
                  ) : (
                    <>
                      {lbl('Sign in', 'Se connecter')}
                      <ChevronRight size={16} />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* ── Student form ────────────────────────────────────── */}
            {mode === 'student' && (
              <form onSubmit={handleStudentSubmit} className="space-y-5" noValidate>
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide">
                    {lbl('Student ID', 'Matricule')}
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <IdCard size={15} className="text-slate-400 group-focus-within:text-indigo-500 transition-colors duration-200" />
                    </div>
                    <input
                      type="text"
                      value={studentId}
                      onChange={e => { setStudentId(e.target.value); setError(''); setNeedsStudentPassword(false); }}
                      placeholder={lbl('e.g. BSPS-2026-001', 'ex. BSPS-2026-001')}
                      autoComplete="username"
                      className="w-full pl-10 pr-4 py-3 text-sm rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 focus:bg-white transition-all duration-200"
                    />
                  </div>
                </div>

                {needsStudentPassword && (
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide">
                      {lbl('Password', 'Mot de passe')}
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <Lock size={15} className="text-slate-400 group-focus-within:text-indigo-500 transition-colors duration-200" />
                      </div>
                      <input
                        type={showPw ? 'text' : 'password'}
                        value={studentPassword}
                        onChange={e => { setStudentPassword(e.target.value); setError(''); }}
                        placeholder="••••••••"
                        autoComplete="current-password"
                        autoFocus
                        className="w-full pl-10 pr-11 py-3 text-sm rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 focus:bg-white transition-all duration-200"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPw(v => !v)}
                        tabIndex={-1}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="flex items-center gap-2.5 px-3.5 py-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                    <AlertCircle size={15} className="shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60 hover:-translate-y-0.5 active:translate-y-0"
                  style={{
                    background: 'linear-gradient(135deg, #4f46e5 0%, #6d28d9 100%)',
                    boxShadow: '0 4px 20px rgba(99,102,241,0.45)',
                  }}
                >
                  {loading ? (
                    <>
                      <span className="w-4 h-4 border-[2.5px] border-white/30 border-t-white rounded-full animate-spin" />
                      {lbl('Signing in…', 'Connexion…')}
                    </>
                  ) : (
                    <>
                      {lbl('Sign in', 'Se connecter')}
                      <ChevronRight size={16} />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Footer */}
            <p className="text-center text-[11px] text-slate-400 mt-8">
              {schoolName} · {lbl('School Management System', 'Système de Gestion Scolaire')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
