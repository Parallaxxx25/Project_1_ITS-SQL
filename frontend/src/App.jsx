import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Header from './components/Header';
import Home from './components/Home';
import CourseText from './components/CourseText';
import Login from './components/Login'; 
import StepIndicator from './components/StepIndicator';
import LeftPanel from './components/LeftPanel';
import RightPanel from './components/RightPanel';
import MySubmissions from './components/MySubmissions';
import Tabs from './components/Tabs';
import FeedbackOverlay from './components/FeedbackOverlay';
import HintText from './components/HintText';
import InstructorDashboard from './components/InstructorDashboard';
import AdminPanel from './components/AdminPanel';
import { dbManager } from './lib/db-manager';
import { getAllProblems } from './lib/problems';
import { Verifier, stripSqlComments } from './lib/verifier';
import { requestClientHint, fetchClientHint, getCurrentUser, getToken, clearAuth } from './lib/api';
import { logout as authApiLogout } from './lib/auth-api';
 
import botIcon from './assets/bot.png';

export default function App() {
  const isFreshEntry = !sessionStorage.getItem('is_initialized');

  // The server is the only source of truth for the session. `user` starts
  // null and is populated by restoreSession() (below) hitting /api/auth/me
  // with the stored JWT — a hand-edited sessionStorage.userData no longer
  // grants anything, and an expired token surfaces as logged-out instead of
  // a UI that looks logged in while every call 401s.
  const [user, setUser] = useState(null);

  const isLoggedIn = !!user;

  // เอา 'courses' ออกจาก VALID_PAGES ตามโค้ดต้นฉบับของคุณ
  const VALID_PAGES = ['home', 'coursetext', 'workspace', 'instructor', 'coursemanage', 'problems', 'admin'];

  const getPageFromPath = () => {
    const path = window.location.pathname.replace(/^\//, '') || 'home';
    return VALID_PAGES.includes(path) ? path : 'home';
  };

  const [currentPage, setCurrentPage] = useState(() => {
    if (isFreshEntry) return getPageFromPath() || 'home';
    const auth = !!getToken();
    if (!auth) return 'home';
    return getPageFromPath() || sessionStorage.getItem('currentPage') || 'home';
  });

  // ✨ Browser History Integration
  const isPopstateRef = useRef(false);

  const navigateTo = useCallback((page) => {
    if (page === 'instructor' || page === 'coursemanage' || page === 'problems') {
      // TA is bundled with instructor — both get teaching access.
      const canTeach = !!user && ['instructor', 'ta'].includes(user.role);
      if (!canTeach) {
        console.warn('Access denied: staff only (instructor/ta)');
        return;
      }
    }
    if (page === 'admin' && user?.role !== 'admin') {
      console.warn('Access denied: admin only');
      return;
    }
    
    setCurrentPage(page);
    if (!isPopstateRef.current) {
      const url = page === 'home' ? '/' : `/${page}`;
      window.history.pushState({ page }, '', url);
    }
    isPopstateRef.current = false;
  }, [user]);

  useEffect(() => {
    const initialPage = getPageFromPath() || sessionStorage.getItem('currentPage') || 'home';
    const url = initialPage === 'home' ? '/' : `/${initialPage}`;
    window.history.replaceState({ page: initialPage }, '', url);

    const handlePopState = (event) => {
      const page = event.state?.page || 'home';
      isPopstateRef.current = true;
      navigateTo(page);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [navigateTo]);

  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [dbError, setDbError] = useState(null);
  const [workspaceMode, setWorkspaceMode] = useState(() => localStorage.getItem('workspaceMode') || 'COURSE');

  const handleLogout = useCallback(() => {
    authApiLogout();
    localStorage.removeItem('its_token'); // vestigial key from the retired client-side-only auth
    setUser(null);
    navigateTo('home'); 
    sessionStorage.removeItem('userData');
    sessionStorage.removeItem('isLoggedIn');
    sessionStorage.removeItem('currentPage');
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningRef.current) clearTimeout(warningRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
  }, [navigateTo]);

  const handleLogin = (user, error) => {
    if (error) {
      setLoginError(error);
      return;
    }
    if (user) {
      setUser(user);
      setShowLoginModal(false);
      setLoginError('');
      navigateTo('home');
      sessionStorage.setItem('userData', JSON.stringify(user));
      sessionStorage.setItem('isLoggedIn', 'true');
    }
  };

  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const timeoutRef = useRef(null);
  const warningRef = useRef(null);
  const countdownIntervalRef = useRef(null);

  const resetTimer = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningRef.current) clearTimeout(warningRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    
    setShowWarning(false);
    setCountdown(30);

    if (isLoggedIn) {
      // Idle window: warn at 19.5 min, auto-logout at 20 min (30s countdown).
      warningRef.current = setTimeout(() => {
        setShowWarning(true);
        countdownIntervalRef.current = setInterval(() => {
          setCountdown(prev => (prev > 0 ? prev - 1 : 0));
        }, 1000);
      }, 1170000);

      timeoutRef.current = setTimeout(() => handleLogout(), 1200000);
    }
  }, [isLoggedIn, handleLogout]);

  useEffect(() => {
    const events = ['mousemove', 'keydown', 'scroll', 'click', 'touchstart'];
    events.forEach(event => window.addEventListener(event, resetTimer));
    resetTimer();
    return () => events.forEach(event => window.removeEventListener(event, resetTimer));
  }, [resetTimer]);

  useEffect(() => {
    sessionStorage.setItem('is_initialized', 'true');

    // Revalidate the stored token against the server. Never throws — a bad
    // token just clears the session. Kept as a promise so the existing
    // isLoading gate (cleared in the finally below) covers the round-trip.
    const restoreSession = async () => {
      if (!getToken()) { clearAuth(); return; }
      try {
        const me = await getCurrentUser();   // GET /api/auth/me
        setUser(me);
        sessionStorage.setItem('userData', JSON.stringify(me));
        sessionStorage.setItem('isLoggedIn', 'true');
      } catch {
        clearAuth();
        setUser(null);
      }
    };

    const initializeApp = async () => {
      const session = restoreSession();
      try {
        if (!window.duckdb_initialized) {
          await dbManager.initialize();
          window.duckdb_initialized = true;
        }
      } catch (err) {
        console.error(err);
        setDbError(err?.message || 'ไม่สามารถเริ่มต้นฐานข้อมูล (DuckDB) ได้ กรุณารีเฟรชหน้า');
      }
      finally { await session; setIsLoading(false); }
    };
    initializeApp();
  }, []);

  useEffect(() => { sessionStorage.setItem('currentPage', currentPage); }, [currentPage]);

  const getWorkspaceKeys = useCallback(() => {
    const mode = localStorage.getItem('workspaceMode') || 'COURSE';
    const modId = localStorage.getItem('workspaceModule') || '01';
    const userId = user?.id || 'guest';
    return {
      statusKey: `statuses_${userId}_${mode}_${modId}`,
      stepKey: `currentStep_${userId}_${mode}_${modId}`,
      submissionKey: `submissions_${userId}_${mode}_${modId}`
    };
  }, [user?.id]);

  const [currentProblem, setCurrentProblem] = useState(1);
  const [selectedTab, setSelectedTab] = useState(() => localStorage.getItem('selectedTab') || 'description');
  const [problemData, setProblemData] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [moduleSubs, setModuleSubs] = useState([]);
  const [overlay, setOverlay] = useState({ visible: false, status: 'loading', message: '' });
  // Query-execution errors (bad SQL, engine timeout, …) render as an inline
  // banner in the workspace instead of the pass/fail gif overlay — students
  // need to actually read these, not have them flash by.
  const [submitError, setSubmitError] = useState(null);
  const [filteredProblemsList, setFilteredProblemsList] = useState([]);
  const [problemStatuses, setProblemStatuses] = useState([]);
  
  // Hints come from the tutor service only — see requestTutorHint/handleOpenHintPanel
  // below. currentHint is the single most recent hint text (the tutor returns one
  // hint per attempt, escalating in depth on resubmission — there's nothing to page
  // through within one attempt).
  const [currentHint, setCurrentHint] = useState(null); // { hint_text, hint_level, source } | null
  const [hasAttempted, setHasAttempted] = useState(false); // this problem has a failed/errored submission to hint on
  const [isHintOpen, setIsHintOpen] = useState(false);
  const [botAlert, setBotAlert] = useState(false);
  const hintRef = useRef(null);
  const hintPopoverRef = useRef(null);
  // Split in two calls, matching the tutor's own cost split: /grade
  // (deterministic, no LLM) fires right after a failed submit so the bot-dot
  // reflects real hint availability; /hint (the Gemini call) fires only when
  // the panel opens, so a student who never opens it never costs a Gemini call.
  // 'idle' (nothing fetched yet) | 'loading' | 'done' | 'unavailable' (service
  // unreachable at grade- or hint-time — distinct from "no attempt yet", which
  // is read from hasAttempted, and "no tutor mapping", read from problemData).
  const [tutorHintStatus, setTutorHintStatus] = useState('idle');
  const hintRequestIdRef = useRef(null);
  const lastAttemptRef = useRef({ query: '', attemptNumber: 0 });

  useEffect(() => { localStorage.setItem('selectedTab', selectedTab); }, [selectedTab]);

  // Light dismiss (click outside / Esc) closes the popover in the browser, not
  // in React — mirror it back so the FAB styling and botAlert stay in sync.
  // Native listener rather than onToggle: React 18 only wires that for <details>.
  useEffect(() => {
    const el = hintPopoverRef.current;
    if (!el) return;
    const onToggle = (e) => { if (e.newState === 'closed') setIsHintOpen(false); };
    el.addEventListener('toggle', onToggle);
    return () => el.removeEventListener('toggle', onToggle);
  }, [currentPage]);

  // Mirror isHintOpen onto the native popover. showPopover/hidePopover throw
  // if the element is already in that state, hence the guards.
  useEffect(() => {
    const el = hintPopoverRef.current;
    // Popover API is baseline since 2024; on anything older the panel simply
    // never opens rather than crashing the workspace.
    if (!el || !el.isConnected || typeof el.showPopover !== 'function') return;
    const isOpen = el.matches(':popover-open');
    if (isHintOpen && !isOpen) el.showPopover();
    if (!isHintOpen && isOpen) el.hidePopover();
  }, [isHintOpen]);

  const refreshCurrentSubmissions = useCallback((step) => {
    const { submissionKey } = getWorkspaceKeys();
    const allSubs = JSON.parse(localStorage.getItem(submissionKey)) || {};
    const specificSub = allSubs[step || currentProblem];
    setSubmissions(specificSub ? [specificSub] : []);

    // Module-wide list (latest attempt per answered question) for the student history view.
    const list = Object.keys(allSubs)
      .map((k) => {
        const stepNum = parseInt(k, 10);
        const prob = filteredProblemsList[stepNum - 1];
        return { step: stepNum, title: prob?.title || `Question ${stepNum}`, ...allSubs[k] };
      })
      .filter((s) => !Number.isNaN(s.step))
      .sort((a, b) => a.step - b.step);
    setModuleSubs(list);
  }, [getWorkspaceKeys, currentProblem, filteredProblemsList]);

  useEffect(() => {
    if (currentPage === 'workspace') {
      const mode = localStorage.getItem('workspaceMode') || 'COURSE';
      const modId = localStorage.getItem('workspaceModule') || '01';
      setWorkspaceMode(mode);

      const currentList = getAllProblems().filter(p => p.type === mode && p.moduleId === modId);
      setFilteredProblemsList(currentList);
      
      const { statusKey, stepKey } = getWorkspaceKeys();
      const savedStatuses = localStorage.getItem(statusKey);
      setProblemStatuses(savedStatuses ? JSON.parse(savedStatuses) : []);
      
      const savedStep = parseInt(localStorage.getItem(stepKey)) || 1;
      const safeStep = (savedStep >= 1 && savedStep <= currentList.length) ? savedStep : 1;

      if (currentList.length > 0) {
        const stepIndex = safeStep - 1;
        setCurrentProblem(safeStep);
        setProblemData(currentList[stepIndex]);
        refreshCurrentSubmissions(safeStep);
        setSelectedTab('description'); 
      } else {
        setProblemData({
          title: `NO CONTENT FOUND`,
          description: `กรุณาติดต่อผู้สอนเพื่อเพิ่มข้อสอบ`,
          requirements: [], table: 'N/A', columns: [], goldenQuery: ''
        });
      }
    }
  }, [currentPage, getWorkspaceKeys]);

  useEffect(() => {
    if (currentPage === 'workspace' && filteredProblemsList.length > 0) {
      const { stepKey } = getWorkspaceKeys();
      const target = filteredProblemsList[currentProblem - 1];
      if (target) {
        setProblemData(target);
        refreshCurrentSubmissions(currentProblem);
        localStorage.setItem(stepKey, currentProblem.toString());
        setSubmitError(null);
        // Leaving this problem invalidates any hint context for it.
        setHasAttempted(false);
        setCurrentHint(null);
        setTutorHintStatus('idle');
        setBotAlert(false);
        hintRequestIdRef.current = null;
      }
    }
  }, [currentProblem, filteredProblemsList, currentPage, getWorkspaceKeys, refreshCurrentSubmissions]);

  const updateProblemStatus = useCallback((index, status) => {
    setProblemStatuses(prev => {
      const next = [...prev];
      next[index] = status;
      const { statusKey } = getWorkspaceKeys();
      localStorage.setItem(statusKey, JSON.stringify(next));
      return next;
    });
  }, [getWorkspaceKeys]);

  const handleSubmit = async (code, language) => {
    if(!problemData || problemData.title === 'NO CONTENT FOUND') return;
    resetTimer();
    setSubmitError(null);
    if (dbError) {
      setSubmitError(dbError);
      return;
    }
    setOverlay({ visible: true, status: 'loading', message: 'Validating Query...' });
    try {
      const cleanCode = stripSqlComments(code);
      const verifyStart = performance.now();
      const result = await new Verifier().verify(code, problemData.goldenQuery);
      const durationMs = Math.round(performance.now() - verifyStart);

      // Surface the real engine error (syntax / unknown table / timeout) as an
      // inline workspace banner instead of silently marking "failed" — this is
      // a broken submission, not a graded wrong answer. It still deserves a
      // hint though: the tutor service can grade+hint on it same as any
      // other failed attempt.
      if (result.error) {
        setOverlay({ visible: false });
        setSubmitError(result.error);

        // EXAM gets no AI hints from any path — the failed/passed branch below
        // already checks this; this one used to leak a hint on engine errors.
        if ((localStorage.getItem('workspaceMode') || 'COURSE') === 'EXAM') return;

        const { submissionKey: errSubmissionKey } = getWorkspaceKeys();
        const errExistingSubs = JSON.parse(localStorage.getItem(errSubmissionKey)) || {};
        const errPriorAttempts = errExistingSubs[currentProblem]?.attempts?.length || 0;
        lastAttemptRef.current = { query: code, attemptNumber: errPriorAttempts + 1, isCorrect: false };

        setHasAttempted(true);
        setCurrentHint(null);
        setTutorHintStatus('idle');
        requestTutorHint(code, errPriorAttempts + 1, false);
        return;
      }
      const hasSemicolon = cleanCode.trim().endsWith(';');
      const isPassed = result.success && hasSemicolon;
      
      updateProblemStatus(currentProblem - 1, isPassed ? 'passed' : 'failed');

      const { submissionKey } = getWorkspaceKeys();
      const mode = localStorage.getItem('workspaceMode') || 'COURSE';
      const modId = localStorage.getItem('workspaceModule') || '01';
      // DuckDB returns BIGINT columns as JS BigInt, which JSON.stringify cannot serialize
      // (it throws) — sanitize to plain numbers so the whole submission persists to localStorage.
      const jsonSafe = (v) => (v == null ? v : JSON.parse(JSON.stringify(v, (_, val) => (typeof val === 'bigint' ? Number(val) : val))));
      const safeResult = jsonSafe(result.studentResult);

      const existingSubs = JSON.parse(localStorage.getItem(submissionKey)) || {};
      const prev = existingSubs[currentProblem];
      // Preserve every attempt. Older records stored only the latest object → seed history from it.
      const priorAttempts = Array.isArray(prev?.attempts)
        ? prev.attempts
        : (prev ? [{ code: prev.code, passed: prev.passed, timestamp: prev.timestamp, queryResult: prev.queryResult }] : []);
      const thisAttempt = { code, passed: isPassed, timestamp: new Date().toLocaleString(), submittedAt: Date.now(), durationMs, queryResult: safeResult };
      lastAttemptRef.current = { query: code, attemptNumber: priorAttempts.length + 1, isCorrect: isPassed };
      // Latest fields stay top-level for backward compatibility (instructor grading, score view, etc.).
      const newSubmission = { ...thisAttempt, attempts: [...priorAttempts, thisAttempt] };
      existingSubs[currentProblem] = newSubmission;
      localStorage.setItem(submissionKey, JSON.stringify(existingSubs));

      if (isPassed && user) {
        if (mode === 'ASSIGNMENT') {
          const { statusKey } = getWorkspaceKeys();
          const updatedStatuses = JSON.parse(localStorage.getItem(statusKey)) || [];
          updatedStatuses[currentProblem - 1] = 'passed';
          const totalProblems = getAllProblems().filter(p => p.type === 'ASSIGNMENT' && p.moduleId === modId).length;
          const allPassed = totalProblems > 0 && updatedStatuses.filter(s => s === 'passed').length >= totalProblems;
          if (allPassed) {
            const storageKey = `course_06070999_${user.id}_${mode}_lessons`;
            const savedLessons = JSON.parse(localStorage.getItem(storageKey)) || [];
            const updatedLessons = savedLessons.map(lesson => lesson.id === modId ? { ...lesson, status: 'COMPLETED' } : lesson);
            localStorage.setItem(storageKey, JSON.stringify(updatedLessons));
          }
        } else {
          const storageKey = `course_06070999_${user.id}_${mode}_lessons`;
          const savedLessons = JSON.parse(localStorage.getItem(storageKey)) || [];
          const updatedLessons = savedLessons.map(lesson => lesson.id === modId ? { ...lesson, status: 'COMPLETED' } : lesson);
          localStorage.setItem(storageKey, JSON.stringify(updatedLessons));
        }
      }

      if (!isPassed && mode !== 'EXAM') {
        setHasAttempted(true);
        setCurrentHint(null);
        // Reset — a fresh failed attempt means the previous attempt's
        // fetched (or unavailable) tutor hint no longer applies.
        setTutorHintStatus('idle');
        hintRequestIdRef.current = null;
        if (result.success && !hasSemicolon) {
          // Missing-semicolon is a client-grading rule the tutor never sees
          // (it never receives a query that "succeeded" client-side but was
          // rejected for this) — shown locally, no tutor round trip.
          setCurrentHint({ hint_text: "Syntax Error: SQL queries must end with a semicolon (;).", hint_level: null, source: 'local' });
          setTutorHintStatus('done');
          setBotAlert(true);
        } else {
          requestTutorHint(code, priorAttempts.length + 1, isPassed);
        }
      } else { setBotAlert(false); }

      refreshCurrentSubmissions(currentProblem);
      setOverlay({ visible: true, status: isPassed ? 'success' : 'error' });
      setTimeout(() => {
        setOverlay({ visible: false });
        setSelectedTab('submissions');
        if (isPassed && mode === 'EXAM') {
          const totalSteps = filteredProblemsList.length;
          const { statusKey } = getWorkspaceKeys();
          const latestStatuses = JSON.parse(localStorage.getItem(statusKey)) || [];
          latestStatuses[currentProblem - 1] = 'passed';
          for (let i = 0; i < totalSteps; i++) {
            if (latestStatuses[i] !== 'passed') {
              setCurrentProblem(i + 1);
              return;
            }
          }
        }
      }, 1500);
    } catch (err) {
      setOverlay({ visible: false });
      setSubmitError(err?.message || 'เกิดข้อผิดพลาดในการตรวจคำตอบ');
    }
  };

  // "Run Code" — the scratch pad. Runs the student's query and shows the rows,
  // nothing else: no submission record, no step status, and deliberately no
  // correctness verdict (that stays Submit's job, so Run can't be used as a
  // free grader). A query that *errors* still buys a tutor hint, and therefore
  // still costs an attempt on the escalation ladder.
  const handleRunCode = async (code) => {
    if (!problemData || problemData.title === 'NO CONTENT FOUND') return null;
    if (dbError) return { error: dbError };

    const cleanCode = stripSqlComments(code);
    if (!cleanCode.trim().endsWith(';')) {
      // Client-side formatting rule: nothing ran, so it costs nothing.
      return { error: 'Syntax Error: SQL queries must end with a semicolon (;).' };
    }

    try {
      const result = await dbManager.executeReadOnly(cleanCode.trim().replace(/;+\s*$/, ''));
      // Flatten Arrow row proxies into plain objects, in schema column order —
      // ResultTable reads its headers off Object.keys(rows[0]).
      const cols = result?.columns || [];
      const rows = (result?.rows || []).map(
        (r) => Object.fromEntries(cols.map((c) => [c, r[c]]))
      );
      return { rows };
    } catch (err) {
      const mode = localStorage.getItem('workspaceMode') || 'COURSE';
      if (mode !== 'EXAM') {
        const { submissionKey } = getWorkspaceKeys();
        const existingSubs = JSON.parse(localStorage.getItem(submissionKey)) || {};
        // Read-only: an errored run is never written back to the submission
        // history, so it stays out of My Submissions and instructor grading.
        const priorAttempts = existingSubs[currentProblem]?.attempts?.length || 0;
        lastAttemptRef.current = { query: code, attemptNumber: priorAttempts + 1, isCorrect: false };
        setHasAttempted(true);
        setCurrentHint(null);
        setTutorHintStatus('idle');
        hintRequestIdRef.current = null;
        requestTutorHint(code, priorAttempts + 1, false);
      }
      return { error: err?.message || 'เกิดข้อผิดพลาดในการรันคำสั่ง' };
    }
  };

  // Called right after a failed/errored submit — the deterministic /grade
  // call only (no LLM), just to learn whether a hint is mintable and, if so,
  // stash the token for handleOpenHintPanel to redeem later. Never shows a
  // loading state: this is a ~50ms round trip, not the Gemini call.
  const requestTutorHint = useCallback(async (query, attemptNumber, isCorrect) => {
    const tutorProblemId = problemData?.tutorProblemId;
    hintRequestIdRef.current = null;
    if (!tutorProblemId) { setBotAlert(false); return; } // no tutor-side mapping for this problem (e.g. instructor-authored)
    try {
      const req = await requestClientHint(tutorProblemId, query, isCorrect, attemptNumber);
      if (req.hint_available && req.hint_request_id) {
        hintRequestIdRef.current = req.hint_request_id;
        setBotAlert(true);
      } else {
        setBotAlert(false);
      }
    } catch {
      // Tutor service unreachable at grade time — go straight to the
      // Retry state so opening the panel doesn't spend a second failing
      // round trip finding this out.
      setBotAlert(true);
      setTutorHintStatus('unavailable');
    }
  }, [problemData]);

  // Fetches the tutor AI hint (the Gemini call) — called only when the
  // student opens the hint panel, so it fires at most once per attempt.
  const handleOpenHintPanel = useCallback(() => {
    if (!problemData?.tutorProblemId || !hasAttempted) return;
    if (tutorHintStatus === 'loading' || tutorHintStatus === 'done') return;
    if (!hintRequestIdRef.current) {
      setTutorHintStatus('unavailable');
      return;
    }
    setTutorHintStatus('loading');
    (async () => {
      try {
        const tutorHint = await fetchClientHint(hintRequestIdRef.current);
        setCurrentHint(tutorHint);
        setTutorHintStatus('done');
      } catch {
        setTutorHintStatus('unavailable');
      }
    })();
  }, [tutorHintStatus, hasAttempted, problemData]);

  // Retry from the panel's "unavailable" state — re-runs whichever half of
  // the flow didn't complete (grade, if the token never landed; hint,
  // otherwise), rather than assuming which one failed.
  const retryTutorHint = useCallback(() => {
    setTutorHintStatus('idle');
    (async () => {
      if (!hintRequestIdRef.current) {
        const { query, attemptNumber, isCorrect } = lastAttemptRef.current;
        if (!query) { setTutorHintStatus('unavailable'); return; }
        await requestTutorHint(query, attemptNumber, isCorrect);
      }
      if (hintRequestIdRef.current) {
        setTutorHintStatus('loading');
        try {
          const tutorHint = await fetchClientHint(hintRequestIdRef.current);
          setCurrentHint(tutorHint);
          setTutorHintStatus('done');
        } catch {
          setTutorHintStatus('unavailable');
        }
      } else {
        setTutorHintStatus('unavailable');
      }
    })();
  }, [requestTutorHint]);

  const handleStepChange = useCallback((newStep) => {
    const mode = localStorage.getItem('workspaceMode') || 'COURSE';
    if (mode === 'EXAM' && problemStatuses[newStep - 1] === 'passed') return;
    if (newStep > currentProblem && problemStatuses[currentProblem - 1] !== 'passed') {
      updateProblemStatus(currentProblem - 1, 'skipped');
    }
    setCurrentProblem(newStep);
    setSelectedTab('description');
  }, [problemStatuses, currentProblem, updateProblemStatus]);

  // ตรวจสอบหน้าที่ต้องการ Full-width
  const isFullWidthPage = ['home'].includes(currentPage);
  const isWorkspace = currentPage === 'workspace';
  const isTeachPage = ['instructor', 'coursemanage', 'problems'].includes(currentPage);
  // TA is bundled with instructor — both count as teaching staff.
  const canTeach = !!user && ['instructor', 'ta'].includes(user.role);
  const isAdmin = user?.role === 'admin';

  // Locked steps (EXAM only) — memoized to keep StepIndicator from re-rendering needlessly
  const lockedSteps = useMemo(
    () => (workspaceMode === 'EXAM' ? problemStatuses.map((s) => s === 'passed') : []),
    [workspaceMode, problemStatuses]
  );

  if (isLoading) return <FeedbackOverlay isVisible={true} />;

  return (
    <div className="min-h-screen bg-[#F8F9FA] font-sans text-slate-800 selection:bg-[#FF9900]/20 overflow-x-hidden relative">

      {/* Modern Session Warning Modal */}
      {showWarning && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm transition-all duration-300">
          <div className="bg-white rounded-3xl shadow-2xl p-10 max-w-sm w-full text-center space-y-6 animate-in zoom-in-95 duration-200">
            <div className="text-5xl mb-2 flex justify-center">
              <svg className="w-16 h-16 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
            </div>
            <h3 className="text-2xl font-bold text-[#03045e] tracking-tight">Session Expiring</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              ระบบจะทำการออกจากระบบอัตโนมัติในอีก <br/>
              <span className="text-[#ef4444] font-bold text-2xl">{countdown}</span> วินาที
            </p>
            <button onClick={resetTimer} className="w-full bg-[#03045e] hover:bg-[#020344] text-white py-4 rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-md hover:shadow-lg mt-2">
              Stay Connected
            </button>
          </div>
        </div>
      )}

      {overlay.visible && <FeedbackOverlay isVisible={overlay.visible} />}
      {showLoginModal && !isLoggedIn && <Login onLogin={handleLogin} onClose={() => { setShowLoginModal(false); setLoginError(''); }} loginError={loginError} />}
      
      <Header currentPage={currentPage} onNavigate={navigateTo} isLoggedIn={isLoggedIn} userData={user} onLogout={handleLogout} onLoginClick={() => setShowLoginModal(true)} />

      {/*
        Navbar is fixed h-20 (80px). Workspace needs extra top clearance so it
        doesn't tuck under the navbar; other pages self-manage their own top padding.
      */}
      <main className={`relative z-10 min-h-[calc(100vh-80px)] pb-20 ${isWorkspace || isTeachPage ? 'pt-28 md:pt-32' : 'pt-12 md:pt-16'} ${isFullWidthPage ? 'w-full' : 'container mx-auto px-4 sm:px-6'}`}>
        {currentPage === 'home' && <Home onNavigate={navigateTo} onShowLogin={() => setShowLoginModal(true)} isLoggedIn={isLoggedIn} user={user} />}
        {isLoggedIn ? (
          <>
            {currentPage === 'coursetext' && <CourseText onNavigate={navigateTo} user={user} />}
            {/* instructor / coursemanage / problems all resolve to the unified console */}
            {(currentPage === 'instructor' || currentPage === 'coursemanage' || currentPage === 'problems') && canTeach && <InstructorDashboard onNavigate={navigateTo} user={user} />}
            {currentPage === 'admin' && isAdmin && <AdminPanel onNavigate={navigateTo} />}
            
            {/* Workspace Area */}
            {currentPage === 'workspace' && problemData && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-32">
                <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-[#03045e] text-white flex items-center justify-center shadow-[0_8px_20px_rgba(3,4,94,0.25)] shrink-0">
                      <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                    </div>
                    <div>
                      <h1 className="text-2xl sm:text-3xl font-bold text-[#03045e] tracking-tight leading-none">
                        SQL Assignment
                      </h1>
                      <p className="text-slate-400 text-[11px] sm:text-xs font-semibold mt-2 uppercase tracking-[0.15em]">
                        {workspaceMode} Mode · Problem {currentProblem} / {filteredProblemsList.length || 1}
                      </p>
                    </div>
                  </div>
                  <button onClick={() => navigateTo('coursetext')} className="bg-white border border-slate-200 text-[#03045e] px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:border-slate-300 hover:bg-slate-50 hover:-translate-y-0.5 active:translate-y-0 focus-visible:ring-2 focus-visible:ring-[#03045e]/30 transition-all flex items-center gap-2 shadow-sm outline-none">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                    Back to Lesson
                  </button>
                </div>

                <StepIndicator totalSteps={filteredProblemsList.length || 1} currentStep={currentProblem} onStepChange={handleStepChange} statuses={problemStatuses} lockedSteps={lockedSteps} />

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <LeftPanel problemData={problemData} currentStep={currentProblem} />
                  <div className="lg:col-span-2 relative z-20 flex flex-col gap-6">
                    <Tabs selectedTab={selectedTab} onTabChange={setSelectedTab} />
                    {selectedTab === 'description' ? (
                      <RightPanel problemData={problemData} currentStep={currentProblem} onSubmit={handleSubmit} onRun={handleRunCode} isExamLocked={workspaceMode === 'EXAM' && problemStatuses[currentProblem - 1] === 'passed'} submitError={submitError} />
                    ) : (
                      <MySubmissions submissions={submissions} moduleSubs={moduleSubs} problemData={problemData} />
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          currentPage !== 'home' && <Home onNavigate={navigateTo} onShowLogin={() => setShowLoginModal(true)} isLoggedIn={isLoggedIn} user={user} />
        )}
      </main>

      {/* --- ✨ REDESIGNED AI ASSISTANT (Modern Minimal / HUD Style) ✨ --- */}
      {currentPage === 'workspace' && isLoggedIn && workspaceMode !== 'EXAM' && (
        <>
          <div className="fixed bottom-8 right-8 z-[2000] flex flex-col items-end pointer-events-none" ref={hintRef}>

            {/* Chat Bubble / Hint Panel — a native popover, so the browser
                handles light dismiss: one click outside closes it AND still
                reaches whatever was clicked, with no backdrop swallowing it. */}
            <div
              popover="auto"
              ref={hintPopoverRef}
              className="hint-popover pointer-events-auto fixed inset-auto right-8 bottom-[124px] origin-bottom-right">
              <div className="bg-white rounded-[2rem] shadow-[0_30px_80px_-20px_rgba(3,4,94,0.3)] border border-slate-100 w-[90vw] max-w-[420px] overflow-hidden flex flex-col relative">
                
                {/* Panel Header */}
                <div className="bg-white text-[#03045e] border-b border-slate-100 px-8 py-6 flex items-center justify-between relative overflow-hidden">
                  <div className="flex items-center gap-4 relative z-10">
                    <div className="w-11 h-11 bg-slate-50 rounded-full flex items-center justify-center border border-slate-200 shrink-0">
                      <img src={botIcon} className="w-8 h-8 object-contain" alt="AI Bot" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm tracking-widest uppercase text-[#03045e] leading-tight">AI SQL Agent</h4>
                      <p className="text-[#FF9900] text-[10px] font-medium uppercase tracking-[0.2em] mt-1">Analysis Engine</p>
                    </div>
                  </div>
                  <button onClick={() => setIsHintOpen(false)} className="relative z-10 w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
                  </button>
                </div>
                
                {/* Panel Body */}
                <div className="p-8 bg-[#FAFAFA] flex flex-col min-h-[260px]">
                  {!problemData?.tutorProblemId ? (
                    <div className="flex flex-col items-center justify-center flex-1 text-slate-400 gap-4">
                      <div className="w-16 h-16 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center">
                        <svg className="w-6 h-6 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                      </div>
                      <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 text-center">AI hints aren't available<br/>for this problem</p>
                    </div>
                  ) : !hasAttempted ? (
                    <div className="flex flex-col items-center justify-center flex-1 text-slate-400 gap-4">
                      <div className="w-16 h-16 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center">
                        <svg className="w-6 h-6 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                      </div>
                      <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Submit a query to get a hint</p>
                    </div>
                  ) : tutorHintStatus === 'loading' ? (
                    <div className="flex flex-col items-center justify-center flex-1 text-slate-400 gap-4">
                      <div className="w-16 h-16 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center animate-pulse">
                        <svg className="w-6 h-6 text-[#FF9900]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                      </div>
                      <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">AI Tutor is thinking...</p>
                    </div>
                  ) : tutorHintStatus === 'unavailable' ? (
                    <div className="flex flex-col items-center justify-center flex-1 text-slate-400 gap-4">
                      <div className="w-16 h-16 rounded-full bg-red-50 border border-red-100 flex items-center justify-center">
                        <svg className="w-6 h-6 text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"></path></svg>
                      </div>
                      <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 text-center">Couldn't reach the AI Tutor</p>
                      <button
                        onClick={(e) => { e.stopPropagation(); retryTutorHint(); }}
                        className="bg-[#03045e] text-white px-6 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-[#020344] transition-all shadow-md"
                      >
                        Try again
                      </button>
                    </div>
                  ) : currentHint ? (
                    <div className="flex-1 flex flex-col animate-in fade-in duration-300">
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#03045e]/5 border border-[#03045e]/10 mb-6 self-start">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#FF9900] animate-pulse"></span>
                        <span className="text-[#03045e] text-[10px] font-bold uppercase tracking-widest">
                          {currentHint.hint_level ? `Hint ${currentHint.hint_level} of 4` : 'Hint'}
                        </span>
                      </div>
                      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex-1">
                        <HintText text={currentHint.hint_text} />
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center flex-1 text-slate-400 gap-4">
                      <div className="w-16 h-16 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center">
                        <svg className="w-6 h-6 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                      </div>
                      <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Submit a query to get a hint</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Floating Action Button (Clean / Elegant) */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                const opening = !isHintOpen;
                setIsHintOpen(opening);
                setBotAlert(false);
                if (opening) handleOpenHintPanel();
              }}
              className={`pointer-events-auto relative w-16 h-16 md:w-[72px] md:h-[72px] rounded-full flex items-center justify-center transition-all duration-500 ease-out z-10
                ${isHintOpen
                  ? 'bg-white border border-slate-200 scale-90 shadow-sm hover:bg-slate-50'
                  : 'bg-white border border-slate-200 shadow-[0_15px_40px_-10px_rgba(0,0,0,0.18)] hover:shadow-[0_20px_50px_-10px_rgba(0,0,0,0.28)] hover:-translate-y-1'
                }`}
            >
              {/* Alert Indicator (Glowing Dot) */}
              {botAlert && !isHintOpen && (
                <>
                  <span className="absolute inset-0 rounded-full animate-ping bg-[#FF9900] opacity-40 duration-1000"></span>
                  <span className="absolute top-0 right-0 md:top-1 md:right-1 w-4 h-4 bg-[#FF9900] border-2 border-[#03045e] rounded-full z-20"></span>
                </>
              )}
              <img 
                src={botIcon} 
                alt="AI Agent" 
                className={`w-9 h-9 md:w-11 md:h-11 object-contain transition-all duration-500 ${isHintOpen ? 'opacity-60' : ''}`}
              />
            </button>
          </div>
        </>
      )}
    </div>
  );
}