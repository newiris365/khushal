"use client";

import PortalShell, { SidebarLink } from '../../components/PortalShell';
import { LayoutDashboard, GraduationCap, BarChart3, Target, Users } from 'lucide-react';

const hodLinks: SidebarLink[] = [
  { label: 'Dashboard', href: '/hod/dashboard', icon: LayoutDashboard },
  { label: 'OBE Programs', href: '/hod/obe/programs', icon: GraduationCap },
  { label: 'CO-PO Attainment', href: '/hod/obe/po-attainment', icon: Target },
  { label: 'Gap Analysis', href: '/hod/obe/gap-analysis', icon: BarChart3 },
  { label: 'My Team', href: '/faculty/students', icon: Users },
];

export default function HodLayout({ children }: { children: React.ReactNode }) {
  return (
    <PortalShell
      portalName="HOD Portal"
      portalBadge="HOD"
      sidebarLinks={hodLinks}
      accentColor="#0891B2"
    >
      {children}
    </PortalShell>
  );
}
