import { createContext } from "react";
import type { NewReportPayload, Report, ResolveReason, ResolveResult, Stats } from "@/types";

export type CategoryFilterValue = "all" | string;

export interface ReportsContextValue {
  reports: Report[];
  loading: boolean;
  error: string;
  stats: Stats;
  filter: CategoryFilterValue;
  setFilter: (value: CategoryFilterValue) => void;
  refresh: () => Promise<void>;
  refreshStats: () => Promise<void>;
  addReport: (payload: NewReportPayload) => Promise<Report>;
  resolve: (id: string, reason: ResolveReason) => Promise<ResolveResult>;
  upvote: (id: string) => Promise<void>;
  removeReport: (id: string) => Promise<void>;
  /** Put an updated report (from any API response) into the shared list. */
  replaceReport: (report: Report) => void;
  lastAddedId: string | null;
}

export const ReportsContext = createContext<ReportsContextValue | null>(null);
