import React, { useState, useEffect } from 'react';
import { ensureInstructors, signup, login } from '../lib/client-auth';

// ── Username / password sign-in + sign-up ───────────────────────────
// Accounts live in the backend SQLite DB (bcrypt-hashed). Students self
// sign-up (role=student); 3 instructor accounts are pre-seeded server-side.

export default function Login({ onLogin, onClose, loginError }) {
  const [isLoading, setIsLoading] = useState(false);
  const [shake,     setShake]     = useState(false);
  const [showPass,  setShowPass]  = useState(false);
  const [error,     setError]     = useState('');

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name,     setName]     = useState('');
  const [mode,     setMode]     = useState('signin'); // 'signin' | 'signup'

  // Animated multilingual greeting in the footer.
  const [displayText, setDisplayText] = useState('');
  const [isDeleting,  setIsDeleting]  = useState(false);
  const [loopNum,     setLoopNum]     = useState(0);
  const [typingSpeed, setTypingSpeed] = useState(150);
  const greetings = ['สวัสดี', 'Hello', 'こんにちは', 'Bonjour', 'Hola', '안녕하세요', 'Ciao'];

  useEffect(() => {
    const handleTyping = () => {
      const i        = loopNum % greetings.length;
      const fullText = greetings[i];
      setDisplayText(isDeleting
        ? fullText.substring(0, displayText.length - 1)
        : fullText.substring(0, displayText.length + 1)
      );
      setTypingSpeed(isDeleting ? 80 : 150);
      if (!isDeleting && displayText === fullText) setTimeout(() => setIsDeleting(true), 1500);
      else if (isDeleting && displayText === '') { setIsDeleting(false); setLoopNum(loopNum + 1); }
    };
    const timer = setTimeout(handleTyping, typingSpeed);
    return () => clearTimeout(timer);
  }, [displayText, isDeleting, loopNum, typingSpeed]);

  useEffect(() => {
    if (loginError) triggerError(loginError);
  }, [loginError]);

  // Seed the 3 fixed instructor accounts into localStorage on first open.
  useEffect(() => { ensureInstructors(); }, []);

  const triggerError = (msg) => {
    setError(msg); setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  // Browser-only auth (no backend) — see lib/client-auth.js.
  // Sign in / Sign up both resolve against localStorage; works on any static host.
  const handleSubmit = async () => {
    if (isLoading) return;                                   // double-submit guard
    if (!username.trim() || !password) {
      triggerError('กรุณากรอก Username และ Password'); return;
    }
    if (mode === 'signup' && !name.trim()) {
      triggerError('กรุณากรอกชื่อ-นามสกุล'); return;
    }
    if (password.length < 6) {
      triggerError('Password ต้องมีอย่างน้อย 6 ตัวอักษร'); return;
    }
    setIsLoading(true); setError('');
    try {
      await ensureInstructors();                            // guarantee the 3 exist
      const user = mode === 'signup'
        ? await signup({ username, password, name })
        : await login({ username, password });
      localStorage.setItem('its_token', 'local-' + Date.now());
      onLogin(user);
    } catch (e) {
      triggerError(e?.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่');
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = (e) => { e.preventDefault(); handleSubmit(); };

  const switchMode = () => {
    setMode((m) => (m === 'signin' ? 'signup' : 'signin'));
    setError('');
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center z-[100] p-4 sm:p-6 animate-in fade-in duration-300">
      <div className="bg-white max-w-[28rem] w-full rounded-[2rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] relative overflow-hidden flex flex-col transform transition-all animate-in zoom-in-95 duration-300">

        {/* ── Header ── */}
        <div className="pt-8 px-8 pb-4 relative">
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-900 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>

          <div className="flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-[#03045e]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
            </div>
            <h3 className="text-2xl font-black text-[#03045e] tracking-tight">{mode === 'signup' ? 'สมัครสมาชิก' : 'เข้าสู่ระบบ'}</h3>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mt-2">
              {mode === 'signup' ? 'Create Account' : 'Sign In'}
            </p>
          </div>
        </div>

        {/* ── Body ── */}
        <form onSubmit={onSubmit} className="px-8 pb-8 space-y-6">

          {/* Error Message */}
          {error && (
            <div
              role="alert"
              aria-live="assertive"
              className={`bg-red-50 border border-red-100 rounded-xl p-3 flex items-start gap-3 ${shake ? 'animate-[shake_0.4s_ease-in-out]' : ''}`}
            >
              <svg className="w-5 h-5 text-red-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              <p className="text-xs font-semibold text-red-700 leading-relaxed">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            {mode === 'signup' && (
              <InputField
                id="name"
                label="ชื่อ-นามสกุล"
                icon="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                placeholder="ชื่อ นามสกุล"
                value={name}
                autoComplete="name"
                onChange={e => setName(e.target.value)}
              />
            )}

            <InputField
              id="username"
              label="Username"
              icon="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              placeholder="ชื่อผู้ใช้"
              value={username}
              autoComplete="username"
              onChange={e => setUsername(e.target.value)}
            />

            <InputField
              id="password"
              label="Password"
              icon="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              type={showPass ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              autoComplete="current-password"
              onChange={e => setPassword(e.target.value)}
              right={
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  aria-label={showPass ? 'Hide password' : 'Show password'}
                  className="text-[10px] font-bold text-slate-400 hover:text-[#03045e] uppercase tracking-widest transition-colors px-2 py-1 bg-slate-100 rounded-md"
                >
                  {showPass ? 'Hide' : 'Show'}
                </button>
              }
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            aria-busy={isLoading}
            className="w-full py-3.5 mt-1 rounded-xl font-bold text-xs tracking-widest uppercase transition-all duration-300 bg-[#03045e] text-white hover:bg-[#020344] hover:shadow-lg hover:-translate-y-0.5 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                {mode === 'signup' ? 'กำลังสมัคร…' : 'กำลังเข้าสู่ระบบ…'}
              </>
            ) : (mode === 'signup' ? 'Sign Up' : 'Sign In')}
          </button>

          {/* Toggle sign in / sign up */}
          <div className="text-center pt-1">
            <button type="button" onClick={switchMode} className="text-xs font-bold text-[#03045e] hover:underline">
              {mode === 'signup' ? 'มีบัญชีอยู่แล้ว? เข้าสู่ระบบ' : 'ยังไม่มีบัญชี? สมัครสมาชิก'}
            </button>
          </div>
        </form>

        {/* ── Footer ── */}
        <div className="bg-slate-50 border-t border-slate-100 p-4 text-center">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            {displayText} <span className="animate-pulse opacity-50">_</span>
          </p>
        </div>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
      `}</style>
    </div>
  );
}

// ── Minimal Input Field ─────────────────────────────────────────
function InputField({ id, label, icon, type = 'text', placeholder, value, onChange, autoComplete, right }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{label}</label>
      <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 focus-within:border-[#FF9900] focus-within:ring-4 focus-within:ring-[#FF9900]/10 transition-all duration-200">
        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={icon}></path>
        </svg>
        <input
          id={id}
          name={id}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          className="flex-1 bg-transparent border-none outline-none text-sm font-semibold text-slate-800 placeholder:text-slate-300 placeholder:font-medium w-full"
        />
        {right}
      </div>
    </div>
  );
}
