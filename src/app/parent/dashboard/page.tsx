"use client";

import React, { useState, useEffect } from 'react';
import { apiGet } from '../../../lib/api';

export default function ParentDashboardPage() {
  const [profile, setProfile] = useState<any>({ name: "Mr. S. R. Gehlot" });
  const [childStats, setChildStats] = useState({ overall: 72, total: 25, present: 18, pendingFees: 50000, walletBalance: 350 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Parent checks metrics for their student child
    apiGet('/core/attendance/student/b0000000-0000-0000-0000-000000000006').then(res => {
      if (res.success) {
        setChildStats(c => ({
          ...c,
          overall: res.stats?.overall || 72,
          total: res.stats?.total || 25,
          present: res.stats?.present || 18
        }));
      }
      setIsLoading(false);
    });
  }, []);

  return (
    <div className="max-w-4xl mx-auto py-6 w-full flex flex-col gap-6">
      <div className="glass-panel rounded-3xl p-8 border border-white/5">
        <h2 className="font-heading font-extrabold text-2xl text-white">Student Monitoring Dashboard</h2>
        <p className="text-xs text-[#C4B5FD] mt-1 font-light">Telemetry report summaries for your child **Khushal Gehlot** (B.Tech CSE Semester 4).</p>
        
        {/* Quick stats grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-8">
          
          <div className="p-5 rounded-2xl bg-white/5 border border-white/5 flex flex-col gap-2 relative">
            <span className="text-[10px] text-[#C4B5FD] uppercase tracking-wider font-semibold">Class Attendance</span>
            <h3 className={`font-heading font-extrabold text-2xl mt-1 ${
              childStats.overall >= 75 ? 'text-emerald-400' : 'text-red-400'
            }`}>{childStats.overall}%</h3>
            <span className="text-[10px] text-[#C4B5FD]/50">Status: {childStats.overall >= 75 ? "Eligible for exams" : "Attendance Deficit"}</span>
          </div>

          <div className="p-5 rounded-2xl bg-white/5 border border-white/5 flex flex-col gap-2 relative">
            <span className="text-[10px] text-[#C4B5FD] uppercase tracking-wider font-semibold">Ledger Balance Dues</span>
            <h3 className="font-heading font-extrabold text-2xl text-white mt-1">₹{childStats.pendingFees.toLocaleString()}</h3>
            <span className="text-[10px] text-[#C4B5FD]/50">Tuition fee overdue alert</span>
          </div>

          <div className="p-5 rounded-2xl bg-white/5 border border-white/5 flex flex-col gap-2 relative">
            <span className="text-[10px] text-[#C4B5FD] uppercase tracking-wider font-semibold">Canteen Wallet Balance</span>
            <h3 className="font-heading font-extrabold text-2xl text-white mt-1">₹{childStats.walletBalance.toLocaleString()}</h3>
            <span className="text-[10px] text-[#C4B5FD]/50">Prepaid school allowance</span>
          </div>

        </div>
      </div>
    </div>
  );
}
