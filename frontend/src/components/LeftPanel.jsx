import React, { useState, useEffect } from 'react';
import { dbManager } from '../lib/db-manager';
import ResultTable from './ResultTable';

const SAMPLE_ROW_LIMIT = 20;
// Table names come from problem metadata, not from student input, but
// instructor-authored problems can carry an arbitrary string — keep the
// interpolation below to plain identifiers.
const SAFE_TABLE_NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;

// Sample rows for one schema card. Auto-loaded for the problem's main table,
// click-to-load for the rest, so a five-table JOIN problem doesn't fire five
// queries on load. Any failure (DuckDB still initializing, table not in the
// dataset) falls back silently to the schema-only card.
function SampleRows({ tableName, autoLoad }) {
  const [rows, setRows] = useState(null);
  const [open, setOpen] = useState(!!autoLoad);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setRows(null);
    setFailed(false);
    setOpen(!!autoLoad);
  }, [tableName, autoLoad]);

  useEffect(() => {
    if (!open || rows || failed) return;
    if (!tableName || !SAFE_TABLE_NAME.test(tableName)) { setFailed(true); return; }
    let cancelled = false;
    dbManager.executeReadOnly(`SELECT * FROM ${tableName} LIMIT ${SAMPLE_ROW_LIMIT}`)
      .then((res) => { if (!cancelled) setRows(res?.rows || []); })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, [open, rows, failed, tableName]);

  if (failed) return null;

  return (
    <div className="border-t border-slate-100">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full px-5 py-3 flex items-center justify-between text-left hover:bg-slate-50/60 transition-colors"
      >
        <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
          ตัวอย่างข้อมูล ({SAMPLE_ROW_LIMIT} แถวแรก)
        </span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`h-4 w-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 20 20" fill="currentColor"
        >
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>
      {open && (
        <div className="px-3 pb-3 overflow-x-auto">
          {rows ? <ResultTable data={rows} /> : (
            <p className="px-2 py-3 text-xs text-slate-400">กำลังโหลดข้อมูลตัวอย่าง...</p>
          )}
        </div>
      )}
    </div>
  );
}

// แยก Timer ออกมาเป็น component ของตัวเอง เพื่อไม่ให้ตาราง Schema
// ถูก re-render ใหม่ทุก ๆ วินาที (ช่วยเรื่อง performance)
function TimerBar() {
  const [timeLeft, setTimeLeft] = useState('');

  // อัปเดต Timer ให้อิงจากเวลาเริ่มสอบจริง (1 ชั่วโมง)
  useEffect(() => {
    let timer;
    const EXAM_DURATION = 60 * 60 * 1000; // 1 ชั่วโมง

    const calculateTimeLeft = () => {
      const mode = localStorage.getItem('workspaceMode');
      const modId = localStorage.getItem('workspaceModule');
      const userData = sessionStorage.getItem('userData');
      const userId = userData ? JSON.parse(userData).id : 'guest';

      let targetTime;

      if (mode === 'EXAM') {
         const startTime = localStorage.getItem(`exam_start_${userId}_${modId}`);
         if (startTime) {
             targetTime = parseInt(startTime) + EXAM_DURATION;
         } else {
             targetTime = Date.now() + EXAM_DURATION;
         }
      } else {
         targetTime = new Date('2026-03-13T10:00:00+07:00').getTime();
      }

      const currentNow = Date.now();
      const difference = targetTime - currentNow;

      if (difference <= 0) {
        setTimeLeft('00h 00m 00s'); // เวลาหมด!
        return;
      }

      const h = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const m = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((difference % (1000 * 60)) / 1000);

      const format = (val) => val.toString().padStart(2, '0');
      setTimeLeft(`${format(h)}h ${format(m)}m ${format(s)}s`);
    };

    calculateTimeLeft();
    timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, []);

  const isTimeUp = timeLeft === '00h 00m 00s';

  return (
    <div className={`px-6 py-4 border-b border-slate-100 flex items-center justify-between transition-colors duration-500 ${isTimeUp ? 'bg-rose-50' : 'bg-slate-50/50'}`}>
      <div className="flex items-center gap-2.5">
        <div className={`flex items-center justify-center w-8 h-8 rounded-full ${isTimeUp ? 'bg-rose-100 text-rose-500' : 'bg-[#03045e]/10 text-[#03045e]'}`}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
          </svg>
        </div>
        <span className={`text-xs font-semibold tracking-wider uppercase ${isTimeUp ? 'text-rose-600' : 'text-slate-500'}`}>
          Time Remaining
        </span>
      </div>

      <div className={`font-mono text-lg font-bold tabular-nums tracking-tight px-3 py-1 rounded-lg border
        ${isTimeUp ? 'text-rose-600 bg-white border-rose-200 shadow-sm animate-pulse' : 'text-slate-800 bg-white border-slate-200 shadow-sm'}`}
      >
        {timeLeft || '00:00:00'}
      </div>
    </div>
  );
}

function LeftPanel({ problemData, currentStep }) {
  if (!problemData) return null;

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col h-full overflow-hidden animate-in slide-in-from-left duration-500">

      {/* Top Timer Bar */}
      <TimerBar />

      {/* Main Scrollable Content */}
      <div className="p-6 sm:p-8 overflow-y-auto custom-scrollbar flex-1 bg-white relative">

        {/* Problem Header */}
        <div className="mb-8">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 text-blue-600 font-semibold text-xs uppercase tracking-wide border border-blue-100 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
              <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
            </svg>
            Problem {currentStep}
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 leading-tight">
            {problemData.title}
          </h2>
        </div>

        {/* Description */}
        <div className="mb-10 text-slate-600 text-base leading-relaxed">
          {problemData.description}
        </div>

        {/* Mission Objectives */}
        <div className="mb-12">
          <div className="flex items-center gap-2 mb-4 px-1">
            <div className="p-1.5 bg-amber-50 text-amber-500 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.381z" clipRule="evenodd" />
              </svg>
            </div>
            <h3 className="font-bold text-slate-800 text-lg">Mission Objectives</h3>
          </div>

          <div className="space-y-3">
            {problemData.requirements?.map((req, i) => (
              <div key={i} className="flex items-start gap-3.5 p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:border-slate-200 transition-colors">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-white border border-slate-200 flex items-center justify-center text-xs font-semibold text-slate-500 shadow-sm mt-0.5">
                  {i + 1}
                </div>
                <p className="text-slate-700 text-[15px] leading-relaxed">{req}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Database Schema */}
        <div className="space-y-6">
          <div className="flex items-center justify-between mb-4 px-1">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-emerald-50 text-emerald-500 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M3 12v3c0 1.657 3.134 3 7 3s7-1.343 7-3v-3c0 1.657-3.134 3-7 3s-7-1.343-7-3z" />
                  <path d="M3 7v3c0 1.657 3.134 3 7 3s7-1.343 7-3V7c0 1.657-3.134 3-7 3S3 8.657 3 7z" />
                  <path d="M17 5c0 1.657-3.134 3-7 3S3 6.657 3 5s3.134-3 7-3 7 1.343 7 3z" />
                </svg>
              </div>
              <h3 className="font-bold text-slate-800 text-lg">Database Schema</h3>
            </div>
            <span className="text-slate-500 font-medium text-xs bg-slate-100 px-2.5 py-1 rounded-md">
              {problemData.allTables && problemData.allTables.length > 1
                ? `${problemData.allTables.length} Tables`
                : `1 Table`}
            </span>
          </div>

          {(problemData.allTables?.length
            ? problemData.allTables
            : [{ name: problemData.table, desc: '', columns: problemData.columns }]
          ).map((tbl, tblIdx) => (
            <div key={tblIdx} className="rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-sm">
              <div className="bg-slate-50 border-b border-slate-200 px-5 py-3.5">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-700 font-bold text-sm font-mono">{tbl.name}</span>
                  <span className="shrink-0 text-slate-400 text-xs font-medium">{tbl.columns?.length || 0} columns</span>
                </div>
                {tbl.desc && (
                  <p className="text-slate-500 text-[12px] mt-1 leading-snug">{tbl.desc}</p>
                )}
              </div>

              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white border-b border-slate-100">
                    <th className="px-5 py-3 font-semibold text-slate-400 uppercase text-[11px] tracking-wider">Column</th>
                    <th className="px-5 py-3 font-semibold text-slate-400 uppercase text-[11px] tracking-wider text-right w-[84px]">Type</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {tbl.columns?.map((col, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors align-top">
                      <td className="px-5 py-3">
                        <code className="text-blue-600 font-medium font-mono text-[13px] bg-blue-50/50 border border-blue-100 px-2 py-0.5 rounded">
                          {col.name}
                        </code>
                        {col.desc && (
                          <p className="text-slate-500 text-[12px] mt-1.5 leading-snug">{col.desc}</p>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <span className="inline-block text-slate-500 font-mono text-[11px] bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
                          {col.type}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <SampleRows tableName={tbl.name} autoLoad={tbl.name === problemData.table} />
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}

export default React.memo(LeftPanel);
