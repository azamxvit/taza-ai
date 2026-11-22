// Numeric date formats: browsers render Kazakh month names inconsistently
// (Chrome prints "M11"), so dates stay numeric in every language.
// Chrome's "kk" locale also prints ISO order (2026-11-20); Kazakhstan writes 20.11.2026,
// so Kazakh uses the Russian (Kazakhstan) numeric pattern.
const LOCALE: Record<string, string> = { kk: "ru-KZ", ru: "ru-RU", en: "en-GB" };
const locale = (lng: string) => LOCALE[lng] ?? lng;
export function formatDateTime(value: string | number | Date, lng: string, timeZone?: string): string {
  return new Date(value).toLocaleString(locale(lng), {
    timeZone,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDate(value: string | number | Date, lng: string): string {
  return new Date(value).toLocaleDateString(locale(lng), { day: "2-digit", month: "2-digit", year: "numeric" });
}
