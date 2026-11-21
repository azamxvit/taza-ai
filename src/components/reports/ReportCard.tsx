import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Eye, ImageOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CategoryChip, SeverityBadge, StatusBadge } from "@/components/common";
import { firstImage } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type { Report } from "@/types";

/** Feed card; the title link (stretched over the card) opens the report on the map. */
export function ReportCard({ report }: { report: Report }) {
  const { t, i18n } = useTranslation();
  const cover = firstImage(report);

  return (
    <Card
      className={`group relative gap-0 rounded-[18px] py-0 ring-0 border transition hover:border-primary/60 ${
        report.status === "resolved" ? "opacity-80" : ""
      }`}
    >
      <article>
        <figure className="relative h-40 bg-background-2">
          {cover ? (
            <img src={cover} alt="" loading="lazy" className="size-full object-cover" />
          ) : (
            <span className="flex size-full items-center justify-center text-faint">
              <ImageOff size={26} aria-hidden="true" />
            </span>
          )}
          <span className="absolute top-2 left-2 flex gap-1.5">
            {/* Opaque backing: the cover can be any colour */}
            <span className="rounded-full bg-background/90 backdrop-blur">
              <StatusBadge status={report.status} />
            </span>
            {report.demo && <Badge className="h-6 bg-background/80 px-2.5 font-semibold text-muted-foreground">{t("app.demo")}</Badge>}
          </span>
        </figure>
        <div className="flex flex-col gap-2 p-4">
          <p className="flex flex-wrap gap-1.5">
            <CategoryChip id={report.category} />
            <SeverityBadge report={report} />
          </p>
          <h3 className="line-clamp-2 font-bold">
            <Link to={`/?r=${report._id}`} className="after:absolute after:inset-0 focus-visible:outline-none">
              {report.title}
            </Link>
          </h3>
          <p className="line-clamp-2 text-sm text-muted-foreground">{report.desc || report.ai?.summary || t("report.noDescription")}</p>
          <footer className="flex items-center justify-between pt-1 text-xs text-faint">
            <time dateTime={report.createdAt}>{formatDate(report.createdAt, i18n.language)}</time>
            <span className="inline-flex items-center gap-1" aria-label={t("report.seeToo")}>
              <Eye size={14} aria-hidden="true" /> {report.upvotes || 0}
            </span>
          </footer>
        </div>
      </article>
    </Card>
  );
}
