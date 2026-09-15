import React, { useState, useEffect } from 'react';
import { getAllProblems } from '../lib/problems';

const INITIAL_LESSONS = [
  { id: '01', title: 'DATABASE FUNDAMENTALS', status: 'PENDING', desc: 'พื้นฐานระบบฐานข้อมูลและความสัมพันธ์ของข้อมูล' },
  { id: '02', title: 'SELECT STATEMENT', status: 'PENDING', desc: 'การดึงข้อมูลพื้นฐานด้วยคำสั่ง SELECT และ DISTINCT' },
  { id: '03', title: 'WHERE CLAUSE & OPERATORS', status: 'PENDING', desc: 'การกรองข้อมูลอย่างละเอียดด้วยเงื่อนไขต่างๆ' },
  { id: '04', title: 'ORDER BY & LIMIT', status: 'PENDING', desc: 'การจัดเรียงลำดับผลลัพธ์และการจำกัดจำนวนข้อมูล' },
  { id: '05', title: 'JOINS & RELATIONSHIPS', status: 'PENDING', desc: 'การรวมตารางหลายใบเข้าด้วยกันเพื่อดึงข้อมูลที่ซับซ้อน' },
  { id: '06', title: 'DISPLAYING DATA FROM MULTIPLE TABLES', status: 'PENDING', desc: 'การแสดงข้อมูลจากหลายตารางด้วย OUTER JOIN และการหาแถวที่ไม่มีคู่' },
  { id: '07', title: 'AGGREGATE FUNCTIONS', status: 'PENDING', desc: 'การสรุปข้อมูลด้วยฟังก์ชันรวม GROUP BY และ HAVING' },
  { id: '08', title: 'SUBQUERIES', status: 'PENDING', desc: 'การเขียนคำสั่งซ้อนภายในคำสั่ง SQL ทั้งแบบ scalar, correlated และ EXISTS' },
];

export default function CourseText({ onNavigate, user }) {
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('course_active_tab') || 'COURSE');
  const [expandedId, setExpandedId] = useState(null); 
  const [isProcessing, setIsProcessing] = useState(false);
  const [lessons, setLessons] = useState([]);
  const [scoreOverlayData, setScoreOverlayData] = useState(null);
  
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const EXAM_DURATION = 60 * 60 * 1000; 

  const getExamProblemCount = (moduleId) => {
    return getAllProblems().filter(p => p.type === 'EXAM' && p.moduleId === moduleId).length;
  };

  const checkExamCompletion = (moduleId) => {
    if (!user) return false;
    const totalProblems = getExamProblemCount(moduleId);
    if (totalProblems === 0) return false; 

    const submissionsKey = `submissions_${user.id}_EXAM_${moduleId}`;
    const userSubs = JSON.parse(localStorage.getItem(submissionsKey)) || {};
    const attemptedCount = Object.keys(userSubs).length;
    
    return attemptedCount >= totalProblems;
  };

  useEffect(() => {
    if (!user) return; 
    const storageKey = `course_06070999_${user.id}_${activeTab}_lessons`;
    const saved = localStorage.getItem(storageKey);
    // Merge on INITIAL_LESSONS so modules added after a student's list was
    // cached still appear, keeping their saved progress.
    const restored = saved
      ? INITIAL_LESSONS.map((l) => JSON.parse(saved).find((s) => s.id === l.id) || l)
      : INITIAL_LESSONS;
    setLessons(restored);

    if (activeTab === 'ASSIGNMENT') {
      const storageKeyForSave = `course_06070999_${user.id}_ASSIGNMENT_lessons`;
      const currentLessons = restored;
      let updated = false;
      const updatedLessons = currentLessons.map(lesson => {
        const assignmentProblems = getAllProblems().filter(p => p.type === 'ASSIGNMENT' && p.moduleId === lesson.id);
        if (assignmentProblems.length === 0) return lesson;
        const statusKey = `statuses_${user.id}_ASSIGNMENT_${lesson.id}`;
        const statuses = JSON.parse(localStorage.getItem(statusKey)) || [];
        const allPassed = statuses.filter(s => s === 'passed').length >= assignmentProblems.length;
        if (allPassed && lesson.status !== 'COMPLETED') {
          updated = true;
          return { ...lesson, status: 'COMPLETED' };
        }
        return lesson;
      });
      if (updated) {
        setLessons(updatedLessons);
        localStorage.setItem(storageKeyForSave, JSON.stringify(updatedLessons));
      }
    }
  }, [activeTab, user]);

  useEffect(() => {
    if (lessons.length > 0 && user) {
      const storageKey = `course_06070999_${user.id}_${activeTab}_lessons`;
      localStorage.setItem(storageKey, JSON.stringify(lessons));
    }
  }, [lessons, activeTab, user]);

  useEffect(() => {
    localStorage.setItem('course_active_tab', activeTab);
  }, [activeTab]);

  const handleMarkComplete = (id) => {
    setIsProcessing(true); 
    setTimeout(() => {
      setLessons(prevLessons => 
        prevLessons.map(lesson => lesson.id === id ? { ...lesson, status: 'COMPLETED' } : lesson)
      );
      setIsProcessing(false); 
    }, 800); 
  };

  const handleEnterWorkspace = (id) => {
    setIsProcessing(true); 
    
    if (activeTab === 'EXAM' && user) {
      const startTimeKey = `exam_start_${user.id}_${id}`;
      if (!localStorage.getItem(startTimeKey)) {
        localStorage.setItem(startTimeKey, Date.now().toString());
      }
    }

    setTimeout(() => {
      localStorage.setItem('workspaceMode', activeTab);
      localStorage.setItem('workspaceModule', id);
      setIsProcessing(false); 
      onNavigate('workspace');
    }, 500); 
  };

  const handleViewScore = (lessonId) => {
    const userId = user?.id || 'guest';
    const mode = 'EXAM';
    
    const examProblems = getAllProblems().filter(p => p.type === mode && p.moduleId === lessonId);
    const submissionsKey = `submissions_${userId}_${mode}_${lessonId}`;
    const userSubs = JSON.parse(localStorage.getItem(submissionsKey)) || {};
    
    let totalScore = 0;
    const details = examProblems.map((prob, idx) => {
        const step = idx + 1;
        const sub = userSubs[step]; 
        const isCorrect = sub && sub.passed; 
        
        if (isCorrect) totalScore += 1; 
        
        let displayStatus = 'NOT_ATTEMPTED';
        if (sub) displayStatus = sub.passed ? 'PASSED' : 'FAILED';
        
        return {
            step, title: prob.title, desc: prob.description,
            code: sub ? sub.code : '-- No Submission --', status: displayStatus 
        };
    });
    
    setScoreOverlayData({ lessonId, totalScore, maxScore: examProblems.length, details });
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] font-sans selection:bg-[#FF9900]/20 selection:text-[#03045e] relative flex flex-col">
      
      <div className="max-w-[85rem] mx-auto px-4 sm:px-6 lg:px-8 pt-24 md:pt-32 pb-32 w-full flex-1 flex flex-col z-10">
        
        {/* --- 1. MINIMAL HERO HEADER --- */}
        <header className="mb-12 md:mb-16">
          <button 
            onClick={() => onNavigate('home')} 
            className="group inline-flex items-center gap-2 text-base font-semibold text-slate-500 hover:text-[#03045e] transition-colors duration-300 mb-8"
          >
            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-[#03045e]/10 transition-colors">
              <svg className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
            </div>
            Back to Overview
          </button>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-100/50 text-[#03045e] text-sm font-bold tracking-widest uppercase mb-4 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                CS 06070999
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 leading-[1.1]">
                Database Concept <br className="hidden md:block" /> System
              </h1>
            </div>
            
            <div className="flex items-center gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#03045e] to-blue-600 flex items-center justify-center text-white font-bold text-xl shadow-inner">
                KA
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Lead Instructor</p>
                <p className="font-semibold text-slate-800 text-base">ผศ.ดร.กนกวรรณ อัจฉริยะชาญวณิช</p>
              </div>
            </div>
          </div>
        </header>

        {/* --- 2. MAIN CONTENT GRID --- */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          
          {/* LEFT SIDE: Navigation Tabs (Col span 3) */}
          <div className="lg:col-span-3 lg:sticky lg:top-32 space-y-8">
            <div className="flex flex-row lg:flex-col gap-2 bg-white lg:bg-transparent p-1.5 lg:p-0 rounded-2xl lg:rounded-none border lg:border-none border-slate-100 shadow-sm lg:shadow-none overflow-x-auto custom-scrollbar">
              {[
                { id: 'COURSE', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' },
                { id: 'ASSIGNMENT', icon: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4' },
                // EXAM tab removed from the student-facing list: exam lock/timer
                // are enforced only via localStorage (RightPanel.jsx, LeftPanel.jsx),
                // which any student can edit in devtools to bypass. Not
                // server-authoritative — see the security review's Phase 6.
              ].map((tab) => (
                <button 
                  key={tab.id} 
                  onClick={() => { setActiveTab(tab.id); setExpandedId(null); }}
                  className={`flex-1 lg:w-full flex items-center justify-between px-5 py-4 rounded-xl font-bold uppercase tracking-widest text-sm transition-all duration-300 whitespace-nowrap
                    ${activeTab === tab.id 
                      ? 'bg-[#03045e] text-white shadow-md lg:shadow-[0_10px_20px_-10px_rgba(3,4,94,0.4)]' 
                      : 'bg-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-900'}`}
                >
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={tab.icon}></path></svg>
                    {tab.id}
                  </div>
                  {activeTab === tab.id && <span className="hidden lg:block w-2 h-2 rounded-full bg-[#FF9900] animate-pulse"></span>}
                </button>
              ))}
            </div>

            {/* Teaching Assistants Card (Desktop Only) */}
            <div className="hidden lg:block bg-white rounded-[2rem] p-6 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Teaching Assistants</h3>
              <div className="space-y-4">
                {[
                  { name: 'นายพชร พ.', initial: 'PP' },
                  { name: 'นายณัฐวีร์ น.', initial: 'NN' }
                ].map((prof, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-[#03045e] font-bold text-sm border border-slate-200">
                      {prof.initial}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800 text-base">{prof.name}</p>
                      <p className="text-xs font-medium text-slate-500">TA</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT SIDE: Lesson Content (Col span 9) */}
          <div className="lg:col-span-9 space-y-4">
            
            <div className="flex items-center justify-between mb-6 px-2">
               <h2 className="text-2xl md:text-3xl font-bold text-slate-900">
                 {activeTab === 'ASSIGNMENT' ? 'Lab Assignments' : activeTab === 'EXAM' ? 'Final Examinations' : 'Curriculum Modules'}
               </h2>
               <span className="px-4 py-1.5 bg-slate-100 text-slate-600 rounded-full text-sm font-bold">
                 {lessons.length} Items
               </span>
            </div>

            <div className="space-y-5">
              {lessons.map((lesson) => {
                const isAssignment = activeTab === 'ASSIGNMENT';
                const isExam = activeTab === 'EXAM';
                const displayTitle = lesson.title;
                const displayDesc = isAssignment ? `Practice: ${lesson.desc}` : isExam ? `Evaluation: ${lesson.desc}` : lesson.desc;
                const isExamCompleted = isExam ? checkExamCompletion(lesson.id) : false;
                
                let isTimeUp = false;
                if (isExam && user) {
                  const startTimeKey = `exam_start_${user.id}_${lesson.id}`;
                  const startTime = localStorage.getItem(startTimeKey);
                  if (startTime) isTimeUp = (now - parseInt(startTime)) >= EXAM_DURATION;
                }
                const forceShowScore = isExamCompleted || isTimeUp;
                const isCompleted = lesson.status === 'COMPLETED' || forceShowScore;
                const isExpanded = expandedId === lesson.id;

                return (
                  <div 
                    key={lesson.id} 
                    className={`bg-white border rounded-[2rem] transition-all duration-300 overflow-hidden
                      ${isExpanded ? 'border-[#03045e]/20 shadow-[0_20px_40px_-15px_rgba(3,4,94,0.08)]' : 'border-slate-100 shadow-[0_4px_15px_rgb(0,0,0,0.02)] hover:border-slate-200 hover:shadow-md'}`}
                  >
                    
                    {/* Header Item */}
                    <div 
                      onClick={() => setExpandedId(isExpanded ? null : lesson.id)} 
                      className="p-6 md:p-8 flex items-center justify-between gap-4 cursor-pointer group select-none"
                    >
                      <div className="flex items-center gap-5 flex-1 min-w-0">
                        {/* Status / Number Badge */}
                        <div className={`w-14 h-14 shrink-0 rounded-2xl flex items-center justify-center font-bold text-xl transition-colors
                          ${isCompleted 
                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                            : 'bg-slate-50 text-slate-400 border border-slate-100 group-hover:bg-[#03045e]/5 group-hover:text-[#03045e]'}`}
                        >
                          {isCompleted ? <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg> : lesson.id}
                        </div>
                        
                        <div className="truncate">
                          <div className="flex items-center gap-3 mb-1.5">
                            {isExam && <span className="text-xs font-bold bg-[#FF9900]/10 text-[#FF9900] px-2.5 py-0.5 rounded uppercase tracking-wider">Exam</span>}
                            {isAssignment && <span className="text-xs font-bold bg-blue-50 text-blue-600 px-2.5 py-0.5 rounded uppercase tracking-wider">Lab</span>}
                            <h4 className={`text-xl md:text-2xl font-bold tracking-tight truncate transition-colors ${isCompleted ? 'text-slate-900' : 'text-slate-700 group-hover:text-slate-900'}`}>
                              {displayTitle}
                            </h4>
                          </div>
                          <p className="text-base font-medium text-slate-500 truncate">{displayDesc}</p>
                        </div>
                      </div>
                      
                      <div className={`shrink-0 w-12 h-12 rounded-full flex items-center justify-center transition-transform duration-300 bg-slate-50 text-slate-400
                        ${isExpanded ? 'rotate-180 bg-[#03045e] text-white' : 'group-hover:bg-slate-100 group-hover:text-slate-600'}`}>
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"></path></svg>
                      </div>
                    </div>

                    {/* Expandable Body */}
                    <div className={`overflow-hidden transition-all duration-500 ease-in-out ${isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
                      <div className="px-6 pb-6 pt-0 md:px-8 md:pb-8 flex flex-col md:flex-row gap-8 items-start md:items-center justify-between border-t border-slate-50 mt-2 pt-6">
                        
                        <div className="flex-1 space-y-2">
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                            {isExam ? 'Instructions' : 'Objectives'}
                          </p>
                          <p className="text-slate-700 text-base leading-relaxed max-w-2xl">
                            {displayDesc}. {isExam ? 'You have 1 hour to complete this examination. The system will lock upon timeout.' : 'Practice and enhance your query skills within the integrated workspace.'}
                          </p>
                        </div>

                        <div className="w-full md:w-auto shrink-0 flex flex-col gap-3">
                          {isExam ? (
                              forceShowScore ? (
                                  <button onClick={() => handleViewScore(lesson.id)} className="w-full md:w-52 py-4 rounded-xl font-bold text-sm tracking-widest uppercase transition-all duration-300 bg-[#03045e] text-white hover:bg-slate-900 hover:shadow-lg hover:-translate-y-0.5 flex items-center justify-center gap-2">
                                    View Results
                                  </button>
                              ) : (
                                  <button onClick={() => handleEnterWorkspace(lesson.id)} disabled={isProcessing} className={`w-full md:w-52 py-4 rounded-xl font-bold text-sm tracking-widest uppercase transition-all duration-300 flex items-center justify-center gap-2
                                    ${isProcessing ? 'bg-slate-100 text-slate-400 cursor-wait' : 'bg-[#FF9900] text-white hover:bg-[#e68a00] hover:shadow-lg hover:-translate-y-0.5'}`}>
                                    Start Exam <span className="text-xl leading-none">→</span>
                                  </button>
                              )
                          ) : (
                              <>
                                <button onClick={() => handleEnterWorkspace(lesson.id)} disabled={isProcessing} className={`w-full md:w-52 py-4 rounded-xl font-bold text-sm tracking-widest uppercase transition-all duration-300 flex items-center justify-center gap-2
                                  ${isProcessing ? 'bg-slate-100 text-slate-400 cursor-wait' : 'bg-[#03045e] text-white hover:bg-slate-900 hover:shadow-lg hover:-translate-y-0.5'}`}>
                                  {isAssignment ? 'Start Lab' : 'Open Workspace'} <span className="text-xl leading-none">→</span>
                                </button>
                                
                                {activeTab === 'COURSE' && (
                                  <button onClick={() => handleMarkComplete(lesson.id)} disabled={lesson.status === 'COMPLETED' || isProcessing} className={`w-full md:w-52 py-3.5 rounded-xl font-bold text-xs tracking-widest uppercase transition-all duration-300 border flex items-center justify-center
                                    ${lesson.status === 'COMPLETED' ? 'bg-slate-50 text-emerald-600 border-emerald-100 cursor-not-allowed' 
                                    : isProcessing ? 'bg-transparent text-slate-400 border-slate-200 cursor-wait' 
                                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50 shadow-sm'}`}>
                                    {lesson.status === 'COMPLETED' ? 'Completed ✓' : 'Mark as Done'}
                                  </button>
                                )}
                              </>
                          )}
                        </div>

                      </div>
                    </div>

                  </div>
                );
              })}
            </div>

          </div>
        </div>
      </div>

      {/* --- MODAL: SCORE OVERLAY (Minimal & Clean) --- */}
      {scoreOverlayData && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setScoreOverlayData(null)}></div>
          
          <div className="relative w-full max-w-4xl max-h-[85vh] bg-white rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] flex flex-col overflow-hidden">
            
            {/* Modal Header */}
            <div className="px-8 py-6 md:px-10 md:py-8 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-50/50">
              <div>
                <span className="inline-block px-3 py-1.5 rounded-full bg-blue-50 text-blue-600 text-xs font-bold tracking-widest uppercase border border-blue-100 mb-3">
                  Evaluation Report
                </span>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">Exam Results</h2>
                <p className="text-sm text-slate-500 font-mono mt-1">MODULE_ID: {scoreOverlayData.lessonId}</p>
              </div>
              
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Final Score</p>
                  <div className="text-4xl font-black text-[#03045e] font-mono leading-none">
                    {scoreOverlayData.totalScore.toString().padStart(2, '0')}
                    <span className="text-slate-300 text-2xl mx-1">/</span>
                    <span className="text-slate-400 text-2xl">{scoreOverlayData.maxScore.toString().padStart(2, '0')}</span>
                  </div>
                </div>
                <button onClick={() => setScoreOverlayData(null)} className="w-12 h-12 rounded-full bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors flex items-center justify-center shadow-sm">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-8 md:p-10 overflow-y-auto custom-scrollbar flex-1 bg-white">
              {scoreOverlayData.details.length > 0 ? (
                <div className="space-y-6">
                  {scoreOverlayData.details.map((detail, idx) => {
                    const isPassed = detail.status === 'PASSED';
                    const isFailed = detail.status === 'FAILED';
                    
                    return (
                      <div key={idx} className={`border rounded-[1.5rem] overflow-hidden transition-all
                        ${isPassed ? 'border-emerald-200 bg-emerald-50/30' : isFailed ? 'border-red-200 bg-red-50/30' : 'border-slate-200 bg-slate-50/50'}`}>
                        
                        <div className="px-6 py-4 border-b border-inherit flex flex-wrap justify-between items-center gap-4 bg-white/50 backdrop-blur-sm">
                          <div className="flex items-center gap-4">
                            <span className="bg-slate-900 text-white w-9 h-9 rounded-xl flex items-center justify-center font-bold font-mono text-base shadow-sm">{detail.step}</span>
                            <span className="font-bold text-slate-800 text-base md:text-lg">{detail.title}</span>
                          </div>
                          
                          <div className={`px-3 py-1.5 rounded-lg font-bold text-xs uppercase tracking-widest border
                            ${isPassed ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : isFailed ? 'bg-red-100 text-red-700 border-red-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                            {isPassed ? 'Correct' : isFailed ? 'Incorrect' : 'No Submission'}
                          </div>
                        </div>
                        
                        <div className="p-6">
                          <p className="text-slate-700 text-base font-medium mb-4">{detail.desc}</p>
                          <div className="bg-slate-900 rounded-xl p-5 overflow-x-auto shadow-inner">
                            <pre className={`font-mono text-sm whitespace-pre-wrap ${detail.status === 'NOT_ATTEMPTED' ? 'text-slate-500 italic' : 'text-[#FF9900]'}`}>
                              {detail.code}
                            </pre>
                          </div>
                        </div>
                        
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-20 flex flex-col items-center justify-center">
                  <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                    <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                  </div>
                  <p className="text-slate-900 font-bold text-xl">No Submission Data</p>
                  <p className="text-slate-500 text-base mt-2">Attempt the exam to generate a report.</p>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}