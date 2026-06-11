"use client";

import React, { useState, useEffect } from 'react';
import { 
  User, Clock, CreditCard, Coffee, LogIn, LogOut, Calendar, 
  CheckCircle, AlertTriangle, ShieldCheck, RefreshCw, MessageSquare
} from 'lucide-react';
import Link from 'next/link';

export default function ParentDashboardPage() {
  const [profile, setProfile] = useState<any>({ name: "Mr. S. R. Gehlot" });
  const [childStats, setChildStats] = useState({ 
    overall: 84, 
    total: 25, 
    present: 21, 
    pendingFees: 50000, 
    walletBalance: 350,
    healthScore: 84
  });
  const [dailyReport, setDailyReport] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      // Fetch today's child status report
      const token = localStorage.getItem('iris_jwt_token') || '';
      const childId = 'b0000000-0000-0000-0000-000000000006'; // Khushal Gehlot
      const todayStr = new Date().toISOString().split('T')[0];

      const res = await fetch(`/api/v1/parent/child/${childId}/daily-report/${todayStr}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        setDailyReport(data.report);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
  };

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 md:px-6 w-full flex flex-col gap-6 text-white">
      {/* Header Banner */}
      <div className="bg-[#13102A]/80 backdrop-blur-md p-6 rounded-3xl border border-[#6C2BD9]/30 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2">
            <User className="w-6 h-6 text-[#A78BFA]" />
            Student Monitoring Dashboard
          </h2>
          <p className="text-xs text-[#A78BFA]/60 mt-1">
            Real-time telemetry reports for your child: <strong className="text-white">Khushal Gehlot</strong> (B.Tech CSE Semester 4)
          </p>
        </div>
        <div className="flex gap-2">
          <Link 
            href="/parent/messages" 
            className="flex items-center gap-1.5 bg-[#6C2BD9]/20 hover:bg-[#6C2BD9]/40 border border-[#6C2BD9]/40 text-[#A78BFA] px-4 py-2 rounded-xl text-xs font-semibold transition-all"
          >
            <MessageSquare className="w-4 h-4" /> Message Teachers
          </Link>
          <button 
            onClick={handleRefresh}
            className="flex items-center gap-1 bg-white/5 hover:bg-white/10 px-3 py-2 rounded-xl text-xs border border-white/10"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
        <div className="bg-[#13102A]/80 border border-[#6C2BD9]/20 p-5 rounded-2xl flex flex-col gap-2 relative">
          <span className="text-[10px] text-[#A78BFA]/60 uppercase tracking-wider font-semibold">Attendance Rate</span>
          <h3 className="text-2xl font-bold text-sky-400 mt-1">{childStats.overall}%</h3>
          <span className="text-[10px] text-[#A78BFA]/40 font-semibold flex items-center gap-1">
            <CheckCircle className="w-3.5 h-3.5 text-sky-400" />
            Exams Eligible
          </span>
        </div>

        <div className="bg-[#13102A]/80 border border-[#6C2BD9]/20 p-5 rounded-2xl flex flex-col gap-2 relative">
          <span className="text-[10px] text-[#A78BFA]/60 uppercase tracking-wider font-semibold">AI Health score</span>
          <h3 className="text-2xl font-bold text-green-400 mt-1">{childStats.healthScore}%</h3>
          <span className="text-[10px] text-[#A78BFA]/40 font-semibold flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-green-400" />
            Low Risk Profile
          </span>
        </div>

        <div className="bg-[#13102A]/80 border border-[#6C2BD9]/20 p-5 rounded-2xl flex flex-col gap-2 relative">
          <span className="text-[10px] text-[#A78BFA]/60 uppercase tracking-wider font-semibold">Pending Dues</span>
          <h3 className="text-2xl font-bold text-yellow-400 mt-1">₹{childStats.pendingFees.toLocaleString()}</h3>
          <span className="text-[10px] text-[#A78BFA]/40 font-semibold flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5 text-yellow-400" />
            Tuition Overdue
          </span>
        </div>

        <div className="bg-[#13102A]/80 border border-[#6C2BD9]/20 p-5 rounded-2xl flex flex-col gap-2 relative">
          <span className="text-[10px] text-[#A78BFA]/60 uppercase tracking-wider font-semibold">Canteen Allowance</span>
          <h3 className="text-2xl font-bold text-violet-400 mt-1">₹{childStats.walletBalance.toLocaleString()}</h3>
          <span className="text-[10px] text-[#A78BFA]/40 font-semibold flex items-center gap-1">
            <CreditCard className="w-3.5 h-3.5 text-violet-400" />
            Card active
          </span>
        </div>
      </div>

      {/* Daily Telemetry Log */}
      <div className="bg-[#13102A]/80 backdrop-blur-md rounded-3xl p-6 border border-[#6C2BD9]/30 space-y-6">
        <div>
          <h3 className="font-bold text-lg">Today's Live Activity Tracking Log</h3>
          <p className="text-xs text-[#A78BFA]/70 mt-1">
            Automated sensor scans tracking gate pass entries, canteen purchases, and period schedules.
          </p>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-[#A78BFA]/60">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#6C2BD9]" />
            Syncing child's activity parameters...
          </div>
        ) : dailyReport ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Attendance & Class context */}
            <div className="bg-[#0D0A1A]/60 p-5 rounded-2xl border border-[#6C2BD9]/15 space-y-4">
              <h4 className="font-bold text-xs uppercase text-[#A78BFA]/50 tracking-wider">Attendance & Class</h4>
              <div className="flex justify-between items-center bg-[#13102A] p-3.5 rounded-xl border border-[#6C2BD9]/15">
                <span className="text-xs text-[#A78BFA]">Today's Status</span>
                <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  {dailyReport.attendance_status.toUpperCase()}
                </span>
              </div>
              <div className="flex justify-between items-center bg-[#13102A] p-3.5 rounded-xl border border-[#6C2BD9]/15">
                <span className="text-xs text-[#A78BFA]">Current Context</span>
                <span className="text-xs font-bold text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
                  IN CLASS: CS-301
                </span>
              </div>
            </div>

            {/* Smart Gate telemetry */}
            <div className="bg-[#0D0A1A]/60 p-5 rounded-2xl border border-[#6C2BD9]/15 space-y-4">
              <h4 className="font-bold text-xs uppercase text-[#A78BFA]/50 tracking-wider">Main Gate Scan times</h4>
              <div className="flex justify-between items-center bg-[#13102A] p-3.5 rounded-xl border border-[#6C2BD9]/15">
                <span className="text-xs text-[#A78BFA] flex items-center gap-1">
                  <LogIn className="w-3.5 h-3.5 text-emerald-400" /> Gate Check-In
                </span>
                <span className="text-xs font-mono font-bold text-emerald-400">
                  {dailyReport.gate_in_time ? new Date(dailyReport.gate_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '09:05 AM'}
                </span>
              </div>
              <div className="flex justify-between items-center bg-[#13102A] p-3.5 rounded-xl border border-[#6C2BD9]/15">
                <span className="text-xs text-[#A78BFA] flex items-center gap-1">
                  <LogOut className="w-3.5 h-3.5 text-orange-400" /> Gate Check-Out
                </span>
                <span className="text-xs font-mono font-bold text-orange-400">
                  {dailyReport.gate_out_time ? new Date(dailyReport.gate_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Active on Campus'}
                </span>
              </div>
            </div>

            {/* Canteen & Notices */}
            <div className="bg-[#0D0A1A]/60 p-5 rounded-2xl border border-[#6C2BD9]/15 space-y-4">
              <h4 className="font-bold text-xs uppercase text-[#A78BFA]/50 tracking-wider">Canteen Meals & notices</h4>
              <div className="flex justify-between items-center bg-[#13102A] p-3.5 rounded-xl border border-[#6C2BD9]/15">
                <span className="text-xs text-[#A78BFA] flex items-center gap-1">
                  <Coffee className="w-3.5 h-3.5 text-violet-400" /> Canteen spend
                </span>
                <span className="text-xs font-bold text-violet-400">
                  ₹{dailyReport.canteen_spend.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center bg-[#13102A] p-3.5 rounded-xl border border-[#6C2BD9]/15">
                <span className="text-xs text-[#A78BFA]">Meals Log</span>
                <span className="text-xs text-[#A78BFA]/80 truncate max-w-[120px] font-semibold">
                  {dailyReport.meals_today}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-12 text-center text-[#A78BFA]/40 border border-dashed border-[#6C2BD9]/20 rounded-2xl">
            Unable to fetch today's tracking log matrix.
          </div>
        )}
      </div>
    </div>
  );
}
