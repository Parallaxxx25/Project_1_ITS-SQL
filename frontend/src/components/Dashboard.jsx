import React, { useState, useEffect } from 'react';
import AnnouncementsBanner from './AnnouncementsBanner';
import StudentContent from './StudentContent';
import { listCourses } from '../lib/api';

export default function Dashboard({ onNavigate, user }) {
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [hasEnrollment, setHasEnrollment] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    // Same backend source of truth as Home — see the note there.
    listCourses().then((courses) => {
      if (cancelled) return;

    const enrolledIds = (courses || []).map((c) => c.code);
    const allCourses = [
      { id: '06070999', name: 'Database Concept System', theme: 'from-blue-600 to-indigo-700' },
    ];

    const coursesData = allCourses
      .filter((course) => enrolledIds.includes(course.id))
      .map((course) => {
        const storageKey = `course_${course.id}_${user.id}_COURSE_lessons`;
        const savedData = localStorage.getItem(storageKey);

        let lessons = [];
        if (savedData) {
          try {
            const parsed = JSON.parse(savedData);
            lessons = Array.isArray(parsed) ? parsed : [];
          } catch {
            lessons = [];
          }
        }

        const completedCount = lessons.filter((l) => l.status === 'COMPLETED').length;
        const total = lessons.length;
        const percent = total > 0 ? Math.round((completedCount / total) * 100) : 0;

        return {
          ...course,
          progress: percent,
          status: percent === 100 ? 'COMPLETE' : 'IN PROGRESS',
        };
      });

      setHasEnrollment(coursesData.length > 0);
      setEnrolledCourses(coursesData);
    }).catch(() => {
      if (cancelled) return;
      setHasEnrollment(false);
      setEnrolledCourses([]);
    });

    return () => { cancelled = true; };
  }, [user]);

  const deadlines = [
    { title: 'SQL Fundamentals Quiz', course: 'Database Concept System', date: 'Feb 20', tag: 'Urgent', tagCol: 'bg-rose-50 text-rose-600 border-rose-100' },
    { title: 'Relational Model Lab', course: 'Database Concept System', date: 'Feb 25', tag: 'In Coming', tagCol: 'bg-pink-50 text-pink-600 border-pink-100' },
    { title: 'Schema Design Project', course: 'Database Concept System', date: 'Mar 05', tag: 'Upcoming', tagCol: 'bg-blue-50 text-blue-600 border-blue-100' },
  ];

  return (
    <div className="max-w-[1240px] mx-auto space-y-8 sm:space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-24 pt-12 sm:pt-16 md:pt-20 px-4 sm:px-6 text-left">
      
      {/* Welcome Header */}
      <div className="px-1 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
        <div>
          {/* ขยายหัวข้อต้อนรับให้ใหญ่ขึ้นเป็น text-3xl และ sm:text-4xl ให้ดูเปิดกว้างและพรีเมียม */}
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Welcome back, <span className="text-indigo-600 font-black">{user?.name || 'Student'}</span> 👋
          </h1>
          {/* ขยายคำอธิบายใต้ชื่อเป็น text-sm และ sm:text-base */}
          <p className="text-sm sm:text-base font-medium text-slate-500 mt-2">
            Student ID: {user?.id || 'N/A'} • Monitor your progress and upcoming milestones.
          </p>
        </div>
      </div>

      {/* Instructor announcements + learning content */}
      <AnnouncementsBanner />
      <StudentContent />

      {!hasEnrollment ? (
        /* Empty State */
        <div className="bg-white border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.01)] rounded-3xl overflow-hidden">
          <div className="p-12 sm:p-20 text-center space-y-5">
            <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center text-slate-400 mx-auto shadow-sm text-2xl">
              📚
            </div>
            {/* ขยายขนาดฟอนต์ Empty State ให้ชัดเจนขึ้น */}
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">No Courses Enrolled</h2>
            <p className="text-base font-medium text-slate-500 max-w-md mx-auto leading-relaxed">
              You haven't enrolled in any courses yet. Explore our curriculum to get started on your database masterclass!
            </p>
            <div className="pt-2">
              <button
                onClick={() => {
                  const scrollToCourses = () => {
                    const target = document.getElementById('courses-section');
                    if (target) {
                      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      window.history.replaceState(null, '', '/#courses-section');
                    }
                  };

                  onNavigate('home');
                  setTimeout(scrollToCourses, 120);
                }}
                className="inline-flex items-center gap-2 bg-[#03045e] hover:bg-indigo-950 text-white font-bold text-sm sm:text-base px-6 py-3 rounded-xl shadow-md shadow-indigo-950/5 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
              >
                Browse All Courses
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Main Dashboard Content Grid */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Enrolled Courses Block */}
          <div className="lg:col-span-8 space-y-6">
            <div className="flex items-center gap-2.5 px-1">
              <div className="p-1.5 bg-indigo-50 text-indigo-500 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89l-.06-1.3c-.053-.5-.073-1.006-.06-1.512a1 1 0 01.37-.765zm13.38 0a1 1 0 01.37.765c.013.506-.007 1.012-.06 1.512l-.06 1.3a1 1 0 01-.89.89 8.97 8.97 0 00-1.05.174v-4.102l1.69-.723zM9.25 12.13v3.714c-.135.039-.269.082-.4.13l-4 1.455a1 1 0 01-1.314-.934v-2.261a10.97 10.97 0 012.333-.47 1 1 0 00.864-.866l.06-1.3a1.45 1.45 0 00-.012-.228l2.465.994zm1.5 3.714v-3.714l2.465-.994c-.004.076-.008.152-.012.228l.06 1.3a1 1 0 00.863.865 10.97 10.97 0 012.334.47v2.261a1 1 0 01-1.314.934l-4-1.455a1.03 1.03 0 01-.4-.13z" />
                </svg>
              </div>
              {/* หัวข้อ Section ปรับเพิ่มเป็น text-base sm:text-lg เพื่อแยกสัดส่วนการมองเห็น */}
              <h2 className="text-base sm:text-lg font-bold text-slate-800">Your Active Courses</h2>
            </div>

            <div className="space-y-4">
              {enrolledCourses.map((course) => (
                <div key={course.id} className="bg-white border border-slate-200 shadow-[0_4px_20px_rgba(0,0,0,0.01)] rounded-2xl p-6 sm:p-8 hover:border-slate-300/80 transition-all group">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    
                    <div className="space-y-4 flex-1">
                      {/* Course Tags */}
                      <div className="flex items-center gap-2">
                        {/* ปรับขนาด Tag ต่าง ๆ เป็นขนาดมาตรฐาน text-xs sm:text-sm */}
                        <span className="bg-slate-50 border border-slate-200 text-slate-600 font-mono font-semibold text-xs sm:text-sm px-2.5 py-1 rounded-md">
                          {course.id}
                        </span>
                        <span className={`px-2.5 py-1 font-bold text-xs sm:text-sm rounded-md border ${
                          course.status === 'COMPLETE' 
                            ? 'bg-amber-50 text-amber-700 border-amber-100' 
                            : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                        }`}>
                          {course.status === 'COMPLETE' ? 'Completed' : 'In Progress'}
                        </span>
                      </div>

                      {/* Title & Progress Bar */}
                      <div>
                        {/* ปรับขนาดฟอนต์ชื่อคอร์สเรียนขึ้นเป็น text-xl และเพิ่มสเกลจอใหญ่เป็น sm:text-2xl */}
                        <h3 className="text-xl sm:text-2xl font-bold text-slate-900 leading-snug group-hover:text-indigo-600 transition-colors">
                          {course.name}
                        </h3>
                        
                        {/* Progress Indicator */}
                        <div className="mt-4 max-w-sm">
                          {/* ปรับขนาดตัวอักษรบอกสถานะและ % ความคืบหน้าขึ้นเป็น text-sm */}
                          <div className="flex items-center justify-between text-sm text-slate-500 font-medium mb-1.5">
                            <span>Course Progress</span>
                            <span className="font-mono font-bold text-slate-800">{course.progress}%</span>
                          </div>
                          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div 
                              className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                              style={{ width: `${course.progress}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="sm:shrink-0 w-full sm:w-auto">
                      {/* ปรับขนาดฟอนต์ปุ่มกดขึ้นเป็น text-sm และเพิ่มความหนาแน่นตัวอักษร */}
                      <button 
                        onClick={() => onNavigate('coursetext')}
                        className={`w-full sm:w-auto px-5 py-3 text-sm font-bold rounded-xl flex items-center justify-center gap-2 border transition-all outline-none group/btn
                          ${course.progress === 100 
                            ? 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100' 
                            : 'bg-[#03045e] border-[#03045e] text-white hover:bg-indigo-950'
                          }`}
                      >
                        {course.progress === 100 ? 'Review Materials' : 'Continue Learning'} 
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 transform group-hover/btn:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>

                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Upcoming Deadlines Block */}
          <div className="lg:col-span-4 space-y-6">
            <div className="flex items-center gap-2 px-1">
              <div className="p-1.5 bg-rose-50 text-rose-500 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M6 2a1 1 0 00-1-1H3a1 1 0 00-1 1v2a1 1 0 001 1h2a1 1 0 001-1V2zm10 0a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1h2a1 1 0 001-1V2zM2 14a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 01-1 1H3a1 1 0 01-1-1v-2zm10-1a1 1 0 00-1 1v2a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 00-1-1h-2zM4 8a1 1 0 021-1h2a1 1 0 021 1v2a1 1 0 02-1 1H5a1 1 0 02-1-1V8zm10-1a1 1 0 00-1 1v2a1 1 0 001 1h2a1 1 0 001-1V8a1 1 0 00-1-1h-2z" clipRule="evenodd" />
                </svg>
              </div>
              {/* ขยับหัวข้อเป็น text-base sm:text-lg */}
              <h2 className="text-base sm:text-lg font-bold text-slate-800">Milestones & Deadlines</h2>
            </div>

            <div className="bg-white border border-slate-200 shadow-[0_4px_25px_rgba(0,0,0,0.01)] rounded-2xl overflow-hidden divide-y divide-slate-50">
              {deadlines.map((item, idx) => (
                <div key={idx} className="p-5 hover:bg-slate-50/60 transition-colors duration-150">
                  <div className="flex justify-between items-start gap-3 mb-1.5">
                    {/* ปรับหัวข้อวิชา Deadline ย่อยให้เด่นขึ้นด้วยขนาด text-base และความหนา font-bold */}
                    <h4 className="font-bold text-base text-slate-800 leading-snug">
                      {item.title}
                    </h4>
                    {/* เพิ่มขนาดฟอนต์ Tag เป็น text-xs */}
                    <span className={`text-xs font-bold px-2 py-0.5 rounded border shrink-0 ${item.tagCol}`}>
                      {item.tag}
                    </span>
                  </div>
                  {/* เปลี่ยนชื่อคอร์สกำกับเป็น text-sm */}
                  <p className="text-sm text-slate-500 mb-3 font-medium">{item.course}</p>
                  {/* ปรับฟอนต์วันที่และขนาดไอคอนปฏิทินเพิ่มขึ้นเป็น text-sm */}
                  <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-600">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="font-mono text-sm">{item.date}, 2026</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}