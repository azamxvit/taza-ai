import type { ObjectId } from "mongodb";

export type ReportStatus = "open" | "appeal_sent" | "answered" | "resolved";

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
  demo?: boolean;
}
