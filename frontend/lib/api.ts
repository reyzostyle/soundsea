export const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:4000";

export type PlaybackOptions = { fade: number; gap: number };

// With a fade or gap set, the server hands back a copy with the fade-out and the
// silence baked in (see /api/audio in the backend for why it isn't done here).
export function audioUrl(filename: string, opts?: PlaybackOptions) {
  const base = `${API_BASE}/api/audio/${encodeURIComponent(filename)}`;
  const params = new URLSearchParams();
  if (opts?.fade) params.set("fade", String(opts.fade));
  if (opts?.gap) params.set("gap", String(opts.gap));
  const q = params.toString();
  return q ? `${base}?${q}` : base;
}

// Same file, but the server adds a Content-Disposition header so the browser
// saves it instead of just streaming it into the player.
export function downloadFileUrl(filename: string, title: string) {
  return `${audioUrl(filename)}?download=${encodeURIComponent(title || "track")}`;
}
