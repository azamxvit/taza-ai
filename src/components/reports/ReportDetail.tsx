import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { CalendarDays, Eye, FileText, Flag, Inbox, MapPin, MoreHorizontal, PencilLine, Sparkles, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CategoryChip, ImageGallery, SeverityBadge, StatusBadge } from "@/components/common";
import { useReports } from "@/context";
import { reportImages, setReportStatus } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { hasUpvoted, markUpvoted } from "@/lib/deviceStore";
import type { Report, ResolveReason } from "@/types";
import { AiInsight, ConfidenceChip } from "./AiInsight";
import { AiNotice } from "./AiNotice";
import { AppealPanel } from "./AppealPanel";
import { ResolveConfirm } from "./ResolveConfirm";
import { StatusSteps } from "./StatusSteps";

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
  const [showAppeal, setShowAppeal] = useState(false);
  const { replaceReport } = useReports();
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
        <StatusSteps report={report} />
      </header>

      <ImageGallery images={reportImages(report)} alt={report.title} />

      {(report.desc || !report.ai) && (
        <p className="text-[15px] whitespace-pre-line">
          {report.desc || <span className="text-faint">{t("report.noDescription")}</span>}
        </p>
      )}

      {report.ai && (
        <section aria-labelledby={`ai-${report._id}`} className="flex flex-col gap-3 rounded-2xl border border-aqua/30 bg-aqua/5 p-4">
          <header className="flex flex-wrap items-center gap-2">
            <h3 id={`ai-${report._id}`} className="flex items-center gap-2">
              <Sparkles size={16} aria-hidden="true" className="text-aqua" />
              {t("ai.section")}
            </h3>
            <ConfidenceChip value={report.ai.confidence} />
          </header>
          {report.ai.summary && <p className="text-sm whitespace-pre-line">{report.ai.summary}</p>}
          <AiInsight evidence={report.ai.visible_evidence} actions={report.ai.suggested_actions} />
          <footer className="flex flex-col gap-1">
            <AiNotice />
            {report.ai.edited && (
              <small className="flex items-center gap-1.5">
                <PencilLine size={12} aria-hidden="true" className="shrink-0" />
                {t("ai.edited")}
              </small>
            )}
          </footer>
        </section>
      )}

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

      {!resolved && (
        <section aria-label={t("appeal.title")} className="flex flex-col gap-3">
          {report.status === "appeal_sent" && (
            <Button
              size="lg"
              disabled={busy}
              onClick={() =>
                void guard(async () => {
                  try {
                    replaceReport((await setReportStatus(report._id, "answered")).report);
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : t("errors.generic"));
                  }
                })
              }
              className="h-10 rounded-xl border-primary/40 bg-primary/15 px-4 font-bold text-primary hover:bg-primary/25"
            >
              <Inbox aria-hidden="true" />
              {t("appeal.gotAnswer")}
            </Button>
          )}
          {showAppeal ? (
            <AppealPanel report={report} />
          ) : (
            <Button
              size="lg"
              variant={report.status === "open" ? "default" : "secondary"}
              onClick={() => setShowAppeal(true)}
              className="h-11 rounded-xl font-bold"
            >
              <FileText aria-hidden="true" />
              {report.status === "open" ? t("appeal.prepare") : t("appeal.show")}
            </Button>
          )}
        </section>
      )}

      <ResolveConfirm report={report} />
    </article>
  );
}
