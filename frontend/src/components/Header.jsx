import React, { useState, useEffect, useRef } from 'react';
import logoImg from '../assets/DBLearn.png';

// นาฬิกาแยกออกมาเป็น component ของตัวเอง เพื่อไม่ให้ Header ทั้งก้อน
// re-render ใหม่ทุก ๆ วินาที (performance)
function HeaderClock() {
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    let timer;
    const updateTime = () => {
      const now = new Date();
      const options = {
        day: 'numeric', month: 'short', hour: 'numeric',
        minute: '2-digit', second: '2-digit', hour12: true, timeZone: 'Asia/Bangkok'
      };
      const formatter = new Intl.DateTimeFormat('en-GB', options);
      const parts = formatter.formatToParts(now);
      const day = parts.find(p => p.type === 'day')?.value;
      const month = parts.find(p => p.type === 'month')?.value;
      const hour = parts.find(p => p.type === 'hour')?.value;
      const minute = parts.find(p => p.type === 'minute')?.value;
      const second = parts.find(p => p.type === 'second')?.value;
      const dayPeriod = parts.find(p => p.type === 'dayPeriod')?.value.toUpperCase();

      const getOrdinal = (n) => {
        const s = ["th", "st", "nd", "rd"], v = n % 100;
        return n + (s[(v - 20) % 10] || s[v] || s[0]);
      };
      setCurrentTime(`${getOrdinal(parseInt(day))} ${month}, ${hour}:${minute}:${second} ${dayPeriod}`);
    };

    updateTime();
    timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="hidden xl:flex items-center justify-center px-6 py-2.5 rounded-full bg-[#0077b6]/5 border border-[#0077b6]/20 shadow-[inset_0_1px_4px_rgba(0,119,182,0.1)] hover:bg-[#0077b6]/10 transition-colors duration-300">
      <span className="tabular-nums text-xs font-mono font-bold text-[#023e8a] tracking-tight">
        {currentTime || 'SYNCING...'}
      </span>
    </div>
  );
}

export default function Header({ currentPage, onNavigate, isLoggedIn, userData, onLogout, onLoginClick }) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const dropdownRef = useRef(null);
  const mobileMenuRef = useRef(null);

  const isStaff = userData?.role && ['instructor', 'ta', 'admin'].includes(userData.role);
  const isAdmin = userData?.role === 'admin';

  // TA is merged into the Instructor identity — presented as Instructor everywhere.
  const roleLabel = { student: 'Student', ta: 'Instructor', instructor: 'Instructor', admin: 'Admin' };

  const roleStyles = {
    student: 'bg-[#0077b6]/10 text-[#0077b6] border-[#0077b6]/20',
    ta: 'bg-[#f48c06]/10 text-[#f48c06] border-[#f48c06]/20',
    instructor: 'bg-[#f48c06]/10 text-[#f48c06] border-[#f48c06]/20',
    admin: 'bg-[#e85d04]/10 text-[#e85d04] border-[#e85d04]/20'
  };

  const roleDot = {
    student: 'bg-[#0077b6]',
    ta: 'bg-[#f48c06]',
    instructor: 'bg-[#f48c06]',
    admin: 'bg-[#e85d04]'
  };

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target)) {
        setIsMobileMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ปรับ Padding ให้ยืดหยุ่นตามหน้าจอ (px-4 -> px-6 -> px-8) และป้องกัน text ตกบรรทัด
  const getNavLinkStyle = (pageName) => {
    const isActive = currentPage === pageName;
    return `cursor-pointer relative px-4 lg:px-6 xl:px-8 py-2.5 font-bold text-sm tracking-wide transition-all duration-300 rounded-full flex items-center justify-center whitespace-nowrap ${
      isActive 
        ? 'bg-[#03045e] text-[#f8f9fa] shadow-[0_4px_15px_rgba(3,4,94,0.3)] hover:shadow-[0_6px_20px_rgba(3,4,94,0.4)]' 
        : 'bg-transparent text-[#023e8a] hover:text-[#03045e] hover:bg-[#0077b6]/10 hover:-translate-y-0.5'
    }`;
  };

  const mobileNavBtn = (page, label) => (
    <button
      onClick={() => { setIsMobileMenuOpen(false); onNavigate(page); }}
      className={`cursor-pointer w-full text-left px-6 py-4 font-bold text-sm tracking-wide transition-all duration-300 border-b border-[#0077b6]/10 last:border-0 flex justify-between items-center ${
        currentPage === page 
          ? 'bg-[#03045e]/5 text-[#03045e] pl-8' 
          : 'text-[#023e8a] hover:bg-[#0077b6]/5 hover:text-[#03045e] hover:pl-8'
      }`}
    >
      {label} 
      {currentPage === page && <span className="w-2 h-2 rounded-full bg-[#e85d04] shadow-[0_0_8px_rgba(232,93,4,0.6)]"></span>}
    </button>
  );


  const handleCourseClick = () => {
    const scrollToCoursesSection = () => {
      const target = document.getElementById('courses-section');
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        window.history.replaceState(null, '', `${window.location.pathname}#courses-section`);
      }
    };

    if (currentPage === 'home') {
      scrollToCoursesSection();
      return;
    }

    onNavigate('home');
    setTimeout(scrollToCoursesSection, 120);
  };

  const handleLogoClick = () => {
    onNavigate('home');
    window.history.replaceState(null, '', '/');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const displayName = userData?.student_id || userData?.username || userData?.name || 'USER';
  const avatarInitials = displayName.substring(0, 2).toUpperCase();

  return (
    <header className="fixed w-full top-0 z-50 bg-[#f8f9fa]/85 backdrop-blur-2xl border-b border-[#0077b6]/15 shadow-[0_4px_30px_rgba(2,62,138,0.06)] transition-all duration-500">
      {/* ขยาย max-w และเพิ่ม padding ให้ยืดหยุ่นตามหน้าจอ */}
      <div className="w-full max-w-[1920px] mx-auto flex items-center justify-between h-20 gap-4 px-4 sm:px-8 lg:px-12 xl:px-20">

        {/* Logo Section (left zone) */}
        <div className="flex-1 flex items-center min-w-0">
          <div
            className="flex items-center gap-3.5 cursor-pointer group shrink-0"
            onClick={handleLogoClick}
          >
            <div className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-2xl bg-[#f8f9fa] border border-[#0077b6]/20 shadow-[0_4px_15px_rgba(2,62,138,0.08)] overflow-hidden transition-transform duration-500 group-hover:scale-105 group-hover:shadow-[0_8px_25px_rgba(232,93,4,0.15)]">
              <img src={logoImg} alt="Logo" className="w-[70%] h-[70%] object-contain" />
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tighter whitespace-nowrap">
              <span className="text-[#e85d04] transition-colors duration-300 group-hover:text-[#f48c06]">DB</span>
              <span className="text-[#03045e]">LEARN</span>
            </h1>
          </div>
        </div>

        {/* Desktop Navigation (center zone) */}
        {isLoggedIn && (
          <nav className="hidden md:flex items-center gap-1 lg:gap-2 p-1.5 lg:p-2 shrink-0 bg-[#f8f9fa] border border-[#0077b6]/15 rounded-full shadow-[inset_0_2px_10px_rgba(2,62,138,0.03)] transition-all duration-300">
            <button onClick={() => onNavigate('home')} className={getNavLinkStyle('home')}>Home</button>
            <button onClick={handleCourseClick} className={getNavLinkStyle('courses')}>Courses</button>
            {isStaff && (
              <button onClick={() => onNavigate('instructor')} className={getNavLinkStyle('instructor')}>Instructor</button>
            )}
            {isAdmin && (
              <button onClick={() => onNavigate('admin')} className={getNavLinkStyle('admin')}>Admin</button>
            )}
          </nav>
        )}

        {/* Right actions (right zone) */}
        <div className="flex-1 flex items-center justify-end gap-3 sm:gap-4 lg:gap-6 min-w-0">

          {/* Minimal Glass Clock */}
          <HeaderClock />

          {/* User Profile / Auth Button */}
          {isLoggedIn ? (
            <div className="relative" ref={dropdownRef}>
              <div
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                // บนมือถือจะซ่อนชื่อ ให้เหลือแค่รูป Avatar ทรงกลม เพื่อประหยัดพื้นที่
                className={`flex items-center gap-0 sm:gap-4 pl-2 sm:pl-6 pr-2 py-2 rounded-full border cursor-pointer select-none transition-all duration-300 active:scale-95 group ${
                  isDropdownOpen 
                    ? 'bg-[#03045e]/5 border-[#0077b6]/30 shadow-[inset_0_2px_8px_rgba(3,4,94,0.05)]' 
                    : 'bg-[#f8f9fa] border-[#0077b6]/15 shadow-[0_4px_15px_rgba(2,62,138,0.06)] hover:border-[#0077b6]/30 hover:shadow-[0_6px_20px_rgba(0,119,182,0.12)]'
                }`}
              >
                <div className="hidden sm:flex flex-col text-right">
                  <span className="text-sm font-extrabold text-[#03045e] leading-tight group-hover:text-[#023e8a] transition-colors">
                    {displayName}
                  </span>
                  {userData?.role && (
                    <span className={`text-[9px] font-extrabold px-2.5 py-0.5 mt-0.5 border rounded-full uppercase tracking-widest self-end ${roleStyles[userData.role] || roleStyles.student}`}>
                      {roleLabel[userData.role] || userData.role}
                    </span>
                  )}
                </div>
                
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#023e8a] to-[#03045e] flex items-center justify-center shadow-[inset_0_2px_4px_rgba(248,249,250,0.3)] group-hover:scale-105 transition-transform duration-300">
                  <span className="text-[#f8f9fa] font-bold text-sm uppercase">
                    {avatarInitials}
                  </span>
                </div>
              </div>

              {/* Dropdown Desktop */}
              <div 
                className={`absolute top-[calc(100%+16px)] right-0 w-80 bg-[#f8f9fa]/95 backdrop-blur-xl border border-[#0077b6]/15 shadow-[0_20px_50px_rgba(3,4,94,0.15)] rounded-[24px] flex flex-col z-50 overflow-hidden transform origin-top-right transition-all duration-300 ${
                  isDropdownOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 -translate-y-4 pointer-events-none'
                }`}
              >
                <div className="px-6 py-5 border-b border-[#0077b6]/10 bg-gradient-to-b from-[#0077b6]/5 to-transparent">
                  <p className="text-[10px] font-black text-[#0077b6] uppercase tracking-[0.2em] mb-1">Signed in as</p>
                  <p className="text-base font-extrabold text-[#03045e] truncate mb-2">{userData?.name || userData?.email}</p>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${roleDot[userData?.role] || roleDot.student} shadow-sm`}></div>
                    <span className="text-xs font-bold text-[#023e8a] uppercase tracking-wide">
                      {roleLabel[userData?.role] || 'Student'}
                    </span>
                  </div>
                </div>
                
                <div className="p-3 space-y-1">
                  {isStaff && (
                    <button
                      onClick={() => { setIsDropdownOpen(false); onNavigate('instructor'); }}
                      className="w-full text-left px-5 py-3 rounded-[16px] font-bold text-[#03045e] text-sm hover:bg-[#0077b6]/10 transition-colors duration-200 flex justify-between items-center group"
                    >
                      Instructor Console
                      <span className="text-[#0077b6] opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                    </button>
                  )}
                  {isAdmin && (
                    <button
                      onClick={() => { setIsDropdownOpen(false); onNavigate('admin'); }}
                      className="w-full text-left px-5 py-3 rounded-[16px] font-bold text-[#e85d04] text-sm hover:bg-[#e85d04]/10 transition-colors duration-200 flex justify-between items-center group"
                    >
                      Admin Settings
                      <span className="text-[#e85d04] opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                    </button>
                  )}
                </div>
                
                <div className="p-3 border-t border-[#0077b6]/10 bg-[#f8f9fa]">
                  <button
                    onClick={() => { setIsDropdownOpen(false); onLogout(); }}
                    className="w-full text-left px-5 py-3.5 rounded-[16px] font-extrabold text-[#f8f9fa] bg-[#e85d04] text-sm hover:bg-[#f48c06] hover:shadow-[0_4px_15px_rgba(232,93,4,0.3)] transition-all duration-300 flex justify-between items-center group"
                  >
                    Sign Out 
                    <span className="transform group-hover:translate-x-1 transition-transform duration-300">→</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <button 
              onClick={onLoginClick}
              className="cursor-pointer bg-[linear-gradient(to_right,#f48c06,#e85d04)] text-[#f8f9fa] font-extrabold h-11 px-6 sm:px-8 rounded-full shadow-[0_8px_20px_rgba(232,93,4,0.25)] hover:shadow-[0_12px_25px_rgba(232,93,4,0.4)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-[0_4px_10px_rgba(232,93,4,0.2)] transition-all duration-300 flex items-center justify-center tracking-wide text-sm whitespace-nowrap"
            >
              Sign In
            </button>
          )}

          {/* Mobile Hamburger Menu */}
          {isLoggedIn && (
            <div className="md:hidden relative" ref={mobileMenuRef}>
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="w-11 h-11 sm:w-12 sm:h-12 rounded-[16px] bg-[#f8f9fa] border border-[#0077b6]/15 shadow-[0_4px_10px_rgba(2,62,138,0.05)] flex flex-col items-center justify-center gap-1.5 transition-all duration-300 hover:bg-[#0077b6]/5 active:scale-95 z-50 relative"
              >
                <span className={`block w-5 h-[2.5px] bg-[#03045e] rounded-full transition-transform duration-300 origin-center ${isMobileMenuOpen ? 'rotate-45 translate-y-[8.5px]' : ''}`}></span>
                <span className={`block w-5 h-[2.5px] bg-[#0077b6] rounded-full transition-opacity duration-300 ${isMobileMenuOpen ? 'opacity-0' : 'opacity-100'}`}></span>
                <span className={`block w-5 h-[2.5px] bg-[#03045e] rounded-full transition-transform duration-300 origin-center ${isMobileMenuOpen ? '-rotate-45 -translate-y-[8.5px]' : ''}`}></span>
              </button>

              <div 
                className={`absolute top-[calc(100%+20px)] right-0 w-72 bg-[#f8f9fa]/95 backdrop-blur-2xl border border-[#0077b6]/15 shadow-[0_20px_50px_rgba(3,4,94,0.2)] rounded-[24px] overflow-hidden flex flex-col transform origin-top-right transition-all duration-300 ${
                  isMobileMenuOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 -translate-y-4 pointer-events-none'
                }`}
              >
                <div className="py-2">
                  {mobileNavBtn('home', 'Home')}
                  {mobileNavBtn('courses', 'Courses')}
                  {isStaff && mobileNavBtn('instructor', 'Instructor Console')}
                  {isAdmin && mobileNavBtn('admin', 'Admin Settings')}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}