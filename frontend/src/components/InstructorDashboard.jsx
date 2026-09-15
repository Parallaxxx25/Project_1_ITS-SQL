import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { problems as builtinProblems, dbSchema } from '../lib/problems';
import {
  getCustomProblems, saveCustomProblem, deleteCustomProblem,
  getAnnouncements, saveAnnouncement, deleteAnnouncement,
  getContent, saveContent, deleteContent,
  getAllSubmissions, onStoreChange,
  getExamConfigs, setExamConfig,
} from '../lib/instructor-store';

// ── Constants ───────────────────────────────────────────────
const MODULES = [
  { id: '01', name: 'Database Fundamentals' },
  { id: '02', name: 'SELECT Statement' },
  { id: '03', name: 'WHERE Clause & Operators' },
  { id: '04', name: 'ORDER BY & LIMIT' },
  { id: '05', name: 'Joins & Relationships' },
  { id: '06', name: 'Displaying Data from Multiple Tables' },
  { id: '07', name: 'Aggregate Functions' },
  { id: '08', name: 'Subqueries' },
];
const moduleName = (id) => MODULES.find((m) => m.id === id)?.name || `Module ${id}`;
const TABLES = Object.keys(dbSchema);

const TYPE_STYLES = {
  COURSE: 'bg-blue-50 border-blue-100 text-blue-600',
  ASSIGNMENT: 'bg-indigo-50 border-indigo-100 text-indigo-600',
  EXAM: 'bg-[#FF9900]/10 border-[#FF9900]/20 text-[#CC7A00]',
};
// ── Small UI helpers ────────────────────────────────────────
const labelCls = 'text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2';
const inputCls = 'w-full bg-slate-50 border border-slate-200 p-3.5 rounded-xl font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#03045e] focus:ring-1 focus:ring-[#03045e] transition-colors';

const Icon = ({ d, className = 'w-5 h-5' }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d={d} />
  </svg>
);
const ICONS = {
  grid: 'M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z',
  check: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  book: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.247m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.247',
  code: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4',
  mega: 'M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z',
  plus: 'M12 4v16m8-8H4',
  edit: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
  trash: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16',
  close: 'M6 18L18 6M6 6l12 12',
  search: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
  users: 'M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4 0M13 7a4 4 0 11-8 0 4 4 0 018 0z',
  doc: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  chart: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
  chevron: 'M19 9l-7 7-7-7',
};

function Modal({ title, subtitle, onClose, children, footer, wide }) {
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose}></div>
      <div className={`relative w-full ${wide ? 'max-w-2xl' : 'max-w-lg'} max-h-[90vh] bg-white rounded-[2rem] shadow-[0_24px_60px_-15px_rgba(3,4,94,0.35)] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200`}>
        <div className="px-5 sm:px-7 py-4 sm:py-5 border-b border-slate-100 flex items-center justify-between gap-3 bg-slate-50/50 shrink-0">
          <div className="min-w-0">
            <h3 className="text-lg sm:text-xl font-bold text-[#03045e] truncate">{title}</h3>
            {subtitle && <p className="text-sm text-slate-400 font-medium mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="w-9 h-9 shrink-0 flex items-center justify-center rounded-full bg-white border border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-100 active:scale-95 transition-all outline-none">
            <Icon d={ICONS.close} className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 sm:p-7 overflow-y-auto custom-scrollbar space-y-5">{children}</div>
        {footer && <div className="px-5 sm:px-7 py-4 border-t border-slate-100 bg-slate-50/50 shrink-0 flex justify-end gap-3">{footer}</div>}
      </div>
    </div>
  );
}

function EmptyState({ icon, title, hint }) {
  return (
    <div className="bg-white border border-slate-200 shadow-[0_8px_30px_rgba(0,0,0,0.03)] rounded-3xl p-8 sm:p-12 text-center flex flex-col items-center justify-center min-h-[260px]">
      <div className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 mb-5 border border-slate-100">
        <Icon d={icon} className="w-7 h-7 sm:w-9 sm:h-9" />
      </div>
      <h3 className="text-slate-800 font-bold text-lg sm:text-xl mb-1.5">{title}</h3>
      <p className="text-slate-400 text-sm sm:text-base max-w-sm mx-auto">{hint}</p>
    </div>
  );
}

const btnPrimary = 'inline-flex items-center justify-center gap-2 bg-[#03045e] text-white px-5 py-3 rounded-xl font-bold text-sm sm:text-base hover:bg-[#020344] hover:-translate-y-0.5 active:translate-y-0 active:scale-[.98] transition-all shadow-md hover:shadow-lg outline-none focus-visible:ring-2 focus-visible:ring-[#03045e]/30';
const btnAccent = 'inline-flex items-center justify-center gap-2 bg-[#f48c06] text-white px-5 py-3 rounded-xl font-bold text-sm sm:text-base hover:bg-[#e07d00] hover:-translate-y-0.5 active:translate-y-0 active:scale-[.98] transition-all shadow-md hover:shadow-lg outline-none focus-visible:ring-2 focus-visible:ring-[#f48c06]/40';
const btnGhost = 'inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-sm sm:text-base text-slate-500 hover:bg-slate-100 hover:text-slate-700 active:scale-[.98] transition-all outline-none';

/** Build a CSV string from rows of cells (RFC-4180 quoting) and trigger a download. */
function downloadCsv(filename, rows) {
  const csv = rows
    .map((r) => r.map((c) => {
      const s = c == null ? '' : String(c);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(','))
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Consistent, clear section heading: icon tile + title + description + optional action. */
function SectionHeader({ icon, title, desc, action }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-center gap-3.5 sm:gap-4">
        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#03045e]/10 text-[#03045e] flex items-center justify-center shrink-0">
          <Icon d={icon} className="w-6 h-6 sm:w-7 sm:h-7" />
        </div>
        <div className="min-w-0">
          <h2 className="text-2xl sm:text-3xl font-bold text-[#03045e] tracking-tight leading-tight">{title}</h2>
          {desc && <p className="text-sm sm:text-base text-slate-500 mt-1.5">{desc}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
export default function InstructorDashboard({ onNavigate, user }) {
  const [section, setSection] = useState('students');
  const [customProblems, setCustomProblems] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [content, setContent] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [examConfigs, setExamConfigs] = useState({});

  const refresh = useCallback(() => {
    setCustomProblems(getCustomProblems());
    setAnnouncements(getAnnouncements());
    setContent(getContent());
    setSubmissions(getAllSubmissions());
    setExamConfigs(getExamConfigs());
  }, []);

  useEffect(() => {
    refresh();
    const off = onStoreChange(() => refresh());
    return off;
  }, [refresh]);

  // TA is merged into Instructor — one shared teaching identity.
  const roleLabel = 'Instructor';

  const SECTIONS = [
    { id: 'students', label: 'Students', icon: ICONS.users },
    { id: 'content', label: 'Content', icon: ICONS.book },
    { id: 'problems', label: 'Problems', icon: ICONS.code },
    { id: 'announcements', label: 'Announcements', icon: ICONS.mega },
  ];

  return (
    <div className="max-w-[1300px] mx-auto pb-32 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 text-left">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#03045e] text-white flex items-center justify-center shadow-[0_8px_20px_rgba(3,4,94,0.25)] shrink-0">
            <Icon d={ICONS.users} className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#03045e]/5 border border-[#03045e]/10 mb-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#f48c06]"></span>
              <span className="text-[11px] sm:text-xs font-bold text-[#03045e] uppercase tracking-widest">{roleLabel} Console</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-[#03045e] tracking-tight leading-tight">Teaching Console</h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setSection('problems')} className={btnGhost + ' bg-white border border-slate-200 shadow-sm'}>
            <Icon d={ICONS.code} className="w-4 h-4" /> Problems
          </button>
          <button onClick={() => setSection('announcements')} className={btnAccent}>
            <Icon d={ICONS.plus} className="w-4 h-4" /> Announce
          </button>
        </div>
      </div>

      {/* Section Nav — roomy responsive grid (2 → 3 → 5 columns) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-2 shadow-[0_4px_20px_rgb(0,0,0,0.02)] grid grid-cols-2 sm:grid-cols-4 gap-2">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            onClick={() => setSection(s.id)}
            className={`flex items-center justify-center gap-2 px-4 py-3.5 sm:py-4 rounded-xl font-bold text-sm sm:text-base leading-tight text-center transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-[#03045e]/30 active:scale-95
              ${section === s.id ? 'bg-[#03045e] text-white shadow-md' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
          >
            <Icon d={s.icon} className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
            <span>{s.label}</span>
          </button>
        ))}
      </div>

      {section === 'students' && <StudentsAnalytics submissions={submissions} />}
      {section === 'content' && <ContentManager content={content} onRefresh={refresh} />}
      {section === 'problems' && <ProblemManager custom={customProblems} examConfigs={examConfigs} onRefresh={refresh} />}
      {section === 'announcements' && <AnnouncementManager items={announcements} onRefresh={refresh} author={user?.name || roleLabel} />}
    </div>
  );
}

// ── Content Manager (สร้างเนื้อหา) ──────────────────────────
function ContentManager({ content, onRefresh }) {
  const [draft, setDraft] = useState(null);

  const openNew = () => setDraft({ title: '', moduleId: '02', type: 'article', body: '' });
  const save = () => {
    if (!draft.title.trim()) { alert('Title is required.'); return; }
    saveContent({ ...draft, title: draft.title.trim() });
    setDraft(null);
    onRefresh();
  };
  const remove = (id) => { if (window.confirm('Delete this content item?')) { deleteContent(id); onRefresh(); } };

  return (
    <div className="space-y-4">
      <SectionHeader
        icon={ICONS.book}
        title="Learning Content"
        desc="Author lesson notes and reading material — published to students."
        action={<button onClick={openNew} className={btnPrimary}><Icon d={ICONS.plus} className="w-4 h-4" /> New Content</button>}
      />

      {content.length === 0 ? (
        <EmptyState icon={ICONS.book} title="No content yet" hint="Create lesson notes, guides, or reading material tied to a module." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {content.map((c) => (
            <div key={c.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.03)] flex flex-col transition-all hover:-translate-y-0.5 hover:shadow-[0_14px_40px_rgb(0,0,0,0.07)]">
              <div className="flex items-center justify-between mb-2 gap-2">
                <span className="text-[11px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 border border-slate-200">Module {c.moduleId} · {c.type}</span>
                <div className="flex gap-1.5 shrink-0">
                  <button onClick={() => setDraft(c)} className="w-9 h-9 rounded-lg bg-slate-50 border border-slate-200 text-slate-400 hover:text-[#03045e] hover:bg-blue-50 active:scale-95 flex items-center justify-center transition-all"><Icon d={ICONS.edit} className="w-4 h-4" /></button>
                  <button onClick={() => remove(c.id)} className="w-9 h-9 rounded-lg bg-slate-50 border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 active:scale-95 flex items-center justify-center transition-all"><Icon d={ICONS.trash} className="w-4 h-4" /></button>
                </div>
              </div>
              <h4 className="font-bold text-slate-800 text-base sm:text-lg mb-1">{c.title}</h4>
              <p className="text-sm sm:text-[15px] text-slate-500 line-clamp-3 whitespace-pre-wrap">{c.body || 'No description.'}</p>
            </div>
          ))}
        </div>
      )}

      {draft && (
        <Modal
          title={draft.id ? 'Edit Content' : 'New Content'}
          subtitle="Lesson notes / reading material"
          onClose={() => setDraft(null)}
          footer={<>
            <button onClick={() => setDraft(null)} className={btnGhost}>Cancel</button>
            <button onClick={save} className={btnPrimary}>Save Content</button>
          </>}
        >
          <div>
            <label className={labelCls}>Title</label>
            <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="e.g. Understanding INNER JOIN" className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Module</label>
              <select value={draft.moduleId} onChange={(e) => setDraft({ ...draft, moduleId: e.target.value })} className={inputCls}>
                {MODULES.map((m) => <option key={m.id} value={m.id}>{m.id} · {m.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Type</label>
              <select value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value })} className={inputCls}>
                <option value="article">Article</option>
                <option value="note">Note</option>
                <option value="guide">Guide</option>
              </select>
            </div>
          </div>
          <div>
            <label className={labelCls}>Body</label>
            <textarea value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} rows={6} placeholder="Write the lesson content here..." className={inputCls + ' resize-none'} />
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Problem & Exam Manager (สร้างโจทย์ / สร้างข้อสอบ) ────────
function ProblemManager({ custom, examConfigs, onRefresh }) {
  const [draft, setDraft] = useState(null);
  const [schedDraft, setSchedDraft] = useState(null); // exam schedule editor { moduleId, openAt, closeAt, timeLimitMin }
  const [typeFilter, setTypeFilter] = useState('all');
  const [q, setQ] = useState('');
  const [collapsed, setCollapsed] = useState({}); // { [moduleId]: true } when a group is collapsed

  const builtinList = builtinProblems.map((p) => ({ ...p, builtin: true }));
  const all = [...custom.map((p) => ({ ...p, builtin: false })), ...builtinList];
  const rows = all.filter((p) => {
    const matchType = typeFilter === 'all' || p.type === typeFilter;
    const matchQ = !q || (p.title || '').toLowerCase().includes(q.toLowerCase());
    return matchType && matchQ;
  });

  // Group problems by module (category), following MODULES order; unknown modules appended.
  const known = new Set(MODULES.map((m) => m.id));
  const groups = MODULES
    .map((m) => ({ id: m.id, name: m.name, items: rows.filter((p) => p.moduleId === m.id) }))
    .concat(
      [...new Set(rows.filter((p) => !known.has(p.moduleId)).map((p) => p.moduleId))]
        .sort()
        .map((id) => ({ id, name: `Module ${id}`, items: rows.filter((p) => p.moduleId === id) }))
    )
    .filter((g) => g.items.length);
  const toggleGroup = (id) => setCollapsed((c) => ({ ...c, [id]: !c[id] }));

  // Exam schedule (per module) — merged from the former Exam Control section.
  const toInput = (ms) => { if (!ms) return ''; return new Date(ms - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16); };
  const fromInput = (str) => (str ? new Date(str).getTime() : null);
  const fmt = (ms) => (ms ? new Date(ms).toLocaleString() : '—');
  const openSchedule = (modId) => {
    const c = (examConfigs || {})[modId] || {};
    setSchedDraft({ moduleId: modId, openAt: c.openAt || null, closeAt: c.closeAt || null, timeLimitMin: c.timeLimitMin || 60 });
  };
  const saveSchedule = () => {
    setExamConfig(schedDraft.moduleId, {
      openAt: schedDraft.openAt || null,
      closeAt: schedDraft.closeAt || null,
      timeLimitMin: schedDraft.timeLimitMin ? Number(schedDraft.timeLimitMin) : null,
    });
    setSchedDraft(null);
    onRefresh();
  };
  const clearSchedule = (modId) => { if (window.confirm('Clear the exam schedule for this module?')) { setExamConfig(modId, null); onRefresh(); } };

  const openNew = (type = 'COURSE') => setDraft({
    type, moduleId: '02', table: 'products',
    title: '', description: '', goldenQuery: '', starterCode: 'SELECT ', requirementsText: '',
  });
  const openEdit = (p) => setDraft({ ...p, requirementsText: (p.requirements || []).join('\n') });

  const save = () => {
    if (!draft.title.trim() || !draft.goldenQuery.trim()) { alert('Title and Golden Query are required.'); return; }
    saveCustomProblem({
      id: draft.id,
      type: draft.type,
      moduleId: draft.moduleId,
      title: draft.title.trim(),
      category: draft.category || `Custom · ${draft.type}`,
      description: draft.description,
      table: draft.table,
      goldenQuery: draft.goldenQuery.trim(),
      starterCode: draft.starterCode || 'SELECT ',
      requirements: draft.requirementsText.split('\n').map((s) => s.trim()).filter(Boolean),
    });
    setDraft(null);
    onRefresh();
  };
  const remove = (id) => { if (window.confirm('Delete this problem? Students will no longer see it.')) { deleteCustomProblem(id); onRefresh(); } };

  return (
    <div className="space-y-4">
      <SectionHeader
        icon={ICONS.code}
        title="Problems & Exams"
        desc="Author problems & exams grouped by module — set each module's exam schedule inline."
        action={<div className="flex gap-2">
          <button onClick={() => openNew('EXAM')} className={btnGhost + ' bg-white border border-slate-200 shadow-sm'}><Icon d={ICONS.plus} className="w-4 h-4" /> New Exam</button>
          <button onClick={() => openNew('COURSE')} className={btnPrimary}><Icon d={ICONS.plus} className="w-4 h-4" /> New Problem</button>
        </div>}
      />

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"><Icon d={ICONS.search} className="w-4 h-4" /></span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search problems by title..." className={inputCls + ' pl-10'} />
        </div>
        <div className="flex gap-2">
          {['all', 'COURSE', 'ASSIGNMENT', 'EXAM'].map((t) => (
            <button key={t} onClick={() => setTypeFilter(t)}
              className={`px-3.5 py-3 rounded-xl font-bold text-[11px] sm:text-xs uppercase tracking-widest transition-all outline-none active:scale-95
                ${typeFilter === t ? 'bg-[#03045e] text-white shadow-md' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {groups.length === 0 ? (
        <EmptyState icon={ICONS.code} title="No problems match" hint="Adjust the search or type filter, or create a new problem." />
      ) : (
        <div className="space-y-4">
          {groups.map((g) => {
            const open = !collapsed[g.id];
            const exams = g.items.filter((p) => p.type === 'EXAM').length;
            const cfg = examConfigs?.[g.id];
            const scheduled = !!cfg && (cfg.openAt || cfg.closeAt || cfg.timeLimitMin);
            return (
              <div key={g.id} className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.03)]">
                <button onClick={() => toggleGroup(g.id)} className="w-full px-5 sm:px-6 py-4 flex items-center gap-3.5 bg-slate-50/60 hover:bg-slate-100/60 active:bg-slate-100 transition-colors text-left outline-none">
                  <div className="w-11 h-11 rounded-xl bg-[#03045e]/10 text-[#03045e] flex items-center justify-center font-bold shrink-0 text-base tabular-nums">{g.id}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-800 text-sm sm:text-base truncate">Module {g.id} · {g.name}</p>
                    <p className="text-xs sm:text-sm text-slate-400">{g.items.length} problem{g.items.length !== 1 ? 's' : ''}{exams ? ` · ${exams} exam${exams !== 1 ? 's' : ''}` : ''}</p>
                  </div>
                  <Icon d={ICONS.chevron} className={`w-5 h-5 text-slate-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
                </button>
                {open && (
                  <div className="border-t border-slate-100">
                    {exams > 0 && (
                      <div className="px-5 sm:px-6 py-3.5 flex items-center gap-3 bg-[#FF9900]/5 border-b border-[#FF9900]/15">
                        <span className="w-9 h-9 rounded-lg bg-[#FF9900]/15 text-[#CC7A00] flex items-center justify-center shrink-0"><Icon d={ICONS.doc} className="w-4 h-4" /></span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-700">Exam schedule</p>
                          <p className="text-xs text-slate-400 truncate">{scheduled ? `opens ${fmt(cfg.openAt)} · closes ${fmt(cfg.closeAt)} · limit ${cfg.timeLimitMin || '—'} min` : 'No schedule · open, 60 min default'}</p>
                        </div>
                        <span className={`hidden sm:inline shrink-0 text-[11px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-md border ${scheduled ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>{scheduled ? 'Scheduled' : 'Default'}</span>
                        <button onClick={() => openSchedule(g.id)} className="shrink-0 text-sm font-bold text-[#03045e] hover:underline active:scale-95 transition-transform">Edit</button>
                        {scheduled && <button onClick={() => clearSchedule(g.id)} className="shrink-0 w-9 h-9 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 active:scale-95 flex items-center justify-center transition-all"><Icon d={ICONS.trash} className="w-4 h-4" /></button>}
                      </div>
                    )}
                    <div className="divide-y divide-slate-50">
                      {g.items.map((p) => (
                        <div key={(p.builtin ? 'b' : 'c') + p.id} className="px-5 sm:px-6 py-4 flex items-center gap-4 hover:bg-slate-50/50 transition-colors">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-bold text-slate-800 text-sm sm:text-base truncate">{p.title}</p>
                              {!p.builtin && <span className="text-[10px] font-bold uppercase tracking-widest text-[#f48c06] bg-[#FF9900]/10 border border-[#FF9900]/20 px-1.5 py-0.5 rounded">Custom</span>}
                            </div>
                            <p className="text-xs sm:text-sm text-slate-400 truncate">table {p.table || '—'}</p>
                          </div>
                          <span className={`hidden sm:inline shrink-0 text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md border ${TYPE_STYLES[p.type] || 'bg-slate-50 border-slate-200 text-slate-500'}`}>{p.type}</span>
                          {p.builtin ? (
                            <span className="shrink-0 text-[11px] font-semibold text-slate-300 uppercase tracking-widest w-[80px] text-right">Built-in</span>
                          ) : (
                            <div className="shrink-0 flex gap-1.5 w-[80px] justify-end">
                              <button onClick={() => openEdit(p)} className="w-9 h-9 rounded-lg bg-slate-50 border border-slate-200 text-slate-400 hover:text-[#03045e] hover:bg-blue-50 active:scale-95 flex items-center justify-center transition-all"><Icon d={ICONS.edit} className="w-4 h-4" /></button>
                              <button onClick={() => remove(p.id)} className="w-9 h-9 rounded-lg bg-slate-50 border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 active:scale-95 flex items-center justify-center transition-all"><Icon d={ICONS.trash} className="w-4 h-4" /></button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {draft && (
        <Modal
          wide
          title={draft.id ? 'Edit Problem' : draft.type === 'EXAM' ? 'Create Exam' : 'Create Problem'}
          subtitle="Publishes to the live student workspace"
          onClose={() => setDraft(null)}
          footer={<>
            <button onClick={() => setDraft(null)} className={btnGhost}>Cancel</button>
            <button onClick={save} className={btnAccent}>{draft.id ? 'Save Changes' : 'Publish'}</button>
          </>}
        >
          <div>
            <label className={labelCls}>Problem Title</label>
            <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="e.g. Select Active Customers" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Description</label>
            <textarea value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} rows={2} placeholder="Explain the task for the student..." className={inputCls + ' resize-none'} />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>Type</label>
              <select value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value })} className={inputCls}>
                <option value="COURSE">COURSE</option>
                <option value="ASSIGNMENT">ASSIGNMENT</option>
                <option value="EXAM">EXAM</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Module</label>
              <select value={draft.moduleId} onChange={(e) => setDraft({ ...draft, moduleId: e.target.value })} className={inputCls}>
                {MODULES.map((m) => <option key={m.id} value={m.id}>{m.id}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Main Table</label>
              <select value={draft.table} onChange={(e) => setDraft({ ...draft, table: e.target.value })} className={inputCls}>
                {TABLES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className={labelCls}>Requirements <span className="normal-case tracking-normal text-slate-400 font-medium">(one per line)</span></label>
            <textarea value={draft.requirementsText} onChange={(e) => setDraft({ ...draft, requirementsText: e.target.value })} rows={3} placeholder={'ใช้คำสั่ง SELECT\nกรองข้อมูลด้วย WHERE'} className={inputCls + ' resize-none'} />
          </div>
          <div>
            <label className={labelCls}>Golden Query <span className="normal-case tracking-normal text-slate-400 font-medium">(expected answer)</span></label>
            <div className="bg-[#0e1117] rounded-xl overflow-hidden border border-slate-800">
              <textarea value={draft.goldenQuery} onChange={(e) => setDraft({ ...draft, goldenQuery: e.target.value })} rows={4} placeholder="SELECT * FROM products;" className="w-full bg-transparent p-4 font-mono text-[13px] text-slate-200 placeholder:text-slate-600 focus:outline-none resize-none" />
            </div>
          </div>
        </Modal>
      )}

      {schedDraft && (
        <Modal
          title={`Exam Schedule · Module ${schedDraft.moduleId}`}
          subtitle="Applies live to the student exam workspace"
          onClose={() => setSchedDraft(null)}
          footer={<>
            <button onClick={() => setSchedDraft(null)} className={btnGhost}>Cancel</button>
            <button onClick={saveSchedule} className={btnAccent}>Save Schedule</button>
          </>}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Opens At</label>
              <input type="datetime-local" value={toInput(schedDraft.openAt)} onChange={(e) => setSchedDraft({ ...schedDraft, openAt: fromInput(e.target.value) })} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Closes At</label>
              <input type="datetime-local" value={toInput(schedDraft.closeAt)} onChange={(e) => setSchedDraft({ ...schedDraft, closeAt: fromInput(e.target.value) })} className={inputCls} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Time Limit <span className="normal-case tracking-normal text-slate-400 font-medium">(minutes)</span></label>
            <input type="number" min="1" value={schedDraft.timeLimitMin || ''} onChange={(e) => setSchedDraft({ ...schedDraft, timeLimitMin: e.target.value })} placeholder="60" className={inputCls} />
          </div>
          <p className="text-xs text-slate-400">Leave a field empty to disable that rule. The time limit counts from the moment each student starts the module exam.</p>
        </Modal>
      )}
    </div>
  );
}

// ── Announcement Manager ────────────────────────────────────
function AnnouncementManager({ items, onRefresh, author }) {
  const [draft, setDraft] = useState(null);

  const openNew = () => setDraft({ title: '', body: '', priority: 'medium', pinned: false });
  const save = () => {
    if (!draft.title.trim()) { alert('Title is required.'); return; }
    saveAnnouncement({ ...draft, title: draft.title.trim(), author });
    setDraft(null);
    onRefresh();
  };
  const remove = (id) => { if (window.confirm('Delete this announcement?')) { deleteAnnouncement(id); onRefresh(); } };

  return (
    <div className="space-y-4">
      <SectionHeader
        icon={ICONS.mega}
        title="Announcements"
        desc="Posted announcements are shown to students on their dashboard."
        action={<button onClick={openNew} className={btnAccent}><Icon d={ICONS.plus} className="w-4 h-4" /> New Announcement</button>}
      />

      {items.length === 0 ? (
        <EmptyState icon={ICONS.mega} title="No announcements" hint="Post class updates, deadlines, or exam openings for students to see." />
      ) : (
        <div className="space-y-3">
          {items.map((a) => (
            <div key={a.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.03)] flex items-start gap-4 transition-all hover:-translate-y-0.5 hover:shadow-[0_14px_40px_rgb(0,0,0,0.07)]">
              <span className={`w-2.5 h-2.5 rounded-full mt-2.5 shrink-0 ${a.priority === 'high' ? 'bg-rose-500' : a.priority === 'low' ? 'bg-emerald-500' : 'bg-[#f48c06]'}`}></span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-bold text-slate-800 text-base sm:text-lg">{a.title}</h4>
                  {a.pinned && <span className="text-[10px] font-bold uppercase tracking-widest text-[#03045e] bg-[#03045e]/5 border border-[#03045e]/10 px-1.5 py-0.5 rounded">Pinned</span>}
                  <span className={`text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border ${a.priority === 'high' ? 'bg-rose-50 border-rose-200 text-rose-600' : a.priority === 'low' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-amber-50 border-amber-200 text-amber-600'}`}>{a.priority}</span>
                </div>
                <p className="text-sm sm:text-[15px] text-slate-500 mt-1 whitespace-pre-wrap">{a.body}</p>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <button onClick={() => setDraft(a)} className="w-9 h-9 rounded-lg bg-slate-50 border border-slate-200 text-slate-400 hover:text-[#03045e] hover:bg-blue-50 active:scale-95 flex items-center justify-center transition-all"><Icon d={ICONS.edit} className="w-4 h-4" /></button>
                <button onClick={() => remove(a.id)} className="w-9 h-9 rounded-lg bg-slate-50 border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 active:scale-95 flex items-center justify-center transition-all"><Icon d={ICONS.trash} className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {draft && (
        <Modal
          title={draft.id ? 'Edit Announcement' : 'New Announcement'}
          onClose={() => setDraft(null)}
          footer={<>
            <button onClick={() => setDraft(null)} className={btnGhost}>Cancel</button>
            <button onClick={save} className={btnAccent}>Post</button>
          </>}
        >
          <div>
            <label className={labelCls}>Title</label>
            <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="e.g. Exam Module 05 is now open" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Message</label>
            <textarea value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} rows={4} placeholder="Write your announcement..." className={inputCls + ' resize-none'} />
          </div>
          <div className="grid grid-cols-2 gap-4 items-end">
            <div>
              <label className={labelCls}>Priority</label>
              <select value={draft.priority} onChange={(e) => setDraft({ ...draft, priority: e.target.value })} className={inputCls}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <label className="flex items-center gap-2.5 p-3.5 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer select-none">
              <input type="checkbox" checked={!!draft.pinned} onChange={(e) => setDraft({ ...draft, pinned: e.target.checked })} className="w-4 h-4 accent-[#03045e]" />
              <span className="text-sm font-semibold text-slate-600">Pin to top</span>
            </label>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Students & Analytics (roster + class performance) ───────
function StudentsAnalytics({ submissions }) {
  const [q, setQ] = useState('');
  const [sort, setSort] = useState('recent');
  const [filter, setFilter] = useState('all');
  const [openId, setOpenId] = useState(null);
  const [openCat, setOpenCat] = useState(null); // selected module inside the student modal

  const data = useMemo(() => {
    const map = new Map();
    const byModule = {};
    const byMode = { COURSE: 0, ASSIGNMENT: 0, EXAM: 0 };
    const durations = [];
    let passed = 0;
    submissions.forEach((s) => {
      const id = String(s.userId);
      let r = map.get(id);
      if (!r) { r = { userId: id, subs: 0, passed: 0, problems: new Set(), modules: new Set(), exams: 0, last: 0 }; map.set(id, r); }
      r.subs += 1;
      if (s.passed) { r.passed += 1; passed += 1; }
      r.problems.add(`${s.mode}-${s.modId}-${s.step}`);
      r.modules.add(s.modId);
      if (s.mode === 'EXAM') r.exams += 1;
      const t = s.submittedAt || Date.parse(s.timestamp) || 0;
      if (t > r.last) r.last = t;

      byModule[s.modId] = byModule[s.modId] || { total: 0, passed: 0 };
      byModule[s.modId].total += 1;
      if (s.passed) byModule[s.modId].passed += 1;
      if (byMode[s.mode] != null) byMode[s.mode] += 1;
      if (typeof s.durationMs === 'number') durations.push(s.durationMs);
    });
    const roster = [...map.values()]
      .map((r) => ({ ...r, problems: r.problems.size, modules: r.modules.size, passRate: r.subs ? Math.round((r.passed / r.subs) * 100) : 0 }))
      .sort((a, b) => b.last - a.last);
    const modules = Object.entries(byModule)
      .map(([id, v]) => ({ id, ...v, rate: v.total ? Math.round((v.passed / v.total) * 100) : 0 }))
      .sort((x, y) => x.id.localeCompare(y.id));
    const total = submissions.length;
    const avgMs = durations.length ? Math.round(durations.reduce((x, y) => x + y, 0) / durations.length) : null;
    return {
      roster, modules, byMode,
      total, students: map.size, passRate: total ? Math.round((passed / total) * 100) : 0, avgMs,
    };
  }, [submissions]);

  const filtered = useMemo(() => {
    let list = data.roster;
    if (filter === 'atrisk') list = list.filter((r) => r.passRate < 50);
    else if (filter === 'top') list = list.filter((r) => r.passRate >= 80);
    if (q) { const query = q.toLowerCase(); list = list.filter((r) => r.userId.toLowerCase().includes(query)); }
    const by = {
      recent: (a, b) => b.last - a.last,
      passLow: (a, b) => a.passRate - b.passRate || b.subs - a.subs,
      passHigh: (a, b) => b.passRate - a.passRate || b.subs - a.subs,
      subs: (a, b) => b.subs - a.subs,
      id: (a, b) => a.userId.localeCompare(b.userId),
    };
    return [...list].sort(by[sort] || by.recent);
  }, [data.roster, filter, q, sort]);
  const detail = useMemo(
    () => (openId ? submissions.filter((s) => String(s.userId) === openId).sort((a, b) => (b.submittedAt || Date.parse(b.timestamp) || 0) - (a.submittedAt || Date.parse(a.timestamp) || 0)) : []),
    [openId, submissions]
  );
  // Group one student's submissions by module (category) for the drill-down modal.
  const groups = useMemo(() => {
    const m = new Map();
    detail.forEach((s) => {
      const id = String(s.modId);
      let g = m.get(id);
      if (!g) { g = { modId: id, subs: [], passed: 0 }; m.set(id, g); }
      g.subs.push(s);
      if (s.passed) g.passed += 1;
    });
    return [...m.values()]
      .map((g) => ({ ...g, count: g.subs.length, rate: g.subs.length ? Math.round((g.passed / g.subs.length) * 100) : 0 }))
      .sort((a, b) => a.modId.localeCompare(b.modId));
  }, [detail]);
  const catSubs = openCat ? (groups.find((g) => g.modId === openCat)?.subs || []) : [];
  const openStudent = (id) => { setOpenId(id); setOpenCat(null); };
  const closeStudent = () => { setOpenId(null); setOpenCat(null); };

  if (submissions.length === 0) {
    return (
      <div className="space-y-5">
        <SectionHeader icon={ICONS.users} title="Students & Analytics" desc="Per-student progress and class performance from recorded submissions." />
        <EmptyState icon={ICONS.users} title="No student data yet" hint="Once students submit answers in this browser, their progress and class analytics appear here." />
      </div>
    );
  }

  const cards = [
    { label: 'Students', value: data.students, tint: 'text-[#03045e] bg-[#03045e]/10', icon: ICONS.users },
    { label: 'Submissions', value: data.total, tint: 'text-indigo-600 bg-indigo-50', icon: ICONS.check },
    { label: 'Pass Rate', value: `${data.passRate}%`, tint: 'text-emerald-600 bg-emerald-50', icon: ICONS.chart },
    { label: 'Avg Verify', value: data.avgMs != null ? `${data.avgMs} ms` : '—', tint: 'text-[#CC7A00] bg-[#FF9900]/10', icon: ICONS.doc },
  ];

  const Bar = ({ label, note, rate, tone = '#03045e' }) => (
    <div>
      <div className="flex justify-between text-sm mb-1.5 gap-3">
        <span className="font-semibold text-slate-600 truncate">{label}</span>
        <span className="text-slate-400 tabular-nums shrink-0">{rate}%{note ? ` · ${note}` : ''}</span>
      </div>
      <div className="h-3 rounded-full bg-slate-100 overflow-hidden"><div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${rate}%`, background: tone }}></div></div>
    </div>
  );

  return (
    <div className="space-y-6">
      <SectionHeader icon={ICONS.users} title="Students & Analytics" desc="Per-student progress and class performance from recorded submissions." />

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.03)] transition-all hover:-translate-y-0.5 hover:shadow-[0_14px_40px_rgb(0,0,0,0.07)]">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${c.tint}`}>
              <Icon d={c.icon} className="w-5 h-5" />
            </div>
            <p className="text-3xl sm:text-4xl font-bold text-slate-900 tabular-nums">{c.value}</p>
            <p className="text-[11px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Roster (2/3) + analytics sidebar (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.03)] overflow-hidden flex flex-col">
          <div className="px-5 sm:px-6 py-4 border-b border-slate-100 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="font-bold text-slate-800 text-base sm:text-lg shrink-0">Student Roster <span className="text-slate-400 font-medium text-sm">· {filtered.length}/{data.roster.length}</span></h3>
              <div className="relative sm:w-56">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><Icon d={ICONS.search} className="w-4 h-4" /></span>
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search student ID..." className="w-full bg-slate-50 border border-slate-200 pl-9 pr-3 py-2.5 rounded-xl text-sm sm:text-base font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#03045e] focus:ring-1 focus:ring-[#03045e] transition-colors" />
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex gap-1.5">
                {[['all', 'All'], ['atrisk', 'At-risk'], ['top', 'Top']].map(([f, lbl]) => (
                  <button key={f} onClick={() => setFilter(f)}
                    className={`px-3 py-2 rounded-lg font-bold text-[11px] sm:text-xs uppercase tracking-widest transition-all outline-none active:scale-95 ${filter === f ? 'bg-[#03045e] text-white shadow-sm' : 'bg-slate-50 border border-slate-200 text-slate-500 hover:bg-slate-100'}`}>
                    {lbl}
                  </button>
                ))}
              </div>
              <select value={sort} onChange={(e) => setSort(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs sm:text-sm font-bold text-slate-600 focus:outline-none focus:border-[#03045e] cursor-pointer">
                <option value="recent">Recent activity</option>
                <option value="passLow">Pass rate · low→high</option>
                <option value="passHigh">Pass rate · high→low</option>
                <option value="subs">Most submissions</option>
                <option value="id">Student ID</option>
              </select>
            </div>
          </div>
          <div className="divide-y divide-slate-50 max-h-[540px] overflow-y-auto custom-scrollbar">
            {filtered.map((r) => (
              <button key={r.userId} onClick={() => openStudent(r.userId)} className="w-full px-5 sm:px-6 py-4 flex items-center gap-4 text-left hover:bg-slate-50/60 active:bg-slate-100/60 transition-colors outline-none">
                <div className="w-11 h-11 rounded-full bg-[#03045e]/10 text-[#03045e] flex items-center justify-center font-bold shrink-0 uppercase text-sm">{r.userId.slice(0, 2)}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-800 text-sm sm:text-base truncate">Student {r.userId}</p>
                  <p className="text-xs sm:text-sm text-slate-400 truncate">{r.problems} problems · {r.modules} modules · {r.exams} exam subs · last {r.last ? new Date(r.last).toLocaleDateString() : '—'}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-slate-900 tabular-nums text-base sm:text-lg">{r.passRate}%</p>
                  <p className="text-[11px] text-slate-400 uppercase tracking-widest">{r.passed}/{r.subs} pass</p>
                </div>
              </button>
            ))}
            {filtered.length === 0 && <div className="p-10 text-center text-sm text-slate-400">No students match.</div>}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.03)] space-y-4">
            <h3 className="font-bold text-slate-800 text-base sm:text-lg">Pass Rate by Module</h3>
            {data.modules.length ? data.modules.map((m) => <Bar key={m.id} label={`Module ${m.id} · ${moduleName(m.id)}`} note={`${m.passed}/${m.total}`} rate={m.rate} />) : <p className="text-sm text-slate-400">No module data.</p>}
          </div>
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.03)]">
            <h3 className="font-bold text-slate-800 text-base sm:text-lg mb-4">Submissions by Type</h3>
            <div className="grid grid-cols-3 gap-3">
              {Object.entries(data.byMode).map(([k, v]) => (
                <div key={k} className={`rounded-2xl p-4 border text-center ${TYPE_STYLES[k] || 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                  <p className="text-2xl sm:text-3xl font-bold tabular-nums">{v}</p>
                  <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest mt-1">{k}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {openId && (
        <Modal
          wide
          title={openCat ? `Student ${openId} · Module ${openCat}` : `Student ${openId}`}
          subtitle={openCat
            ? `${moduleName(openCat)} · ${catSubs.length} quer${catSubs.length !== 1 ? 'ies' : 'y'}`
            : `${detail.length} submission${detail.length !== 1 ? 's' : ''} across ${groups.length} module${groups.length !== 1 ? 's' : ''}`}
          onClose={closeStudent}
          footer={openCat
            ? <button onClick={() => setOpenCat(null)} className={btnGhost}><Icon d={ICONS.close} className="w-4 h-4" /> Back to modules</button>
            : <button onClick={closeStudent} className={btnGhost}>Close</button>}
        >
          {!openCat ? (
            /* Level 1 — categories (modules) */
            groups.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-400">No submissions for this student.</div>
            ) : (
              <div className="space-y-2.5">
                {groups.map((g) => (
                  <button key={g.modId} onClick={() => setOpenCat(g.modId)} className="w-full flex items-center gap-4 px-4 py-3.5 border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 active:scale-[.99] transition-all text-left outline-none">
                    <div className="w-11 h-11 rounded-xl bg-[#03045e]/10 text-[#03045e] flex items-center justify-center font-bold shrink-0 text-base tabular-nums">{g.modId}</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-800 text-sm sm:text-base truncate">Module {g.modId} · {moduleName(g.modId)}</p>
                      <p className="text-xs sm:text-sm text-slate-400">{g.count} quer{g.count !== 1 ? 'ies' : 'y'} · {g.passed}/{g.count} pass</p>
                    </div>
                    <span className={`shrink-0 text-xs font-bold tabular-nums px-2 py-0.5 rounded-md border ${g.rate >= 80 ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : g.rate < 50 ? 'bg-rose-50 border-rose-200 text-rose-600' : 'bg-amber-50 border-amber-200 text-amber-600'}`}>{g.rate}%</span>
                    <Icon d={ICONS.code} className="w-5 h-5 text-slate-300 shrink-0" />
                  </button>
                ))}
              </div>
            )
          ) : (
            /* Level 2 — queries within the selected module */
            <div className="space-y-2.5">
              {catSubs.map((s, i) => (
                <div key={i} className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="px-4 py-2.5 flex items-center gap-3 bg-slate-50/60">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${s.passed ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                    <span className={`shrink-0 text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border ${TYPE_STYLES[s.mode] || 'bg-slate-50 border-slate-200 text-slate-500'}`}>{s.mode}</span>
                    <span className="text-sm font-semibold text-slate-700 flex-1 truncate">Q{s.step}</span>
                    <span className="text-xs text-slate-400 shrink-0">{s.timestamp || '—'}</span>
                  </div>
                  <pre className="bg-[#0e1117] p-3.5 overflow-x-auto custom-scrollbar text-[13px] font-mono text-slate-200 whitespace-pre-wrap"><code>{s.code || '-- (no code)'}</code></pre>
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
