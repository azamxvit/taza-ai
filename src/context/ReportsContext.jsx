import { createContext, useEffect, useState, useCallback } from "react";
import { fetchReports, createReport, deleteReport, resolveReport, upvoteReport, fetchStats } from "../api";

const ReportsContext = createContext(null);

export function ReportsProvider({ children }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastAddedId, setLastAddedId] = useState(null);
  const [stats, setStats] = useState({ total: 0, resolved: 0, open: 0, byCategory: {} });
  const [filter, setFilter] = useState("all");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchReports();
      setReports(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Could not load reports.");
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
    refresh();
    refreshStats();
  }, [refresh, refreshStats]);

  const addReport = useCallback(
    async (payload) => {
      const data = await createReport(payload);
      const report = data.report;
      setReports((prev) => [report, ...prev]);
      setLastAddedId(report._id);
      refreshStats();
      return report;
    },
    [refreshStats]
  );

  // Mark solved (keeps the report, sets status=resolved) or false (removes it).
  const resolve = useCallback(
    async (id, reason) => {
      const data = await resolveReport(id, reason);
      if (data.action === "deleted") {
        setReports((prev) => prev.filter((r) => r._id !== id));
      } else if (data.report) {
        setReports((prev) => prev.map((r) => (r._id === id ? data.report : r)));
      }
      refreshStats();
      return data;
    },
    [refreshStats]
  );

  const upvote = useCallback(
    async (id) => {
      const data = await upvoteReport(id);
      if (data.report) {
        setReports((prev) => prev.map((r) => (r._id === id ? data.report : r)));
      }
      return data;
    },
    []
  );

  const removeReport = useCallback(
    async (id) => {
      await deleteReport(id);
      setReports((prev) => prev.filter((r) => r._id !== id));
      refreshStats();
      return true;
    },
    [refreshStats]
  );

  return (
    <ReportsContext.Provider
      value={{
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
        lastAddedId,
      }}
    >
      {children}
    </ReportsContext.Provider>
  );
}

export default ReportsContext;
