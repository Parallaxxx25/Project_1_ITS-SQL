import React, { useState } from 'react';
import { login } from '../lib/auth-api';

/**
 * LoginForm — username + password. Stores JWT on success (via login()) and
 * calls onSuccess(user). Inline validation + single generic error message.
 */
export default function LoginForm({ onSuccess, onSwitchToSignup }) {
  const [form, setForm] = useState({ username: '', password: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const validate = () => {
    const err = {};
    if (form.username.trim().length < 4) err.username = 'username ต้องมีอย่างน้อย 4 ตัวอักษร';
    if (form.password.length < 8) err.password = 'password ต้องมีอย่างน้อย 8 ตัวอักษร';
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
      const { user } = await login({ username: form.username.trim(), password: form.password });
      onSuccess?.(user);
    } catch (e2) {
      setServerError(e2.message || 'เข้าสู่ระบบไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="w-full max-w-md mx-auto space-y-4" noValidate>
      <h2 className="text-2xl font-bold text-[#03045e]">เข้าสู่ระบบ</h2>

      {serverError && (
        <div role="alert" className="bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl p-3">{serverError}</div>
      )}

      <Field label="Username" value={form.username} onChange={set('username')} error={errors.username} autoComplete="username" />
      <Field label="Password" type="password" value={form.password} onChange={set('password')} error={errors.password} autoComplete="current-password" />

      <button type="submit" disabled={loading}
        className="w-full py-3 rounded-xl bg-[#03045e] text-white font-bold text-sm hover:bg-[#020344] active:scale-[.98] transition-all disabled:opacity-60">
        {loading ? 'กำลังเข้าสู่ระบบ…' : 'Sign In'}
      </button>

      {onSwitchToSignup && (
        <p className="text-center text-sm text-slate-500">
          ยังไม่มีบัญชี?{' '}
          <button type="button" onClick={onSwitchToSignup} className="font-bold text-[#03045e] hover:underline">สมัครสมาชิก</button>
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
