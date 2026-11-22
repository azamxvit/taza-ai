import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight, ImageOff, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { resolveImage } from "@/lib/api";

interface ImageGalleryProps {
  images: string[];
  alt?: string;
}

/** Hero photo + thumbnail strip; click opens a lightbox (from CleanCity, restyled). */
export function ImageGallery({ images, alt = "photo" }: ImageGalleryProps) {
  const { t } = useTranslation();
  const urls = images.filter(Boolean).map(resolveImage);
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(0);
  const next = () => setIdx((i) => (i + 1) % urls.length);
  const prev = () => setIdx((i) => (i - 1 + urls.length) % urls.length);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
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
      <figure className="flex h-52 w-full flex-col items-center justify-center gap-2 rounded-2xl border bg-background-2 text-sm text-faint">
        <ImageOff size={22} aria-hidden="true" />
        <figcaption>{t("report.noPhoto")}</figcaption>
      </figure>
    );
  }

  const openAt = (i: number) => {
    setIdx(i);
    setOpen(true);
  };

  return (
    <figure>
      <button type="button" onClick={() => openAt(0)} className="block w-full">
        <img src={urls[0]} alt={alt} className="h-52 w-full rounded-2xl border object-cover" />
      </button>
      {urls.length > 1 && (
        <ul data-scroll="x" className="mt-2 flex gap-2">
          {urls.slice(1).map((u, i) => (
            <li key={u} className="shrink-0">
              <button type="button" onClick={() => openAt(i + 1)}>
                <img
                  src={u}
                  alt={`${alt} ${i + 2}`}
                  loading="lazy"
                  className="size-16 rounded-xl border object-cover transition hover:border-primary"
                />
              </button>
            </li>
          ))}
        </ul>
      )}

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={alt}
          className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/90 p-4 animate-in fade-in"
          onClick={() => setOpen(false)}
        >
          <Button
            size="icon-lg"
            variant="secondary"
            aria-label={t("report.close")}
            className="absolute top-4 right-4 rounded-full"
            onClick={() => setOpen(false)}
          >
            <X />
          </Button>
          {urls.length > 1 && (
            <Button
              size="icon-lg"
              variant="secondary"
              aria-label="←"
              className="absolute left-3 rounded-full"
              onClick={(e) => {
                e.stopPropagation();
                prev();
              }}
            >
              <ChevronLeft />
            </Button>
          )}
          <img
            src={urls[idx]}
            alt={`${alt} ${idx + 1}`}
            className="max-h-[85vh] max-w-full rounded-xl"
            onClick={(e) => e.stopPropagation()}
          />
          {urls.length > 1 && (
            <Button
              size="icon-lg"
              variant="secondary"
              aria-label="→"
              className="absolute right-3 rounded-full"
              onClick={(e) => {
                e.stopPropagation();
                next();
              }}
            >
              <ChevronRight />
            </Button>
          )}
        </div>
      )}
    </figure>
  );
}
