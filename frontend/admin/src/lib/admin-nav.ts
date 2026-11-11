import {
  Activity,
  Clapperboard,
  CreditCard,
  LayoutDashboard,
  Settings,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export type AdminNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
};

export const adminNav: AdminNavItem[] = [
  { href: "/", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/users", label: "Users", icon: Users },
  { href: "/subscriptions", label: "Subscriptions", icon: CreditCard },
  { href: "/credits", label: "Credits", icon: Wallet },
  { href: "/usage", label: "Usage", icon: Activity },
  { href: "/generations", label: "Generations", icon: Clapperboard },
  { href: "/settings", label: "Settings", icon: Settings },
];
