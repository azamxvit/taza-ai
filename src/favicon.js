// Cycles the browser tab favicon through the given icon paths on an interval.
// Kept as an external module (not an inline <script>) so a strict CSP can drop
// 'unsafe-inline' for scripts.
export function startFaviconCycle(icons, intervalMs = 3000) {
  if (!icons || icons.length === 0) return;
  let i = 0;
  const link = document.getElementById("favicon");
  if (!link) return;
  setInterval(() => {
    i = (i + 1) % icons.length;
    // cache-buster so the browser actually swaps the icon
    link.href = icons[i] + "?t=" + Date.now();
  }, intervalMs);
}
