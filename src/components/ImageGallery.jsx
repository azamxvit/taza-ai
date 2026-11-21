import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight, ImageOff, X } from "lucide-react";
import { resolveImage } from "../api";

// Hero photo + thumbnail strip, click to open a lightbox.
// `images` is an array of server paths (e.g. ["/uploads/x.jpg", ...]).
export default function ImageGallery({ images, alt = "photo", heroClass = "h-52" }) {
  const { t } = useTranslation();
  const urls = (images || []).filter(Boolean).map(resolveImage);
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOpen(false);
      }
      if (e.key === "ArrowRight") setIdx((i) => (i + 1) % urls.length);
      if (e.key === "ArrowLeft") setIdx((i) => (i - 1 + urls.length) % urls.length);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, urls.length]);

  if (urls.length === 0) {
    return (
      <div className={`w-full ${heroClass} rounded-2xl bg-night-2 border border-line flex flex-col items-center justify-center gap-2 text-faint text-sm`}>
        <ImageOff size={22} aria-hidden="true" />
        {t("report.noPhoto")}
      </div>
    );
  }

  const openAt = (i) => {
    setIdx(i);
    setOpen(true);
  };

  return (
    <>
      <button type="button" onClick={() => openAt(0)} className="block w-full">
        <img src={urls[0]} alt={alt} className={`w-full ${heroClass} object-cover rounded-2xl border border-line`} />
      </button>
      {urls.length > 1 && (
        <div className="mt-2 flex gap-2 overflow-x-auto no-scrollbar">
          {urls.slice(1).map((u, i) => (
            <button key={u} type="button" onClick={() => openAt(i + 1)} className="shrink-0">
              <img
                src={u}
                alt={`${alt} ${i + 2}`}
                loading="lazy"
                className="w-16 h-16 object-cover rounded-xl border border-line hover:border-eco transition"
              />
            </button>
          ))}
        </div>
      )}

      {open && (
        <div
          className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/90 p-4 animate-fade-in"
          onClick={() => setOpen(false)}
        >
          <button
            type="button"
            aria-label={t("report.close")}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-surface text-ink flex items-center justify-center"
            onClick={() => setOpen(false)}
          >
            <X size={20} />
          </button>
          {urls.length > 1 && (
            <button
              type="button"
              aria-label="←"
              className="absolute left-3 w-10 h-10 rounded-full bg-surface/80 text-ink flex items-center justify-center"
              onClick={(e) => {
                e.stopPropagation();
                setIdx((i) => (i - 1 + urls.length) % urls.length);
              }}
            >
              <ChevronLeft />
            </button>
          )}
          <img
            src={urls[idx]}
            alt={`${alt} ${idx + 1}`}
            className="max-w-full max-h-[85vh] rounded-xl"
            onClick={(e) => e.stopPropagation()}
          />
          {urls.length > 1 && (
            <button
              type="button"
              aria-label="→"
              className="absolute right-3 w-10 h-10 rounded-full bg-surface/80 text-ink flex items-center justify-center"
              onClick={(e) => {
                e.stopPropagation();
                setIdx((i) => (i + 1) % urls.length);
              }}
            >
              <ChevronRight />
            </button>
          )}
        </div>
      )}
    </>
  );
}
