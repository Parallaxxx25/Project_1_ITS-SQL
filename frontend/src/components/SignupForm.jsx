import React, { useState } from 'react';
import { signup, login } from '../lib/auth-api';

/**
 * SignupForm — first_name, last_name, username, password + confirm.
 * Client-side validation mirrors the backend (username ≥ 4, password ≥ 8).
 * On success it auto-logs-in (stores JWT) and calls onSuccess(user).
 */
export default function SignupForm({ onSuccess, onSwitchToLogin }) {
  const [form, setForm] = useState({ first_name: '', last_name: '', username: '', password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const validate = () => {
    const err = {};
    if (!form.first_name.trim()) err.first_name = 'กรุณากรอกชื่อ';
    if (!form.last_name.trim()) err.last_name = 'กรุณากรอกนามสกุล';
    if (form.username.trim().length < 4) err.username = 'username ต้องมีอย่างน้อย 4 ตัวอักษร';
    if (form.password.length < 8) err.password = 'password ต้องมีอย่างน้อย 8 ตัวอักษร';
    if (form.confirm !== form.password) err.confirm = 'รหัสผ่านไม่ตรงกัน';
    return err;
  };

  const submit = async (e) => {
    e.preventDefault();
    setServerError('');
    const err = validate();
    setErrors(err);
    if (Object.keys(err).length) return;
    setLoading(true);
    try {
      await signup({
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        username: form.username.trim(),
        password: form.password,
      });
      // Signup ok → obtain a token and redirect.
      const { user } = await login({ username: form.username.trim(), password: form.password });
      onSuccess?.(user);
    } catch (e2) {
      if (e2.status === 409) setErrors((p) => ({ ...p, username: 'username นี้ถูกใช้แล้ว' }));
      else setServerError(e2.message || 'สมัครไม่สำเร็จ กรุณาลองใหม่');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="w-full max-w-md mx-auto space-y-4" noValidate>
      <h2 className="text-2xl font-bold text-[#03045e]">สมัครสมาชิก</h2>

      {serverError && (
        <div role="alert" className="bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl p-3">{serverError}</div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Field label="ชื่อ" value={form.first_name} onChange={set('first_name')} error={errors.first_name} autoComplete="given-name" />
        <Field label="นามสกุล" value={form.last_name} onChange={set('last_name')} error={errors.last_name} autoComplete="family-name" />
      </div>
      <Field label="Username" value={form.username} onChange={set('username')} error={errors.username} autoComplete="username" />
      <Field label="Password" type="password" value={form.password} onChange={set('password')} error={errors.password} autoComplete="new-password" />
      <Field label="Confirm Password" type="password" value={form.confirm} onChange={set('confirm')} error={errors.confirm} autoComplete="new-password" />

      <button type="submit" disabled={loading}
        className="w-full py-3 rounded-xl bg-[#03045e] text-white font-bold text-sm hover:bg-[#020344] active:scale-[.98] transition-all disabled:opacity-60">
        {loading ? 'กำลังสมัคร…' : 'Sign Up'}
      </button>

      {onSwitchToLogin && (
        <p className="text-center text-sm text-slate-500">
          มีบัญชีแล้ว?{' '}
          <button type="button" onClick={onSwitchToLogin} className="font-bold text-[#03045e] hover:underline">เข้าสู่ระบบ</button>
        </p>
      )}
    </form>
  );
}

function Field({ label, error, type = 'text', ...props }) {
  return (
    <div>
      <label className="block text-xs font-bold text-slate-500 mb-1">{label}</label>
      <input
        type={type}
        {...props}
        className={`w-full bg-slate-50 border rounded-xl px-4 py-3 text-sm text-slate-900 outline-none transition-colors
          ${error ? 'border-red-300 focus:border-red-400 focus:ring-1 focus:ring-red-300'
                  : 'border-slate-200 focus:border-[#03045e] focus:ring-1 focus:ring-[#03045e]'}`}
      />
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}
