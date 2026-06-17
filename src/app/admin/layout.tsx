"use client";

import React, { useState, useEffect } from 'react';
import PortalShell, { SidebarLink } from '../../components/PortalShell';
import {
  LayoutDashboard, Users, CalendarDays, CreditCard, ShoppingBag, BookOpen,
  Shield, Dumbbell, Bus, BrainCircuit, ClipboardList, GraduationCap,
  Home, Bell, Award, FileText, UserCheck, Briefcase, HeartPulse, Settings,
  Armchair, Package, Link2, AlertTriangle, Calendar, BarChart3, Wand2, UserCircle, MessageSquare,
  Sliders, UserPlus
} from 'lucide-react';

const adminLinks: SidebarLink[] = [
  { label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'Admissions', href: '/admin/admissions', icon: UserCheck },
  { label: 'New Admission', href: '/admin/admissions/new', icon: Users },
  { label: 'Students', href: '/admin/students', icon: GraduationCap },
  { label: 'Users & Roles', href: '/admin/users', icon: UserPlus },
  { label: 'Permissions', href: '/admin/permissions', icon: Sliders },
  { label: 'Attendance', href: '/admin/attendance', icon: CalendarDays },
  { label: 'Timetable', href: '/admin/timetable', icon: ClipboardList },
  { label: 'Timetable Auto', href: '/admin/timetable/auto', icon: Wand2 },
  { label: 'Fees & Finance', href: '/admin/fees', icon: CreditCard },
  { label: 'Fee Escalation', href: '/admin/fees/escalation', icon: AlertTriangle },
  { label: 'Exams & Results', href: '/admin/exams', icon: FileText },
  { label: 'Exam Seating', href: '/admin/exam/seating', icon: Armchair },
  { label: 'Exam Enrollment', href: '/admin/exam/enrollment', icon: ClipboardList },
  { label: 'Academic Calendar', href: '/admin/calendar', icon: Calendar },
  { label: 'Defaulter Report', href: '/admin/reports/defaulters', icon: BarChart3 },
  { label: 'Canteen', href: '/admin/canteen', icon: ShoppingBag },
  { label: 'Hostel', href: '/admin/hostel', icon: Home },
  { label: 'Library', href: '/admin/library/bookclubs', icon: BookOpen },
  { label: 'Placements', href: '/admin/placements', icon: Briefcase },
  { label: 'HR Management', href: '/admin/hr', icon: HeartPulse },
  { label: 'Smart Gate', href: '/admin/gate', icon: Shield },
  { label: 'FitZone Gym', href: '/admin/gym', icon: Dumbbell },
  { label: 'Transit', href: '/admin/transit', icon: Bus },
  { label: 'Events', href: '/admin/events', icon: Award },
  { label: 'Lost & Found', href: '/admin/lost-found', icon: Package },
  { label: 'Notices', href: '/admin/notices', icon: Bell },
  { label: 'ID Cards', href: '/admin/idcards', icon: Users },
  { label: 'AI Concierge', href: '/admin/ai', icon: BrainCircuit, badge: 'AI' },
  { label: 'OBE Maps', href: '/admin/obe', icon: GraduationCap },
  { label: 'NAAC Scorecard', href: '/admin/naac', icon: Award },
  { label: 'Faculty Dev', href: '/admin/faculty-development', icon: ClipboardList },
  { label: 'Faculty Portal', href: '/faculty/dashboard', icon: Users },
  { label: 'Security Portal', href: '/security/dashboard', icon: Shield },
  { label: 'Driver Portal', href: '/driver/dashboard', icon: Bus },
  { label: 'Vendor Portal', href: '/vendor/dashboard', icon: ShoppingBag },
  { label: 'Achievements', href: '/admin/achievements', icon: FileText },
  { label: 'WhatsApp API', href: '/admin/whatsapp', icon: MessageSquare },
  { label: 'Notifications', href: '/admin/notifications', icon: Bell },
  { label: 'Payment Settings', href: '/admin/payment-settings', icon: CreditCard },
  { label: 'Settings', href: '/admin/settings', icon: Settings },
  { label: 'Profile', href: '/profile', icon: UserCircle },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [links, setLinks] = useState<SidebarLink[]>(adminLinks);
  const [userRole, setUserRole] = useState<string>('');

  useEffect(() => {
    const savedProfile = localStorage.getItem('iris_user_profile');
    if (savedProfile) {
      try {
        const parsed = JSON.parse(savedProfile);
        const role = parsed.role || '';
        setUserRole(role);
        if (role === 'SuperAdmin') {
          setLinks([
            { label: 'Global Console', href: '/admin/global', icon: Shield },
            { label: 'Profile', href: '/profile', icon: UserCircle },
          ]);
        } else {
          // Admin cannot see Settings
          setLinks(adminLinks.filter(l => l.href !== '/admin/settings'));
        }
      } catch (e) {
        console.error('Failed parsing profile for SuperAdmin nav check:', e);
      }
    }
  }, []);

  return (
    <PortalShell
      portalName={userRole === 'SuperAdmin' ? "SuperAdmin Console" : "Admin Console"}
      portalBadge={userRole === 'SuperAdmin' ? "SuperAdmin" : "Admin"}
      sidebarLinks={links}
      accentColor="#6C2BD9"
    >
      {children}
    </PortalShell>
  );
}
