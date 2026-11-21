import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Eye, ImageOff } from "lucide-react";
import { firstImage } from "../api";
import { formatDate } from "../format";
import { CategoryChip, SeverityBadge, StatusBadge } from "./badges";

// Feed card. Clicking opens the report on the map (bottom sheet).
export default function ReportCard({ report }) {
  const { t, i18n } = useTranslation();
  const cover = firstImage(report);
  const date = formatDate(report.createdAt, i18n.language);

  return (
    <Link
      to={`/?r=${report._id}`}
      className={`group block rounded-[18px] bg-surface border border-line overflow-hidden hover:border-eco/60 transition ${
        report.status === "resolved" ? "opacity-80" : ""
      }`}
    >
      <div className="relative h-40 bg-night-2">
        {cover ? (
          <img src={cover} alt="" loading="lazy" className="w-full h-full object-cover group-hover:scale-[1.02] transition" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-faint">
            <ImageOff size={26} aria-hidden="true" />
          </div>
        )}
        <div className="absolute top-2 left-2">
          <StatusBadge status={report.status} />
        </div>
      </div>
      <div className="p-4 flex flex-col gap-2">
        <div className="flex flex-wrap gap-1.5">
          <CategoryChip id={report.category} />
          <SeverityBadge report={report} />
        </div>
        <h3 className="font-bold text-ink leading-snug line-clamp-2">{report.title}</h3>
        <p className="text-sm text-muted line-clamp-2">{report.desc || t("report.noDescription")}</p>
        <div className="flex items-center justify-between text-xs text-faint pt-1">
          <span>{date}</span>
          <span className="inline-flex items-center gap-1">
            <Eye size={14} aria-hidden="true" /> {report.upvotes || 0}
          </span>
        </div>
      </div>
    </Link>
  );
}
