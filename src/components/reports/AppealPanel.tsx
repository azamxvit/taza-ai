import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Copy, Download, ExternalLink, FileText, Loader2, MailCheck, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useReports } from "@/context";
import { ApiError, generateAppeal, reportImages, resolveImage, setReportStatus } from "@/lib/api";
import type { AppealLang, Report } from "@/types";
import { AiNotice } from "./AiNotice";

export const EOTINISH_URL = "https://eotinish.kz/";

/** Save each photo as a file (works for cross-origin storage too). */
async function downloadPhotos(report: Report) {
  const urls = reportImages(report).map(resolveImage);
  for (const [i, url] of urls.entries()) {
    const blob = await (await fetch(url)).blob();
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href;
    a.download = `taza-ai-${report._id.slice(-6)}-${i + 1}.jpg`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(href), 1000);
  }
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // Fallback for browsers without the async clipboard API
    const area = document.createElement("textarea");
    area.value = text;
    document.body.append(area);
    area.select();
    document.execCommand("copy");
    area.remove();
  }
}

/**
 * F2: appeal draft for eOtinish. We only prepare text: the resident copies it,
 * downloads the photos and submits on eotinish.kz with their own eGov login.
 */
export function AppealPanel({ report }: { report: Report }) {
  const { t, i18n } = useTranslation();
  const { replaceReport } = useReports();
  const [lang, setLang] = useState<AppealLang>(i18n.language === "kk" ? "kk" : "ru");
  const [texts, setTexts] = useState<Partial<Record<AppealLang, string>>>(() => ({
    ru: report.appeals?.ru?.text,
    kk: report.appeals?.kk?.text,
  }));
  const [recipient, setRecipient] = useState(report.appeals?.[lang]?.recipient ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    async (target: AppealLang, regenerate = false) => {
      setLoading(true);
      setError("");
      try {
        const { appeal } = await generateAppeal(report._id, target, regenerate);
        setTexts((prev) => ({ ...prev, [target]: appeal.text }));
        setRecipient(appeal.recipient);
      } catch (err) {
        const code = err instanceof ApiError ? err.code : "network";
        setError(t(`ai.errors.${code ?? "unavailable"}`, { defaultValue: t("ai.errors.unavailable") }));
      } finally {
        setLoading(false);
      }
    },
    [report._id, t]
  );

  // Generate on first open / language switch if nothing is cached yet.
  const text = texts[lang];
  useEffect(() => {
    if (text === undefined && !loading && !error) void load(lang);
  }, [lang, text, loading, error, load]);

  const markSent = async () => {
    setBusy(true);
    try {
      replaceReport((await setReportStatus(report._id, "appeal_sent")).report);
      toast.success(t("appeal.markedSent"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("errors.generic"));
    } finally {
      setBusy(false);
    }
  };

  const photos = reportImages(report).length;

  return (
    <section aria-labelledby={`appeal-${report._id}`} className="flex flex-col gap-4 rounded-2xl border bg-background-2 p-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h3 id={`appeal-${report._id}`} className="flex items-center gap-2">
          <FileText size={16} aria-hidden="true" className="text-primary" />
          {t("appeal.title")}
        </h3>
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          value={lang}
          onValueChange={(v) => {
            if (!v) return;
            setError("");
            setLang(v as AppealLang);
            setRecipient(report.appeals?.[v as AppealLang]?.recipient ?? "");
          }}
          aria-label={t("appeal.language")}
        >
          <ToggleGroupItem value="ru" className="px-3 text-xs font-bold">РУС</ToggleGroupItem>
          <ToggleGroupItem value="kk" className="px-3 text-xs font-bold">ҚАЗ</ToggleGroupItem>
        </ToggleGroup>
      </header>

      <ol className="flex list-decimal flex-col gap-1 pl-5 text-sm text-muted-foreground marker:font-bold marker:text-primary">
        <li>{t("appeal.step1")}</li>
        <li>{t("appeal.step2")}</li>
        <li>{t("appeal.step3")}</li>
        <li>{t("appeal.step4")}</li>
      </ol>

      {loading && (
        <section aria-live="polite" aria-busy="true" className="flex flex-col gap-2">
          <p className="flex items-center gap-2 text-sm font-semibold text-aqua">
            <Loader2 size={16} className="animate-spin" aria-hidden="true" />
            {t("appeal.generating")}
          </p>
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </section>
      )}

      {error && !loading && (
        <section role="alert" className="flex flex-col gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-3">
          <p className="text-sm">{error}</p>
          <Button type="button" variant="secondary" size="sm" onClick={() => void load(lang)} className="self-start rounded-xl">
            <RotateCcw aria-hidden="true" />
            {t("ai.retry")}
          </Button>
        </section>
      )}

      {text !== undefined && !loading && (
        <>
          {recipient && (
            <p className="text-sm">
              <small className="block">{t("appeal.recipient")}</small>
              <strong>{recipient}</strong>
            </p>
          )}
          <p className="flex flex-col gap-2">
            <Label htmlFor={`appeal-text-${report._id}`}>{t("appeal.textLabel")}</Label>
            <Textarea
              id={`appeal-text-${report._id}`}
              rows={12}
              value={text}
              onChange={(e) => setTexts((prev) => ({ ...prev, [lang]: e.target.value }))}
              className="rounded-xl font-mono text-xs leading-relaxed"
            />
            <AiNotice />
          </p>

          <nav aria-label={t("appeal.actions")} className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Button
              type="button"
              onClick={() => void copyText(text).then(() => toast.success(t("appeal.copied")))}
              className="h-10 rounded-xl font-bold"
            >
              <Copy aria-hidden="true" />
              {t("appeal.copy")}
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={!photos}
              onClick={() => void downloadPhotos(report).catch(() => toast.error(t("errors.generic")))}
              className="h-10 rounded-xl font-bold"
            >
              <Download aria-hidden="true" />
              {t("appeal.download", { count: photos })}
            </Button>
            <Button asChild variant="secondary" className="h-10 rounded-xl font-bold">
              <a href={EOTINISH_URL} target="_blank" rel="noopener noreferrer">
                <ExternalLink aria-hidden="true" />
                {t("appeal.open")}
              </a>
            </Button>
          </nav>

          <small>{t("appeal.weDontSend")}</small>

          <footer className="flex flex-wrap items-center gap-2">
            {report.status === "open" && (
              <Button type="button" disabled={busy} onClick={() => void markSent()} className="h-10 flex-1 rounded-xl border-primary/40 bg-primary/15 font-bold text-primary hover:bg-primary/25">
                <MailCheck aria-hidden="true" />
                {t("appeal.iSent")}
              </Button>
            )}
            <Button type="button" variant="ghost" size="sm" onClick={() => void load(lang, true)} className="rounded-xl text-muted-foreground">
              <RotateCcw aria-hidden="true" />
              {t("appeal.regenerate")}
            </Button>
          </footer>
        </>
      )}
    </section>
  );
}
