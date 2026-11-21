// Issue categories: label, color (used for map markers + filters).
export const CATEGORIES = [
  { id: "trash", label: "Litter / Trash", color: "#ef4444" },
  { id: "pollution", label: "Pollution", color: "#f59e0b" },
  { id: "water", label: "Drainage / Water", color: "#3b82f6" },
  { id: "green", label: "Green Space", color: "#22c55e" },
  { id: "hazard", label: "Hazard", color: "#a855f7" },
  { id: "other", label: "Other", color: "#64748b" },
];

export const CATEGORY_MAP = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));

export function categoryById(id) {
  return CATEGORY_MAP[id] || CATEGORY_MAP.other;
}
