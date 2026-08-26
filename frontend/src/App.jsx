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
import InstructorDashboard from './components/InstructorDashboard';
import AdminPanel from './components/AdminPanel';
import { dbManager } from './lib/db-manager';
import { getAllProblems } from './lib/problems';
import { Verifier, stripSqlComments } from './lib/verifier';
import { HintEngine } from './lib/hint-engine';
import { requestClientHint, fetchClientHint } from './lib/api';
import { logout as authApiLogout } from './lib/auth-api';
 
import botIcon from './assets/bot.png';

// ── Authorized Instructors ─────────────────────────────────────
const AUTHORIZED_INSTRUCTORS = [
  'ผศ.ดร.กนกวรรณ อัจฉริยะชาญวณิช',
  'ดร.ศิรสิทธิ์ โล่ชนะจิต',
  'นายพชร พรอโนทัย',
  'นายณัฐวีร์ เแนกำพล',
]; 

export default function App() {
  const isFreshEntry = !sessionStorage.getItem('is_initialized');

  const [user, setUser] = useState(() => {
    if (isFreshEntry) return null;
    const saved = sessionStorage.getItem('userData');
    return saved ? JSON.parse(saved) : null;
  });

  const isLoggedIn = !!user;

  // เอา 'courses' ออกจาก VALID_PAGES ตามโค้ดต้นฉบับของคุณ
  const VALID_PAGES = ['home', 'coursetext', 'workspace', 'instructor', 'coursemanage', 'problems', 'admin'];

  const getPageFromPath = () => {
    const path = window.location.pathname.replace(/^\//, '') || 'home';
    return VALID_PAGES.includes(path) ? path : 'home';
  };

  const [currentPage, setCurrentPage] = useState(() => {
    if (isFreshEntry) return getPageFromPath() || 'home';
    const auth = sessionStorage.getItem('isLoggedIn') === 'true';
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
    const initializeApp = async () => {
      try { 
        if (!window.duckdb_initialized) {
          await dbManager.initialize(); 
          window.duckdb_initialized = true;
        }
      } catch (err) {
        console.error(err);
        setDbError(err?.message || 'ไม่สามารถเริ่มต้นฐานข้อมูล (DuckDB) ได้ กรุณารีเฟรชหน้า');
      }
      finally { setIsLoading(false); }
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
  
  const [currentHints, setCurrentHints] = useState([]);
  const [hintIndex, setHintIndex] = useState(0);
  const [isHintOpen, setIsHintOpen] = useState(false);
  const [botAlert, setBotAlert] = useState(false);
  const hintRef = useRef(null);
  // Tutor AI hint (see App.jsx::handleSubmit + the bot-button onClick below)
  // is fetched on-demand — only when the student opens this panel, not on
  // every failed submit, to keep it to one Gemini call per attempt.
  // 'idle' | 'loading' | 'done' | 'unavailable'
  const [tutorHintStatus, setTutorHintStatus] = useState('idle');
  const lastAttemptRef = useRef({ query: '', attemptNumber: 0 });

  useEffect(() => { localStorage.setItem('selectedTab', selectedTab); }, [selectedTab]);

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
      // hint though: HintEngine has a dedicated syntax-error branch, and the
      // tutor service can grade+hint on it same as any other failed attempt.
      if (result.error) {
        setOverlay({ visible: false });
        setSubmitError(result.error);

        setTutorHintStatus('idle');
        const hints = new HintEngine().generateHints(cleanCode, result, problemData);
        setCurrentHints(hints); setHintIndex(0); setBotAlert(true);

        const { submissionKey: errSubmissionKey } = getWorkspaceKeys();
        const errExistingSubs = JSON.parse(localStorage.getItem(errSubmissionKey)) || {};
        const errPriorAttempts = errExistingSubs[currentProblem]?.attempts?.length || 0;
        lastAttemptRef.current = { query: code, attemptNumber: errPriorAttempts + 1, isCorrect: false };
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

      let hints = [];
      if (!isPassed && mode !== 'EXAM') {
        // Reset — a fresh failed attempt means the previous attempt's
        // fetched (or unavailable) tutor hint no longer applies.
        setTutorHintStatus('idle');
        hints = new HintEngine().generateHints(cleanCode, result, problemData);
        if (result.success && !hasSemicolon) hints = [{ message: "Syntax Error: SQL queries must end with a semicolon (;)." }];
        setCurrentHints(hints); setHintIndex(0); setBotAlert(true); 
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

  // Fetches the tutor AI hint on-demand — called only when the student
  // opens the hint panel (not on every failed submit), so the tutor
  // service's Gemini call fires at most once per attempt. The local
  // HintEngine hints already showing stay as the offline fallback if this
  // never resolves.
  const handleOpenHintPanel = () => {
    const tutorProblemId = problemData?.tutorProblemId;
    if (!tutorProblemId || tutorHintStatus !== 'idle') return;
    const { query, attemptNumber, isCorrect } = lastAttemptRef.current;
    if (!query || isCorrect) return;

    setTutorHintStatus('loading');
    (async () => {
      try {
        const req = await requestClientHint(tutorProblemId, query, isCorrect, attemptNumber);
        if (!req.hint_available || !req.hint_request_id) {
          setTutorHintStatus('unavailable');
          return;
        }
        const tutorHint = await fetchClientHint(req.hint_request_id);
        setCurrentHints((prev) => [{ message: tutorHint.hint_text }, ...prev]);
        setHintIndex(0);
        setTutorHintStatus('done');
      } catch {
        // Tutor service unreachable — the local hints already shown cover this.
        setTutorHintStatus('unavailable');
      }
    })();
  };

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
            {currentPage === 'admin' && <AdminPanel onNavigate={navigateTo} />}
            
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
                      <RightPanel problemData={problemData} currentStep={currentProblem} onSubmit={handleSubmit} isExamLocked={workspaceMode === 'EXAM' && problemStatuses[currentProblem - 1] === 'passed'} submitError={submitError} />
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
          {/* Backdrop for overlay */}
          {isHintOpen && (
            <div className="fixed inset-0 z-[1999] bg-slate-900/10 backdrop-blur-sm transition-opacity duration-300" onClick={() => setIsHintOpen(false)}></div>
          )}
          
          <div className="fixed bottom-8 right-8 z-[2000] flex flex-col items-end pointer-events-none" ref={hintRef}>
            
            {/* Chat Bubble / Hint Panel */}
            <div className={`pointer-events-auto absolute bottom-[calc(100%+20px)] right-0 transition-all duration-500 ease-out origin-bottom-right ${isHintOpen ? 'scale-100 opacity-100 translate-y-0' : 'scale-95 opacity-0 translate-y-8 pointer-events-none'}`}>
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
                  {currentHints.length > 0 ? (
                    <div className="flex-1 flex flex-col animate-in fade-in duration-300">
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#03045e]/5 border border-[#03045e]/10 mb-6 self-start">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#FF9900] animate-pulse"></span>
                        <span className="text-[#03045e] text-[10px] font-bold uppercase tracking-widest">
                          Insight {hintIndex + 1} of {currentHints.length}
                        </span>
                      </div>
                      {tutorHintStatus === 'loading' && (
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4 -mt-4">
                          AI Tutor is thinking...
                        </p>
                      )}
                      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex-1">
                        <p className="text-[15px] font-medium text-slate-700 leading-relaxed">
                          {currentHints[hintIndex]?.message}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center flex-1 text-slate-400 gap-4">
                      <div className="w-16 h-16 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center">
                        <svg className="w-6 h-6 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                      </div>
                      <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Waiting for query...</p>
                    </div>
                  )}
                  
                  {/* Panel Controls */}
                  {currentHints.length > 1 && (
                    <div className="flex gap-4 mt-8 pt-6 border-t border-slate-100">
                      <button 
                        disabled={hintIndex === 0}
                        onClick={(e) => { e.stopPropagation(); setHintIndex(prev => Math.max(0, prev - 1)); }} 
                        className="flex-1 bg-white border border-slate-200 text-[#03045e] py-3.5 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-slate-50 hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                      >
                        Previous
                      </button>
                      <button 
                        disabled={hintIndex === currentHints.length - 1}
                        onClick={(e) => { e.stopPropagation(); setHintIndex(prev => Math.min(currentHints.length - 1, prev + 1)); }} 
                        className="flex-1 bg-[#03045e] text-white border border-[#03045e] py-3.5 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-[#020344] disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md"
                      >
                        Next
                      </button>
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