"use client";

import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard, Users, Home, ClipboardList, AlertTriangle,
  CheckCircle2, XCircle, Clock, ArrowLeftRight
} from 'lucide-react';
import { apiGet } from '../../../lib/api';

export default function WardenDashboard() {
  const [stats, setStats] = useState({ visitors: 0, pending: 0, absent: 0, transfers: 0 });
  const [pendingVisitors, setPendingVisitors] = useState<any[]>([]);
  const [curfewAbsent, setCurfewAbsent] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [visRes, curfewRes, transferRes] = await Promise.all([
          apiGet('campusCore/hostel/visitors', { status: 'pending' }),
          apiGet('campusCore/hostel/curfew/status'),
          apiGet('campusCore/hostel/transfers', { status: 'pending' }),
        ]);
        if (visRes.success) {
          setPendingVisitors(visRes.visitors?.filter((v: any) => v.approval_status === 'pending') || []);
          setStats(s => ({ ...s, visitors: visRes.visitors?.length || 0, pending: visRes.visitors?.filter((v: any) => v.approval_status === 'pending').length || 0 }));
        }
        if (curfewRes.success) {
          const absent = (curfewRes.students || []).filter((s: any) => !s.is_present);
          setCurfewAbsent(absent);
          setStats(s => ({ ...s, absent: absent.length }));
        }
        if (transferRes.success) {
          setStats(s => ({ ...s, transfers: transferRes.requests?.length || 0 }));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><div className="text-emerald-400 animate-pulse">Loading...</div></div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Warden Dashboard</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Pending Visitors', value: stats.pending, icon: Users, color: 'text-amber-400' },
          { label: 'Room Transfers', value: stats.transfers, icon: ArrowLeftRight, color: 'text-violet-400' },
          { label: 'Absent Tonight', value: stats.absent, icon: AlertTriangle, color: 'text-red-400' },
          { label: 'Total Visitors', value: stats.visitors, icon: Home, color: 'text-blue-400' },
        ].map(s => (
          <div key={s.label} className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
            <div className="flex items-center gap-3">
              <s.icon size={20} className={s.color} />
              <div>
                <p className="text-2xl font-bold text-white">{s.value}</p>
                <p className="text-xs text-slate-400">{s.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Visitors */}
        <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Users size={18} className="text-amber-400" /> Pending Visitor Approvals
          </h2>
          {pendingVisitors.length === 0 ? (
            <p className="text-slate-400 text-sm">No pending visitor approvals.</p>
          ) : (
            <div className="space-y-2">
              {pendingVisitors.slice(0, 5).map((v: any) => (
                <div key={v.id} className="flex items-center justify-between bg-white/5 rounded-lg p-3 border border-white/5">
                  <div>
                    <p className="text-sm font-medium text-white">{v.visitor_name}</p>
                    <p className="text-xs text-slate-400">Visiting: {v.students?.users?.full_name || '—'}</p>
                  </div>
                  <a href="/warden/visitors" className="text-xs text-emerald-400 hover:text-emerald-300 underline">Review</a>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Absent Students */}
        <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <AlertTriangle size={18} className="text-red-400" /> Absent Tonight
            {curfewAbsent.length > 0 && (
              <span className="bg-red-500/20 text-red-400 text-xs px-2 py-0.5 rounded-full">{curfewAbsent.length}</span>
            )}
          </h2>
          {curfewAbsent.length === 0 ? (
            <p className="text-slate-400 text-sm">All students present or check-in not started.</p>
          ) : (
            <div className="space-y-2">
              {curfewAbsent.slice(0, 5).map((s: any) => (
                <div key={s.student_id} className="flex items-center gap-3 bg-red-500/10 rounded-lg p-3 border border-red-500/20">
                  <XCircle size={16} className="text-red-400" />
                  <div>
                    <p className="text-sm font-medium text-white">{s.student_name}</p>
                    <p className="text-xs text-slate-400">Room: {s.room_number} — {s.roll_number}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
