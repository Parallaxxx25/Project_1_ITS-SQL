import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { examLockState } from '../lib/instructor-store';

const SQL_KEYWORDS = [
  { label: 'SELECT', kind: 'Keyword', insertText: 'SELECT', detail: 'เลือกคอลัมน์ที่ต้องการแสดงผล' },
  { label: 'FROM', kind: 'Keyword', insertText: 'FROM', detail: 'ระบุชื่อตารางที่ต้องการดึงข้อมูล' },
  { label: 'WHERE', kind: 'Keyword', insertText: 'WHERE', detail: 'กรองข้อมูลตามเงื่อนไขที่กำหนด' },
  { label: 'AS', kind: 'Keyword', insertText: 'AS', detail: 'ตั้งชื่อนามแฝง (Alias)' },
  { label: 'DISTINCT', kind: 'Keyword', insertText: 'DISTINCT', detail: 'ดึงเฉพาะค่าที่ไม่ซ้ำกัน' },
  { label: 'INSERT INTO', kind: 'Keyword', insertText: 'INSERT INTO', detail: 'เพิ่มข้อมูลใหม่ลงในตาราง' },
  { label: 'UPDATE', kind: 'Keyword', insertText: 'UPDATE', detail: 'แก้ไขข้อมูลที่มีอยู่แล้ว' },
  { label: 'DELETE', kind: 'Keyword', insertText: 'DELETE', detail: 'ลบข้อมูลออกจากตาราง' },
  { label: 'VALUES', kind: 'Keyword', insertText: 'VALUES', detail: 'ระบุค่าที่ต้องการเพิ่ม' },
  { label: 'MERGE', kind: 'Keyword', insertText: 'MERGE', detail: 'ทำ Upsert (Insert/Update)' },
  { label: 'CREATE', kind: 'Keyword', insertText: 'CREATE', detail: 'สร้าง Object ใหม่' },
  { label: 'ALTER', kind: 'Keyword', insertText: 'ALTER', detail: 'แก้ไขโครงสร้างตาราง' },
  { label: 'DROP', kind: 'Keyword', insertText: 'DROP', detail: 'ลบ Object ออกอย่างถาวร' },
  { label: 'TRUNCATE', kind: 'Keyword', insertText: 'TRUNCATE', detail: 'ล้างข้อมูลในตาราง' },
  { label: 'RENAME', kind: 'Keyword', insertText: 'RENAME', detail: 'เปลี่ยนชื่อตาราง' },
  { label: 'AND', kind: 'Operator', insertText: 'AND', detail: 'เชื่อมเงื่อนไข (และ)' },
  { label: 'OR', kind: 'Operator', insertText: 'OR', detail: 'เชื่อมเงื่อนไข (หรือ)' },
  { label: 'NOT', kind: 'Operator', insertText: 'NOT', detail: 'ปฏิเสธเงื่อนไข' },
  { label: 'BETWEEN', kind: 'Operator', insertText: 'BETWEEN', detail: 'ตรวจสอบค่าในช่วง' },
  { label: 'LIKE', kind: 'Operator', insertText: 'LIKE', detail: 'ค้นหาตามรูปแบบ (Wildcard)' },
  { label: 'IN', kind: 'Operator', insertText: 'IN', detail: 'ตรวจสอบค่าในรายการ' },
  { label: 'IS NULL', kind: 'Operator', insertText: 'IS NULL', detail: 'ตรวจสอบค่าว่าง' },
  { label: 'EXISTS', kind: 'Operator', insertText: 'EXISTS', detail: 'ตรวจสอบการมีอยู่ของข้อมูล' },
  { label: 'JOIN', kind: 'Keyword', insertText: 'JOIN', detail: 'รวมตาราง' },
  { label: 'INNER JOIN', kind: 'Keyword', insertText: 'INNER JOIN', detail: 'รวมเฉพาะข้อมูลที่ตรงกัน' },
  { label: 'LEFT JOIN', kind: 'Keyword', insertText: 'LEFT JOIN', detail: 'รวมตารางโดยเน้นฝั่งซ้าย' },
  { label: 'RIGHT JOIN', kind: 'Keyword', insertText: 'RIGHT JOIN', detail: 'รวมตารางโดยเน้นฝั่งขวา' },
  { label: 'ON', kind: 'Keyword', insertText: 'ON', detail: 'ระบุเงื่อนไขการ Join' },
  { label: 'GROUP BY', kind: 'Keyword', insertText: 'GROUP BY', detail: 'จัดกลุ่มข้อมูล' },
  { label: 'HAVING', kind: 'Keyword', insertText: 'HAVING', detail: 'กรองข้อมูลหลังจัดกลุ่ม' },
  { label: 'ORDER BY', kind: 'Keyword', insertText: 'ORDER BY', detail: 'เรียงลำดับผลลัพธ์' },
  { label: 'LIMIT', kind: 'Keyword', insertText: 'LIMIT', detail: 'จำกัดจำนวนแถว' },
  { label: 'ASC', kind: 'Keyword', insertText: 'ASC', detail: 'เรียงน้อยไปมาก' },
  { label: 'DESC', kind: 'Keyword', insertText: 'DESC', detail: 'เรียงมากไปน้อย' },
  { label: 'COUNT', kind: 'Function', insertText: 'COUNT', detail: 'นับจำนวนแถว' },
  { label: 'SUM', kind: 'Function', insertText: 'SUM', detail: 'ผลรวม' },
  { label: 'AVG', kind: 'Function', insertText: 'AVG', detail: 'ค่าเฉลี่ย' },
  { label: 'MIN', kind: 'Function', insertText: 'MIN', detail: 'ค่าน้อยที่สุด' },
  { label: 'MAX', kind: 'Function', insertText: 'MAX', detail: 'ค่ามากที่สุด' }
];

export default function RightPanel({ problemData, currentStep, onStepChange, onSubmit, isExamLocked = false, submitError = null }) {
  const [code, setCode] = useState('-- Write your SQL query here --');
  const [isRunning, setIsRunning] = useState(false);
  const editorRef = useRef(null);
  const [isTimeUp, setIsTimeUp] = useState(false);
  const [examGate, setExamGate] = useState({ reason: null, remainingMs: null });

  const getStorageKey = () => {
    const mode = localStorage.getItem('workspaceMode') || 'COURSE';
    const modId = localStorage.getItem('workspaceModule') || '02';
    return `saved_code_${mode}_${modId}_step_${currentStep}`;
  };

  // Exam gating — instructor schedule (open / close / time limit) takes priority;
  // falls back to the legacy fixed 60-minute limit when no schedule is set.
  useEffect(() => {
    const LEGACY_DURATION = 60 * 60 * 1000;
    const evaluate = () => {
      const mode = localStorage.getItem('workspaceMode');
      if (mode !== 'EXAM') { setIsTimeUp(false); setExamGate({ reason: null, remainingMs: null }); return; }

      const modId = localStorage.getItem('workspaceModule');
      const userData = sessionStorage.getItem('userData');
      const userId = userData ? JSON.parse(userData).id : 'guest';
      const startedAt = parseInt(localStorage.getItem(`exam_start_${userId}_${modId}`)) || null;

      const st = examLockState(modId, startedAt);
      if (st.cfg) {
        setExamGate({ reason: st.reason, remainingMs: st.remainingMs });
        setIsTimeUp(st.reason === 'time_up');
        return;
      }
      // No instructor schedule → legacy fixed 60-minute limit.
      if (startedAt) {
        const remainingMs = startedAt + LEGACY_DURATION - Date.now();
        setExamGate({ reason: remainingMs <= 0 ? 'time_up' : null, remainingMs: Math.max(0, remainingMs) });
        setIsTimeUp(remainingMs <= 0);
      } else {
        setExamGate({ reason: null, remainingMs: null });
        setIsTimeUp(false);
      }
    };
    evaluate();
    const interval = setInterval(evaluate, 1000);
    return () => clearInterval(interval);
  }, [problemData, currentStep]);

  useEffect(() => {
    if (!problemData) return;
    const storageKey = getStorageKey();
    const savedCode = localStorage.getItem(storageKey);
    
    if (savedCode) {
      setCode(savedCode); 
    } else {
      setCode('-- Write your SQL query here --'); 
    }
  }, [problemData, currentStep]);

  const handleEditorChange = (value) => {
    const newCode = value || '';
    setCode(newCode);
    if (problemData) {
      localStorage.setItem(getStorageKey(), newCode);
    }
  };

  const handleEditorMount = (editor, monaco) => {
    editorRef.current = editor;

    editor.updateOptions({
      wordBasedSuggestions: 'off',
      suggest: { showWords: false }
    });
    
    if (monaco) {
      if (!monaco.languages.__isCustomSqlRegistered) {
        monaco.languages.registerCompletionItemProvider('sql', {
          provideCompletionItems: (model, position) => {
            const word = model.getWordUntilPosition(position);
            const range = {
              startLineNumber: position.lineNumber, endLineNumber: position.lineNumber,
              startColumn: word.startColumn, endColumn: word.endColumn,
            };
            const suggestions = SQL_KEYWORDS.map(keyword => ({
              label: keyword.label,
              kind: monaco.languages.CompletionItemKind[keyword.kind] || 14,
              insertText: keyword.insertText,
              insertTextRules: monaco.languages.CompletionItemInsertTextRule?.InsertAsSnippet,
              detail: keyword.detail,
              range: range,
              sortText: "000-" + keyword.label, 
            }));
            return { suggestions };
          },
          triggerCharacters: ['S', 's', 'F', 'f', 'W', 'w', 'A', 'a', 'O', 'o', 'G', 'g', 'H', 'h', 'L', 'l', 'I', 'i', 'U', 'u', 'D', 'd', 'C', 'c', 'J', 'j'],
        });
        monaco.languages.__isCustomSqlRegistered = true;
      }
    }
  };

  const handleRunQuery = async () => {
    if (isRunning || lockedAny) return;
    setIsRunning(true);
    try {
      if (typeof onSubmit === 'function') {
        await onSubmit(code, 'sql');
      }
    } catch (error) {
      console.error('Submit error:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const handleResetCode = () => {
    if (lockedAny) return;
    if(window.confirm('Are you sure you want to reset your code? This cannot be undone.')) {
      const defaultCode = '-- Write your SQL query here --';
      setCode(defaultCode);
      localStorage.setItem(getStorageKey(), defaultCode);
    }
  };

  // Derived lock state. `hardLock` = red, blocks work (time up / not open / closed).
  // `isExamLocked` (green) = already submitted a correct answer.
  const scheduleBlocked = examGate.reason === 'not_open' || examGate.reason === 'closed';
  const hardLock = isTimeUp || scheduleBlocked;
  const lockedAny = hardLock || isExamLocked;
  const lockLabel = examGate.reason === 'not_open' ? 'Exam Not Open'
    : examGate.reason === 'closed' ? 'Exam Closed'
    : 'Time is Up';
  const showCountdown = !lockedAny && typeof examGate.remainingMs === 'number' && examGate.remainingMs > 0;
  const countdown = (() => {
    const t = Math.max(0, Math.floor((examGate.remainingMs || 0) / 1000));
    return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
  })();

  return (
    <div className="flex flex-col space-y-6 w-full relative z-10">
      
      {/* Editor Card */}
      <div className="bg-[#0e1117] rounded-3xl overflow-hidden border border-slate-700/60 shadow-[0_8px_30px_rgb(0,0,0,0.12)] flex flex-col">
        
        {/* Header Bar */}
        <div className={`px-5 py-3.5 flex items-center justify-between border-b border-slate-800 transition-colors duration-300
          ${hardLock ? 'bg-rose-950/30' : isExamLocked ? 'bg-emerald-950/30' : 'bg-[#161b22]'}`}
        >
          <div className="flex items-center gap-4">
            {/* Window Controls (Mac Style) */}
            <div className="flex gap-2">
              <div className="w-3 h-3 bg-[#ff5f56] rounded-full"></div>
              <div className="w-3 h-3 bg-[#ffbd2e] rounded-full"></div>
              <div className="w-3 h-3 bg-[#27c93f] rounded-full"></div>
            </div>
            <div className="flex items-center gap-2 text-sm font-medium text-slate-300">
              <span className="font-mono text-slate-400">query.sql</span>
              {showCountdown && <span className="text-amber-400 text-xs px-2 py-0.5 rounded-full bg-amber-400/10 border border-amber-400/20 font-mono tabular-nums">{countdown} left</span>}
              {hardLock && <span className="text-rose-400 text-xs px-2 py-0.5 rounded-full bg-rose-400/10 border border-rose-400/20 animate-pulse">{examGate.reason === 'not_open' ? 'NOT OPEN' : examGate.reason === 'closed' ? 'CLOSED' : 'LOCKED'}</span>}
              {isExamLocked && <span className="text-emerald-400 text-xs px-2 py-0.5 rounded-full bg-emerald-400/10 border border-emerald-400/20">SUBMITTED</span>}
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={handleResetCode}
              disabled={lockedAny}
              className={`text-xs font-medium transition-colors flex items-center gap-1
                ${lockedAny ? 'text-slate-600 cursor-not-allowed' : 'text-slate-400 hover:text-rose-400 cursor-pointer'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
              </svg>
              Reset
            </button>
            <span className="bg-[#0ea5e9]/10 text-[#0ea5e9] px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wider uppercase border border-[#0ea5e9]/20">
              SQL
            </span>
          </div>
        </div>
        
        {/* Editor Area */}
        <div className="h-[300px] sm:h-[360px] lg:h-[400px] w-full relative bg-[#0d1117]">
          {/* Overlay Lock */}
          {lockedAny && (
            <div className="absolute inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center transition-all duration-500">
              {isExamLocked ? (
                <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-medium text-sm px-6 py-3 rounded-2xl flex items-center gap-3 shadow-lg shadow-emerald-500/10">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  คำตอบถูกต้อง - ส่งแล้ว
                </div>
              ) : (
                <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 font-medium text-sm px-6 py-3 rounded-2xl flex items-center gap-3 shadow-lg shadow-rose-500/10">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                  {lockLabel}
                </div>
              )}
            </div>
          )}
          
          <Editor
            height="100%"
            width="100%"
            defaultLanguage="sql"
            value={code}
            onChange={handleEditorChange} 
            onMount={handleEditorMount}
            theme="vs-dark"
            loading={
              <div className="flex h-full w-full items-center justify-center text-slate-400 font-mono text-sm">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-[#0ea5e9]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Initializing Editor...
              </div>
            }
            options={{
              minimap: { enabled: false },
              fontSize: 13,
              fontFamily: '"Fira Code", "JetBrains Mono", "Menlo", monospace',
              padding: { top: 16, bottom: 16 },
              scrollBeyondLastLine: false,
              lineHeight: 20,
              wordBasedSuggestions: 'off',
              suggest: { showWords: false },
              scrollbar: { alwaysConsumeMouseWheel: false, verticalScrollbarSize: 8 },
              fixedOverflowWidgets: true,
              readOnly: lockedAny,
            }}
          />
        </div>
      </div>

      {/* Submission Error Banner */}
      {submitError && (
        <div
          role="alert"
          aria-live="assertive"
          className="bg-red-50 border border-red-100 rounded-xl p-3 flex items-start gap-3"
        >
          <svg className="w-5 h-5 text-red-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          <p className="text-base font-semibold text-red-700 leading-relaxed whitespace-pre-wrap">{submitError}</p>
        </div>
      )}

      {/* Action Button */}
      <button
        onClick={handleRunQuery}
        disabled={isRunning || lockedAny}
        className={`w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-semibold text-base transition-all duration-300
          ${isExamLocked
            ? 'bg-emerald-50 text-emerald-500 border border-emerald-200 cursor-not-allowed shadow-sm'
            : hardLock
            ? 'bg-rose-50 text-rose-500 border border-rose-200 cursor-not-allowed shadow-sm'
            : 'bg-[#03045e] text-white hover:bg-[#020344] hover:shadow-[0_8px_20px_rgba(3,4,94,0.25)] hover:-translate-y-0.5 active:translate-y-0 cursor-pointer shadow-md'
          }
        `}
      >
        {isExamLocked ? (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Already Submitted
          </>
        ) : hardLock ? (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
            {lockLabel}
          </>
        ) : isRunning ? (
          <>
            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Submitting...
          </>
        ) : (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
            </svg>
            Submit Answer
          </>
        )}
      </button>
    </div>
  );
}