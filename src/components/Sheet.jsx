import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";

// Mobile: bottom sheet with a drag handle (swipe down to close).
// Desktop (md+): floating panel on the right side of the map.
export default function Sheet({ open, onClose, title, children, labelledBy }) {
  const { t } = useTranslation();
  const ref = useRef(null);
  const drag = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const onPointerDown = (e) => {
    drag.current = { y: e.clientY, dy: 0 };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e) => {
    if (!drag.current || !ref.current) return;
    const dy = Math.max(0, e.clientY - drag.current.y);
    drag.current.dy = dy;
    ref.current.style.transform = `translateY(${dy}px)`;
  };
  const onPointerUp = () => {
    if (!drag.current || !ref.current) return;
    const { dy } = drag.current;
    drag.current = null;
    if (dy > 90) onClose?.();
    else ref.current.style.transform = "";
  };

  return createPortal(
    <section
      ref={ref}
      role="dialog"
      aria-modal="false"
      aria-labelledby={labelledBy}
      aria-label={labelledBy ? undefined : title}
      className="fixed z-[1200] inset-x-0 bottom-0 max-h-[82dvh] rounded-t-[24px] bg-surface border-t border-line shadow-[0_-12px_40px_-10px_rgba(0,0,0,.7)] flex flex-col animate-sheet-up
        md:inset-x-auto md:right-4 md:top-[84px] md:bottom-4 md:w-[420px] md:max-h-none md:rounded-[20px] md:border md:animate-panel-in"
    >
      <div
        className="md:hidden flex justify-center pt-2.5 pb-1 cursor-grab touch-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <span className="w-10 h-1.5 rounded-full bg-line" />
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label={t("report.close")}
        className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-night/70 text-muted hover:text-ink flex items-center justify-center"
      >
        <X size={18} />
      </button>
      <div className="overflow-y-auto overscroll-contain px-5 pb-6 pt-2 md:pt-5" style={{ paddingBottom: "max(24px, env(safe-area-inset-bottom))" }}>
        {children}
      </div>
    </section>,
    document.body
  );
}
