"use client";

import PortalShell, { SidebarLink } from '../../components/PortalShell';
import {
  QrCode, Calendar, CalendarDays, CreditCard, ShoppingBag, Home, BookOpen,
  Award, Dumbbell, Bus, MessageCircle, FileText, Bell, User, CheckCircle, Briefcase,
  Upload, Download, Wallet, CalendarCheck, UserCircle, GraduationCap, ClipboardList
} from 'lucide-react';

const studentLinks: SidebarLink[] = [
  { label: 'Mark Attendance', href: '/student/attendance/marking', icon: CheckCircle },
  { label: 'Attendance QR', href: '/student/dashboard', icon: QrCode },
  { label: 'My Attendance', href: '/student/attendance', icon: Calendar },
  { label: 'Timetable', href: '/student/timetable', icon: CalendarDays },
  { label: 'Academic Calendar', href: '/student/calendar', icon: Calendar },
  { label: 'Course Registration', href: '/student/courses', icon: GraduationCap },
  { label: 'Fee Ledger', href: '/student/fees', icon: CreditCard },
  { label: 'Assignments', href: '/student/assignments', icon: Upload },
  { label: 'Study Materials', href: '/student/study-materials', icon: Download },
  { label: 'Leave Application', href: '/student/leave', icon: CalendarCheck },
  { label: 'Campus Wallet', href: '/student/wallet', icon: Wallet },
  { label: 'Canteen', href: '/student/canteen', icon: ShoppingBag },
  { label: 'Hostel', href: '/hostel', icon: Home },
  { label: 'Library', href: '/student/library/research', icon: BookOpen },
  { label: 'Placements', href: '/student/placements', icon: Briefcase },
  { label: 'Events', href: '/student/events', icon: Award },
  { label: 'FitZone', href: '/student/gym', icon: Dumbbell },
  { label: 'Transit GPS', href: '/transit', icon: Bus },
  { label: 'Exam Results', href: '/student/results', icon: FileText },
  { label: 'Exam Enrollment', href: '/student/exams', icon: ClipboardList },
  { label: 'Notices', href: '/student/notices', icon: Bell },
  { label: 'ID Card', href: '/student/idcard', icon: User },
  { label: 'AI Assistant', href: '/ai/search', icon: MessageCircle, badge: 'AI' },
  { label: 'Profile', href: '/profile', icon: UserCircle },
];

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <PortalShell
      portalName="Student Portal"
      portalBadge="Student"
      sidebarLinks={studentLinks}
      accentColor="#06B6D4"
    >
      {children}
    </PortalShell>
  );
}
