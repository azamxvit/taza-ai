import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { CameraIcon, CheckCircle2, Loader2 } from "lucide-react";
import { useReports } from "@/context";
import { ApiError, confirmResolved, resolveImage } from "@/lib/api";
import { compressImage } from "@/lib/compress";
import { getClientId, hasConfirmed, markConfirmed } from "@/lib/deviceStore";
import { CONFIRMATIONS_TO_RESOLVE, type Report } from "@/types";

/**
 * F2: "the problem is gone". Each device adds one "after" photo;
 * after 3 different devices the server marks the report resolved.
 */
export function ResolveConfirm({ report }: { report: Report }) {
  const { t } = useTranslation();
  const { replaceReport } = useReports();
  const [busy, setBusy] = useState(false);
  const [confirmed, setConfirmed] = useState(() => hasConfirmed(report._id));
  const confirmations = report.confirmations ?? [];
  const count = Math.min(confirmations.length, CONFIRMATIONS_TO_RESOLVE);
  const resolved = report.status === "resolved";

  const upload = async (file: File) => {
    setBusy(true);
    try {
      const image = await compressImage(file, { maxDim: 1280, quality: 0.8 });
      const { report: updated } = await confirmResolved(report._id, image, getClientId());
      markConfirmed(report._id);
      setConfirmed(true);
      replaceReport(updated);
      toast.success(updated.status === "resolved" ? t("confirm.resolvedNow") : t("confirm.thanks"));
    } catch (err) {
      if (err instanceof ApiError && err.code === "already_confirmed") {
        markConfirmed(report._id);
        setConfirmed(true);
      }
      const code = err instanceof ApiError ? err.code : undefined;
      toast.error(t(`confirm.errors.${code}`, { defaultValue: err instanceof Error ? err.message : t("errors.generic") }));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section
      aria-labelledby={`confirm-${report._id}`}
      className={`flex flex-col gap-3 rounded-2xl border p-4 ${resolved ? "border-primary/40 bg-primary/10" : "bg-background-2"}`}
    >
      <header className="flex flex-col gap-1">
        <h3 id={`confirm-${report._id}`} className="flex items-center gap-2">
          <CheckCircle2 size={16} aria-hidden="true" className="text-primary" />
          {resolved ? t("confirm.resolvedTitle") : t("confirm.title")}
        </h3>
        <small>{resolved ? t("confirm.resolvedHint", { count: CONFIRMATIONS_TO_RESOLVE }) : t("confirm.hint", { count: CONFIRMATIONS_TO_RESOLVE })}</small>
      </header>

      <p className="flex items-center gap-3 text-sm">
        <meter min={0} max={CONFIRMATIONS_TO_RESOLVE} value={count} className="sr-only">
          {count}/{CONFIRMATIONS_TO_RESOLVE}
        </meter>
        <span aria-hidden="true" className="flex gap-1">
          {Array.from({ length: CONFIRMATIONS_TO_RESOLVE }, (_, i) => (
            <span key={i} className={`h-2 w-8 rounded-full ${i < count ? "bg-primary" : "bg-border"}`} />
          ))}
        </span>
        <strong>{t("confirm.progress", { count, total: CONFIRMATIONS_TO_RESOLVE })}</strong>
      </p>

      {confirmations.length > 0 && (
        <figure className="flex flex-col gap-1.5">
          <ul className="flex flex-wrap gap-2">
            {confirmations.map((c) => (
              <li key={c.imageUrl}>
                <a href={resolveImage(c.imageUrl)} target="_blank" rel="noopener noreferrer">
                  <img src={resolveImage(c.imageUrl)} alt={t("confirm.afterPhoto")} className="size-16 rounded-xl border object-cover" />
                </a>
              </li>
            ))}
          </ul>
          <figcaption>{t("confirm.afterPhotos")}</figcaption>
        </figure>
      )}

      {!resolved &&
        (confirmed ? (
          <p className="text-sm font-semibold text-primary">{t("confirm.youConfirmed")}</p>
        ) : (
          <label
            aria-disabled={busy}
            className="flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-primary/40 bg-primary/15 px-4 text-sm font-bold text-primary transition hover:bg-primary/25 aria-disabled:pointer-events-none aria-disabled:opacity-60"
          >
            {busy ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <CameraIcon size={16} aria-hidden="true" />}
            {busy ? t("confirm.uploading") : t("confirm.button")}
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              disabled={busy}
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) void upload(file);
              }}
            />
          </label>
        ))}
    </section>
  );
}
