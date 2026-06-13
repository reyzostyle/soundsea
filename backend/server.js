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

  if (fs.existsSync(COOKIES_FILE)) {
    // datacenter IP is flagged: cookies pass the bot check, and the "tv"
    // client avoids the SABR-only streaming that skips web_safari formats
    args.push("--cookies", COOKIES_FILE, "--extractor-args", "youtube:player_client=tv");
  }

  args.push(url);

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

  proc.on("close", (code) => {
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

    res.json({
      title: meta.title || "Unknown title",
      filename,
      duration: typeof meta.duration === "number" ? meta.duration : null,
      thumbnail: typeof meta.thumbnail === "string" ? meta.thumbnail : null,
    });
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
  res.json({ ok: true, cookiesFile: fs.existsSync(COOKIES_FILE), potProvider });
});

app.get("/api/audio/:filename", (req, res) => {
  const { filename } = req.params;
  // filenames are always <16 hex chars>.mp3, generated server-side
  if (!/^[a-f0-9]{16}\.mp3$/.test(filename)) {
    return res.status(400).json({ error: "Invalid filename." });
  }
  const filePath = path.join(DOWNLOADS_DIR, filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "File not found." });
  }
  // sendFile supports Range requests, which makes the player seekable
  res.sendFile(filePath);
});

app.listen(PORT, () => {
  console.log(`Music player backend listening on http://localhost:${PORT}`);
});
