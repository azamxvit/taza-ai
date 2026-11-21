import { useMemo, useState } from "react";
import { useReports } from "../context/useReports";
import { CATEGORIES } from "../categories";
import ReportCard from "./ReportCard";
import ReportDetail from "./ReportDetail";

export default function ReportsPage() {
  const { reports, loading, error, refresh, stats, filter, setFilter, resolve, upvote, removeReport } =
    useReports();
  const [detail, setDetail] = useState(null);

  const filtered = useMemo(() => {
    if (filter === "all") return reports;
    return reports.filter((r) => r.category === filter);
  }, [reports, filter]);

  // Keep the open detail modal in sync with the latest report data.
  const detailLive = detail ? reports.find((r) => r._id === detail._id) : null;

  return (
    <div className="p-6 sm:p-10 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-white">Community Reports</h1>
          <p className="text-gray-400 mt-1">
            {reports.length} report{reports.length === 1 ? "" : "s"} submitted
          </p>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <Stat label="Total" value={stats.total} color="text-white" />
        <Stat label="Open" value={stats.open} color="text-teal-300" />
        <Stat label="Resolved" value={stats.resolved} color="text-green-300" />
        <Stat
          label="Resolution rate"
          value={stats.total ? Math.round((stats.resolved / stats.total) * 100) + "%" : "0%"}
          color="text-blue-300"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>
          All
        </FilterChip>
        {CATEGORIES.map((c) => (
          <FilterChip
            key={c.id}
            active={filter === c.id}
            color={c.color}
            onClick={() => setFilter(c.id)}
          >
            {c.label}
          </FilterChip>
        ))}
      </div>

      {loading && (
        <div className="text-center text-gray-400 py-12">Loading reports…</div>
      )}

      {error && (
        <div className="text-center text-red-400 py-12">
          {error}
          <button onClick={refresh} className="ml-3 underline hover:text-red-300">
            Retry
          </button>
        </div>
      )}

      {!loading && !error && reports.length === 0 && (
        <div className="text-center text-gray-400 py-12 border border-dashed border-gray-700 rounded-xl">
          No reports yet. Click the map to file the first one!
        </div>
      )}

      {!loading && !error && reports.length > 0 && filtered.length === 0 && (
        <div className="text-center text-gray-400 py-12">
          No reports in this category.
        </div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((report) => (
            <ReportCard
              key={report._id}
              report={report}
              onDelete={removeReport}
              onResolve={resolve}
              onUpvote={upvote}
              onOpen={setDetail}
            />
          ))}
        </div>
      )}

      {detailLive && (
        <ReportDetail
          report={detailLive}
          onClose={() => setDetail(null)}
          onResolve={resolve}
          onUpvote={upvote}
          onDelete={removeReport}
        />
      )}
    </div>
  );
}

function Stat({ label, value, color }) {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 text-center">
      <div className={`text-2xl font-extrabold ${color}`}>{value}</div>
      <div className="text-xs uppercase tracking-wide text-gray-400 mt-1">{label}</div>
    </div>
  );
}

function FilterChip({ active, color, onClick, children }) {
  const base = "px-3 py-1.5 rounded-full text-sm font-medium border transition";
  const style = active
    ? { backgroundColor: (color || "#14b8a6") + "33", borderColor: color || "#14b8a6", color: color || "#5eead4" }
    : { borderColor: "#374151", color: "#9ca3af" };
  return (
    <button
      onClick={onClick}
      style={style}
      className={`${base} ${active ? "" : "hover:border-gray-500 hover:text-gray-200"}`}
    >
      {children}
    </button>
  );
}
