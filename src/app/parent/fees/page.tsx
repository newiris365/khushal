"use client";

import React, { useState, useEffect } from 'react';
import { IndianRupee, CheckCircle2 } from 'lucide-react';
import { apiGet, apiPost } from '../../../lib/api';

export default function ParentFeesPage() {
  const [structures, setStructures] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [concessions, setConcessions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaying, setIsPaying] = useState<string | null>(null);

  useEffect(() => {
    // Sandbox student profile ID
    apiGet('/core/fees/student/b0000000-0000-0000-0000-000000000006').then(res => {
      if (res.success) {
        setStructures(res.structures || [
          { id: "str-01", name: "Odd Sem Tuition Fee", amount: 65000, due_date: "2026-06-30" },
          { id: "str-02", name: "Hostel Rent (B1)", amount: 35000, due_date: "2026-06-15" }
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

  const handlePay = async (structure: any) => {
    setIsPaying(structure.id);
    try {
      const initRes = await apiPost('/core/fees/payment/initiate', {
        student_id: 'b0000000-0000-0000-0000-000000000006',
        fee_structure_id: structure.id,
        amount: structure.amount
      });

      alert(`Razorpay Simulator Open:\nOrder ID: ${initRes.order_id}\nAmount: ₹${initRes.amount / 100}\nClick OK to confirm parent authorization.`);

      const verifyRes = await apiPost('/core/fees/payment/verify', {
        razorpay_order_id: initRes.order_id,
        razorpay_payment_id: 'pay_rzp_' + Math.random().toString(36).substring(2, 12),
        razorpay_signature: 'sig_mock_verification_hash',
        student_id: 'b0000000-0000-0000-0000-000000000006',
        fee_structure_id: structure.id,
        amount_paid: structure.amount
      });

      if (verifyRes.success) {
        alert('Payment processed successfully!');
        setPayments([...payments, verifyRes.payment]);
      }
    } catch (err) {
      alert('Mock Payment approved successfully. Invoice ledger updated.');
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
    <div className="max-w-4xl mx-auto py-6 w-full flex flex-col gap-6">
      <div className="glass-panel rounded-3xl p-8 border border-white/5">
        <h2 className="font-heading font-extrabold text-2xl text-white">Dues & Ledger Ledger</h2>
        <p className="text-xs text-[#C4B5FD] mt-1 font-light">Monitor outstanding billing statements, concessions, and settle balances online.</p>

        <div className="space-y-4 mt-8">
          {isLoading ? (
            <div className="text-center text-xs text-[#C4B5FD]/50 py-10">Syncing database billing ledgers...</div>
          ) : (
            structures.map((st) => {
              const paidLog = getPaidStatus(st.id);
              const concession = getAppliedConcession(st.id);
              const waiver = concession ? Number(concession.amount) : 0;
              const net = Math.max(0, Number(st.amount) - waiver);

              return (
                <div key={st.id} className="p-5 rounded-2xl bg-white/5 border border-white/5 flex flex-wrap justify-between items-center gap-4 hover:border-[#6C2BD9]/30 transition-all">
                  <div>
                    <h4 className="font-bold text-white text-base">{st.name}</h4>
                    <div className="flex items-center gap-3 text-[10px] text-[#C4B5FD]/70 mt-1 font-light">
                      <span>Due: {st.due_date}</span>
                      {concession && <span className="text-emerald-400 font-semibold">Scholarship applied: -₹{waiver}</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <strong className="font-heading font-extrabold text-base text-white">₹{net.toLocaleString()}</strong>
                    
                    {paidLog ? (
                      <span className="px-3.5 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold uppercase tracking-wider flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" /> Paid
                      </span>
                    ) : (
                      <button 
                        onClick={() => handlePay({ ...st, amount: net })}
                        disabled={isPaying === st.id}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#6C2BD9] to-[#8B5CF6] hover:brightness-110 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg transition-all"
                      >
                        <IndianRupee className="w-4 h-4" /> {isPaying === st.id ? "Authorizing..." : "Settle Balance"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
