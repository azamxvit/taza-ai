import { Map, List, BarChart3, Info, type LucideIcon } from "lucide-react";

export interface NavItem {
  to: string;
  key: "map" | "reports" | "stats" | "about";
  icon: LucideIcon;
  end?: boolean;
}

// Shared between the desktop top bar and the mobile bottom nav.
export const NAV_ITEMS: NavItem[] = [
  { to: "/", key: "map", icon: Map, end: true },
  { to: "/reports", key: "reports", icon: List },
  { to: "/stats", key: "stats", icon: BarChart3 },
  { to: "/about", key: "about", icon: Info },
];
