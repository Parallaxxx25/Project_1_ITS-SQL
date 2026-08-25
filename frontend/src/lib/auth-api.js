/**
 * auth-api.js — talks to POST /api/signup and /api/login, manages the JWT.
 * Set VITE_API_URL to the hosted backend in production (with or without /api).
 */
const API_BASE = (() => {
  let b = (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '');
  if (!/\/api$/.test(b)) b += '/api';
  return b;
})();

const TOKEN_KEY = 'dblearn_token';

export function getToken() { return localStorage.getItem(TOKEN_KEY); }
export function setToken(t) { localStorage.setItem(TOKEN_KEY, t); }
export function clearToken() { localStorage.removeItem(TOKEN_KEY); }

/** Decode the JWT payload; returns null if missing/expired/invalid. */
export function getUser() {
  const t = getToken();
  if (!t) return null;
  try {
    const p = JSON.parse(atob(t.split('.')[1]));
    if (p.exp && Date.now() / 1000 > p.exp) { clearToken(); return null; }
    return p; // { id, username, first_name, last_name, iat, exp }
  } catch { clearToken(); return null; }
}

export function isAuthenticated() { return !!getUser(); }
export function logout() { clearToken(); }

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

/** { first_name, last_name, username, password } → { user }. Does NOT log in. */
export function signup(payload) { return post('/signup', payload); }

/** { username, password } → { token, user }; stores the token on success. */
export async function login(payload) {
  const data = await post('/login', payload);
  if (data.token) setToken(data.token);
  return data;
}
