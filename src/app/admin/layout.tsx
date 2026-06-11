"use client";

import React, { useState, useEffect } from 'react';
import PortalShell, { SidebarLink } from '../../components/PortalShell';
import {
  LayoutDashboard, Users, CalendarDays, CreditCard, ShoppingBag, BookOpen,
  Shield, Dumbbell, Bus, BrainCircuit, ClipboardList, GraduationCap,
  Home, Bell, Award, FileText, UserCheck, Briefcase, HeartPulse
} from 'lucide-react';

const adminLinks: SidebarLink[] = [
  { label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'Admissions', href: '/admin/admissions', icon: UserCheck },
  { label: 'Students', href: '/admin/students', icon: GraduationCap },
  { label: 'Attendance', href: '/admin/attendance', icon: CalendarDays },
  { label: 'Timetable', href: '/admin/timetable', icon: ClipboardList },
  { label: 'Fees & Finance', href: '/admin/fees', icon: CreditCard },
  { label: 'Exams & Results', href: '/admin/exams', icon: FileText },
  { label: 'Canteen', href: '/admin/canteen', icon: ShoppingBag },
  { label: 'Hostel', href: '/admin/hostel', icon: Home },
  { label: 'Library', href: '/admin/library/bookclubs', icon: BookOpen },
  { label: 'Placements', href: '/admin/placements', icon: Briefcase },
  { label: 'HR Management', href: '/admin/hr', icon: HeartPulse },
  { label: 'Smart Gate', href: '/admin/gate', icon: Shield },
  { label: 'FitZone Gym', href: '/admin/gym', icon: Dumbbell },
  { label: 'Transit', href: '/admin/transit', icon: Bus },
  { label: 'Events', href: '/admin/events', icon: Award },
  { label: 'Notices', href: '/admin/notices', icon: Bell },
  { label: 'ID Cards', href: '/admin/idcards', icon: Users },
  { label: 'AI Concierge', href: '/admin/ai', icon: BrainCircuit, badge: 'AI' },
  { label: 'OBE Maps', href: '/admin/obe', icon: GraduationCap },
  { label: 'NAAC Scorecard', href: '/admin/naac', icon: Award },
  { label: 'Faculty Dev', href: '/admin/faculty-development', icon: ClipboardList },
  { label: 'Achievements', href: '/admin/achievements', icon: FileText },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [links, setLinks] = useState<SidebarLink[]>(adminLinks);

  useEffect(() => {
    const savedProfile = localStorage.getItem('iris_user_profile');
    if (savedProfile) {
      try {
        const parsed = JSON.parse(savedProfile);
        if (parsed.role === 'SuperAdmin') {
          setLinks([
            { label: 'Global Tenants', href: '/admin/global', icon: Shield },
            ...adminLinks
          ]);
        }
      } catch (e) {
        console.error('Failed parsing profile for SuperAdmin nav check:', e);
      }
    }
  }, []);

  return (
    <PortalShell
      portalName="Admin Console"
      portalBadge="Admin"
      sidebarLinks={links}
      accentColor="#6C2BD9"
    >
      {children}
    </PortalShell>
  );
}
