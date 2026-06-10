"use client";

import React, { useState } from 'react';
import { 
  Wallet, Search, IndianRupee, ArrowUpRight, ArrowDownRight, 
  History, Download, AlertCircle, RefreshCw, ShieldCheck 
} from 'lucide-react';
import { apiGet, apiPost } from '../../../../lib/api';

interface StudentWallet {
  id: string;
  name: string;
  rollNumber: string;
  balance: number;
}

interface WalletTx {
  id: string;
  type: 'credit' | 'debit';
  amount: number;
  reason: string;
  reference_type: string;
  balance_after: number;
  created_at: string;
}

const MOCK_STUDENTS: StudentWallet[] = [
  { id: 'b0000000-0000-0000-0000-000000000006', name: 'Khushal Gehlot', rollNumber: 'CS23B1024', balance: 350.00 },
  { id: '2', name: 'Alok Kumar', rollNumber: 'CS23B1025', balance: 80.50 },
  { id: '3', name: 'Vikram Singh', rollNumber: 'EE23B2011', balance: 1450.00 },
  { id: '4', name: 'Priya Patel', rollNumber: 'ME23B4009', balance: 520.00 }
];

const MOCK_TXS: Record<string, WalletTx[]> = {
  'b0000000-0000-0000-0000-000000000006': [
    { id: 'tx-1', type: 'debit', amount: 80, reason: 'Order check out ORD-98212', reference_type: 'order_payment', balance_after: 350.00, created_at: new Date(Date.now() - 480000).toISOString() },
    { id: 'tx-2', type: 'credit', amount: 300, reason: 'Manual top-up (Cash Desk)', reference_type: 'cash_load', balance_after: 430.00, created_at: new Date(Date.now() - 3600000).toISOString() }
  ],
  '2': [
    { id: 'tx-3', type: 'debit', amount: 50, reason: 'Order check out ORD-43210', reference_type: 'order_payment', balance_after: 80.50, created_at: new Date(Date.now() - 7200000).toISOString() }
  ]
};

export default function AdminWalletsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<StudentWallet | null>(null);
  const [txHistory, setTxHistory] = useState<WalletTx[]>([]);

  // Adjustment form states
  const [adjustType, setAdjustType] = useState<'credit' | 'debit'>('credit');
  const [adjustAmt, setAdjustAmt] = useState('');
  const [adjustReason, setAdjustReason] = useState('Cash desk credit load');
  const [loading, setLoading] = useState(false);

  const handleSearch = () => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return;

    const matched = MOCK_STUDENTS.find(s => s.rollNumber.toLowerCase() === query || s.name.toLowerCase().includes(query));
    if (matched) {
      setSelectedStudent(matched);
      setTxHistory(MOCK_TXS[matched.id] || []);
    } else {
      setSelectedStudent(null);
      setTxHistory([]);
      alert("No student matching query found.");
    }
  };

  const handleApplyAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !adjustAmt || Number(adjustAmt) <= 0) return;

    setLoading(true);
    const amtNum = Number(adjustAmt);
    const finalAmt = adjustType === 'credit' ? amtNum : -amtNum;

    try {
      await apiPost('/canteen/wallet/adjust', {
        student_id: selectedStudent.id,
        amount: finalAmt,
        reason: adjustReason
      });
    } catch (err) {}

    // Update local state
    const newBal = selectedStudent.balance + finalAmt;
    const updatedStudent = { ...selectedStudent, balance: newBal };
    setSelectedStudent(updatedStudent);
    
    // Add transaction to history list
    const newTx: WalletTx = {
      id: `tx-${Date.now()}`,
      type: adjustType,
      amount: amtNum,
      reason: adjustReason,
      reference_type: adjustType === 'credit' ? 'manual_credit' : 'manual_debit',
      balance_after: newBal,
      created_at: new Date().toISOString()
    };

    setTxHistory(prev => [newTx, ...prev]);
    setAdjustAmt('');
    setAdjustReason('Cash desk credit load');
    setLoading(false);
    alert(`Adjusted wallet for ${selectedStudent.name}. New balance: ₹${newBal.toFixed(2)}`);
  };

  const handleExportStatement = () => {
    if (!selectedStudent || txHistory.length === 0) return;
    
    // Simulating downloadable raw text file
    const headers = "TransactionID,Type,Amount,Reason,ReferenceType,BalanceAfter,CreatedAt\n";
    const rows = txHistory.map(tx => 
      `${tx.id},${tx.type},${tx.amount},"${tx.reason}",${tx.reference_type},${tx.balance_after},${tx.created_at}`
    ).join('\n');
    
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `statement_${selectedStudent.rollNumber}.csv`;
    a.click();
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto">
      
      {/* Header Bar */}
      <div className="flex items-center gap-3 bg-[#13102A]/80 border border-white/5 p-6 rounded-3xl">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#6C2BD9] to-[#8B5CF6] flex items-center justify-center">
          <Wallet className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Manual Wallet Adjustments & Audits</h2>
          <p className="text-xs text-[#A78BFA]/70 mt-0.5">Search student accounts, credit manual balances, and export statement logs.</p>
        </div>
      </div>

      {/* Search Bar Panel */}
      <div className="glass-panel border border-[#6C2BD9]/20 p-5 rounded-2xl flex flex-col sm:flex-row gap-4 items-stretch">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A78BFA]/50" />
          <input 
            type="text"
            placeholder="Search by student Roll Number (e.g. CS23B1024) or Name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-[#0D0A1A] border border-white/10 rounded-xl text-xs text-white outline-none focus:border-[#6C2BD9]/50"
            onKeyDown={(e) => { if(e.key==='Enter') handleSearch(); }}
          />
        </div>
        <button 
          onClick={handleSearch}
          className="px-6 py-3 rounded-xl bg-[#6C2BD9] hover:bg-[#8B5CF6] text-xs font-bold transition-all shrink-0"
        >
          Locate Account
        </button>
      </div>

      {selectedStudent ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Columns (2/3 width): Ledger adjustments + Details */}
          <div className="md:col-span-2 flex flex-col gap-6">
            
            {/* Account Details Widget */}
            <div className="glass-panel border border-white/5 p-5 rounded-2xl relative overflow-hidden flex justify-between items-center">
              <div className="absolute top-0 right-0 w-24 h-24 bg-[#8B5CF6]/5 rounded-full blur-xl" />
              
              <div className="space-y-1 relative z-10">
                <h3 className="text-sm font-extrabold text-white">{selectedStudent.name}</h3>
                <p className="text-[10px] text-[#C4B5FD]/50 font-bold uppercase tracking-wider">{selectedStudent.rollNumber} • B.Tech CSE</p>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-[#C4B5FD]/50 uppercase font-bold tracking-widest block mb-0.5">Active Balance</span>
                <span className="text-2xl font-black text-white font-mono">₹{selectedStudent.balance.toFixed(2)}</span>
              </div>
            </div>

            {/* Adjustments Form */}
            <div className="glass-panel border border-[#6C2BD9]/20 p-5 rounded-2xl">
              <h3 className="text-sm font-bold mb-4 text-[#A78BFA] flex items-center gap-1.5">
                <IndianRupee className="w-4 h-4" /> Apply Balance Adjustment
              </h3>

              <form onSubmit={handleApplyAdjustment} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] text-[#C4B5FD]/60 uppercase block mb-1.5 font-bold">Adjustment Type</label>
                    <div className="flex bg-[#0D0A1A] p-1 rounded-xl border border-white/10">
                      <button 
                        type="button" 
                        onClick={() => setAdjustType('credit')}
                        className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all ${
                          adjustType === 'credit' ? 'bg-[#6C2BD9] text-white' : 'text-[#C4B5FD]/50'
                        }`}
                      >
                        Credit (+)
                      </button>
                      <button 
                        type="button" 
                        onClick={() => setAdjustType('debit')}
                        className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all ${
                          adjustType === 'debit' ? 'bg-[#6C2BD9] text-white' : 'text-[#C4B5FD]/50'
                        }`}
                      >
                        Debit (-)
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-[#C4B5FD]/60 uppercase block mb-1.5 font-bold">Amount (₹)</label>
                    <input 
                      required
                      type="number"
                      value={adjustAmt}
                      onChange={(e) => setAdjustAmt(e.target.value)}
                      placeholder="e.g. 500"
                      className="w-full px-4 py-2 bg-[#0D0A1A] border border-white/10 rounded-xl text-xs text-white outline-none focus:border-[#6C2BD9]/50"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-[#C4B5FD]/60 uppercase block mb-1.5 font-bold">Reason/Reference Notes</label>
                  <input 
                    required
                    type="text"
                    value={adjustReason}
                    onChange={(e) => setAdjustReason(e.target.value)}
                    placeholder="Provide audit reference notes..."
                    className="w-full px-4 py-2.5 bg-[#0D0A1A] border border-white/10 rounded-xl text-xs text-white outline-none focus:border-[#6C2BD9]/50"
                  />
                </div>

                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full py-2.5 bg-[#6C2BD9] hover:bg-[#8B5CF6] text-xs font-bold text-white rounded-xl transition-all"
                >
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin mx-auto" /> : 'Commit Transaction Ledger Entry'}
                </button>
              </form>
            </div>

          </div>

          {/* Right Column (1/3 width): Tx Statement */}
          <div className="glass-panel border border-white/5 rounded-2xl p-5 flex flex-col min-h-[350px]">
            <div className="flex justify-between items-center border-b border-white/5 pb-2.5 mb-4">
              <h3 className="text-xs font-extrabold uppercase tracking-widest text-[#A78BFA] flex items-center gap-1.5">
                <History className="w-4 h-4" /> Activity History
              </h3>
              
              {txHistory.length > 0 && (
                <button 
                  onClick={handleExportStatement}
                  className="w-7 h-7 bg-white/5 rounded border border-white/10 flex items-center justify-center text-[#C4B5FD]/50 hover:text-white transition-colors"
                  title="Export Statement"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex-1 flex flex-col gap-3 overflow-y-auto">
              {txHistory.map(tx => (
                <div key={tx.id} className="p-3 bg-white/5 rounded-xl border border-white/5 flex justify-between items-center gap-2">
                  <div className="space-y-0.5">
                    <h4 className="text-[10px] font-bold text-white leading-snug">{tx.reason}</h4>
                    <p className="text-[8px] text-[#C4B5FD]/45 font-mono">{new Date(tx.created_at).toLocaleDateString()} {new Date(tx.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p>
                  </div>

                  <div className="text-right shrink-0">
                    <span className={`text-[10px] font-bold ${tx.type === 'credit' ? 'text-emerald-400' : 'text-red-400'}`}>
                      {tx.type === 'credit' ? '+' : '-'}₹{tx.amount}
                    </span>
                    <span className="text-[8px] text-[#C4B5FD]/35 block font-mono">Bal: ₹{tx.balance_after}</span>
                  </div>
                </div>
              ))}
              
              {txHistory.length === 0 && (
                <div className="text-center py-20 text-[10px] text-[#C4B5FD]/30">No transaction logs for account.</div>
              )}
            </div>
          </div>

        </div>
      ) : (
        <div className="glass-panel border border-dashed border-[#6C2BD9]/20 rounded-2xl py-24 text-center">
          <AlertCircle className="w-12 h-12 text-[#6C2BD9]/20 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-[#C4B5FD]/60">Select Student Account</h3>
          <p className="text-xs text-[#C4B5FD]/40 mt-1 max-w-xs mx-auto">Please enter a roll number or name in the search field above to open the billing profile.</p>
        </div>
      )}

    </div>
  );
}
