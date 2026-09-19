"use client";

import { useCallback, useEffect, useState } from "react";
import { audioUrl } from "./api";
import { Track } from "./types";

// Page side of offline mode (public/sw.js does the caching). When "keep offline" is
// on, the library's audio files are saved on the device and kept in step with the
// library: new downloads, studio edits and Discover adds get saved, deleted tracks
// get dropped. Saved files are the plain originals; a fade/gap set in Settings needs
// the server, so offline those play without it.

const ENABLED_KEY = "mp.offline";

export type OfflineState = {
  /** this browser can do it (service workers) */
  supported: boolean;
  enabled: boolean;
  online: boolean;
  /** plain audio URLs saved on this device */
  saved: Set<string>;
  progress: { done: number; total: number } | null;
  usageBytes: number | null;
  setEnabled: (on: boolean) => void;
};

async function post(msg: unknown) {
  const reg = await navigator.serviceWorker.ready;
  reg.active?.postMessage(msg);
}

export function useOffline(tracks: Track[], hydrated: boolean): OfflineState {
  const [supported, setSupported] = useState(false);
  const [enabled, setEnabledState] = useState(false);
  const [online, setOnline] = useState(true);
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [usageBytes, setUsageBytes] = useState<number | null>(null);

  // register the worker (production only: it would fight Next's dev reloads)
  useEffect(() => {
    if (!("serviceWorker" in navigator) || process.env.NODE_ENV !== "production") return;
    setSupported(true);
    try {
      setEnabledState(localStorage.getItem(ENABLED_KEY) === "1");
    } catch {}
    setOnline(navigator.onLine);

    navigator.serviceWorker.register("/sw.js").catch(() => setSupported(false));

    const onMessage = (e: MessageEvent) => {
      const msg = e.data || {};
      if (msg.type === "progress") setProgress(msg.done >= msg.total ? null : { done: msg.done, total: msg.total });
      if (msg.type === "saved") {
        setSaved(new Set(msg.urls as string[]));
        navigator.storage?.estimate?.().then((est) => setUsageBytes(est.usage ?? null)).catch(() => {});
      }
    };
    navigator.serviceWorker.addEventListener("message", onMessage);

    // hand over what this page already loaded, so the shell opens offline next time
    navigator.serviceWorker.ready.then((reg) => {
      const urls = performance
        .getEntriesByType("resource")
        .map((e) => e.name)
        .filter((u) => u.startsWith(location.origin) && /\/_next\/static\//.test(u));
      reg.active?.postMessage({ type: "shell", urls });
      reg.active?.postMessage({ type: "status" });
    });

    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => {
      navigator.serviceWorker.removeEventListener("message", onMessage);
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, []);

  const urlsKey = tracks.map((t) => t.filename).sort().join(",");

  // keep the saved set matching the library whenever it (or the connection) changes
  useEffect(() => {
    if (!supported || !enabled || !hydrated || !online) return;
    const urls = Array.from(new Set(tracks.map((t) => audioUrl(t.filename))));
    post({ type: "sync", urls }).catch(() => {});
    // urlsKey stands in for `tracks`: only the set of files matters here
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supported, enabled, hydrated, online, urlsKey]);

  const setEnabled = useCallback((on: boolean) => {
    setEnabledState(on);
    try {
      localStorage.setItem(ENABLED_KEY, on ? "1" : "0");
    } catch {}
    // ask the browser not to evict the saved files under storage pressure
    if (on) navigator.storage?.persist?.().catch(() => {});
    if (!on) {
      setProgress(null);
      post({ type: "clear" }).catch(() => {});
    }
  }, []);

  return { supported, enabled, online, saved, progress, usageBytes, setEnabled };
}
