/**
 * auth-api.js — talks to POST /api/auth/register and /api/auth/login.
 *
 * Deliberately not /api/signup + /api/login (app/api/accounts.py) — those
 * mint a JWT with an "id" claim, but every backend endpoint that requires
 * login (including the tutor-hint passthrough, see api.js::requestClientHint)
 * checks for a "sub" claim via middleware/auth.py::get_current_user. Only
 * /api/auth/register + /api/auth/login (app/api/auth.py) mint that shape.
 *
 * Token storage is delegated to lib/api.js's setToken/clearAuth so every
 * other authenticated call in the app (which goes through api.js's
 * apiFetch) picks up the same session.
 */
import { setToken as setApiToken, clearAuth as clearApiAuth } from './api';

const API_BASE = (() => {
  let b = (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '');
  if (!/\/api$/.test(b)) b += '/api';
  return b;
})();

async function post(path, body) {
  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาตรวจสอบเครือข่าย');
  }
  let data = {};
  try { data = await res.json(); } catch { /* non-JSON */ }
  if (!res.ok) {
    const d = data.detail;
    const msg = Array.isArray(d) ? (d[0]?.msg || 'error') : (d || `เกิดข้อผิดพลาด (${res.status})`);
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  return data;
}

/**
 * { username, password, name } -> the logged-in user. Registers with a
 * synthesized @kmitl.ac.th email (the backend's RegisterRequest requires
 * one; this form only collects a single name field, matching the retired
 * client-side auth's own convention for the same reason).
 */
export async function signup({ username, password, name }) {
  const data = await post('/auth/register', {
    username,
    password,
    name,
    email: `${username}@kmitl.ac.th`,
  });
  setApiToken(data.token);
  return data.user;
}

/** { username, password } -> the logged-in user. */
export async function login({ username, password }) {
  const data = await post('/auth/login', { username, password });
  setApiToken(data.token);
  return data.user;
}

export function logout() {
  clearApiAuth();
}
