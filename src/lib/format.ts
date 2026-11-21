// Numeric date formats: browsers render Kazakh month names inconsistently
// (Chrome prints "M11"), so dates stay numeric in every language.
export function formatDateTime(value: string | number | Date, lng: string, timeZone?: string): string {
  return new Date(value).toLocaleString(lng, {
    timeZone,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDate(value: string | number | Date, lng: string): string {
  return new Date(value).toLocaleDateString(lng, { day: "2-digit", month: "2-digit", year: "numeric" });
}
