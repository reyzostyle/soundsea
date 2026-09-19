// SoundSea service worker: the app opens and saved tracks play without a connection
// (a basement gym is the whole point).
//
// - App shell: the page is network-first with the last copy as fallback; Next's
//   hashed static files are cache-first, since a hash never changes content.
// - Audio: the page asks for tracks to be saved ("sync"); each is fetched whole and
//   kept under its plain /api/audio/<file>.mp3 URL. Playback requests (which carry a
//   Range header, and may carry ?fade=&gap=) are answered from that copy with a
//   proper 206 slice, so seeking works offline too. Offline, a fade/gap variant falls
//   back to the plain file.

const SHELL = "soundsea-shell-v1";
const AUDIO = "soundsea-audio-v1";
const AUDIO_PATH = /\/api\/audio\/[a-f0-9]{16}\.mp3$/;

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(SHELL).then((c) => c.add("/")).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) {
        if (key !== SHELL && key !== AUDIO) await caches.delete(key);
      }
      await self.clients.claim();
    })()
  );
});

const plainAudioUrl = (url) => url.origin + url.pathname;

async function cachedAudio(url) {
  const cache = await caches.open(AUDIO);
  return (await cache.match(url.href)) || (await cache.match(plainAudioUrl(url)));
}

// Answer a (possibly ranged) media request from a whole cached file.
async function rangeResponse(cached, rangeHeader) {
  const blob = await cached.blob();
  const size = blob.size;
  const headers = { "Content-Type": "audio/mpeg", "Accept-Ranges": "bytes" };
  const m = rangeHeader && /bytes=(\d*)-(\d*)/.exec(rangeHeader);
  if (!m) return new Response(blob, { status: 200, headers: { ...headers, "Content-Length": String(size) } });
  let start = m[1] === "" ? size - Number(m[2]) : Number(m[1]);
  let end = m[1] !== "" && m[2] !== "" ? Number(m[2]) : size - 1;
  start = Math.max(0, start);
  end = Math.min(end, size - 1);
  if (start > end) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
  return new Response(blob.slice(start, end + 1), {
    status: 206,
    headers: { ...headers, "Content-Length": String(end - start + 1), "Content-Range": `bytes ${start}-${end}/${size}` },
  });
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  if (AUDIO_PATH.test(url.pathname) && !url.searchParams.has("download")) {
    event.respondWith(
      (async () => {
        const cached = await cachedAudio(url);
        if (cached) return rangeResponse(cached, req.headers.get("range"));
        return fetch(req);
      })()
    );
    return;
  }

  if (url.origin !== self.location.origin) return;

  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(req);
          if (res.ok) (await caches.open(SHELL)).put("/", res.clone());
          return res;
        } catch {
          return (await caches.match("/")) || Response.error();
        }
      })()
    );
    return;
  }

  if (url.pathname.startsWith("/_next/static/") || /\.(png|svg|ico|woff2?)$/.test(url.pathname)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(SHELL);
        const hit = await cache.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      })()
    );
  }
});

// ---- messages from the page ----

async function broadcast(msg) {
  for (const client of await self.clients.matchAll()) client.postMessage(msg);
}

async function savedUrls() {
  const cache = await caches.open(AUDIO);
  return (await cache.keys()).map((r) => r.url);
}

let syncing = null;

// Make the saved set match `urls`: fetch what's missing, drop what's no longer wanted.
async function sync(urls) {
  const cache = await caches.open(AUDIO);
  const wanted = new Set(urls);
  for (const key of await cache.keys()) if (!wanted.has(key.url)) await cache.delete(key);
  const have = new Set(await savedUrls());
  const missing = urls.filter((u) => !have.has(u));
  let done = urls.length - missing.length;
  await broadcast({ type: "progress", done, total: urls.length });
  for (const u of missing) {
    try {
      const res = await fetch(u, { mode: "cors" });
      if (res.status === 200) await cache.put(u, res);
    } catch {
      // offline or gone: it'll be picked up on the next sync
    }
    done += 1;
    await broadcast({ type: "progress", done, total: urls.length });
  }
  await broadcast({ type: "saved", urls: await savedUrls() });
}

self.addEventListener("message", (event) => {
  const msg = event.data || {};
  if (msg.type === "sync" && Array.isArray(msg.urls)) {
    // one sync at a time; a newer request runs after the current one finishes
    const run = () => sync(msg.urls);
    syncing = (syncing || Promise.resolve()).then(run, run);
    event.waitUntil(syncing);
  } else if (msg.type === "status") {
    event.waitUntil(savedUrls().then((urls) => broadcast({ type: "saved", urls })));
  } else if (msg.type === "clear") {
    event.waitUntil(caches.delete(AUDIO).then(() => broadcast({ type: "saved", urls: [] })));
  } else if (msg.type === "shell" && Array.isArray(msg.urls)) {
    // assets the page loaded before this worker took control
    event.waitUntil(
      caches.open(SHELL).then((c) =>
        Promise.all(msg.urls.map((u) => c.match(u).then((hit) => hit || c.add(u).catch(() => {}))))
      )
    );
  }
});
