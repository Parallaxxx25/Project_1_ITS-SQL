import React, { useState, useEffect } from 'react';
import kmitlLogo from '../assets/it.png'; 
import { readEnrollmentMap, writeEnrollmentMap } from '../lib/enrollment-storage';

const INITIAL_COURSE_DATA = [
  { 
    id: '06070999', 
    name: 'DATABASE CONCEPT SYSTEM', 
    code: 'DB101', 
    theme: 'from-[#03045e] to-[#023e8a]', 
    instructor: 'ผศ.ดร.กนกวรรณ อัจฉริยะชาญวณิช' 
  }
];

const AlternatingDash = ({ className = "max-w-xs" }) => (
  <div 
    className={`h-[3px] rounded-full bg-[linear-gradient(to_right,#03045e_0%,#03045e_45%,#e85d04_45%,#e85d04_90%,transparent_90%,transparent_100%)] bg-[length:40px_100%] ${className}`}
  ></div>
);

export default function Home({ onNavigate, user }) {
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [accessCode, setAccessCode] = useState('');
  const [error, setError] = useState('');
  const [enrolledList, setEnrolledList] = useState(() => readEnrollmentMap(user));
  const [isEnrolling, setIsEnrolling] = useState(false);

  const objectives = [
    { id: "01", desc: "Master normalization principles and architect robust relational structures." },
    { id: "02", desc: "Write efficient SELECT, INSERT, UPDATE, and DELETE operations." },
    { id: "03", desc: "Combine data seamlessly using advanced subqueries and relationships." },
    { id: "04", desc: "Utilize aggregate functions to extract meaningful business insights." },
    { id: "05", desc: "Implement indexing strategies to drastically reduce query times." },
    { id: "06", desc: "Ensure data integrity through robust transaction management." }
  ];

  useEffect(() => {
    setEnrolledList(readEnrollmentMap(user));
  }, [user]);

  const handleCourseClick = (course) => {
    if (enrolledList[course.id]) {
      onNavigate('coursetext');
    } else {
      setSelectedCourse(course);
      setError('');
      setAccessCode('');
    }
  };

  const handleEnrollSubmit = async (e) => {
    e.preventDefault();
    if (isEnrolling) return;
    setIsEnrolling(true);
    setError('');

    // Client-only: validate the access code locally (no backend).
    const validCodes = [selectedCourse.code, selectedCourse.access_code, 'ITSSQL2025'].filter(Boolean);
    if (validCodes.includes((accessCode || '').trim())) {
      const newList = { ...enrolledList, [selectedCourse.id]: true };
      writeEnrollmentMap(user, newList);
      setEnrolledList(newList);
      setSelectedCourse(null);
      onNavigate('coursetext');
    } else {
      setError('Invalid Access Code. Please try again.');
    }
    setIsEnrolling(false);
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-[#03045e] font-sans selection:bg-[#f48c06] selection:text-[#f8f9fa] pb-24 relative overflow-hidden">
      
      {/* Background Ambient Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80vw] h-[500px] bg-[#0077b6]/5 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="max-w-[1450px] mx-auto px-6 md:px-10 lg:px-12 pt-32 lg:pt-40 space-y-32 relative z-10">
        
        {/* ================= HERO SECTION ================= */}
        <div className="relative w-full flex flex-col xl:flex-row items-center gap-16 lg:gap-20">
          <div className="flex-1 w-full space-y-8 z-10">
            <div className="inline-flex items-center gap-3 bg-[#0077b6]/10 border border-[#0077b6]/20 text-[#023e8a] font-bold px-5 py-2.5 rounded-full shadow-sm shadow-[#023e8a]/5 tracking-widest text-xs uppercase backdrop-blur-md">
              <span className="w-2.5 h-2.5 rounded-full bg-[#e85d04] animate-pulse"></span>
              Welcome to DBLearn Platform
            </div>
            
            <div className="space-y-6">
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-[#03045e] tracking-tighter leading-[1.1]">
                Master SQL & <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#e85d04] to-[#f48c06]">
                  Database Systems
                </span>
              </h1>
              <AlternatingDash className="w-3/4 md:max-w-md opacity-80" />
            </div>
            
            <p className="text-lg md:text-xl font-medium text-[#023e8a]/70 max-w-2xl leading-relaxed">
              Step into the future of database management. Learn structured query language from foundational syntax to advanced architectural concepts through an immersive, high-performance environment.
            </p>
          </div>

          {/* Code Block Glassmorphism */}
          <div className="w-full xl:w-5/12 shrink-0 relative group perspective-1000">
            <div className="absolute inset-0 bg-gradient-to-br from-[#0077b6]/10 to-[#f48c06]/10 blur-2xl rounded-[2rem] -z-10 transition-all duration-700 group-hover:blur-3xl group-hover:from-[#0077b6]/20 group-hover:to-[#f48c06]/20"></div>
            
            <div className="bg-[#f8f9fa]/70 backdrop-blur-xl border border-[#0077b6]/20 rounded-[2rem] shadow-[0_20px_50px_-10px_rgba(3,4,94,0.1)] overflow-hidden transition-all duration-500 hover:shadow-[0_30px_60px_-15px_rgba(3,4,94,0.15)]">
              <div className="bg-[#03045e]/5 px-6 py-4 flex items-center gap-3 border-b border-[#0077b6]/10">
                <div className="w-3.5 h-3.5 rounded-full bg-[#e85d04]"></div>
                <div className="w-3.5 h-3.5 rounded-full bg-[#f48c06]"></div>
                <div className="w-3.5 h-3.5 rounded-full bg-[#0077b6]"></div>
                <span className="ml-4 text-xs font-bold text-[#023e8a]/60 uppercase tracking-widest">query.sql</span>
              </div>
              
              <div className="p-8 sm:p-10 font-mono text-sm sm:text-base leading-loose text-[#023e8a]">
                <p><span className="text-[#e85d04] font-extrabold">SELECT</span> *</p>
                <p><span className="text-[#e85d04] font-extrabold">FROM</span> users</p>
                <p><span className="text-[#e85d04] font-extrabold">WHERE</span> mindset <span className="text-[#f48c06] font-bold">LIKE</span> <span className="text-[#0077b6] font-semibold">'%GROWTH%'</span></p>
                <p><span className="text-[#e85d04] font-extrabold">ORDER BY</span> skills <span className="text-[#e85d04] font-extrabold">DESC</span>;</p>
                <br/>
                <p className="text-[#0077b6]/60 italic font-semibold">-- 0 rows returned (Just kidding!)</p>
                <p className="text-[#e85d04] font-black text-xl mt-2 animate-pulse">_</p>
              </div>
            </div>
          </div>
        </div>

        {/* ================= OBJECTIVES (What You'll Learn) ================= */}
        <div className="relative w-full space-y-16 py-10">
          <div className="relative z-20 flex flex-col items-center justify-center mb-16">
            <div className="relative cursor-default">
              <div className="relative inline-flex items-center justify-center px-10 py-4 rounded-full bg-[#f8f9fa] border border-[#0077b6]/10 shadow-[0_8px_30px_rgba(3,4,94,0.06),inset_0_2px_5px_rgba(248,249,250,1)]">
                <div className="w-2.5 h-2.5 rounded-full bg-[#e85d04] mr-3 shadow-[0_0_10px_rgba(232,93,4,0.5)]"></div>
                <span className="font-extrabold text-sm sm:text-base tracking-[0.25em] uppercase text-[#03045e] z-10">
                  What You'll Learn
                </span>
              </div>
            </div>
            <div className="mt-8 w-48 sm:w-72 border-t-[2px] border-dashed border-[#0077b6]/20"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-y-16 md:gap-y-24 gap-x-8 relative z-10 max-w-5xl mx-auto">
            {objectives.map((item) => (
              <div key={item.id} className="relative flex flex-col items-center group hover:-translate-y-2 transition-transform duration-500">
                <div className="relative w-24 h-24 mb-6 flex items-center justify-center z-10">
                  <div className="absolute inset-0 bg-[#f48c06]/20 rounded-full blur-[20px] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
                  <div className="absolute inset-0 rounded-full border-[2px] border-dashed border-[#0077b6]/30 group-hover:border-[#e85d04] group-hover:rotate-180 transition-all duration-700 ease-in-out"></div>
                  <div className="absolute inset-2.5 rounded-full bg-gradient-to-br from-[#03045e] to-[#023e8a] shadow-[inset_0_4px_12px_rgba(248,249,250,0.1),0_8px_20px_rgba(3,4,94,0.3)] flex items-center justify-center overflow-hidden">
                    <div className="absolute top-0 left-1/4 right-1/4 h-1/2 bg-gradient-to-b from-[#f8f9fa]/20 to-transparent rounded-full blur-[2px]"></div>
                  </div>
                  <span className="relative font-black text-3xl text-transparent bg-clip-text bg-gradient-to-b from-[#f8f9fa] to-[#0077b6] drop-shadow-[0_2px_4px_rgba(3,4,94,0.8)] z-10">
                    {item.id}
                  </span>
                </div>
                <div className="relative z-10 px-4 text-center">
                  <p className="text-[#023e8a]/80 font-semibold text-[1.05rem] leading-relaxed max-w-[280px] mx-auto group-hover:text-[#03045e] transition-colors duration-300">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ================= COURSES SECTION (NEW PANORAMIC HUB DESIGN) ================= */}
        <div id="courses-section" className="relative w-full py-10 mt-10 scroll-mt-32">
          
          <div className="flex flex-col items-center justify-center space-y-6 mb-20 text-center">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-[#03045e] tracking-tighter uppercase drop-shadow-sm">
              Module Overview
            </h1>
            <p className="text-xs sm:text-sm md:text-base font-bold text-[#0077b6] uppercase tracking-[0.2em] sm:tracking-[0.3em]">
              Initialize your learning environment
            </p>
            <AlternatingDash className="w-64 sm:w-96 opacity-90 mt-4" />
          </div>

          {/* แผงควบคุมหลักสูตรแนวนอน (Horizontal Panels) */}
          <div className="max-w-6xl mx-auto space-y-10">
            {INITIAL_COURSE_DATA.map((course) => {
              const isEnrolled = enrolledList[course.id];
              return (
                <div key={course.id} className="group relative w-full">
                  
                  {/* Ambient Hover Glow ด้านหลัง Panel */}
                  <div className="absolute -inset-1.5 bg-gradient-to-r from-[#0077b6]/20 via-[#e85d04]/20 to-[#f48c06]/20 rounded-[2.5rem] blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>
                  
                  {/* Glassmorphic Panel Container */}
                  <div className="relative bg-[#f8f9fa]/70 backdrop-blur-2xl border border-[#0077b6]/20 rounded-[2rem] p-6 sm:p-8 lg:p-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8 lg:gap-12 shadow-[0_15px_40px_-15px_rgba(3,4,94,0.1)] hover:shadow-[0_20px_50px_-15px_rgba(3,4,94,0.2)] transition-all duration-500 overflow-hidden">
                    
                    {/* Background Decorative Abstract Shapes */}
                    <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-br from-[#0077b6]/5 to-[#f48c06]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#03045e]/5 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2 pointer-events-none"></div>

                    {/* Left: ข้อมูลหลักสูตร */}
                    <div className="relative z-10 flex-1 space-y-5 w-full">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="bg-[#03045e] text-[#f8f9fa] text-[10px] sm:text-xs font-black px-4 py-1.5 rounded-full uppercase tracking-widest shadow-sm">
                          {course.code}
                        </span>
                        <span className="bg-[#0077b6]/10 text-[#0077b6] border border-[#0077b6]/20 text-[10px] sm:text-xs font-black px-4 py-1.5 rounded-full uppercase tracking-widest">
                          ID: {course.id}
                        </span>
                      </div>
                      
                      <h3 className="text-3xl sm:text-4xl lg:text-5xl font-black leading-[1.1] uppercase tracking-tighter text-[#03045e]">
                        {course.name}
                      </h3>
                      
                      <p className="text-[#023e8a]/70 font-medium text-sm sm:text-base max-w-2xl leading-relaxed">
                        Dive deep into the architecture of modern databases. Master relational models, query optimization, and transaction management in this highly specialized environment.
                      </p>
                    </div>

                    {/* Right: กล่องย่อยสำหรับผู้สอนและปุ่ม (Inner Control Box) */}
                    <div className="relative z-10 w-full lg:w-auto flex flex-col sm:flex-row items-center justify-between gap-6 lg:gap-8 bg-[#f8f9fa] border border-[#0077b6]/15 p-5 sm:p-6 rounded-[1.5rem] shadow-inner shrink-0">
                      
                      {/* ข้อมูลผู้สอน */}
                      <div className="flex items-center gap-4 w-full sm:w-auto">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#023e8a] to-[#0077b6] flex items-center justify-center font-black text-[#f8f9fa] shadow-md border-2 border-[#f8f9fa] shrink-0">
                          KA
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black text-[#e85d04] uppercase tracking-widest">Instructor</span>
                          <span className="font-bold text-[#03045e] text-sm sm:text-base whitespace-nowrap">{course.instructor}</span>
                        </div>
                      </div>

                      {/* เส้นแบ่งแนวตั้ง (แสดงเฉพาะหน้าจอ Desktop/Tablet) */}
                      <div className="hidden sm:block w-[1px] h-12 bg-[#0077b6]/20"></div>

                      {/* Action Button */}
                      <button 
                        onClick={() => handleCourseClick(course)}
                        className={`w-full sm:w-auto px-8 py-4 rounded-xl font-black text-xs sm:text-sm uppercase tracking-[0.2em] transition-all duration-300 shadow-md flex items-center justify-center gap-3 whitespace-nowrap
                          ${isEnrolled 
                            ? 'bg-[#0077b6] text-[#f8f9fa] hover:bg-[#023e8a] shadow-[0_8px_20px_rgba(0,119,182,0.3)] hover:-translate-y-1' 
                            : 'bg-gradient-to-r from-[#e85d04] to-[#f48c06] text-[#f8f9fa] shadow-[0_8px_20px_rgba(232,93,4,0.3)] hover:shadow-[0_12px_25px_rgba(232,93,4,0.4)] hover:-translate-y-1'
                          }`}
                      >
                        {isEnrolled ? (
                          <>
                            <span className="w-2 h-2 rounded-full bg-[#f8f9fa] animate-pulse"></span>
                            Access Module
                          </>
                        ) : (
                          'Enroll Now'
                        )}
                      </button>

                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ================= FOOTER ================= */}
        <div className="w-full bg-gradient-to-br from-[#03045e] to-[#023e8a] rounded-[2.5rem] p-10 md:p-14 shadow-[0_30px_60px_-15px_rgba(3,4,94,0.4)] relative overflow-hidden flex flex-col lg:flex-row items-center justify-between gap-12 text-[#f8f9fa] mt-16 border border-[#f8f9fa]/10">
          
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#f48c06]/10 rounded-full blur-[80px] pointer-events-none"></div>

          <div className="flex flex-col md:flex-row items-center gap-8 relative z-10 w-full lg:w-auto text-center md:text-left">
            <div className="bg-[#f8f9fa]/5 backdrop-blur-sm p-4 rounded-2xl border border-[#f8f9fa]/10 shadow-inner shrink-0">
              <img 
                src={kmitlLogo} 
                alt="KMITL Logo" 
                className="w-16 h-16 md:w-20 md:h-20 object-contain" 
                onError={(e) => { e.target.src = "https://via.placeholder.com/80?text=IT"; }}
              />
            </div>
            <div className="space-y-3">
              <h3 className="text-2xl font-black text-[#f8f9fa] tracking-wide drop-shadow-sm">
                School of Information Technology
              </h3>
              <AlternatingDash className="w-32 mx-auto md:mx-0 opacity-80 bg-[linear-gradient(to_right,#f8f9fa_0%,#f8f9fa_45%,#f48c06_45%,#f48c06_90%,transparent_90%,transparent_100%)]" />
              <p className="text-[#f8f9fa]/70 font-medium max-w-md mt-2 leading-relaxed">
                King Mongkut's Institute of Technology Ladkrabang<br/>
                <span className="text-[#f48c06]">1 Chalongkrung Road, Bangkok 10520</span>
              </p>
            </div>
          </div>

          <div className="relative z-10 flex flex-col items-center lg:items-end text-center lg:text-right w-full lg:w-auto border-t border-[#f8f9fa]/10 lg:border-t-0 lg:border-l pt-8 lg:pt-0 lg:pl-12">
             <p className="font-bold uppercase tracking-[0.2em] text-xs sm:text-sm mb-4 text-[#f48c06]">
                © 2026 Prototype Version 1.0
            </p>
            <p className="font-medium text-[#f8f9fa]/80 text-sm flex items-center justify-center gap-2">
                Crafted by 
                <a href="https://github.com/Whiterose48" target="_blank" rel="noopener noreferrer" className="text-[#f8f9fa] border-b border-[#e85d04]/50 hover:text-[#f48c06] hover:border-[#f48c06] transition-colors font-bold pb-0.5">@Phruk</a> 
                <span className="text-[#0077b6]">&</span> 
                <a href="https://github.com/Parallaxxx25" target="_blank" rel="noopener noreferrer" className="text-[#f8f9fa] border-b border-[#e85d04]/50 hover:text-[#f48c06] hover:border-[#f48c06] transition-colors font-bold pb-0.5">@Khet</a>
            </p>
          </div>

        </div>
      </div>

      {/* ================= MODAL ENROLLMENT ================= */}
      {selectedCourse && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-[#03045e]/40 backdrop-blur-md" onClick={() => setSelectedCourse(null)}></div>
          
          <div className="relative max-w-md w-full z-10 scale-in-center">
            <div className="bg-[#f8f9fa] border border-[#023e8a]/10 rounded-[2.5rem] p-8 sm:p-12 shadow-[0_25px_50px_-12px_rgba(3,4,94,0.3)] relative overflow-hidden">
              
              <div className="absolute top-0 right-0 w-48 h-48 bg-[#f48c06]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

              <button 
                onClick={() => setSelectedCourse(null)}
                className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center rounded-full bg-[#0077b6]/5 text-[#023e8a] hover:bg-[#e85d04] hover:text-[#f8f9fa] transition-colors duration-300 text-lg font-bold z-20"
              >✕</button>

              <div className="text-center space-y-6 relative z-10 mt-4">
                <div className="w-20 h-20 bg-gradient-to-br from-[#e85d04] to-[#f48c06] rounded-full mx-auto flex items-center justify-center text-4xl shadow-[0_10px_25px_rgba(232,93,4,0.3)]">
                  <span className="drop-shadow-md">🔑</span>
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-[#03045e]">
                    Enter Code
                  </h3>
                  <p className="text-sm font-semibold text-[#0077b6]">Unlock {selectedCourse.code}</p>
                </div>
                
                <form onSubmit={handleEnrollSubmit} className="space-y-6 pt-2">
                  <div>
                    <input 
                      autoFocus
                      type="text"
                      placeholder="e.g. DB101"
                      value={accessCode}
                      onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                      className="w-full bg-[#f8f9fa] border-2 border-[#0077b6]/20 p-4 rounded-2xl font-bold text-center text-lg text-[#03045e] placeholder:text-[#0077b6]/30 focus:outline-none focus:border-[#e85d04] focus:ring-4 focus:ring-[#e85d04]/10 transition-all shadow-inner"
                    />
                    {error && (
                      <p className="text-[#e85d04] text-xs font-bold uppercase mt-3 animate-pulse">{error}</p>
                    )}
                  </div>
                  
                  <button 
                    type="submit" 
                    disabled={isEnrolling} 
                    className={`w-full py-5 rounded-2xl font-extrabold uppercase text-sm tracking-widest transition-all duration-300 shadow-[0_10px_20px_rgba(3,4,94,0.15)] 
                      ${isEnrolling 
                        ? 'bg-[#023e8a]/50 text-[#f8f9fa] cursor-wait' 
                        : 'bg-[#03045e] text-[#f8f9fa] hover:bg-[#023e8a] hover:-translate-y-1 hover:shadow-[0_15px_30px_rgba(3,4,94,0.25)] cursor-pointer'
                      }`}
                  >
                    {isEnrolling ? 'Verifying...' : 'Unlock Course'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}