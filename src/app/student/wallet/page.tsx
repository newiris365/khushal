"use client";

import React, { useState, useEffect } from 'react';
import { Wallet, Plus, ArrowUpRight, ArrowDownLeft, Clock, CreditCard } from 'lucide-react';
import { apiGet, apiPost } from '../../../lib/api';

interface Transaction {
  id: string;
  amount: number;
  type: string;
  payment_method: string;
  status: string;
  description: string;
  created_at: string;
}

export default function WalletPage() {
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [topping, setTopping] = useState(false);
  const [topAmount, setTopAmount] = useState('');

  useEffect(() => { loadWallet(); }, []);

  const loadWallet = async () => {
    setLoading(true);
    try {
      const [balRes, txRes] = await Promise.all([
        apiGet('/core/wallet/balance'),
        apiGet('/core/wallet/transactions'),
      ]);
      if (balRes.success) setBalance(balRes.balance || 0);
      if (txRes.success) setTransactions(txRes.transactions || []);
    } catch (err) {
      console.error('Failed to load wallet', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTopUp = async () => {
    const amount = parseFloat(topAmount);
    if (!amount || amount <= 0) {
      alert('Please enter a valid amount');
      return;
    }
    setTopping(true);
    try {
      // Mock Razorpay order creation
      const orderId = 'order_' + Math.random().toString(36).substring(2, 12);
      alert(`Razorpay Simulator:\nOrder ID: ${orderId}\nAmount: ₹${amount}\nClick OK to confirm payment.`);

      const res = await apiPost('/core/wallet/credit', {
        amount,
        razorpay_order_id: orderId,
        razorpay_payment_id: 'pay_rzp_' + Math.random().toString(36).substring(2, 12),
      });
      if (res.success) {
        setBalance(res.new_balance || balance + amount);
        setTopAmount('');
        loadWallet();
      }
    } catch (err) {
      // Mock success
      setBalance(prev => prev + amount);
      setTransactions(prev => [{
        id: 'tx_' + Math.random(),
        amount,
        type: 'topup',
        payment_method: 'razorpay',
        status: 'completed',
        description: 'Wallet top-up via Razorpay',
        created_at: new Date().toISOString(),
      }, ...prev]);
      setTopAmount('');
    } finally {
      setTopping(false);
    }
  };

  const QUICK_AMOUNTS = [100, 200, 500, 1000];

  return (
    <main className="min-h-screen bg-[#0D0A1A] text-white p-8">
      <div className="max-w-2xl mx-auto flex flex-col gap-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#6C2BD9]/20 border border-[#6C2BD9]/30 flex items-center justify-center">
            <Wallet className="w-6 h-6 text-[#A78BFA]" />
          </div>
          <div>
            <h1 className="font-heading font-extrabold text-2xl">Campus Wallet</h1>
            <p className="text-xs text-[#C4B5FD]/70 font-light">Top up and manage your canteen wallet</p>
          </div>
        </div>

        {/* Balance Card */}
        <div className="glass-panel rounded-2xl p-8 border border-[#6C2BD9]/30 text-center">
          <span className="text-xs text-[#C4B5FD]/50">Available Balance</span>
          <div className="text-5xl font-heading font-extrabold text-white mt-2">
            ₹{balance.toLocaleString('en-IN')}
          </div>
        </div>

        {/* Top Up */}
        <div className="glass-panel rounded-2xl p-6 border border-white/5 flex flex-col gap-4">
          <h3 className="font-heading font-bold text-sm">Add Money</h3>
          <div className="flex gap-2">
            {QUICK_AMOUNTS.map(amt => (
              <button key={amt} onClick={() => setTopAmount(amt.toString())}
                className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                  topAmount === amt.toString()
                    ? 'bg-[#6C2BD9]/30 border-[#6C2BD9]/50 text-white'
                    : 'bg-white/5 border-white/10 text-[#C4B5FD]/60 hover:text-white'
                }`}>
                ₹{amt}
              </button>
            ))}
          </div>
          <div className="flex gap-3">
            <input type="number" value={topAmount} onChange={e => setTopAmount(e.target.value)}
              className="flex-1 bg-[#13102A] border border-[#6C2BD9]/30 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-[#8B5CF6]"
              placeholder="Enter amount" min="1" />
            <button onClick={handleTopUp} disabled={topping || !topAmount}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#6C2BD9] to-[#8B5CF6] text-white text-xs font-bold flex items-center gap-1.5 hover:brightness-110 transition-all disabled:opacity-50">
              <CreditCard className="w-4 h-4" /> {topping ? 'Processing...' : 'Pay via Razorpay'}
            </button>
          </div>
        </div>

        {/* Transaction History */}
        <div className="glass-panel rounded-2xl p-6 border border-white/5 flex flex-col gap-4">
          <h3 className="font-heading font-bold text-sm">Transaction History</h3>
          {loading ? (
            <div className="text-center text-[#C4B5FD]/40 text-xs py-4">Loading...</div>
          ) : transactions.length === 0 ? (
            <div className="text-center text-[#C4B5FD]/40 text-xs py-4">No transactions yet</div>
          ) : (
            <div className="flex flex-col gap-2">
              {transactions.map(tx => (
                <div key={tx.id} className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    tx.type === 'topup' || tx.type === 'parent_topup'
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-red-500/20 text-red-400'
                  }`}>
                    {tx.type === 'topup' || tx.type === 'parent_topup'
                      ? <ArrowDownLeft className="w-4 h-4" />
                      : <ArrowUpRight className="w-4 h-4" />
                    }
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-medium">{tx.description || tx.type}</div>
                    <div className="text-[9px] text-[#C4B5FD]/40">
                      {new Date(tx.created_at).toLocaleString('en-IN')} &middot; {tx.payment_method}
                    </div>
                  </div>
                  <div className={`text-sm font-bold ${
                    tx.type === 'topup' || tx.type === 'parent_topup' ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {tx.type === 'topup' || tx.type === 'parent_topup' ? '+' : '-'}₹{tx.amount.toLocaleString('en-IN')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
