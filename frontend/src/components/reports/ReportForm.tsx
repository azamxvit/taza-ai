import { useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { ImagePlus, Loader2, MapPin, PencilLine, RotateCcw, SearchX, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { NodeIcon } from "@/components/common";
import { analyzeReport, ApiError } from "@/lib/api";
import { CATEGORIES } from "@/lib/categories";
import { compressImages } from "@/lib/compress";
import type { AiAnalysis, CategoryId, Lang, LatLng, NewReportPayload, Severity } from "@/types";
import { AiInsight, ConfidenceChip } from "./AiInsight";
import { AiNotice } from "./AiNotice";
import { SeverityPicker } from "./SeverityPicker";

const MAX_PHOTOS = 5;

/**
 * input     — photos + optional note, waiting for "Analyze"
 * analyzing — request to /api/ai/analyze in flight
 * draft     — AI draft, editable, can be published
 * rejected  — AI says this is not an environmental problem: not published
 * error     — AI failed (quota, network): retry or fill in manually
 * manual    — form without AI
 */
type Stage = "input" | "analyzing" | "draft" | "rejected" | "error" | "manual";

interface ReportFormProps {
  pos: LatLng;
  onSubmit: (payload: NewReportPayload) => Promise<void>;
  onCancel: () => void;
}

export function ReportForm({ pos, onSubmit, onCancel }: ReportFormProps) {
  const { t, i18n } = useTranslation();
  const [stage, setStage] = useState<Stage>("input");
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [analysis, setAnalysis] = useState<AiAnalysis | null>(null);
  const [model, setModel] = useState("");
  const [aiError, setAiError] = useState("");

  // Editable draft (prefilled by the AI)
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<CategoryId>("illegal_dump");
  const [severity, setSeverity] = useState<Severity>(2);
  const [summary, setSummary] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Revoke object URLs when previews change or the form unmounts.
  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews]);

  const setFiles = (next: File[]) => {
    setImages(next);
    setPreviews(next.map((f) => URL.createObjectURL(f)));
    // New photos make an existing AI result stale.
    if (stage === "draft" || stage === "rejected" || stage === "error") {
      setStage("input");
      setAnalysis(null);
    }
  };

  const runAnalysis = async () => {
    setStage("analyzing");
    setAiError("");
    setError("");
    try {
      const compressed = await compressImages(images.slice(0, 3), { maxDim: 1280, quality: 0.8 });
      const res = await analyzeReport(compressed, note.trim(), i18n.language as Lang);
      const a = res.analysis;
      setAnalysis(a);
      setModel(res.model);
      if (!a.relevant) {
        setStage("rejected");
        return;
      }
      setTitle(a.title);
      setCategory(a.category);
      setSeverity(a.severity);
      setSummary(a.summary);
      setStage("draft");
    } catch (err) {
      const code = err instanceof ApiError ? err.code : "network";
      setAiError(t(`ai.errors.${code ?? "unavailable"}`, { defaultValue: t("ai.errors.unavailable") }));
      setStage("error");
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (stage !== "draft" && stage !== "manual") return;
    if (!title.trim()) {
      setError(t("form.titleRequired"));
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      const compressed = await compressImages(images, { maxDim: 1280, quality: 0.8 });
      const ai =
        stage === "draft" && analysis
          ? {
              summary: summary.trim(),
              visible_evidence: analysis.visible_evidence,
              suggested_actions: analysis.suggested_actions,
              confidence: analysis.confidence,
              category: analysis.category,
              severity: analysis.severity,
              model,
              edited:
                title.trim() !== analysis.title ||
                category !== analysis.category ||
                severity !== analysis.severity ||
                summary.trim() !== analysis.summary,
            }
          : undefined;
      await onSubmit({
        title: title.trim(),
        desc: note.trim(),
        category,
        severity,
        lat: pos.lat,
        lng: pos.lng,
        images: compressed,
        ai,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : t("form.failed"));
    } finally {
      setSubmitting(false);
    }
  };

  const canEdit = stage === "draft" || stage === "manual";
  const busy = stage === "analyzing" || submitting;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
      <header className="pr-12">
        <h2 className="text-xl font-extrabold">{t("form.title")}</h2>
      </header>

      <section aria-label={t("form.location")} className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 p-3 text-sm">
        <MapPin size={18} className="shrink-0 text-primary" aria-hidden="true" />
        <p>
          <data value={`${pos.lat},${pos.lng}`} className="block font-mono">
            {pos.lat.toFixed(5)}, {pos.lng.toFixed(5)}
          </data>
          <small>{t("form.locationHint")}</small>
        </p>
      </section>

      <fieldset disabled={busy}>
        <legend>{t("form.photos", { count: images.length, max: MAX_PHOTOS })}</legend>
        <ul className="flex flex-wrap gap-2">
          {previews.map((src, i) => (
            <li key={src} className="relative">
              <img src={src} alt="" className="size-20 rounded-xl border object-cover" />
              <Button
                type="button"
                variant="destructive"
                size="icon-xs"
                aria-label={t("form.removePhoto")}
                onClick={() => setFiles(images.filter((_, j) => j !== i))}
                className="absolute -top-1.5 -right-1.5 rounded-full bg-destructive text-background hover:bg-destructive/80"
              >
                <X />
              </Button>
            </li>
          ))}
          {images.length < MAX_PHOTOS && (
            <li>
              <label className="flex size-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed text-center text-[10px] font-semibold text-muted-foreground transition hover:border-primary hover:text-primary">
                <ImagePlus size={22} aria-hidden="true" />
                {t("form.addPhoto")}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="sr-only"
                  onChange={(e) => {
                    const incoming = Array.from(e.target.files ?? []).filter((f) => f.type.startsWith("image/"));
                    setFiles([...images, ...incoming].slice(0, MAX_PHOTOS));
                    e.target.value = "";
                  }}
                />
              </label>
            </li>
          )}
        </ul>
      </fieldset>

      <p className="flex flex-col gap-2">
        <Label htmlFor="report-note">{t("ai.noteLabel")}</Label>
        <Textarea
          id="report-note"
          rows={2}
          maxLength={2000}
          disabled={busy}
          placeholder={t("form.descriptionPlaceholder")}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="rounded-xl"
        />
        <small>{t("ai.privacy")}</small>
      </p>

      {stage === "input" && (
        <section className="flex flex-col gap-2">
          <Button type="button" size="lg" disabled={!images.length} onClick={() => void runAnalysis()} className="h-11 rounded-xl font-bold">
            <Sparkles aria-hidden="true" />
            {t("ai.analyze")}
          </Button>
          {!images.length && <small className="text-center">{t("ai.needPhoto")}</small>}
          <Button type="button" variant="link" onClick={() => setStage("manual")} className="self-center text-muted-foreground">
            <PencilLine aria-hidden="true" />
            {t("ai.manual")}
          </Button>
        </section>
      )}

      {stage === "analyzing" && (
        <section aria-live="polite" aria-busy="true" className="flex flex-col gap-3 rounded-2xl border border-aqua/30 bg-aqua/5 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-aqua">
            <Loader2 size={16} className="animate-spin" aria-hidden="true" />
            {t("ai.analyzing")}
          </p>
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </section>
      )}

      {stage === "rejected" && analysis && (
        <section role="status" className="flex flex-col gap-3 rounded-2xl border border-warn/40 bg-warn/10 p-4">
          <h3 className="flex items-center gap-2">
            <SearchX size={18} aria-hidden="true" className="text-warn" />
            {t("ai.irrelevantTitle")}
          </h3>
          <p className="text-sm">{analysis.summary}</p>
          <AiNotice />
          <small>{t("ai.irrelevantHint")}</small>
        </section>
      )}

      {stage === "error" && (
        <section role="alert" className="flex flex-col gap-3 rounded-2xl border border-destructive/40 bg-destructive/10 p-4">
          <p className="text-sm">{aiError}</p>
          <footer className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={() => void runAnalysis()} className="rounded-xl">
              <RotateCcw aria-hidden="true" />
              {t("ai.retry")}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setStage("manual")} className="rounded-xl">
              <PencilLine aria-hidden="true" />
              {t("ai.manual")}
            </Button>
          </footer>
        </section>
      )}

      {canEdit && (
        <section aria-labelledby="draft-heading" className="flex flex-col gap-5 rounded-2xl border border-aqua/30 bg-aqua/5 p-4">
          <header className="flex flex-col gap-1.5">
            <h3 id="draft-heading" className="flex flex-wrap items-center gap-2">
              {stage === "draft" ? (
                <>
                  <Sparkles size={16} aria-hidden="true" className="text-aqua" />
                  {t("ai.draftTitle")}
                  {analysis && <ConfidenceChip value={analysis.confidence} />}
                </>
              ) : (
                <>
                  <PencilLine size={16} aria-hidden="true" className="text-muted-foreground" />
                  {t("ai.manualTitle")}
                </>
              )}
            </h3>
            <small>{stage === "draft" ? t("ai.draftHint") : t("ai.manualHint")}</small>
          </header>

          <p className="flex flex-col gap-2">
            <Label htmlFor="report-title">{t("form.titleLabel")}</Label>
            <Input
              id="report-title"
              maxLength={120}
              placeholder={t("form.titlePlaceholder")}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              aria-invalid={Boolean(error && !title.trim())}
              className="h-11 rounded-xl"
            />
          </p>

          <fieldset>
            <legend>{t("form.category")}</legend>
            <ToggleGroup
              type="single"
              spacing={2}
              value={category}
              onValueChange={(v) => v && setCategory(v as CategoryId)}
              className="grid w-full grid-cols-2"
            >
              {CATEGORIES.map((c) => (
                <ToggleGroupItem
                  key={c.id}
                  value={c.id}
                  className="h-auto min-h-10 justify-start rounded-xl! border bg-background-2 px-3 py-2 text-left text-xs font-semibold whitespace-normal text-muted-foreground data-[state=on]:border-primary data-[state=on]:bg-primary/10 data-[state=on]:text-foreground"
                >
                  <span style={{ color: c.color }}>
                    <NodeIcon node={c.icon} size={16} />
                  </span>
                  {t(`category.${c.id}`)}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </fieldset>

          <SeverityPicker value={severity} onChange={setSeverity} />

          {stage === "draft" && analysis && (
            <>
              <p className="flex flex-col gap-2">
                <Label htmlFor="report-summary">{t("ai.summary")}</Label>
                <Textarea
                  id="report-summary"
                  rows={4}
                  maxLength={1000}
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  className="rounded-xl"
                />
              </p>
              <AiInsight evidence={analysis.visible_evidence} actions={analysis.suggested_actions} />
              <AiNotice />
            </>
          )}
        </section>
      )}

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <footer className="flex gap-2">
        <Button type="button" variant="secondary" size="lg" onClick={onCancel} className="h-11 rounded-xl px-4 font-bold">
          {t("form.cancel")}
        </Button>
        {canEdit && (
          <Button type="submit" size="lg" disabled={submitting} className="h-11 flex-1 rounded-xl font-bold">
            {submitting && <Loader2 className="animate-spin" aria-hidden="true" />}
            {submitting ? t("form.submitting") : t("form.submit")}
          </Button>
        )}
      </footer>
    </form>
  );
}
