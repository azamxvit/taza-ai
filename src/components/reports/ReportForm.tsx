import { useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { ImagePlus, Loader2, MapPin, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { NodeIcon } from "@/components/common";
import { CATEGORIES } from "@/lib/categories";
import { compressImages } from "@/lib/compress";
import type { CategoryId, LatLng, NewReportPayload } from "@/types";

const MAX_PHOTOS = 5;

interface ReportFormProps {
  pos: LatLng;
  onSubmit: (payload: NewReportPayload) => Promise<void>;
  onCancel: () => void;
}

export function ReportForm({ pos, onSubmit, onCancel }: ReportFormProps) {
  const { t } = useTranslation();
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [category, setCategory] = useState<CategoryId>("illegal_dump");
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Revoke object URLs when previews change or the form unmounts.
  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews]);

  const setFiles = (next: File[]) => {
    setImages(next);
    setPreviews(next.map((f) => URL.createObjectURL(f)));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError(t("form.titleRequired"));
      return;
    }
    setError("");
    setLoading(true);
    try {
      const compressed = await compressImages(images, { maxDim: 1280, quality: 0.8 });
      await onSubmit({ title: title.trim(), desc: desc.trim(), category, lat: pos.lat, lng: pos.lng, images: compressed });
    } catch (err) {
      setError(err instanceof Error ? err.message : t("form.failed"));
    } finally {
      setLoading(false);
    }
  };

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

      <fieldset>
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
              <label className="flex size-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed text-[10px] font-semibold text-muted-foreground transition hover:border-primary hover:text-primary">
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

      <p className="flex flex-col gap-2">
        <Label htmlFor="report-desc">{t("form.description")}</Label>
        <Textarea
          id="report-desc"
          rows={3}
          maxLength={2000}
          placeholder={t("form.descriptionPlaceholder")}
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          className="rounded-xl"
        />
      </p>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <footer className="flex gap-2">
        <Button type="button" variant="secondary" size="lg" onClick={onCancel} className="h-11 rounded-xl px-4 font-bold">
          {t("form.cancel")}
        </Button>
        <Button type="submit" size="lg" disabled={loading} className="h-11 flex-1 rounded-xl font-bold">
          {loading && <Loader2 className="animate-spin" aria-hidden="true" />}
          {loading ? t("form.submitting") : t("form.submit")}
        </Button>
      </footer>
    </form>
  );
}
