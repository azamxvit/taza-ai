import { useState, useEffect } from "react";
import { resolveImage } from "../api";

// Reusable image gallery: thumbnail strip + click-to-open lightbox.
// `images` is an array of server paths (e.g. ["/uploads/x.jpg", ...]).
export default function ImageGallery({ images, alt = "photo" }) {
  const urls = (images || []).filter(Boolean).map(resolveImage);
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
      if (e.key === "ArrowRight") setIdx((i) => (i + 1) % urls.length);
      if (e.key === "ArrowLeft") setIdx((i) => (i - 1 + urls.length) % urls.length);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, urls.length]);

  if (urls.length === 0) {
    return (
      <div className="w-full h-44 bg-gray-800 flex items-center justify-center text-gray-500 text-sm">
        No photo
      </div>
    );
  }

  const showLightbox = open && urls.length > 0;

  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        {urls.map((u, i) => (
          <button
            key={i}
            type="button"
            onClick={() => {
              setIdx(i);
              setOpen(true);
            }}
            className="relative focus:outline-none"
          >
            <img
              src={u}
              alt={`${alt} ${i + 1}`}
              className="w-full h-24 object-cover rounded border border-gray-600 hover:border-teal-400 transition"
              loading="lazy"
            />
            {urls.length > 1 && (
              <span className="absolute bottom-1 right-1 text-[10px] bg-black/60 text-white px-1 rounded">
                {i + 1}/{urls.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {showLightbox && (
        <div
          className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/85 p-4"
          onClick={() => setOpen(false)}
        >
          <button
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-gray-900/80 text-white text-xl"
            onClick={() => setOpen(false)}
          >
            ✕
          </button>
          {urls.length > 1 && (
            <button
              className="absolute left-4 text-white text-3xl"
              onClick={(e) => {
                e.stopPropagation();
                setIdx((i) => (i - 1 + urls.length) % urls.length);
              }}
            >
              ‹
            </button>
          )}
          <img
            src={urls[idx]}
            alt={`${alt} ${idx + 1}`}
            className="max-w-full max-h-[85vh] rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
          {urls.length > 1 && (
            <button
              className="absolute right-4 text-white text-3xl"
              onClick={(e) => {
                e.stopPropagation();
                setIdx((i) => (i + 1) % urls.length);
              }}
            >
              ›
            </button>
          )}
        </div>
      )}
    </>
  );
}
