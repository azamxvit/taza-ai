import type { ObjectId } from "mongodb";

export type ReportStatus = "open" | "appeal_sent" | "answered" | "resolved";

/** AI assessment saved with a report (the author may have edited the draft). */
export interface ReportAi {
  summary: string;
  visible_evidence: string[];
  suggested_actions: string[];
  confidence: number;
  /** What the AI proposed before the author's edits. */
  category: string;
  severity: number;
  model: string;
  edited: boolean;
}

export interface ReportDoc {
  _id?: ObjectId;
  title: string;
  desc: string;
  category: string;
  severity?: number;
  lat: number;
  lng: number;
  imageUrl: string | null;
  imageUrls: string[];
  status: ReportStatus;
  upvotes: number;
  createdAt: Date;
  ai?: ReportAi;
  demo?: boolean;
}
