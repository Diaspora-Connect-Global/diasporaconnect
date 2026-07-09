/** Resolve lucide icon names (stored in mock/tab data as strings) to components. */
import {
  Home,
  Megaphone,
  LayoutGrid,
  ClipboardList,
  CalendarDays,
  ShieldCheck,
  LifeBuoy,
  Users,
  FileText,
  BellRing,
  Plane,
  Phone,
  FileDown,
  Tag,
  UsersRound,
  type LucideIcon,
} from 'lucide-react';

const ICONS: Readonly<Record<string, LucideIcon>> = {
  Home,
  Megaphone,
  LayoutGrid,
  ClipboardList,
  CalendarDays,
  ShieldCheck,
  LifeBuoy,
  Users,
  UsersRound,
  FileText,
  BellRing,
  Plane,
  Phone,
  FileDown,
};

export function embassyIcon(name: string): LucideIcon {
  return ICONS[name] ?? Tag;
}
