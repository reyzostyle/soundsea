export const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:4000";

export function audioUrl(filename: string) {
  return `${API_BASE}/api/audio/${encodeURIComponent(filename)}`;
}
