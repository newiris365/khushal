"use client";

import React, { useState } from 'react';
import { 
  UtensilsCrossed, Clock, ShoppingBag, BarChart3, 
  Package, ShieldCheck, Moon, Sun, Power
} from 'lucide-react';

interface SidebarLink {
  label: string;
  href: string;
  icon: any;
}

const vendorLinks: SidebarLink[] = [
  { label: 'Live Kitchen Queue', href: '/vendor/canteen/queue', icon: Clock },
  { label: 'Menu Management', href: '/vendor/canteen/menu', icon: ShoppingBag },
  { label: 'Analytics & Forecasts', href: '/vendor/canteen/analytics', icon: BarChart3 },
  { label: 'Inventory & Waste', href: '/vendor/canteen/inventory', icon: Package },
  { label: 'Hygiene Checklist', href: '/vendor/canteen/hygiene', icon: ShieldCheck },
];

export default function VendorLayout({ children }: { children: React.ReactNode }) {
  const [canteenOpen, setCanteenOpen] = useState(true);

  return (
    <div className="min-h-screen bg-[#0D0A1A] text-white flex flex-col md:flex-row">
      
      {/* ── Left Sidebar Drawer ───────────────────────────────── */}
      <aside className="w-full md:w-64 bg-[#13102A]/85 border-r border-[#6C2BD9]/25 flex flex-col shrink-0">
        
        {/* Header Branding */}
        <div className="p-6 border-b border-white/5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#6C2BD9] to-[#8B5CF6] flex items-center justify-center">
            <UtensilsCrossed className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-extrabold text-sm tracking-tight text-white uppercase">IRIS Vendor</h1>
            <p className="text-[10px] text-[#A78BFA] font-semibold">Module 2: Canteen Core</p>
          </div>
        </div>

        {/* Links Navigation */}
        <nav className="flex-1 p-4 flex flex-col gap-1.5">
          {vendorLinks.map(link => {
            const Icon = link.icon;
            return (
              <a 
                key={link.href}
                href={link.href} 
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold text-[#C4B5FD]/70 hover:text-white hover:bg-[#6C2BD9]/15 border border-transparent hover:border-[#6C2BD9]/20 transition-all"
              >
                <Icon className="w-4 h-4 text-[#A78BFA]" />
                {link.label}
              </a>
            );
          })}
        </nav>

        {/* Global Canteen Status Controls */}
        <div className="p-4 border-t border-white/5 bg-[#0D0A1A]/40">
          <div className="flex items-center justify-between bg-[#13102A] border border-white/5 p-3 rounded-xl">
            <div className="text-xs">
              <div className="font-bold text-white">Canteen State</div>
              <div className={`text-[10px] mt-0.5 font-semibold ${canteenOpen ? 'text-emerald-400' : 'text-red-400'}`}>
                {canteenOpen ? 'Receiving Orders' : 'Offline'}
              </div>
            </div>
            
            <button 
              onClick={() => setCanteenOpen(!canteenOpen)}
              className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
                canteenOpen 
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/35 hover:bg-emerald-500/20' 
                  : 'bg-red-500/10 text-red-400 border border-red-500/35 hover:bg-red-500/20'
              }`}
            >
              <Power className="w-4 h-4" />
            </button>
          </div>
        </div>

      </aside>

      {/* ── Main Workspace panel ────────────────────────────── */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
        {children}
      </main>

    </div>
  );
}
