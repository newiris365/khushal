"use client";

import React from 'react';
import PortalShell, { SidebarLink } from '../../components/PortalShell';
import {
  LayoutDashboard, ScanLine, Car, ShieldAlert, Users, ClipboardList
} from 'lucide-react';

const securityLinks: SidebarLink[] = [
  { label: 'Dashboard', href: '/security/dashboard', icon: LayoutDashboard },
  { label: 'Gate Scanner', href: '/security/gate', icon: ScanLine },
  { label: 'Vehicle Logs', href: '/security/vehicles', icon: Car },
  { label: 'Blacklist', href: '/security/restrictions', icon: ShieldAlert },
];

export default function SecurityLayout({ children }: { children: React.ReactNode }) {
  return (
    <PortalShell
      portalName="Security Portal"
      portalBadge="Security"
      sidebarLinks={securityLinks}
      accentColor="#DC2626"
    >
      {children}
    </PortalShell>
  );
}
