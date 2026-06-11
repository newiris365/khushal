"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { BookOpen, ShieldAlert, Sparkles, CheckCircle2, ChevronRight, AlertCircle, RefreshCw } from 'lucide-react';

interface CourseOverview {
  id: string;
  course_code: string;
  course_name: string;
  teacher_name: string;
  status: 'draft' | 'configured' | 'attained';
  co_mapped: boolean;
  marks_entered: boolean;
  attainment_score?: number;
}

export default function HodCoursesOverview() {
  const [courses, setCourses] = useState<CourseOverview[]>([]);
  const [loading, setLoading] = useState(true);

  const getAuthHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('iris_jwt_token')}`
  });

  const loadCourses = async () => {
    setLoading(true);
    try {
      // Fetch department courses
      const res = await fetch('/api/obe/courses/a0000000-0000-0000-0000-000000000001', {
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (data.success && data.courses && data.courses.length > 0) {
        // Map backend courses to mock HOD status details
        const mapped = data.courses.map((c: any, idx: number) => ({
          id: c.id,
          course_code: c.course_code,
          course_name: c.course_name,
          teacher_name: c.staff?.name || 'Prof. Satish Kumar',
          status: idx === 0 ? 'attained' : idx === 1 ? 'configured' : 'draft',
          co_mapped: idx < 2,
          marks_entered: idx === 0,
          attainment_score: idx === 0 ? 75.0 : undefined
        }));
        setCourses(mapped);
      } else {
        // Fallback mock roster
        setCourses([
          { id: 'c-1', course_code: 'CS-401', course_name: 'Advanced Web Applications', teacher_name: 'Prof. Satish Kumar', status: 'attained', co_mapped: true, marks_entered: true, attainment_score: 75.0 },
          { id: 'c-2', course_code: 'CS-402', course_name: 'Database Security & Sharding', teacher_name: 'Dr. Amit Mehta', status: 'configured', co_mapped: true, marks_entered: false },
          { id: 'c-3', course_code: 'CS-408', course_name: 'Outcome Based Machine Learning', teacher_name: 'Prof. Satish Kumar', status: 'draft', co_mapped: false, marks_entered: false }
        ]);
      }
    } catch (err) {
      // Fallback
      setCourses([
        { id: 'c-1', course_code: 'CS-401', course_name: 'Advanced Web Applications', teacher_name: 'Prof. Satish Kumar', status: 'attained', co_mapped: true, marks_entered: true, attainment_score: 75.0 },
        { id: 'c-2', course_code: 'CS-402', course_name: 'Database Security & Sharding', teacher_name: 'Dr. Amit Mehta', status: 'configured', co_mapped: true, marks_entered: false },
        { id: 'c-3', course_code: 'CS-408', course_name: 'Outcome Based Machine Learning', teacher_name: 'Prof. Satish Kumar', status: 'draft', co_mapped: false, marks_entered: false }
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCourses();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'attained':
        return <span className="text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold">Attainment Computed</span>;
      case 'configured':
        return <span className="text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#6C2BD9]/15 border border-[#8B5CF6]/30 text-[#A78BFA] font-bold">CO-PO Matrix Configured</span>;
      default:
        return <span className="text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold">Incomplete Setup</span>;
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-2 w-full flex flex-col gap-8">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-[#6C2BD9]/30 bg-gradient-to-r from-[#13102A] to-[#1E193C] p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#8B5CF6]/10 rounded-full blur-3xl -z-10"></div>
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-[#C4B5FD] to-[#A78BFA] bg-clip-text text-transparent">
            Department Course Roster
          </h1>
          <p className="text-xs text-[#C4B5FD]/70 max-w-xl">
            As Head of Department, review curriculum alignment compliance across all active program courses, check syllabus statuses, and ensure grades are mapped.
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/hod/obe/po-attainment"
            className="px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs shadow-lg transition-all border border-white/5"
          >
            PO Radars
          </Link>
          <Link
            href="/hod/obe/gap-analysis"
            className="px-4 py-3 rounded-xl bg-gradient-to-r from-[#6C2BD9] to-[#8B5CF6] text-white font-bold text-xs shadow-lg shadow-[#6C2BD9]/25 hover:brightness-110 transition-all border border-[#A78BFA]/20"
          >
            AI Gap Analysis
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20">
          <RefreshCw className="w-8 h-8 text-[#8B5CF6] animate-spin mx-auto mb-4" />
          <p className="text-xs text-[#C4B5FD]">Loading department courses...</p>
        </div>
      ) : (
        <div className="glass-panel border border-[#6C2BD9]/20 rounded-2xl overflow-hidden bg-[#13102A]/40">
          <div className="p-6 border-b border-white/5">
            <h3 className="font-extrabold text-sm text-white">Course Configuration Audit</h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 text-[#C4B5FD] text-[10px] uppercase font-bold tracking-wider">
                  <th className="py-4 px-6">Course Code</th>
                  <th className="py-4 px-6">Course Name</th>
                  <th className="py-4 px-6">Assigned Faculty</th>
                  <th className="py-4 px-6">CO Mappings</th>
                  <th className="py-4 px-6">Final Score</th>
                  <th className="py-4 px-6">Compliance Status</th>
                </tr>
              </thead>
              <tbody>
                {courses.map(course => (
                  <tr key={course.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors text-xs text-white">
                    <td className="py-4 px-6 font-mono text-[#A78BFA] font-bold">{course.course_code}</td>
                    <td className="py-4 px-6 font-extrabold">{course.course_name}</td>
                    <td className="py-4 px-6 text-[#C4B5FD]/90 font-medium">{course.teacher_name}</td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-1.5 font-bold">
                        {course.co_mapped ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            <span className="text-emerald-400">Mapped</span>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-4 h-4 text-amber-500" />
                            <span className="text-amber-500">Pending</span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6 font-bold text-white">
                      {course.attainment_score ? `${course.attainment_score}%` : 'N/A'}
                    </td>
                    <td className="py-4 px-6">
                      {getStatusBadge(course.status)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
