import { API_BASE } from "./api";
import { Track } from "./types";

// Covers saved before the backend started inlining them point at TikTok CDN links
// that expire after a few days. When one fails to load, ask the backend for a fresh
// copy (as a data URL, so it never expires again) and hand it to whoever registered.
// One request at a time, and each track is tried once per page load: yt-dlp is not
// cheap and a whole library of broken covers would otherwise fire them all at once.

type Handler = (trackId: string, thumbnail: string) => void;

let handler: Handler | null = null;
const tried = new Set<string>();
const queue: Track[] = [];
let running = false;

export function setThumbRepairHandler(fn: Handler | null) {
  handler = fn;
}

export function reportBrokenThumb(track: Track) {
  if (!track.sourceUrl || tried.has(track.id)) return;
  tried.add(track.id);
  queue.push(track);
  void drain();
}

async function drain() {
  if (running) return;
  running = true;
  while (queue.length) {
    const track = queue.shift()!;
    try {
      const res = await fetch(`${API_BASE}/api/thumbnail`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: track.sourceUrl }),
      });
      if (res.ok) {
        const data = (await res.json()) as { thumbnail?: string };
        if (data.thumbnail) handler?.(track.id, data.thumbnail);
      }
    } catch {}
  }
  running = false;
}
