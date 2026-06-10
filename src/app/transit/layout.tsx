"use client";

import PortalShell, { SidebarLink } from '../../components/PortalShell';
import { LayoutDashboard, MapPin, Route, CreditCard, Car, Leaf, AlertOctagon } from 'lucide-react';

const transitLinks: SidebarLink[] = [
  { label: 'Live Tracker', href: '/transit', icon: LayoutDashboard },
  { label: 'Routes', href: '/transit/routes', icon: Route },
  { label: 'Track Bus', href: '/transit/track', icon: MapPin },
  { label: 'My Subscription', href: '/transit/subscription', icon: CreditCard },
  { label: 'Parking Pass', href: '/transit/parking', icon: Car },
  { label: 'Carbon Offset', href: '/transit/carbon', icon: Leaf },
  { label: 'Parent SOS', href: '/transit/sos', icon: AlertOctagon },
];

export default function TransitLayout({ children }: { children: React.ReactNode }) {
  return (
    <PortalShell
      portalName="Transit GPS"
      portalBadge="Transit"
      sidebarLinks={transitLinks}
      accentColor="#10B981"
    >
      {children}
    </PortalShell>
  );
}
