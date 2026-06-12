"use client";

import PortalShell, { SidebarLink } from '../../components/PortalShell';
import { LayoutDashboard, CalendarDays, CreditCard, FileText, MessageSquare, Calendar, Link2, Bell, Bus, Wallet } from 'lucide-react';

const parentLinks: SidebarLink[] = [
  { label: 'Dashboard', href: '/parent/dashboard', icon: LayoutDashboard },
  { label: 'Attendance', href: '/parent/attendance', icon: CalendarDays },
  { label: 'Fee Status', href: '/parent/fees', icon: CreditCard },
  { label: 'Exam Results', href: '/parent/results', icon: FileText },
  { label: 'Wallet Top-Up', href: '/parent/dashboard', icon: Wallet },
  { label: 'Messages', href: '/parent/messages', icon: MessageSquare },
  { label: 'PTM Schedule', href: '/parent/ptm', icon: Calendar },
  { label: 'Link Child', href: '/parent/link', icon: Link2 },
];

export default function ParentLayout({ children }: { children: React.ReactNode }) {
  return (
    <PortalShell
      portalName="Parent Portal"
      portalBadge="Parent"
      sidebarLinks={parentLinks}
      accentColor="#EC4899"
    >
      {children}
    </PortalShell>
  );
}
