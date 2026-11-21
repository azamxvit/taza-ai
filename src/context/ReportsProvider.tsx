import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { createReport, deleteReport, fetchReports, fetchStats, resolveReport, upvoteReport } from "@/lib/api";
import type { NewReportPayload, Report, ResolveReason, Stats } from "@/types";
import { ReportsContext, type CategoryFilterValue } from "./context";

const EMPTY_STATS: Stats = { total: 0, resolved: 0, open: 0, byCategory: {} };

// Shared report state (from CleanCity), typed and extended for Taza AI.
export function ReportsProvider({ children }: { children: ReactNode }) {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastAddedId, setLastAddedId] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats>(EMPTY_STATS);
  const [filter, setFilter] = useState<CategoryFilterValue>("all");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchReports();
      setReports(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load reports");
      setReports([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshStats = useCallback(async () => {
    try {
      setStats(await fetchStats());
    } catch {
      /* stats are non-critical */
    }
  }, []);

  useEffect(() => {
    void refresh();
    void refreshStats();
  }, [refresh, refreshStats]);

  const addReport = useCallback(
    async (payload: NewReportPayload) => {
      const { report } = await createReport(payload);
      setReports((prev) => [report, ...prev]);
      setLastAddedId(report._id);
      void refreshStats();
      return report;
    },
    [refreshStats]
  );

  const resolve = useCallback(
    async (id: string, reason: ResolveReason) => {
      const data = await resolveReport(id, reason);
      if (data.action === "deleted") setReports((prev) => prev.filter((r) => r._id !== id));
      else if (data.report) setReports((prev) => prev.map((r) => (r._id === id ? data.report! : r)));
      void refreshStats();
      return data;
    },
    [refreshStats]
  );

  const upvote = useCallback(async (id: string) => {
    const { report } = await upvoteReport(id);
    setReports((prev) => prev.map((r) => (r._id === id ? report : r)));
  }, []);

  const removeReport = useCallback(
    async (id: string) => {
      await deleteReport(id);
      setReports((prev) => prev.filter((r) => r._id !== id));
      void refreshStats();
    },
    [refreshStats]
  );

  const replaceReport = useCallback(
    (report: Report) => {
      setReports((prev) => prev.map((r) => (r._id === report._id ? report : r)));
      void refreshStats();
    },
    [refreshStats]
  );

  const value = useMemo(
    () => ({
      reports,
      loading,
      error,
      stats,
      filter,
      setFilter,
      refresh,
      refreshStats,
      addReport,
      resolve,
      upvote,
      removeReport,
      replaceReport,
      lastAddedId,
    }),
    [reports, loading, error, stats, filter, refresh, refreshStats, addReport, resolve, upvote, removeReport, replaceReport, lastAddedId]
  );

  return <ReportsContext.Provider value={value}>{children}</ReportsContext.Provider>;
}
