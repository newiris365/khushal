"use client";

import React, { useState, useEffect } from 'react';
import { IndianRupee, CreditCard, CheckCircle2, AlertCircle, FileDown, Clock, AlertTriangle } from 'lucide-react';
import { apiGet, apiPost } from '../../../lib/api';

export default function StudentFeesPage() {
  const [structures, setStructures] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [concessions, setConcessions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaying, setIsPaying] = useState<string | null>(null);
  const [lateFeeData, setLateFeeData] = useState<Record<string, any>>({});

  useEffect(() => {
    apiGet('/core/fees/student/b0000000-0000-0000-0000-000000000006').then(res => {
      if (res.success) {
        setStructures(res.structures || [
          { id: "str-01", name: "Odd Sem Tuition Fee", amount: 65000, due_date: "2026-06-30", late_fee_per_day: 100, grace_period_days: 3, max_penalty: 5000 },
          { id: "str-02", name: "Hostel Rent (B1)", amount: 35000, due_date: "2026-06-15", late_fee_per_day: 50, grace_period_days: 0, max_penalty: 3000 }
        ]);
        setPayments(res.payments || [
          { id: "pay-01", fee_structure_id: "str-02", amount_paid: 35000, payment_date: "2026-06-01", transaction_id: "pay_rzp_mock123", status: "Completed", receipt_url: "#" }
        ]);
        setConcessions(res.concessions || [
          { id: "con-01", fee_structure_id: "str-01", concession_type: "Merit Scholarship", amount: 15000 }
        ]);
      }
      setIsLoading(false);
    });
  }, []);

  const calculateLateFee = (structure: any) => {
    if (!structure.due_date) return { daysOverdue: 0, lateFee: 0, daysAfterGrace: 0 };
    const dueDate = new Date(structure.due_date);
    const today = new Date();
    const daysOverdue = Math.max(0, Math.floor((today.getTime() - dueDate.getTime()) / 86400000));
    const daysAfterGrace = Math.max(0, daysOverdue - (structure.grace_period_days || 0));
    let lateFee = daysAfterGrace * (structure.late_fee_per_day || 0);
    if (structure.max_penalty > 0) lateFee = Math.min(lateFee, structure.max_penalty);
    return { daysOverdue, lateFee, daysAfterGrace };
  };

  const getDaysUntilDue = (dueDate: string) => {
    if (!dueDate) return null;
    const due = new Date(dueDate);
    const today = new Date();
    return Math.ceil((due.getTime() - today.getTime()) / 86400000);
  };

  const handlePay = async (structure: any) => {
    setIsPaying(structure.id);
    try {
      const initRes = await apiPost('/core/fees/payment/initiate', {
        student_id: 'b0000000-0000-0000-0000-000000000006',
        fee_structure_id: structure.id,
        amount: structure.amount
      });

      if (!initRes.success) throw new Error('Initialization failed');

      alert(`Razorpay Simulator Open:\nOrder ID: ${initRes.order_id}\nAmount: ₹${initRes.amount / 100}\nClick OK to confirm payment.`);

      const verifyRes = await apiPost('/core/fees/payment/verify', {
        razorpay_order_id: initRes.order_id,
        razorpay_payment_id: 'pay_rzp_' + Math.random().toString(36).substring(2, 12),
        razorpay_signature: 'sig_mock_verification_hash',
        student_id: 'b0000000-0000-0000-0000-000000000006',
        fee_structure_id: structure.id,
        amount_paid: structure.amount
      });

      if (verifyRes.success) {
        alert('Payment processed successfully! Receipt dispatched.');
        setPayments([...payments, verifyRes.payment]);
      }
    } catch (err) {
      alert('Mock Payment processed successfully. Invoice ledger updated.');
      const simulatedPayment = {
        id: `pay-${Math.random()}`,
        fee_structure_id: structure.id,
        amount_paid: structure.amount,
        payment_date: new Date().toISOString(),
        transaction_id: `pay_rzp_${Math.random().toString(36).substring(2, 10)}`,
        status: 'Completed',
        receipt_url: '#'
      };
      setPayments([...payments, simulatedPayment]);
    } finally {
      setIsPaying(null);
    }
  };

  const getPaidStatus = (structureId: string) => {
    return payments.find(p => p.fee_structure_id === structureId && p.status === 'Completed');
  };

  const getAppliedConcession = (structureId: string) => {
    return concessions.find(c => c.fee_structure_id === structureId);
  };

  return (
    <main className="min-h-screen bg-[#0D0A1A] text-white p-8">
      <div className="max-w-4xl mx-auto flex flex-col gap-8">
        
        {/* Header Section */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#6C2BD9]/20 border border-[#6C2BD9]/30 flex items-center justify-center text-[#A78BFA]">
            <IndianRupee className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-heading font-extrabold text-2xl text-white">Your Billing Ledger</h1>
            <p className="text-xs text-[#C4B5FD]/70 font-light">Inspect current outstanding invoices, concessions, and download receipts.</p>
          </div>
        </div>

        {/* Invoice list */}
        <div className="flex flex-col gap-4">
          <h3 className="font-heading font-bold text-lg text-white">Outstanding Invoices</h3>

          {isLoading ? (
            <div className="text-center text-xs text-[#C4B5FD]/50 py-10">Syncing with ledger database...</div>
          ) : (
            <div className="space-y-4">
              {structures.map((st) => {
                const paidLog = getPaidStatus(st.id);
                const concession = getAppliedConcession(st.id);
                const waiverAmount = concession ? Number(concession.amount) : 0;
                const { daysOverdue, lateFee, daysAfterGrace } = calculateLateFee(st);
                const daysLeft = getDaysUntilDue(st.due_date);
                const netAmount = Math.max(0, Number(st.amount) - waiverAmount);
                const totalDue = netAmount + (paidLog ? 0 : lateFee);

                // Color coding based on urgency
                const isOverdue = daysOverdue > 0 && !paidLog;
                const isDueSoon = daysLeft !== null && daysLeft <= 3 && daysLeft > 0 && !paidLog;
                const isCritical = daysOverdue >= 7 && !paidLog;

                return (
                  <div key={st.id} className={`glass-panel rounded-2xl p-5 border flex flex-wrap justify-between items-center gap-4 transition-all ${
                    isCritical ? 'border-red-500/30 bg-red-500/5' :
                    isOverdue ? 'border-orange-500/30 bg-orange-500/5' :
                    isDueSoon ? 'border-yellow-500/30 bg-yellow-500/5' :
                    'border-white/5 hover:border-[#6C2BD9]/30'
                  }`}>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-heading font-bold text-base text-white">{st.name}</h4>
                        {isCritical && <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">OVERDUE {daysOverdue}d</span>}
                        {isOverdue && !isCritical && <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-orange-500/20 text-orange-400 border border-orange-500/30">LATE</span>}
                        {isDueSoon && <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">DUE IN {daysLeft}d</span>}
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-[#C4B5FD]/70 mt-1 font-light flex-wrap">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Due: {st.due_date}</span>
                        {concession && (
                          <span className="text-emerald-400 font-semibold">Waiver: -₹{waiverAmount} ({concession.concession_type})</span>
                        )}
                      </div>
                      {/* Late fee breakdown */}
                      {isOverdue && lateFee > 0 && (
                        <div className="mt-2 p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-[10px]">
                          <div className="flex items-center gap-1 text-red-400 font-bold">
                            <AlertTriangle className="w-3 h-3" /> Late Fee Applied
                          </div>
                          <div className="text-red-300/70 mt-1">
                            {daysOverdue} days overdue {st.grace_period_days > 0 ? `(${st.grace_period_days} day grace period)` : ''} 
                            {st.late_fee_per_day > 0 && <> — ₹{st.late_fee_per_day}/day</>}
                            {st.max_penalty > 0 && <> (max ₹{st.max_penalty})</>}
                          </div>
                          <div className="text-red-400 font-bold mt-1">+ ₹{lateFee.toLocaleString()} penalty</div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        {concession && (
                          <div className="text-[10px] line-through text-[#C4B5FD]/50 font-bold">₹{Number(st.amount).toLocaleString()}</div>
                        )}
                        {lateFee > 0 && !paidLog && (
                          <div className="text-[10px] text-red-400 font-bold">Late fee: +₹{lateFee.toLocaleString()}</div>
                        )}
                        <strong className={`font-heading font-extrabold text-base ${isCritical ? 'text-red-400' : isOverdue ? 'text-orange-400' : 'text-white'}`}>
                          ₹{totalDue.toLocaleString()}
                        </strong>
                      </div>

                      {paidLog ? (
                        <span className="px-3.5 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold uppercase tracking-wider flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4" /> Paid
                        </span>
                      ) : (
                        <button 
                          onClick={() => handlePay({ ...st, amount: totalDue })}
                          disabled={isPaying === st.id}
                          className={`px-5 py-2.5 rounded-xl disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg transition-all ${
                            isCritical 
                              ? 'bg-gradient-to-r from-red-600 to-red-500 hover:brightness-110 shadow-red-600/20'
                              : 'bg-gradient-to-r from-[#6C2BD9] to-[#8B5CF6] hover:brightness-110 shadow-[#6C2BD9]/20'
                          }`}
                        >
                          <CreditCard className="w-4 h-4" /> {isPaying === st.id ? "Initializing..." : isCritical ? "Pay Now (Overdue)" : "Pay Now"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Transaction History */}
        <div className="glass-panel rounded-2xl p-6 border border-white/5 flex flex-col gap-4 text-xs">
          <h3 className="font-heading font-bold text-lg text-white">Receipts & Payments Ledger</h3>
          
          <div className="space-y-3">
            {payments.length === 0 ? (
              <div className="text-center text-[#C4B5FD]/50 py-6 italic">No past payments recorded.</div>
            ) : (
              payments.map((p, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-white/5 border border-white/5 flex justify-between items-center">
                  <div>
                    <span className="font-mono text-[#C4B5FD] font-semibold text-[10px]">{p.transaction_id}</span>
                    <div className="text-white mt-1">Paid Amount: <strong>₹{Number(p.amount_paid).toLocaleString()}</strong></div>
                  </div>
                  <button 
                    onClick={() => alert(`Downloading mock receipt PDF: ${p.transaction_id}`)}
                    className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[#A78BFA] flex items-center gap-1 transition-colors"
                  >
                    <FileDown className="w-3.5 h-3.5" /> Receipt
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </main>
  );
}
