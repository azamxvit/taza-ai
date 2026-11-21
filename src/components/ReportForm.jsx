import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ImagePlus, MapPin, X, Loader2 } from "lucide-react";
import { CATEGORIES } from "../categories";
import { compressImages } from "../compressUtils";
import NodeIcon from "./Icon";

const MAX_PHOTOS = 5;

const inputClass =
  "w-full p-3 rounded-xl bg-night-2 text-ink placeholder:text-faint border border-line focus:outline-none focus:border-eco transition";

export default function ReportForm({ pos, onSubmit, onCancel }) {
  const { t } = useTranslation();
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [category, setCategory] = useState("illegal_dump");
  const [images, setImages] = useState([]); // array of File
  const [previews, setPreviews] = useState([]); // object URLs
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleFiles = (fileList) => {
    const incoming = Array.from(fileList || []).filter((f) => f.type.startsWith("image/"));
    const next = [...images, ...incoming].slice(0, MAX_PHOTOS);
    previews.forEach((u) => URL.revokeObjectURL(u));
    setImages(next);
    setPreviews(next.map((f) => URL.createObjectURL(f)));
  };

  const removeAt = (idx) => {
    const next = images.filter((_, i) => i !== idx);
    previews.forEach((u) => URL.revokeObjectURL(u));
    setImages(next);
    setPreviews(next.map((f) => URL.createObjectURL(f)));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError(t("form.titleRequired"));
      return;
    }
    setError("");
    setLoading(true);
    try {
      // Fast client-side pre-compress, then the server re-optimizes (auto-orient).
      const compressed = await compressImages(images, { maxDim: 1280, quality: 0.8 });
      await onSubmit({ title: title.trim(), desc: desc.trim(), category, lat: pos.lat, lng: pos.lng, images: compressed });
    } catch (err) {
      setError(err.message || t("form.failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <h2 id="report-form-title" className="text-xl font-extrabold text-ink pr-10">
        {t("form.title")}
      </h2>

      <div className="flex items-center gap-2 rounded-xl bg-eco/10 border border-eco/30 p-3 text-sm">
        <MapPin size={18} className="text-eco shrink-0" aria-hidden="true" />
        <div>
          <div className="font-mono text-ink">
            {pos.lat.toFixed(5)}, {pos.lng.toFixed(5)}
          </div>
          <div className="text-xs text-muted">{t("form.locationHint")}</div>
        </div>
      </div>

      <div>
        <div className="text-sm font-semibold text-muted mb-2">{t("form.photos", { count: images.length, max: MAX_PHOTOS })}</div>
        <div className="flex gap-2 flex-wrap">
          {previews.map((src, i) => (
            <div key={src} className="relative">
              <img src={src} alt="" className="w-20 h-20 object-cover rounded-xl border border-line" />
              <button
                type="button"
                aria-label={t("form.removePhoto")}
                onClick={() => removeAt(i)}
                className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-danger text-night flex items-center justify-center"
              >
                <X size={14} />
              </button>
            </div>
          ))}
          {images.length < MAX_PHOTOS && (
            <label className="w-20 h-20 rounded-xl border-2 border-dashed border-line hover:border-eco text-muted hover:text-eco flex flex-col items-center justify-center gap-1 text-[10px] font-semibold cursor-pointer transition">
              <ImagePlus size={22} aria-hidden="true" />
              {t("form.addPhoto")}
              <input
                type="file"
                accept="image/*"
                multiple
                className="sr-only"
                onChange={(e) => {
                  handleFiles(e.target.files);
                  e.target.value = "";
                }}
              />
            </label>
          )}
        </div>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold text-muted">{t("form.titleLabel")}</span>
        <input
          className={inputClass}
          type="text"
          maxLength={120}
          placeholder={t("form.titlePlaceholder")}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </label>

      <fieldset>
        <legend className="text-sm font-semibold text-muted mb-2">{t("form.category")}</legend>
        <div className="grid grid-cols-2 gap-2">
          {CATEGORIES.map((c) => {
            const active = category === c.id;
            return (
              <button
                key={c.id}
                type="button"
                aria-pressed={active}
                onClick={() => setCategory(c.id)}
                className={`flex items-center gap-2 text-left px-3 py-2 rounded-xl text-xs font-semibold border transition ${
                  active ? "border-eco bg-eco/10 text-ink" : "border-line bg-night-2 text-muted hover:text-ink"
                }`}
              >
                <span style={{ color: c.color }}>
                  <NodeIcon node={c.icon} size={16} />
                </span>
                {t(`category.${c.id}`)}
              </button>
            );
          })}
        </div>
      </fieldset>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold text-muted">{t("form.description")}</span>
        <textarea
          className={inputClass}
          rows={3}
          maxLength={2000}
          placeholder={t("form.descriptionPlaceholder")}
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
        />
      </label>

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        {onCancel && (
          <button type="button" onClick={onCancel} className="px-4 py-3 rounded-xl font-bold text-muted bg-raised hover:text-ink">
            {t("form.cancel")}
          </button>
        )}
        <button
          disabled={loading}
          type="submit"
          className="flex-1 inline-flex items-center justify-center gap-2 bg-eco hover:bg-eco-strong disabled:opacity-60 text-night font-bold py-3 rounded-xl transition"
        >
          {loading && <Loader2 size={18} className="animate-spin" aria-hidden="true" />}
          {loading ? t("form.submitting") : t("form.submit")}
        </button>
      </div>
    </form>
  );
}
