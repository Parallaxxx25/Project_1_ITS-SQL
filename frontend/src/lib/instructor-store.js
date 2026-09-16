/**
 * instructor-store.js — localStorage-backed data layer for instructor/TA features.
 *
 * The app runs client-side (DuckDB-WASM + localStorage) and deploys as a static
 * site, so instructor-authored data (problems, exams, announcements, learning
 * content) is persisted in localStorage here instead of a backend. Every mutation
 * dispatches an `its-store-change` window event so open views can live-refresh.
 */

const KEYS = {
  problems: 'its_custom_problems',
  announcements: 'its_announcements',
  content: 'its_content',
  userNames: 'its_user_names',
};

const STORE_EVENT = 'its-store-change';

function read(key) {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
  // Notify same-tab listeners (the native `storage` event only fires cross-tab).
  try {
    window.dispatchEvent(new CustomEvent(STORE_EVENT, { detail: { key } }));
  } catch {
    /* SSR / no window — ignore */
  }
}

// ── User directory ──────────────────────────────────────────
// Submissions are keyed by the numeric user id only, so the instructor roster
// has no name to show. Every login records id -> username here so the roster
// can label rows. Students who never logged in on this browser stay id-only.

/** id -> username map of every user seen on this browser. */
export function getUserNames() {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEYS.userNames));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

/** Record a logged-in user's username against their id. */
export function rememberUser(user) {
  if (!user?.id || !user.username) return;
  const names = getUserNames();
  if (names[user.id] === user.username) return;
  names[user.id] = user.username;
  localStorage.setItem(KEYS.userNames, JSON.stringify(names));
}

/** Subscribe to any store change. Returns an unsubscribe fn. */
export function onStoreChange(handler) {
  const wrapped = (e) => handler(e?.detail?.key);
  window.addEventListener(STORE_EVENT, wrapped);
  window.addEventListener('storage', wrapped); // cross-tab
  return () => {
    window.removeEventListener(STORE_EVENT, wrapped);
    window.removeEventListener('storage', wrapped);
  };
}

const genId = () => Date.now() + Math.floor(Math.random() * 1000);

// ── Custom Problems / Exams ─────────────────────────────────
// Shape mirrors rawProblems in problems.js so getAllProblems() can normalize it.

export function getCustomProblems() {
  return read(KEYS.problems);
}

export function saveCustomProblem(problem) {
  const list = read(KEYS.problems);
  if (problem.id) {
    const idx = list.findIndex((p) => p.id === problem.id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...problem, updatedAt: Date.now() };
      write(KEYS.problems, list);
      return list[idx];
    }
  }
  const created = { ...problem, id: problem.id || genId(), createdAt: Date.now() };
  list.push(created);
  write(KEYS.problems, list);
  return created;
}

export function deleteCustomProblem(id) {
  write(KEYS.problems, read(KEYS.problems).filter((p) => p.id !== id));
}

// ── Announcements ───────────────────────────────────────────

export function getAnnouncements() {
  return read(KEYS.announcements).sort(
    (a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || (b.createdAt || 0) - (a.createdAt || 0)
  );
}

export function saveAnnouncement(item) {
  const list = read(KEYS.announcements);
  if (item.id) {
    const idx = list.findIndex((a) => a.id === item.id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...item, updatedAt: Date.now() };
      write(KEYS.announcements, list);
      return list[idx];
    }
  }
  const created = { priority: 'medium', pinned: false, ...item, id: item.id || genId(), createdAt: Date.now() };
  list.push(created);
  write(KEYS.announcements, list);
  return created;
}

export function deleteAnnouncement(id) {
  write(KEYS.announcements, read(KEYS.announcements).filter((a) => a.id !== id));
}

// ── Learning Content (lessons / notes) ──────────────────────

export function getContent() {
  return read(KEYS.content).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

export function saveContent(item) {
  const list = read(KEYS.content);
  if (item.id) {
    const idx = list.findIndex((c) => c.id === item.id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...item, updatedAt: Date.now() };
      write(KEYS.content, list);
      return list[idx];
    }
  }
  const created = { type: 'article', ...item, id: item.id || genId(), createdAt: Date.now() };
  list.push(created);
  write(KEYS.content, list);
  return created;
}

export function deleteContent(id) {
  write(KEYS.content, read(KEYS.content).filter((c) => c.id !== id));
}

// ── Grading — aggregate student submissions from localStorage ─
// Submissions are stored per user under: submissions_<userId>_<mode>_<modId>

export function getAllSubmissions() {
  const out = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith('submissions_')) continue;

    const parts = key.split('_');
    if (parts.length < 4) continue;
    const modId = parts[parts.length - 1];
    const mode = parts[parts.length - 2];
    const userId = parts.slice(1, parts.length - 2).join('_');

    let subs = {};
    try {
      subs = JSON.parse(localStorage.getItem(key)) || {};
    } catch {
      subs = {};
    }

    Object.entries(subs).forEach(([step, sub]) => {
      if (!sub || typeof sub !== 'object') return;
      out.push({ key, step, userId, mode, modId, ...sub });
    });
  }
  // Newest first (timestamp is a locale string; Date parsing is best-effort).
  return out.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
}

/** Override the pass/fail grade of a stored submission. */
export function setSubmissionStatus(key, step, passed) {
  let subs = {};
  try {
    subs = JSON.parse(localStorage.getItem(key)) || {};
  } catch {
    return;
  }
  if (!subs[step]) return;
  subs[step] = { ...subs[step], passed, gradedByInstructor: true };
  localStorage.setItem(key, JSON.stringify(subs));
  try {
    window.dispatchEvent(new CustomEvent(STORE_EVENT, { detail: { key } }));
  } catch {
    /* ignore */
  }
}

// ── Exam Control (per-module schedule + time limit) ─────────
// One config per module id: { openAt, closeAt, timeLimitMin }. Consumed live by
// the student exam workspace (RightPanel) to gate submission.
const EXAM_KEY = 'its_exam_configs';

export function getExamConfigs() {
  try {
    const raw = localStorage.getItem(EXAM_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export function getExamConfig(moduleId) {
  return getExamConfigs()[String(moduleId)] || null;
}

/** config: { openAt:number|null, closeAt:number|null, timeLimitMin:number|null }. Pass null to clear. */
export function setExamConfig(moduleId, config) {
  const all = getExamConfigs();
  const id = String(moduleId);
  if (config == null) {
    delete all[id];
  } else {
    all[id] = { ...(all[id] || {}), ...config };
  }
  localStorage.setItem(EXAM_KEY, JSON.stringify(all));
  try {
    window.dispatchEvent(new CustomEvent(STORE_EVENT, { detail: { key: EXAM_KEY } }));
  } catch {
    /* ignore */
  }
  return all[id] || null;
}

/**
 * Live lock state for a module exam.
 * @param {string} moduleId
 * @param {number|null} startedAtMs when this student started the exam (exam_start_*)
 * @returns {{locked:boolean, reason:('not_open'|'closed'|'time_up'|null), cfg:object|null, remainingMs:number|null}}
 */
export function examLockState(moduleId, startedAtMs) {
  const cfg = getExamConfig(moduleId);
  if (!cfg) return { locked: false, reason: null, cfg: null, remainingMs: null };
  const now = Date.now();
  if (cfg.openAt && now < cfg.openAt) return { locked: true, reason: 'not_open', cfg, remainingMs: null };
  if (cfg.closeAt && now > cfg.closeAt) return { locked: true, reason: 'closed', cfg, remainingMs: null };
  if (cfg.timeLimitMin && startedAtMs) {
    const remainingMs = startedAtMs + cfg.timeLimitMin * 60000 - now;
    if (remainingMs <= 0) return { locked: true, reason: 'time_up', cfg, remainingMs: 0 };
    return { locked: false, reason: null, cfg, remainingMs };
  }
  return { locked: false, reason: null, cfg, remainingMs: null };
}
