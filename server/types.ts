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

/** Appeal draft for eOtinish, cached per language. We never send it anywhere ourselves. */
export interface AppealDoc {
  lang: "ru" | "kk";
  recipient: string;
  subject: string;
  text: string;
  model: string;
  createdAt: Date;
}

export interface StatusEvent {
  status: ReportStatus;
  at: Date;
}

/** "The problem is gone" confirmation with an "after" photo. `client` is a salted hash of the device id. */
export interface ResolveConfirmation {
  client: string;
  imageUrl: string;
  at: Date;
}

/** Distinct confirmations needed to mark a report resolved. */
export const CONFIRMATIONS_TO_RESOLVE = 3;

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
  appeals?: Partial<Record<"ru" | "kk", AppealDoc>>;
  statusHistory?: StatusEvent[];
  confirmations?: ResolveConfirmation[];
  resolvedAt?: Date;
  demo?: boolean;
}
