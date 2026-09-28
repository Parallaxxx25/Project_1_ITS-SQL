import React, { useState } from 'react';
import ResultTable from './ResultTable';

// Collapsible code row — the <pre> block is only mounted while open, so a long
// list of past submissions stays cheap to render (no lag).
const CollapsibleCode = React.memo(function CollapsibleCode({ title, subtitle, passed, code, queryResult, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full px-5 sm:px-6 py-4 flex items-center gap-4 text-left hover:bg-slate-50/70 transition-colors outline-none focus-visible:bg-slate-50"
      >
        <span className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${passed ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500'}`}>
          {passed ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          )}
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-slate-800 text-base sm:text-lg truncate">{title}</p>
          {subtitle && <p className="text-sm sm:text-base text-slate-400 truncate mt-0.5">{subtitle}</p>}
        </div>
        <span className="text-sm sm:text-base font-bold text-[#03045e] shrink-0">{open ? 'Hide' : 'View'}</span>
      </button>
      {open && (
        <div className="px-5 sm:px-6 pb-5 space-y-4">
          <div className="bg-[#0e1117] rounded-2xl p-4 overflow-x-auto custom-scrollbar border border-slate-800">
            <pre translate="no" className="notranslate font-mono text-[14px] sm:text-[15px] lg:text-base leading-relaxed text-slate-200 whitespace-pre-wrap"><code>{code || '-- (no code stored)'}</code></pre>
          </div>
          {queryResult && Array.isArray(queryResult.rows) && queryResult.rows.length > 0 && (
            <div>
              <p className="text-xs sm:text-sm font-bold text-slate-500 mb-2 uppercase tracking-wide">Output</p>
              <ResultTable data={queryResult.rows} />
            </div>
          )}
        </div>
      )}
    </div>
  );
});

function SectionHeader({ colorCls, iconPath, title, count }) {
  return (
    <div className="flex items-center gap-2 mb-4 px-1">
      <div className={`p-1.5 rounded-lg ${colorCls}`}>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">{iconPath}</svg>
      </div>
      <h3 className="font-bold text-slate-800 text-xl sm:text-2xl">{title}</h3>
      {typeof count === 'number' && (
        <span className="ml-1 text-sm sm:text-base font-bold text-slate-400 bg-slate-100 rounded-full px-2 py-0.5">{count}</span>
      )}
    </div>
  );
}

function MySubmissions({ submissions, moduleSubs, problemData }) {
  const [copied, setCopied] = useState(false);

  const latestSubmission = submissions && submissions.length > 0 ? submissions[0] : null;
  const hasLatest = !!latestSubmission;
  const hasModule = Array.isArray(moduleSubs) && moduleSubs.length > 0;

  // 1. Empty State — nothing submitted anywhere in this module.
  if (!hasLatest && !hasModule) {
    return (
      <div className="bg-white border border-slate-200 shadow-[0_8px_30px_rgba(0,0,0,0.03)] rounded-3xl p-12 text-center flex flex-col items-center justify-center min-h-[300px] animate-in fade-in duration-300">
        <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 mb-5 border border-slate-100 shadow-sm">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
        </div>
        <h3 className="text-slate-800 font-bold text-lg mb-1">No Submissions Yet</h3>
        <p className="text-slate-400 text-sm max-w-xs mx-auto">
          Write your SQL query and hit <span className="font-semibold text-slate-500">Submit Answer</span> to see your result here.
        </p>
      </div>
    );
  }

  const isPassed = latestSubmission?.passed;

  // Every attempt for the question currently open. Older records only kept the
  // latest object → treat that single record as a one-item history.
  const attempts = Array.isArray(latestSubmission?.attempts) && latestSubmission.attempts.length > 0
    ? latestSubmission.attempts
    : (latestSubmission ? [latestSubmission] : []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(latestSubmission?.code || '');
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {hasLatest && (
        <>
          {/* 2. Status Banner (Pass / Fail) */}
          <div className={`rounded-3xl border shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 sm:p-7 flex flex-col sm:flex-row sm:items-center justify-between gap-5 bg-white ${
            isPassed ? 'border-emerald-100' : 'border-rose-100'
          }`}>
            <div className="flex items-center gap-4 sm:gap-5">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${
                isPassed ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500'
              }`}>
                {isPassed ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M6.938 4h10.124c1.54 0 2.502 1.667 1.732 3l-5.062 8.66c-.77 1.333-2.694 1.333-3.464 0L5.206 7c-.77-1.333.192-3 1.732-3z" />
                  </svg>
                )}
              </div>
              <div>
                <h3 className={`text-xl sm:text-2xl font-bold tracking-tight ${isPassed ? 'text-emerald-700' : 'text-rose-600'}`}>
                  {isPassed ? 'Query Passed' : 'Query Failed'}
                </h3>
                <p className="text-slate-500 text-base sm:text-lg mt-1 leading-relaxed">
                  {isPassed
                    ? 'Great work — your result matches the expected output.'
                    : 'Not quite. Review your logic and give it another try.'}
                </p>
              </div>
            </div>

            <span className={`self-start sm:self-center inline-flex items-center gap-2 px-4 py-1.5 rounded-full font-bold text-[11px] uppercase tracking-widest border ${
              isPassed
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-rose-50 text-rose-600 border-rose-200'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isPassed ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
              {isPassed ? 'Success' : 'Error'}
            </span>
          </div>

          {/* 3. Your Query — latest attempt */}
          <div>
            <div className="flex items-center gap-2 mb-4 px-1">
              <div className="p-1.5 bg-[#03045e]/10 text-[#03045e] rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className="font-bold text-slate-800 text-xl sm:text-2xl">Your Query</h3>
            </div>

            <div className="bg-[#0e1117] rounded-3xl overflow-hidden border border-slate-700/60 shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
              <div className="px-5 py-3.5 flex items-center justify-between border-b border-slate-800 bg-[#161b22]">
                <div className="flex items-center gap-4">
                  <div className="flex gap-2">
                    <div className="w-3 h-3 bg-[#ff5f56] rounded-full"></div>
                    <div className="w-3 h-3 bg-[#ffbd2e] rounded-full"></div>
                    <div className="w-3 h-3 bg-[#27c93f] rounded-full"></div>
                  </div>
                  <span className="font-mono text-slate-400 text-sm">query.sql</span>
                </div>

                <button
                  onClick={handleCopy}
                  className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md transition-all outline-none focus-visible:ring-2 focus-visible:ring-[#0ea5e9]/40 ${
                    copied ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                  }`}
                >
                  {copied ? (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Copied
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                        <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                      </svg>
                      Copy
                    </>
                  )}
                </button>
              </div>

              <div className="p-6 overflow-x-auto custom-scrollbar">
                <pre translate="no" className="notranslate font-mono text-[15px] sm:text-base lg:text-[17px] leading-relaxed text-slate-200 whitespace-pre-wrap">
                  <code>{latestSubmission.code}</code>
                </pre>
              </div>
            </div>
          </div>

          {/* 4. Output Data (Query Result) */}
          {latestSubmission.queryResult && latestSubmission.queryResult.rows && (
            <div>
              <div className="flex items-center gap-2 mb-4 px-1">
                <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                  </svg>
                </div>
                <h3 className="font-bold text-slate-800 text-xl sm:text-2xl">Output Data</h3>
              </div>

              <ResultTable data={latestSubmission.queryResult.rows} />
            </div>
          )}

          {/* 5. Attempt History — every submission for this question */}
          {attempts.length > 1 && (
            <div>
              <SectionHeader
                colorCls="bg-amber-50 text-amber-600"
                iconPath={<path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />}
                title="Attempt History"
                count={attempts.length}
              />
              <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.03)] divide-y divide-slate-50">
                {attempts.slice().reverse().slice(0, 5).map((a, i) => {
                  const attemptNo = attempts.length - i;
                  const speed = a.durationMs != null ? `${a.durationMs} ms` : '—';
                  return (
                    <CollapsibleCode
                      key={i}
                      title={`Attempt ${attemptNo}`}
                      subtitle={`${a.passed ? 'Passed' : 'Failed'} · ${speed} · ${a.timestamp || '—'}`}
                      passed={a.passed}
                      code={a.code}
                      defaultOpen={i === 0}
                    />
                  );
                })}
                {attempts.length > 5 && (
                  <p className="px-5 sm:px-6 py-3 text-sm sm:text-base text-slate-400">Showing latest 5 of {attempts.length} attempts.</p>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* 6. Your Submitted Answers — latest attempt across every question in this module */}
      {hasModule && (
        <div>
          <SectionHeader
            colorCls="bg-emerald-50 text-emerald-600"
            iconPath={<path fillRule="evenodd" d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />}
            title="Your Submitted Answers"
            count={moduleSubs.length}
          />
          <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.03)] divide-y divide-slate-50">
            {moduleSubs.map((s) => {
              const tries = Array.isArray(s.attempts) ? s.attempts.length : 1;
              const speed = s.durationMs != null ? `${s.durationMs} ms · ` : '';
              return (
                <CollapsibleCode
                  key={s.step}
                  title={`Q${s.step}. ${s.title}`}
                  subtitle={`${s.passed ? 'Passed' : 'Failed'} · ${tries} attempt${tries > 1 ? 's' : ''} · ${speed}${s.timestamp || '—'}`}
                  passed={s.passed}
                  code={s.code}
                  queryResult={s.queryResult}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default React.memo(MySubmissions);
