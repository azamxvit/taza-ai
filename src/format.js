// Numeric date formats: browsers render Kazakh month names inconsistently
// (Chrome prints "M11"), so we keep dates numeric in every language.
export function formatDateTime(value, lng) {
  return new Date(value).toLocaleString(lng, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDate(value, lng) {
  return new Date(value).toLocaleDateString(lng, { day: "2-digit", month: "2-digit", year: "numeric" });
}
