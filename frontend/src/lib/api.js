/**
 * API Service Layer — communicates with the FastAPI backend.
 * Replaces localStorage/DuckDB-WASM for data operations.
 */

// Normalized to always end with '/api'. Set VITE_API_URL to the hosted backend
// in production (with or without the /api suffix). Dev: unset → '/api' (Vite proxy).
const API_BASE = (() => {
  let b = (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '');
  if (!/\/api$/.test(b)) b += '/api';
  return b;
})();

// ─── Token Management ─────────────────────────────────────

let _token = sessionStorage.getItem('jwt_token') || null;

export function setToken(token) {
  _token = token;
  if (token) {
    sessionStorage.setItem('jwt_token', token);
  } else {
    sessionStorage.removeItem('jwt_token');
  }
}

export function getToken() {
  return _token;
}

export function clearAuth() {
  _token = null;
  sessionStorage.removeItem('jwt_token');
  sessionStorage.removeItem('userData');
  sessionStorage.removeItem('isLoggedIn');
}

// ─── Fetch Wrapper ────────────────────────────────────────

async function apiFetch(path, options = {}, timeoutMs = 15000) {
  const url = `${API_BASE}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (_token) {
    headers['Authorization'] = `Bearer ${_token}`;
  }

  // Timeout so a hung request can't block the UI forever.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response;
  try {
    response = await fetch(url, { ...options, headers, signal: controller.signal });
  } catch (err) {
    // Distinguish timeout vs offline/CORS — both are network-level failures.
    if (err.name === 'AbortError') throw new Error('การเชื่อมต่อหมดเวลา กรุณาลองใหม่');
    throw new Error('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาตรวจสอบเครือข่าย');
  } finally {
    clearTimeout(timer);
  }

  if (response.status === 401) {
    clearAuth();
    // Don't force reload — let the app handle re-auth gracefully
    throw new Error('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่');
  }

  if (response.status === 204) {
    return null; // No content
  }

  // Body may not be JSON (500 HTML page, proxy error) — guard the parse.
  let data = {};
  try { data = await response.json(); } catch { /* non-JSON body */ }

  if (!response.ok) {
    throw new Error(data.detail || `เกิดข้อผิดพลาด (${response.status})`);
  }

  return data;
}

// ─── Auth ─────────────────────────────────────────────────

export async function loginWithGoogle(accessToken, role = 'student') {
  const data = await apiFetch('/auth/google', {
    method: 'POST',
    body: JSON.stringify({ access_token: accessToken, role }),
  });
  setToken(data.access_token);
  return data;
}

export async function getCurrentUser() {
  return apiFetch('/auth/me');
}

// ─── Courses ──────────────────────────────────────────────

export async function listCourses() {
  return apiFetch('/courses');
}

export async function getCourse(courseId) {
  return apiFetch(`/courses/${courseId}`);
}

export async function createCourse(payload) {
  return apiFetch('/courses', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateCourse(courseId, payload) {
  return apiFetch(`/courses/${courseId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteCourse(courseId) {
  return apiFetch(`/courses/${courseId}`, { method: 'DELETE' });
}

export async function enrollInCourse(courseId, accessCode) {
  return apiFetch(`/courses/${courseId}/enroll`, {
    method: 'POST',
    body: JSON.stringify({ access_code: accessCode }),
  });
}

export async function listStudents(courseId) {
  return apiFetch(`/courses/${courseId}/students`);
}

// ─── Modules ──────────────────────────────────────────────

export async function listModules(courseId) {
  return apiFetch(`/courses/${courseId}/modules`);
}

export async function createModule(courseId, payload) {
  return apiFetch(`/courses/${courseId}/modules`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateModule(moduleId, payload) {
  return apiFetch(`/courses/modules/${moduleId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteModule(moduleId) {
  return apiFetch(`/courses/modules/${moduleId}`, { method: 'DELETE' });
}

// ─── Lessons ──────────────────────────────────────────────

export async function listLessons(moduleId) {
  return apiFetch(`/courses/modules/${moduleId}/lessons`);
}

export async function createLesson(moduleId, payload) {
  return apiFetch(`/courses/modules/${moduleId}/lessons`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateLesson(lessonId, payload) {
  return apiFetch(`/courses/lessons/${lessonId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteLesson(lessonId) {
  return apiFetch(`/courses/lessons/${lessonId}`, { method: 'DELETE' });
}

// ─── Problems ─────────────────────────────────────────────

export async function listProblems(lessonId) {
  return apiFetch(`/problems/lesson/${lessonId}`);
}

export async function getProblem(problemId) {
  return apiFetch(`/problems/${problemId}`);
}

export async function createProblem(lessonId, payload) {
  return apiFetch(`/problems/lesson/${lessonId}`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateProblem(problemId, payload) {
  return apiFetch(`/problems/${problemId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteProblem(problemId) {
  return apiFetch(`/problems/${problemId}`, { method: 'DELETE' });
}

// ─── Hints ────────────────────────────────────────────────

export async function listHints(problemId) {
  return apiFetch(`/problems/${problemId}/hints`);
}

export async function createHint(problemId, payload) {
  return apiFetch(`/problems/${problemId}/hints`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// ─── Submissions ──────────────────────────────────────────
// The server-graded POST /submissions + POST /{id}/hint pair was removed —
// the live app grades entirely client-side (App.jsx::handleSubmit) and
// never called either. See backend/app/api/submissions.py for the note.

// ─── Tutor hint (client-graded flow) ───────────────────────
// handleSubmit grades entirely in the browser (DuckDB-WASM) — these two
// mirror POST /submissions/hint-request + POST /submissions/hint-request/{id}/hint,
// the actual path the tutor service is reached from.

// tutorProblemId is the tutor service's own problem id — see the
// hand-mapped tutorProblemId field in lib/problems.js, not this problem's
// own frontend id.
export async function requestClientHint(tutorProblemId, query, isCorrect, attemptNumber = 1) {
  return apiFetch('/submissions/hint-request', {
    method: 'POST',
    body: JSON.stringify({
      tutor_problem_id: tutorProblemId,
      query,
      is_correct: isCorrect,
      attempt_number: attemptNumber,
    }),
  });
}

export async function fetchClientHint(hintRequestId) {
  return apiFetch(`/submissions/hint-request/${hintRequestId}/hint`, { method: 'POST' }, 30000);
}

export async function getMySubmissions(problemId = null, limit = 50) {
  let path = `/submissions/my?limit=${limit}`;
  if (problemId) path += `&problem_id=${problemId}`;
  return apiFetch(path);
}

export async function getSubmissionsForProblem(problemId) {
  return apiFetch(`/submissions/problem/${problemId}/all`);
}

export async function getSubmissionsForStudent(studentId) {
  return apiFetch(`/submissions/student/${studentId}`);
}

// ─── Dashboard ────────────────────────────────────────────

export async function getMyProgress(courseId = null) {
  let path = '/dashboard/my-progress';
  if (courseId) path += `?course_id=${courseId}`;
  return apiFetch(path);
}

export async function getClassAnalytics(courseId) {
  return apiFetch(`/dashboard/class/${courseId}`);
}

export async function getStudentProgressList(courseId) {
  return apiFetch(`/dashboard/class/${courseId}/students`);
}

// ─── Admin ────────────────────────────────────────────────

export async function listUsers(role = null, search = null) {
  let path = '/admin/users?';
  if (role) path += `role=${role}&`;
  if (search) path += `search=${encodeURIComponent(search)}&`;
  return apiFetch(path);
}

export async function getUser(userId) {
  return apiFetch(`/admin/users/${userId}`);
}

export async function updateUserRole(userId, payload) {
  return apiFetch(`/admin/users/${userId}/role`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function assignRoleByEmail(email, role) {
  return apiFetch('/admin/users/assign-role', {
    method: 'POST',
    body: JSON.stringify({ email, role }),
  });
}

export async function deactivateUser(userId) {
  return apiFetch(`/admin/users/${userId}/deactivate`, { method: 'PUT' });
}

export async function getSystemStats() {
  return apiFetch('/admin/stats');
}

// ─── Assignments ──────────────────────────────────────────

export async function listAssignments(courseId) {
  return apiFetch(`/admin/courses/${courseId}/assignments`);
}

export async function createAssignment(courseId, payload) {
  return apiFetch(`/admin/courses/${courseId}/assignments`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateAssignment(assignmentId, payload) {
  return apiFetch(`/admin/assignments/${assignmentId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteAssignment(assignmentId) {
  return apiFetch(`/admin/assignments/${assignmentId}`, { method: 'DELETE' });
}

// ─── TA Management ────────────────────────────────────────

export async function assignTA(courseId, userId) {
  return apiFetch(`/admin/courses/${courseId}/ta/${userId}`, { method: 'POST' });
}

export async function removeTA(courseId, userId) {
  return apiFetch(`/admin/courses/${courseId}/ta/${userId}`, { method: 'DELETE' });
}

// ─── Health ───────────────────────────────────────────────

export async function healthCheck() {
  return apiFetch('/health');
}
