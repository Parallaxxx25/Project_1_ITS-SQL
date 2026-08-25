/**
 * client-auth.js — browser-only auth (no backend).
 *
 * Accounts live in localStorage under `its_users`. Passwords are stored as a
 * SHA-256(salt + password) hash (per-user random salt). NOTE: client-side auth
 * is inherently spoofable (anyone can read/edit localStorage) — this is a
 * learning app, not a security boundary. It exists so signup/login work on a
 * static host (Vercel) with zero backend.
 */

const USERS_KEY = 'its_users';

// The only pre-set instructors. Everyone else self signs up as a student.
const INSTRUCTOR_SEED = [
  { username: 'aj001',      password: 'aj001',    name: 'Instructor aj001',  email: 'aj001@kmitl.ac.th' },
  { username: 'it66070126', password: 'NLKctw25', name: 'นายพชร พรอโนทัย',     email: 'it66070126@kmitl.ac.th' },
  { username: 'it66070066', password: 'LGHuuh18', name: 'นายณัฐวีร์ เเนกำพล',  email: 'it66070066@kmitl.ac.th' },
];

function loadUsers() {
  try { return JSON.parse(localStorage.getItem(USERS_KEY)) || []; }
  catch { return []; }
}
function saveUsers(users) { localStorage.setItem(USERS_KEY, JSON.stringify(users)); }

function randHex(bytes = 16) {
  const a = new Uint8Array(bytes);
  crypto.getRandomValues(a);
  return [...a].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function hashPassword(password, salt) {
  const data = new TextEncoder().encode(`${salt}:${password}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Shape returned to the app (never expose the hash/salt).
function publicUser(u) {
  return { id: u.username, username: u.username, email: u.email, name: u.name, role: u.role, modules: u.modules || [] };
}

/** Idempotently seed the 3 instructors. Repairs role/name/password each call so
 *  the known credentials always work. Safe to call on every mount. */
export async function ensureInstructors() {
  const users = loadUsers();
  const byName = new Map(users.map((u) => [u.username.toLowerCase(), u]));
  for (const s of INSTRUCTOR_SEED) {
    const salt = randHex();
    const pwHash = await hashPassword(s.password, salt);
    const existing = byName.get(s.username.toLowerCase());
    if (existing) {
      Object.assign(existing, { role: 'instructor', name: s.name, email: s.email, salt, pwHash });
    } else {
      users.push({ username: s.username, name: s.name, email: s.email, role: 'instructor', salt, pwHash, modules: [] });
    }
  }
  saveUsers(users);
}

/** Create a new student account. Throws Error(message) on validation/duplicate. */
export async function signup({ username, password, name }) {
  username = (username || '').trim();
  name = (name || '').trim();
  if (username.length < 3) throw new Error('Username ต้องมีอย่างน้อย 3 ตัวอักษร');
  if (!password || password.length < 6) throw new Error('Password ต้องมีอย่างน้อย 6 ตัวอักษร');
  if (!name) throw new Error('กรุณากรอกชื่อ-นามสกุล');

  const users = loadUsers();
  if (users.some((u) => u.username.toLowerCase() === username.toLowerCase())) {
    throw new Error('Username นี้ถูกใช้แล้ว');
  }
  const salt = randHex();
  const pwHash = await hashPassword(password, salt);
  const rec = { username, name, email: `${username}@kmitl.ac.th`, role: 'student', salt, pwHash, modules: [] };
  users.push(rec);
  saveUsers(users);
  return publicUser(rec);
}

/** Verify credentials. Throws Error with a generic message on failure. */
export async function login({ username, password }) {
  username = (username || '').trim();
  const u = loadUsers().find((x) => x.username.toLowerCase() === username.toLowerCase());
  if (!u) throw new Error('Username หรือ Password ไม่ถูกต้อง');
  const pwHash = await hashPassword(password, u.salt);
  if (pwHash !== u.pwHash) throw new Error('Username หรือ Password ไม่ถูกต้อง');
  return publicUser(u);
}
