// Taza AI eco categories (replace CleanCity's generic ones).
// `icon` is a vanilla lucide IconNode so it works both in React and in
// Leaflet divIcon HTML strings. Labels come from i18n: t(`category.${id}`).
import { Trash2, Flame, Droplet, Waves, Factory, Fish, TreeDeciduous, CircleHelp, type IconNode } from "lucide";
import type { CategoryId, Report, Severity } from "@/types";

export interface Category {
  id: CategoryId;
  color: string;
  icon: IconNode;
}

export const CATEGORIES: Category[] = [
  { id: "illegal_dump", color: "#f59e0b", icon: Trash2 },
  { id: "waste_burning", color: "#fb7185", icon: Flame },
  { id: "oil_spill", color: "#a78bfa", icon: Droplet },
  { id: "water_pollution", color: "#38bdf8", icon: Waves },
  { id: "air_emission", color: "#cbd5e1", icon: Factory },
  { id: "dead_wildlife", color: "#f472b6", icon: Fish },
  { id: "tree_damage", color: "#a3e635", icon: TreeDeciduous },
  { id: "other", color: "#94a3b8", icon: CircleHelp },
];

export const CATEGORY_IDS = CATEGORIES.map((c) => c.id);

const CATEGORY_MAP = Object.fromEntries(CATEGORIES.map((c) => [c.id, c])) as Record<CategoryId, Category>;

export function categoryById(id: string | undefined): Category {
  return CATEGORY_MAP[id as CategoryId] ?? CATEGORY_MAP.other;
}

/** Severity 1–5 → CSS variable from tokens.css (green → red). */
export function severityColor(sev: Severity): string {
  return `var(--sev-${sev})`;
}

export function severityOf(report: Pick<Report, "severity"> | null | undefined): Severity {
  const s = Number(report?.severity);
  return (s >= 1 && s <= 5 ? Math.round(s) : 2) as Severity;
}

/** Marker diameter in px: 26 … 46. */
export function markerSize(sev: Severity): number {
  return 26 + (sev - 1) * 5;
}
