"use client";

import React, { useState, useEffect } from 'react';
import { Bell, AlertTriangle, CheckCircle2, Clock, MessageSquare } from 'lucide-react';
import { apiGet, apiPut } from '../../../lib/api';

export default function WardenComplaintsPage() {
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await apiGet('campusCore/hostel/complaints');
        if (res.success) setComplaints(res.complaints || []);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const filtered = complaints.filter(c => statusFilter === 'all' || c.status === statusFilter);

  const statusColors: Record<string, string> = {
    open: 'bg-amber-500/20 text-amber-400',
    in_progress: 'bg-blue-500/20 text-blue-400',
    resolved: 'bg-emerald-500/20 text-emerald-400',
    closed: 'bg-slate-500/20 text-slate-400',
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white flex items-center gap-2">
        <Bell size={24} className="text-amber-400" />
        Hostel Complaints
      </h1>

      <div className="flex flex-wrap gap-2">
        {['all', 'open', 'in_progress', 'resolved', 'closed'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium ${statusFilter === s ? 'bg-amber-600 text-white' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}>
            {s === 'all' ? 'All' : s.replace('_', ' ')}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading complaints...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <Bell size={40} className="mx-auto mb-3 opacity-50" />
          <p>No complaints found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(c => (
            <div key={c.id} className="bg-white/5 rounded-xl p-4 border border-white/10">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-white">{c.title || c.complaint_type}</h3>
                    <span className={`text-[10px] px-2 py-0.5 rounded ${statusColors[c.status] || 'bg-slate-500/20 text-slate-400'}`}>
                      {c.status?.replace('_', ' ')}
                    </span>
                    {c.priority && (
                      <span className={`text-[10px] px-2 py-0.5 rounded ${c.priority === 'high' ? 'bg-red-500/20 text-red-400' : 'bg-slate-500/20 text-slate-400'}`}>
                        {c.priority}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mb-2">{c.description || c.details}</p>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span>By: {c.student_name || 'Student'}</span>
                    <span>Room: {c.room_number || '—'}</span>
                    <span className="flex items-center gap-1"><Clock size={10} /> {new Date(c.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
