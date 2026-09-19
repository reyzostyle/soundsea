const express = require("express");
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const PORT = process.env.PORT || 4000;
const DOWNLOADS_DIR = path.join(__dirname, "public", "downloads");
const DOWNLOAD_TIMEOUT_MS = 10 * 60 * 1000;
const COOKIES_FILE = path.join("/tmp", "yt-cookies.txt");

fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });

// Write YouTube cookies from env var to a temp file so yt-dlp can use them
if (process.env.YOUTUBE_COOKIES) {
  try {
    fs.writeFileSync(COOKIES_FILE, process.env.YOUTUBE_COOKIES, "utf8");
    console.log("YouTube cookies loaded from env.");
  } catch (e) {
    console.warn("Failed to write cookies file:", e.message);
  }
}

const app = express();
app.use(express.json());

// CORS for the Next.js dev server
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

const ALLOWED_HOSTS = [/(^|\.)youtube\.com$/i, /^youtu\.be$/i, /(^|\.)tiktok\.com$/i];

function validateUrl(raw) {
  if (typeof raw !== "string") return null;
  let url;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  if (!ALLOWED_HOSTS.some((re) => re.test(url.hostname))) return null;
  return url.toString();
}

const TIKTOK_MUSIC_HINT =
  "This is a TikTok music link. Open a video that uses this sound (for example the first one on the music page) and paste that video's link instead.";

const isTikTokHost = (hostname) => /(^|\.)tiktok\.com$/i.test(hostname);

// TikTok share links (vm.tiktok.com, /t/...) are short redirects, so follow them to
// tell a music/sound page apart from a normal video before handing off to yt-dlp.
async function resolveFinalUrl(url) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const r = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    clearTimeout(timer);
    return r.url || url;
  } catch {
    return url;
  }
}

function isTikTokMusicUrl(finalUrl) {
  try {
    const u = new URL(finalUrl);
    return isTikTokHost(u.hostname) && /\/music\//i.test(u.pathname);
  } catch {
    return false;
  }
}

// TikTok thumbnail links are signed and expire after a few days, so a stored URL
// turns into a broken image. Fetch the picture once, center-crop it to a small
// square JPEG with ffmpeg and hand back a data URL the client can keep forever.
// Falls back to null (the caller keeps the original URL) if anything goes wrong.
async function thumbnailToDataUrl(src) {
  if (typeof src !== "string" || !/^https?:\/\//i.test(src)) return null;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const r = await fetch(src, { signal: controller.signal, headers: { "User-Agent": "Mozilla/5.0" } });
    clearTimeout(timer);
    if (!r.ok) return null;
    const input = Buffer.from(await r.arrayBuffer());

    const jpeg = await new Promise((resolve) => {
      const ff = spawn("ffmpeg", [
        "-loglevel", "error",
        "-i", "pipe:0",
        "-vf", "crop='min(iw,ih)':'min(iw,ih)',scale=256:256",
        "-frames:v", "1",
        "-q:v", "4",
        "-f", "image2", "-c:v", "mjpeg",
        "pipe:1",
      ]);
      const chunks = [];
      const kill = setTimeout(() => ff.kill("SIGKILL"), 10000);
      ff.stdout.on("data", (c) => chunks.push(c));
      ff.on("error", () => resolve(null));
      ff.on("close", (code) => {
        clearTimeout(kill);
        resolve(code === 0 && chunks.length ? Buffer.concat(chunks) : null);
      });
      ff.stdin.on("error", () => {});
      ff.stdin.end(input);
    });
    return jpeg ? `data:image/jpeg;base64,${jpeg.toString("base64")}` : null;
  } catch {
    return null;
  }
}

function cookieArgs() {
  // datacenter IP is flagged: cookies pass the bot check, and the "tv"
  // client avoids the SABR-only streaming that skips web_safari formats
  return fs.existsSync(COOKIES_FILE)
    ? ["--cookies", COOKIES_FILE, "--extractor-args", "youtube:player_client=tv"]
    : [];
}

app.post("/api/download", async (req, res) => {
  const url = validateUrl(req.body && req.body.url);
  if (!url) {
    return res.status(400).json({ error: "Please provide a valid YouTube or TikTok URL." });
  }

  // A TikTok music/sound page is a catalog of videos, not a single audio file. Resolve
  // share-link redirects and stop those early with a clear hint to use a video link.
  if (isTikTokHost(new URL(url).hostname) && isTikTokMusicUrl(await resolveFinalUrl(url))) {
    return res.status(400).json({ error: TIKTOK_MUSIC_HINT });
  }

  const id = crypto.randomBytes(8).toString("hex");
  const args = [
    "-x",
    "--audio-format", "mp3",
    "--audio-quality", "0",
    "--format", "bestaudio/best",
    "--no-playlist",
    // normalize loudness to -14 LUFS (the Spotify/YouTube standard) so tracks
    // don't jump in volume between each other
    "--postprocessor-args", "ffmpeg:-af loudnorm=I=-14:TP=-1.5:LRA=11",
    // download the EJS solver scripts so deno can solve the "n" signature
    // challenge — without it YouTube format URLs stay encrypted and only
    // thumbnail images are returned
    "--remote-components", "ejs:github",
    "-j",
    "--no-simulate",
    "-o", path.join(DOWNLOADS_DIR, `${id}.%(ext)s`),
  ];

  args.push(...cookieArgs(), url);

  const proc = spawn("yt-dlp", args);
  let stdout = "";
  let stderr = "";
  proc.stdout.on("data", (chunk) => (stdout += chunk));
  proc.stderr.on("data", (chunk) => (stderr += chunk));

  const timer = setTimeout(() => proc.kill("SIGKILL"), DOWNLOAD_TIMEOUT_MS);

  proc.on("error", (err) => {
    clearTimeout(timer);
    if (!res.headersSent) {
      res.status(500).json({ error: `Failed to run yt-dlp: ${err.message}` });
    }
  });

  proc.on("close", async (code) => {
    clearTimeout(timer);
    if (res.headersSent) return;

    const filename = `${id}.mp3`;
    const filePath = path.join(DOWNLOADS_DIR, filename);
    if (code !== 0 || !fs.existsSync(filePath)) {
      // full yt-dlp output in server logs for debugging
      console.error(`yt-dlp failed (code ${code}) for ${url}\n${stderr}`);

      // Fallback for a TikTok music/sound link the redirect check above missed (for
      // example if the redirect lookup timed out): yt-dlp's sound extractor fails with
      // "No working app info", so point the user at a video link.
      if (isTikTokHost(new URL(url).hostname) && /No working app info is available/i.test(stderr)) {
        return res.status(400).json({ error: TIKTOK_MUSIC_HINT });
      }

      const lines = stderr.trim().split("\n").filter(Boolean);
      const message =
        lines.filter((l) => l.includes("ERROR")).pop() ||
        lines.pop() ||
        "yt-dlp failed to download this URL.";
      return res.status(500).json({ error: message });
    }

    let meta = {};
    try {
      const jsonLine = stdout.split("\n").find((l) => l.trim().startsWith("{"));
      if (jsonLine) meta = JSON.parse(jsonLine);
    } catch {
      // metadata is best-effort; the file downloaded fine
    }

    const rawThumb = typeof meta.thumbnail === "string" ? meta.thumbnail : null;
    res.json({
      title: meta.title || "Unknown title",
      filename,
      duration: typeof meta.duration === "number" ? meta.duration : null,
      thumbnail: (await thumbnailToDataUrl(rawThumb)) || rawThumb,
    });
  });
});

// Re-fetch the cover for a track whose stored thumbnail no longer loads (tracks saved
// before covers were inlined still point at expired TikTok links). Metadata only, no
// audio download.
app.post("/api/thumbnail", (req, res) => {
  const url = validateUrl(req.body && req.body.url);
  if (!url) return res.status(400).json({ error: "Invalid URL." });

  const proc = spawn("yt-dlp", ["-j", "--skip-download", "--no-playlist", ...cookieArgs(), url]);
  let stdout = "";
  proc.stdout.on("data", (chunk) => (stdout += chunk));
  const timer = setTimeout(() => proc.kill("SIGKILL"), 60 * 1000);
  proc.on("error", () => {
    clearTimeout(timer);
    if (!res.headersSent) res.status(500).json({ error: "yt-dlp unavailable." });
  });
  proc.on("close", async () => {
    clearTimeout(timer);
    if (res.headersSent) return;
    let meta = {};
    try {
      const jsonLine = stdout.split("\n").find((l) => l.trim().startsWith("{"));
      if (jsonLine) meta = JSON.parse(jsonLine);
    } catch {}
    const thumbnail = await thumbnailToDataUrl(meta.thumbnail);
    if (!thumbnail) return res.status(404).json({ error: "No thumbnail found." });
    res.json({ thumbnail });
  });
});

// Studio: render an edited copy of a track. The original file is never touched; the
// result is a new mp3 the client saves as a new track. Speed works like the "sped up"
// and "slowed" edits people actually listen to: resampled, so pitch moves with tempo.
const clamp = (v, min, max, fallback) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

function probeDuration(filePath) {
  return new Promise((resolve) => {
    const p = spawn("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", filePath]);
    let out = "";
    p.stdout.on("data", (c) => (out += c));
    p.on("error", () => resolve(null));
    p.on("close", () => {
      const d = parseFloat(out);
      resolve(Number.isFinite(d) ? d : null);
    });
  });
}

app.post("/api/render", async (req, res) => {
  const body = req.body || {};
  const source = typeof body.filename === "string" ? body.filename : "";
  if (!/^[a-f0-9]{16}\.mp3$/.test(source)) return res.status(400).json({ error: "Invalid filename." });
  const sourcePath = path.join(DOWNLOADS_DIR, source);
  if (!fs.existsSync(sourcePath)) return res.status(404).json({ error: "Original file not found." });

  const total = await probeDuration(sourcePath);
  if (!total) return res.status(500).json({ error: "Could not read the original file." });

  const start = clamp(body.start, 0, total, 0);
  const end = clamp(body.end, start + 0.5, total, total);
  const speed = clamp(body.speed, 0.5, 1.5, 1);
  const bass = clamp(body.bass, 0, 15, 0);
  const reverb = clamp(body.reverb, 0, 1, 0);
  const outLen = (end - start) / speed;
  const fadeIn = clamp(body.fadeIn, 0, outLen / 2, 0);
  const fadeOut = clamp(body.fadeOut, 0, outLen / 2, 0);

  // everything becomes 44.1k stereo first so asetrate means the same thing for every file
  let chain = `[0:a]aformat=sample_rates=44100:channel_layouts=stereo`;
  if (speed !== 1) chain += `,asetrate=${Math.round(44100 * speed)},aresample=44100`;
  if (bass > 0) chain += `,bass=g=${bass.toFixed(1)}:f=100:w=0.6`;
  chain += "[s]";
  let last = "s";
  const inputs = ["-ss", start.toFixed(3), "-to", end.toFixed(3), "-i", sourcePath];
  if (reverb > 0) {
    // impulse response: 2.5s of exponentially decaying noise, the same shape the
    // browser preview builds for its ConvolverNode
    inputs.push("-f", "lavfi", "-i", "anoisesrc=d=2.5:c=white:a=0.5:r=44100,afade=t=out:d=2.5:curve=exp,aformat=channel_layouts=stereo");
    chain += `;[s][1:a]afir=dry=${(1 - reverb * 0.35).toFixed(2)}:wet=${(reverb * 0.5).toFixed(2)}[r]`;
    last = "r";
  }
  const tail = [];
  // a hair of fade-in always, so a trim that starts mid-waveform doesn't click
  tail.push(`afade=t=in:d=${Math.max(fadeIn, 0.02).toFixed(3)}`);
  if (fadeOut > 0) tail.push(`afade=t=out:st=${(outLen - fadeOut).toFixed(3)}:d=${fadeOut.toFixed(3)}`);
  tail.push("alimiter=limit=0.95");
  chain += `;[${last}]${tail.join(",")}[o]`;

  const id = crypto.randomBytes(8).toString("hex");
  const filename = `${id}.mp3`;
  const outPath = path.join(DOWNLOADS_DIR, filename);
  const ff = spawn("ffmpeg", [
    "-v", "error", "-y", ...inputs,
    "-filter_complex", chain, "-map", "[o]",
    "-c:a", "libmp3lame", "-q:a", "2", outPath,
  ]);
  let stderr = "";
  ff.stderr.on("data", (c) => (stderr += c));
  const timer = setTimeout(() => ff.kill("SIGKILL"), 2 * 60 * 1000);
  ff.on("error", () => {
    clearTimeout(timer);
    if (!res.headersSent) res.status(500).json({ error: "ffmpeg unavailable." });
  });
  ff.on("close", async (code) => {
    clearTimeout(timer);
    if (res.headersSent) return;
    if (code !== 0 || !fs.existsSync(outPath)) {
      console.error(`render failed (code ${code}) for ${source}\n${stderr}`);
      return res.status(500).json({ error: "Rendering failed." });
    }
    res.json({ filename, duration: (await probeDuration(outPath)) ?? outLen });
  });
});

// Lightweight health check: is the PO token provider reachable?
app.get("/api/health", async (req, res) => {
  let potProvider;
  try {
    const r = await fetch("http://127.0.0.1:4416/ping");
    potProvider = await r.json();
  } catch (e) {
    potProvider = `unreachable: ${e.message}`;
  }
  // how many audio files the disk holds and how old the oldest is: tells at a glance
  // whether downloads survive a redeploy (a volume) or vanish with each container
  let files = 0;
  let oldestDays = null;
  try {
    const names = fs.readdirSync(DOWNLOADS_DIR).filter((n) => n.endsWith(".mp3"));
    files = names.length;
    const oldest = Math.min(...names.map((n) => fs.statSync(path.join(DOWNLOADS_DIR, n)).mtimeMs));
    if (Number.isFinite(oldest)) oldestDays = Math.round((Date.now() - oldest) / 86400000);
  } catch {}
  res.json({ ok: true, cookiesFile: fs.existsSync(COOKIES_FILE), potProvider, files, oldestDays });
});

// Playback variants: the same track faded in and out and/or followed by silence, for
// the "fade" and "gap between tracks" settings. Baked into a file rather than
// done in the browser because iOS Safari ignores audio.volume and throttles timers
// on a locked screen, so a client-side fade or pause would silently not happen there.
// Cached on disk; variants nobody played for 30 days are swept.
const VARIANTS_DIR = path.join(DOWNLOADS_DIR, "variants");
fs.mkdirSync(VARIANTS_DIR, { recursive: true });
const rendering = new Map();

function sweepVariants() {
  const cutoff = Date.now() - 30 * 86400000;
  try {
    for (const name of fs.readdirSync(VARIANTS_DIR)) {
      const p = path.join(VARIANTS_DIR, name);
      if (fs.statSync(p).atimeMs < cutoff && fs.statSync(p).mtimeMs < cutoff) fs.unlinkSync(p);
    }
  } catch {}
}
sweepVariants();
setInterval(sweepVariants, 86400000).unref();

// half-second steps, 0–10s: keeps the number of cached variants small
const step = (v) => Math.round(clamp(v, 0, 10, 0) * 2) / 2;

async function variantPath(filename, fade, gap) {
  const id = filename.slice(0, 16);
  // v2: variants made before the fade-in was added must not be served as-is.
  // The old files simply go unused and the 30-day sweep collects them.
  const out = path.join(VARIANTS_DIR, `${id}.f${fade}.g${gap}.v2.mp3`);
  if (fs.existsSync(out)) {
    fs.utimes(out, new Date(), new Date(), () => {});
    return out;
  }
  if (rendering.has(out)) return rendering.get(out);

  const job = (async () => {
    const src = path.join(DOWNLOADS_DIR, filename);
    const total = await probeDuration(src);
    if (!total) return null;
    const filters = [];
    // the same length at both ends: the track fades in as the one before it fades
    // out, which is the crossfade shape the Settings screen draws
    const f = Math.min(fade, total / 2);
    if (f > 0) {
      filters.push(`afade=t=in:d=${f.toFixed(3)}`);
      filters.push(`afade=t=out:st=${(total - f).toFixed(3)}:d=${f.toFixed(3)}`);
    }
    if (gap > 0) filters.push(`apad=pad_dur=${gap}`);
    const tmp = `${out}.${crypto.randomBytes(4).toString("hex")}.tmp.mp3`;
    const ok = await new Promise((resolve) => {
      const ff = spawn("ffmpeg", ["-v", "error", "-y", "-i", src, "-af", filters.join(","), "-c:a", "libmp3lame", "-q:a", "2", tmp]);
      const kill = setTimeout(() => ff.kill("SIGKILL"), 2 * 60 * 1000);
      ff.on("error", () => resolve(false));
      ff.on("close", (code) => {
        clearTimeout(kill);
        resolve(code === 0);
      });
    });
    if (!ok || !fs.existsSync(tmp)) {
      fs.rm(tmp, () => {});
      return null;
    }
    fs.renameSync(tmp, out); // atomic: a half-written variant is never served
    return out;
  })();
  rendering.set(out, job);
  try {
    return await job;
  } finally {
    rendering.delete(out);
  }
}

app.get("/api/audio/:filename", async (req, res) => {
  const { filename } = req.params;
  // filenames are always <16 hex chars>.mp3, generated server-side
  if (!/^[a-f0-9]{16}\.mp3$/.test(filename)) {
    return res.status(400).json({ error: "Invalid filename." });
  }
  const filePath = path.join(DOWNLOADS_DIR, filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "File not found." });
  }
  if (typeof req.query.download === "string") {
    // RFC 5987: ASCII fallback plus a UTF-8 filename* so non-Latin titles
    // (Cyrillic etc.) still show up correctly in the saved file's name
    const raw = req.query.download.replace(/[\r\n]/g, "").trim().slice(0, 150) || "track";
    const ascii = raw.replace(/[^\x20-\x7E]/g, "_").replace(/["\\]/g, "_").trim() || "track";
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${ascii}.mp3"; filename*=UTF-8''${encodeURIComponent(raw)}.mp3`
    );
    return res.sendFile(filePath);
  }

  const fade = step(req.query.fade);
  const gap = step(req.query.gap);
  let servePath = filePath;
  if (fade > 0 || gap > 0) {
    // if the variant can't be made, the plain file still plays
    servePath = (await variantPath(filename, fade, gap)) || filePath;
  }
  // sendFile supports Range requests, which makes the player seekable
  res.sendFile(servePath);
});

app.listen(PORT, () => {
  console.log(`Music player backend listening on http://localhost:${PORT}`);
});
