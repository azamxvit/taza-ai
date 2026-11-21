import { useState } from "react";
import { useTranslation } from "react-i18next";
import { CalendarDays, CheckCircle2, Eye, Flag, MapPin, MoreHorizontal, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CategoryChip, ImageGallery, SeverityBadge, StatusBadge } from "@/components/common";
import { reportImages } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { hasUpvoted, markUpvoted } from "@/lib/upvoteStore";
import type { Report, ResolveReason } from "@/types";

interface ReportDetailProps {
  report: Report;
  onResolve: (id: string, reason: ResolveReason) => Promise<unknown>;
  onUpvote: (id: string) => Promise<unknown>;
  onDelete: (id: string) => Promise<unknown>;
  onClose: () => void;
}

/** Content of the report bottom sheet / side panel. */
export function ReportDetail({ report, onResolve, onUpvote, onDelete, onClose }: ReportDetailProps) {
  const { t, i18n } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [upvoted, setUpvoted] = useState(() => hasUpvoted(report._id));
  const resolved = report.status === "resolved";

  const guard = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className="flex flex-col gap-4">
      <header className="flex flex-col gap-3 pr-12">
        <ul className="flex flex-wrap items-center gap-2" aria-label={t("form.category")}>
          <li><CategoryChip id={report.category} /></li>
          <li><SeverityBadge report={report} /></li>
          <li><StatusBadge status={report.status} /></li>
          {report.demo && <li><Badge variant="secondary">{t("app.demo")}</Badge></li>}
        </ul>
        <h2 className="text-xl font-extrabold">{report.title}</h2>
      </header>

      <ImageGallery images={reportImages(report)} alt={report.title} />

      <p className="text-[15px] whitespace-pre-line">
        {report.desc || <span className="text-faint">{t("report.noDescription")}</span>}
      </p>

      <dl className="grid-cols-2 text-xs">
        <div className="flex items-center gap-1.5 rounded-xl border bg-background-2 p-2.5">
          <dt className="sr-only">{t("report.date")}</dt>
          <CalendarDays size={14} className="shrink-0 text-faint" aria-hidden="true" />
          <dd className="text-muted-foreground">
            <time dateTime={report.createdAt}>{formatDateTime(report.createdAt, i18n.language)}</time>
          </dd>
        </div>
        <div className="flex items-center gap-1.5 rounded-xl border bg-background-2 p-2.5">
          <dt className="sr-only">{t("report.coords")}</dt>
          <MapPin size={14} className="shrink-0 text-faint" aria-hidden="true" />
          <dd className="font-mono text-muted-foreground">
            {report.lat.toFixed(5)}, {report.lng.toFixed(5)}
          </dd>
        </div>
      </dl>

      <footer className="flex flex-wrap items-center gap-2">
        <Button
          variant="secondary"
          size="lg"
          disabled={busy || upvoted}
          title={upvoted ? t("report.alreadyConfirmed") : undefined}
          onClick={() => {
            setUpvoted(true);
            markUpvoted(report._id);
            void guard(() => onUpvote(report._id));
          }}
          className={`h-10 rounded-xl px-4 font-bold ${upvoted ? "text-aqua disabled:opacity-100" : ""}`}
        >
          <Eye aria-hidden="true" />
          {t("report.seeToo")} · {report.upvotes || 0}
        </Button>

        {!resolved && (
          <Button
            size="lg"
            disabled={busy}
            onClick={() => void guard(() => onResolve(report._id, "solved"))}
            className="h-10 rounded-xl border-primary/40 bg-primary/15 px-4 font-bold text-primary hover:bg-primary/25"
          >
            <CheckCircle2 aria-hidden="true" />
            {t("report.markSolved")}
          </Button>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary" size="icon-lg" aria-label={t("report.more")} className="ml-auto size-10 rounded-xl">
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="z-[1300]">
            <DropdownMenuItem
              className="text-warn"
              onSelect={() =>
                void guard(async () => {
                  await onResolve(report._id, "false");
                  onClose();
                })
              }
            >
              <Flag aria-hidden="true" /> {t("report.reportFalse")}
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              onSelect={() =>
                void guard(async () => {
                  await onDelete(report._id);
                  onClose();
                })
              }
            >
              <Trash2 aria-hidden="true" /> {t("report.delete")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </footer>
    </article>
  );
}
