import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Eye, CheckCircle2, MoreHorizontal, Flag, Trash2, MapPin, CalendarDays } from "lucide-react";
import { reportImages } from "../api";
import { formatDateTime } from "../format";
import { hasUpvoted, markUpvoted } from "../upvoteStore";
import ImageGallery from "./ImageGallery";
import { CategoryChip, SeverityBadge, StatusBadge } from "./badges";

// Content of the report bottom sheet / side panel.
export default function ReportDetail({ report, onResolve, onUpvote, onDelete, onClose }) {
  const { t, i18n } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [menu, setMenu] = useState(false);
  const [upvoted, setUpvoted] = useState(() => hasUpvoted(report._id));
  const resolved = report.status === "resolved";

  const guard = async (fn) => {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
      setMenu(false);
    }
  };

  const date = formatDateTime(report.createdAt, i18n.language);

  return (
    <article className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2 pr-10">
        <CategoryChip id={report.category} />
        <SeverityBadge report={report} />
        <StatusBadge status={report.status} />
        {report.demo && (
          <span className="rounded-full px-2 py-0.5 text-xs font-semibold bg-raised text-muted">{t("app.demo")}</span>
        )}
      </div>

      <h2 id="report-title" className="text-xl font-extrabold leading-snug text-ink">
        {report.title}
      </h2>

      <ImageGallery images={reportImages(report)} alt={report.title} />

      <p className="text-[15px] leading-relaxed text-ink/90 whitespace-pre-line">
        {report.desc || <span className="text-faint">{t("report.noDescription")}</span>}
      </p>

      <div className="grid grid-cols-2 gap-2 text-xs text-muted">
        <div className="flex items-center gap-1.5 rounded-xl bg-night-2 border border-line p-2.5">
          <CalendarDays size={14} className="text-faint shrink-0" aria-hidden="true" />
          {date}
        </div>
        <div className="flex items-center gap-1.5 rounded-xl bg-night-2 border border-line p-2.5" title={t("report.coords")}>
          <MapPin size={14} className="text-faint shrink-0" aria-hidden="true" />
          <span className="font-mono">
            {Number(report.lat).toFixed(5)}, {Number(report.lng).toFixed(5)}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={busy || upvoted}
          onClick={() => {
            setUpvoted(true);
            markUpvoted(report._id);
            guard(() => onUpvote(report._id));
          }}
          title={upvoted ? t("report.alreadyConfirmed") : undefined}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border transition ${
            upvoted ? "bg-aqua/15 border-aqua/40 text-aqua" : "bg-raised border-line text-ink hover:border-aqua"
          }`}
        >
          <Eye size={16} aria-hidden="true" />
          {t("report.seeToo")} · {report.upvotes || 0}
        </button>

        {!resolved && (
          <button
            type="button"
            disabled={busy}
            onClick={() => guard(() => onResolve(report._id, "solved"))}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-eco/15 border border-eco/40 text-eco hover:bg-eco/25 transition disabled:opacity-50"
          >
            <CheckCircle2 size={16} aria-hidden="true" />
            {t("report.markSolved")}
          </button>
        )}

        <div className="relative ml-auto">
          <button
            type="button"
            aria-label={t("report.more")}
            aria-expanded={menu}
            onClick={() => setMenu((m) => !m)}
            className="w-10 h-10 rounded-xl bg-raised border border-line text-muted hover:text-ink flex items-center justify-center"
          >
            <MoreHorizontal size={18} />
          </button>
          {menu && (
            <div className="absolute right-0 bottom-12 z-20 w-52 rounded-xl bg-night-2 border border-line shadow-xl overflow-hidden animate-fade-in">
              <button
                type="button"
                onClick={() => guard(async () => { await onResolve(report._id, "false"); onClose?.(); })}
                className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-amber-300 hover:bg-raised"
              >
                <Flag size={15} aria-hidden="true" /> {t("report.reportFalse")}
              </button>
              <button
                type="button"
                onClick={() => guard(async () => { await onDelete(report._id); onClose?.(); })}
                className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-danger hover:bg-raised"
              >
                <Trash2 size={15} aria-hidden="true" /> {t("report.delete")}
              </button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
