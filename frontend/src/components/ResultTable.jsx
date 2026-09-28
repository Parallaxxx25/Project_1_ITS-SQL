import React from 'react';

function ResultTable({ data }) {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <div className="bg-white border border-slate-200 shadow-[0_8px_30px_rgba(0,0,0,0.02)] rounded-3xl p-12 text-center flex flex-col items-center justify-center animate-in fade-in duration-300">
        <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 mb-4 border border-slate-100/80 shadow-sm">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
          </svg>
        </div>
        <h3 className="text-slate-800 font-bold text-lg mb-1">No Data Found</h3>
        <p className="text-slate-400 text-sm max-w-xs mx-auto">
          Execute a valid SQL query to see the structured output rows here.
        </p>
      </div>
    );
  }
  
  const columns = Object.keys(data[0]);

  return (
    <div className="bg-white border border-slate-200 shadow-[0_12px_40px_rgba(0,0,0,0.04)] rounded-3xl overflow-hidden flex flex-col max-h-[500px] w-full animate-in fade-in zoom-in-98 duration-300">
      
      {/* Table Header Action Bar */}
      <div className="bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-100/50">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <h3 className="text-slate-800 font-bold text-sm">
            Query Output
          </h3>
        </div>
        <span className="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wider uppercase border border-emerald-100">
          {data.length} {data.length === 1 ? 'Row' : 'Rows'} Returned
        </span>
      </div>

      {/* Table Grid Wrapper — column names and row values are query data, so
          page translators (Google Translate) must leave them as-is. */}
      <div className="overflow-auto custom-scrollbar flex-1 bg-white">
        <table translate="no" className="notranslate w-full text-left border-collapse table-auto">
          <thead className="sticky top-0 z-20 bg-slate-50/80 backdrop-blur-md border-b border-slate-200">
            <tr>
              {columns.map((col) => (
                <th 
                  key={col} 
                  className="px-6 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-r border-slate-200/50 last:border-r-0"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {data.map((row, i) => (
              <tr key={i} className="hover:bg-slate-50/50 transition-colors duration-150">
                {columns.map((col) => {
                  const isNull = row[col] === null || row[col] === undefined;
                  return (
                    <td 
                      key={col} 
                      className={`px-6 py-3.5 text-[13px] font-mono tabular-nums border-r border-slate-100 last:border-r-0 max-w-xs truncate
                        ${isNull ? 'bg-slate-50/30' : 'text-slate-700'}`}
                    >
                      {isNull ? (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-400/80 tracking-wide font-sans">
                          NULL
                        </span>
                      ) : (
                        row[col]?.toString()
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
}

export default React.memo(ResultTable);