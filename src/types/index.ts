// Shared domain types for the Taza AI frontend.

export type CategoryId =
  | "illegal_dump"
  | "waste_burning"
  | "oil_spill"
  | "water_pollution"
  | "air_emission"
  | "dead_wildlife"
  | "tree_damage"
  | "other";

export type Severity = 1 | 2 | 3 | 4 | 5;

export type ReportStatus = "open" | "appeal_sent" | "answered" | "resolved";

export interface Report {
  _id: string;
  title: string;
  desc: string;
  /** Legacy CleanCity categories may still appear; unknown ids render as "other". */
  category: CategoryId | (string & {});
  severity?: Severity;
  lat: number;
  lng: number;
  imageUrl: string | null;
  imageUrls: string[];
  status: ReportStatus;
  upvotes: number;
  createdAt: string;
  demo?: boolean;
}

export interface NewReportPayload {
  title: string;
  desc: string;
  category: CategoryId;
  lat: number;
  lng: number;
  images: Blob[];
}

export interface Stats {
  total: number;
  open: number;
  resolved: number;
  byCategory: Partial<Record<string, number>>;
}

export type ResolveReason = "solved" | "false";

export interface ResolveResult {
  ok: boolean;
  action: "deleted" | "resolved";
  report?: Report;
}

export interface LatLng {
  lat: number;
  lng: number;
}

export type Lang = "ru" | "kk" | "en";
