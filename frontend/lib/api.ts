export const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:4000";

export function audioUrl(filename: string) {
  return `${API_BASE}/api/audio/${encodeURIComponent(filename)}`;
}

// Same file, but the server adds a Content-Disposition header so the browser
// saves it instead of just streaming it into the player.
export function downloadFileUrl(filename: string, title: string) {
  return `${audioUrl(filename)}?download=${encodeURIComponent(title || "track")}`;
}
