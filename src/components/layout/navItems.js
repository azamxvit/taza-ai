import { Map, List, BarChart3, Info } from "lucide-react";

// Shared between the desktop top bar and the mobile bottom nav.
export const NAV_ITEMS = [
  { to: "/", key: "map", icon: Map, end: true },
  { to: "/reports", key: "reports", icon: List },
  { to: "/stats", key: "stats", icon: BarChart3 },
  { to: "/about", key: "about", icon: Info },
];
