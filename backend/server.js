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

app.post("/api/download", (req, res) => {
  const url = validateUrl(req.body && req.body.url);
  if (!url) {
    return res.status(400).json({ error: "Please provide a valid YouTube or TikTok URL." });
  }

  const id = crypto.randomBytes(8).toString("hex");
  const args = [
    "-x",
    "--audio-format", "mp3",
    "--audio-quality", "0",
    "--format", "bestaudio/best",
    "--no-playlist",
    "-j",
    "--no-simulate",
    "-o", path.join(DOWNLOADS_DIR, `${id}.%(ext)s`),
  ];

  if (fs.existsSync(COOKIES_FILE)) {
    args.push("--cookies", COOKIES_FILE);
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
