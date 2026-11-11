import {
  CalendarDays,
  Clapperboard,
  CreditCard,
  Home,
  ImageIcon,
  Inbox,
  MessageSquareText,
  MessagesSquare,
  Palette,
  PenLine,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type DashboardNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  comingSoon?: boolean;
  exact?: boolean;
};

export const dashboardNav: DashboardNavItem[] = [
  { href: "/dashboard", label: "Home", icon: Home, exact: true },
  { href: "/dashboard/evi", label: "Evi Chat", icon: MessagesSquare },
  { href: "/dashboard/brand-kit", label: "Brand Kit", icon: Palette },
  { href: "/dashboard/images", label: "Images", icon: ImageIcon },
  { href: "/dashboard/videos", label: "Videos", icon: Clapperboard },
  { href: "/dashboard/ad-copy", label: "Ad Copy", icon: PenLine },
  {
    href: "/dashboard/post-calendar",
    label: "Post Calendar",
    icon: CalendarDays,
  },
  {
    href: "/dashboard/social-inbox",
    label: "Social Inbox",
    icon: Inbox,
  },
  {
    href: "/dashboard/chat-widget",
    label: "Chat Widget",
    icon: MessageSquareText,
  },
  { href: "/dashboard/billing", label: "Billing & Credits", icon: CreditCard },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];
