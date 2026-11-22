import { Map, List, BarChart3, Info, Wind, type LucideIcon } from "lucide-react";

export interface NavItem {
  to: string;
  key: "map" | "reports" | "air" | "stats" | "about";
  icon: LucideIcon;
  end?: boolean;
  /** Shown in the mobile bottom nav (otherwise reachable from the top bar). */
  mobile?: boolean;
}

// Shared between the desktop top bar and the mobile bottom nav.
export const NAV_ITEMS: NavItem[] = [
  { to: "/", key: "map", icon: Map, end: true, mobile: true },
  { to: "/reports", key: "reports", icon: List, mobile: true },
  { to: "/air", key: "air", icon: Wind, mobile: true },
  { to: "/stats", key: "stats", icon: BarChart3, mobile: true },
  { to: "/about", key: "about", icon: Info },
];
