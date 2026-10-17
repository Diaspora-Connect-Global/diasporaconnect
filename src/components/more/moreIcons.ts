import type { LucideIcon } from 'lucide-react';
import { Bookmark, BriefcaseBusiness, Building2, CalendarDays, ClipboardList, CreditCard, Lightbulb, MessageSquareMore, SquarePen, Store, Tag, Ticket, UsersRound, Wrench } from 'lucide-react';

/** The icon of each More destination (shared by the More page and the phone drawer). */
export const ITEM_ICONS: Record<string, LucideIcon> = {
  requests: ClipboardList,
  saved: Bookmark,
  tickets: Ticket,
  businesses: Building2,
  services: Wrench,
  listings: Tag,
  applications: BriefcaseBusiness,
  payments: CreditCard,
  circles: UsersRound,
  events: CalendarDays,
  conversations: MessageSquareMore,
  marketplace: Store,
  opportunities: Lightbulb,
  createPost: SquarePen,
};
