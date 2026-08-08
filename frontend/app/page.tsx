"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Playlist, RepeatMode, Track } from "@/lib/types";
import { loadPlaylists, loadTracks, savePlaylists, saveTracks } from "@/lib/storage";
import { API_BASE, audioUrl } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { squareCoverUrl } from "@/lib/image";
import { useAuth } from "@/contexts/AuthContext";
import {
  cloudAddToPlaylist,
  cloudCreatePlaylist,
  cloudDeletePlaylist,
  cloudDeleteTrack,
  cloudRemoveFromPlaylist,
  cloudRenamePlaylist,
  cloudReorderPlaylist,
  cloudUpdatePlaylistThumbnail,
  cloudUpsertTrack,
  fetchLibrary,
  migrateLocalToCloud,
} from "@/lib/cloud";
import DownloadForm from "@/components/DownloadForm";
import Sidebar from "@/components/Sidebar";
import TrackList from "@/components/TrackList";
import PlayerBar from "@/components/PlayerBar";
import SettingsPanel from "@/components/SettingsPanel";
import TrackEditModal from "@/components/TrackEditModal";
import PlaylistHeader from "@/components/PlaylistHeader";
import { MenuIcon } from "@/components/Icons";

export default function Home() {
  const { user } = useAuth();
  const [hydrated, setHydrated] = useState(false);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  // "library" or a playlist id; `view` is what's on screen, `queueSource` is what's playing
  const [view, setView] = useState<string>("library");
  const [queueSource, setQueueSource] = useState<string>("library");
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [repeat, setRepeat] = useState<RepeatMode>("off");
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [editingTrackId, setEditingTrackId] = useState<string | null>(null);
  const [shuffle, setShuffle] = useState(false);
  const [volume, setVolume] = useState(1);

  const audioRef = useRef<HTMLAudioElement>(null);
  // When restoring a previous session, holds the position to seek to (stay paused).
  const pendingRestoreRef = useRef<number | null>(null);
  const restoredRef = useRef(false);
  const lastSaveRef = useRef(0);

  useEffect(() => {
    setTracks(loadTracks());
    setPlaylists(loadPlaylists());
    try {
      const v = parseFloat(localStorage.getItem("mp.volume") ?? "");
      if (!Number.isNaN(v)) setVolume(Math.min(1, Math.max(0, v)));
    } catch {}
    setHydrated(true);
  }, []);

  // keep the audio element's volume in sync and remember it
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
    try {
      localStorage.setItem("mp.volume", String(volume));
    } catch {}
  }, [volume]);
  useEffect(() => {
    if (hydrated) saveTracks(tracks);
  }, [tracks, hydrated]);
  useEffect(() => {
    if (hydrated) savePlaylists(playlists);
  }, [playlists, hydrated]);

  // Remember what was playing so a suspended/killed tab (e.g. iOS locking the phone
  // while paused) picks up right where it left off on the next visit.
  const savePlayback = useCallback(
    (pos: number) => {
      if (!currentId) return;
      try {
        localStorage.setItem("mp.playback", JSON.stringify({ trackId: currentId, source: queueSource, position: pos }));
      } catch {}
    },
    [currentId, queueSource]
  );

  useEffect(() => {
    if (!hydrated || restoredRef.current) return;
    restoredRef.current = true;
    try {
      const raw = localStorage.getItem("mp.playback");
      if (!raw) return;
      const saved = JSON.parse(raw) as { trackId?: string; source?: string; position?: number };
      if (!saved.trackId || !tracks.some((t) => t.id === saved.trackId)) return;
      pendingRestoreRef.current = typeof saved.position === "number" ? saved.position : 0;
      if (saved.source) setQueueSource(saved.source);
      setCurrentId(saved.trackId);
      setIsPlaying(false);
    } catch {}
  }, [hydrated, tracks]);

  // When signed in, the account is the source of truth: load the cloud library, and
  // on an empty account push up whatever was stored locally so it gets saved. Signing
  // out falls back to the local library. (No-op when Supabase isn't configured.)
  useEffect(() => {
    if (!hydrated || !supabase) return;
    let cancelled = false;
    (async () => {
      if (user) {
        const cloud = await fetchLibrary(user.id);
        if (cancelled) return;
        if (cloud.tracks.length === 0 && cloud.playlists.length === 0) {
          const localTracks = loadTracks();
          const localPlaylists = loadPlaylists();
          if (localTracks.length || localPlaylists.length) {
            await migrateLocalToCloud(user.id, localTracks, localPlaylists);
            if (cancelled) return;
            setTracks(localTracks);
            setPlaylists(localPlaylists);
          } else {
            setTracks([]);
            setPlaylists([]);
          }
        } else {
          setTracks(cloud.tracks);
          // keep the locally saved playlist order (the DB has no position column)
          const localOrder = loadPlaylists().map((p) => p.id);
          const sorted = [...cloud.playlists].sort((a, b) => {
            const ia = localOrder.indexOf(a.id);
            const ib = localOrder.indexOf(b.id);
            if (ia === -1 && ib === -1) return 0;
            if (ia === -1) return 1;
            if (ib === -1) return -1;
            return ia - ib;
          });
          setPlaylists(sorted);
        }
      } else {
        setTracks(loadTracks());
        setPlaylists(loadPlaylists());
      }
    })().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [user, hydrated]);

  const trackById = useMemo(() => new Map(tracks.map((t) => [t.id, t])), [tracks]);
  const currentTrack = currentId ? (trackById.get(currentId) ?? null) : null;

  const tracksFor = useCallback(
    (source: string): Track[] => {
      if (source === "library") return tracks;
      const pl = playlists.find((p) => p.id === source);
      if (!pl) return [];
      return pl.trackIds.map((id) => trackById.get(id)).filter((t): t is Track => !!t);
    },
    [tracks, playlists, trackById]
  );

  const queue = useMemo(() => tracksFor(queueSource), [tracksFor, queueSource]);
  const viewTracks = useMemo(() => tracksFor(view), [tracksFor, view]);
  const viewPlaylist = view === "library" ? null : (playlists.find((p) => p.id === view) ?? null);

  // --- playback ---

  const playTrack = useCallback(
    (id: string, source?: string) => {
      // an explicit play cancels any pending session restore
      const restoring = pendingRestoreRef.current !== null;
      pendingRestoreRef.current = null;
      if (source) setQueueSource(source);
      if (id === currentId) {
        const a = audioRef.current;
        if (a) {
          if (!restoring) a.currentTime = 0;
          a.play().catch(() => {});
        }
        return;
      }
      setCurrentId(id);
      setIsPlaying(true);
    },
    [currentId]
  );

  // The <audio> src follows currentTrack; start playback whenever the track changes
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    if (!currentId) {
      a.pause();
      setPosition(0);
      setDuration(0);
      return;
    }
    if (pendingRestoreRef.current !== null) {
      // restored from a previous session: show the saved position, stay paused
      setPosition(pendingRestoreRef.current);
      setDuration(0);
      return;
    }
    setPosition(0);
    setDuration(0);
    a.play().catch(() => setIsPlaying(false));
  }, [currentId]);

  const togglePlay = useCallback(() => {
    const a = audioRef.current;
    if (!a || !currentTrack) return;
    if (a.paused) a.play().catch(() => {});
    else a.pause();
  }, [currentTrack]);

  const goNext = useCallback(
    (auto = false) => {
      if (!queue.length) return;
      const idx = queue.findIndex((t) => t.id === currentId);
      if (shuffle && queue.length > 1) {
        let r = idx;
        while (r === idx) r = Math.floor(Math.random() * queue.length);
        playTrack(queue[r].id);
        return;
      }
      if (idx === -1) {
        playTrack(queue[0].id);
        return;
      }
      if (idx === queue.length - 1) {
        // end of queue: wrap on manual skip or when repeating the playlist
        if (!auto || repeat === "all") playTrack(queue[0].id);
        else setIsPlaying(false);
      } else {
        playTrack(queue[idx + 1].id);
      }
    },
    [queue, currentId, repeat, playTrack, shuffle]
  );

  const playPlaylist = (playlistId: string) => {
    const list = tracksFor(playlistId);
    if (!list.length) return;
    setShuffle(false);
    playTrack(list[0].id, playlistId);
  };

  const shufflePlaylist = (playlistId: string) => {
    const list = tracksFor(playlistId);
    if (!list.length) return;
    setShuffle(true);
    playTrack(list[Math.floor(Math.random() * list.length)].id, playlistId);
  };

  const sharePlaylist = async (playlist: Playlist) => {
    const url = window.location.origin;
    try {
      if (navigator.share) {
        await navigator.share({ title: playlist.name, text: `My playlist "${playlist.name}" on SoundSea`, url });
      } else {
        await navigator.clipboard.writeText(url);
      }
    } catch {}
  };

  const goPrev = useCallback(() => {
    const a = audioRef.current;
    if (a && a.currentTime > 3) {
      a.currentTime = 0;
      return;
    }
    if (!queue.length) return;
    const idx = queue.findIndex((t) => t.id === currentId);
    playTrack(idx <= 0 ? queue[queue.length - 1].id : queue[idx - 1].id);
  }, [queue, currentId, playTrack]);

  const handleEnded = () => {
    const a = audioRef.current;
    if (repeat === "one" && a) {
      a.currentTime = 0;
      a.play().catch(() => {});
      return;
    }
    goNext(true);
  };

  const handleSeek = (seconds: number) => {
    const a = audioRef.current;
    if (!a) return;
    a.currentTime = seconds;
    setPosition(seconds);
  };

  const cycleRepeat = () => setRepeat((r) => (r === "off" ? "all" : r === "all" ? "one" : "off"));

  // --- lock-screen / headphone media controls ---
  // Register previoustrack/nexttrack so the lock screen shows track-skip buttons
  // (not the 10-second jumps); seekto keeps the progress bar scrubbable.
  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    const ms = navigator.mediaSession;
    if (!currentTrack) {
      ms.metadata = null;
      return;
    }
    ms.metadata = new MediaMetadata({
      title: currentTrack.title,
      artist: "SoundSea",
      artwork: currentTrack.thumbnail ? [{ src: currentTrack.thumbnail, sizes: "512x512" }] : [],
    });
    // swap in a square center-crop once ready, so the lock screen doesn't show
    // a 16:9 video frame with bars
    let artworkStale = false;
    if (currentTrack.thumbnail) {
      squareCoverUrl(currentTrack.thumbnail)
        .then((sq) => {
          if (artworkStale) return;
          ms.metadata = new MediaMetadata({
            title: currentTrack.title,
            artist: "SoundSea",
            artwork: [{ src: sq, sizes: "512x512", type: "image/jpeg" }],
          });
        })
        .catch(() => {});
    }
    ms.setActionHandler("play", () => togglePlay());
    ms.setActionHandler("pause", () => togglePlay());
    ms.setActionHandler("previoustrack", () => goPrev());
    ms.setActionHandler("nexttrack", () => goNext(false));
    ms.setActionHandler("seekto", (d) => {
      const a = audioRef.current;
      if (a && typeof d.seekTime === "number") {
        a.currentTime = d.seekTime;
        setPosition(d.seekTime);
      }
    });
    // explicitly clear the seek handlers so iOS prefers track skip buttons
    for (const action of ["seekbackward", "seekforward"] as const) {
      try {
        ms.setActionHandler(action, null);
      } catch {}
    }
    return () => {
      artworkStale = true;
      for (const action of ["play", "pause", "previoustrack", "nexttrack", "seekto"] as const) {
        try {
          ms.setActionHandler(action, null);
        } catch {}
      }
    };
  }, [currentTrack, togglePlay, goPrev, goNext]);

  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
  }, [isPlaying]);

  // Keyboard: Space / Enter toggle play-pause (ignored while typing in a field).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      // don't hijack typing or a focused button/link/select
      if (t && (["INPUT", "TEXTAREA", "BUTTON", "A", "SELECT"].includes(t.tagName) || t.isContentEditable)) return;
      if (e.code === "Space" || e.key === " " || e.key === "Enter") {
        if (!currentTrack) return;
        e.preventDefault();
        togglePlay();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePlay, currentTrack]);

  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    const ms = navigator.mediaSession;
    if (!ms.setPositionState || !currentTrack || !duration || !isFinite(duration)) return;
    try {
      ms.setPositionState({ duration, position: Math.min(position, duration), playbackRate: 1 });
    } catch {}
  }, [position, duration, currentTrack]);

  // --- download ---

  const handleDownload = useCallback(async (url: string): Promise<boolean> => {
    setDownloading(true);
    setDownloadError(null);
    try {
      const res = await fetch(`${API_BASE}/api/download`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      let data: { title?: string; filename?: string; duration?: number | null; thumbnail?: string | null; error?: string } | null = null;
      try {
        data = await res.json();
      } catch {}
      if (!res.ok || !data?.filename) {
        throw new Error(data?.error || `Download failed (${res.status})`);
      }
      const track: Track = {
        id: crypto.randomUUID(),
        title: data.title || "Unknown title",
        filename: data.filename,
        duration: data.duration ?? null,
        thumbnail: data.thumbnail ?? null,
        addedAt: Date.now(),
        sourceUrl: url,
      };
      setTracks((prev) => [track, ...prev]);
      if (user) cloudUpsertTrack(user.id, track).catch(() => {});
      return true;
    } catch (e) {
      setDownloadError(e instanceof Error ? e.message : "Download failed");
      return false;
    } finally {
      setDownloading(false);
    }
  }, [user]);

  // --- playlists ---

  const createPlaylist = (name: string) => {
    const pl: Playlist = { id: crypto.randomUUID(), name: name.trim() || "New playlist", trackIds: [] };
    setPlaylists((prev) => [...prev, pl]);
    setView(pl.id);
    if (user) cloudCreatePlaylist(user.id, pl).catch(() => {});
  };

  const renamePlaylist = (id: string, name: string) => {
    const trimmed = name.trim();
    setPlaylists((prev) => prev.map((p) => (p.id === id ? { ...p, name: trimmed || p.name } : p)));
    if (user && trimmed) cloudRenamePlaylist(id, trimmed).catch(() => {});
  };

  const deletePlaylist = (id: string) => {
    setPlaylists((prev) => prev.filter((p) => p.id !== id));
    if (view === id) setView("library");
    if (queueSource === id) setQueueSource("library");
    if (user) cloudDeletePlaylist(id).catch(() => {});
  };

  // Order lives in the local array (and is persisted by savePlaylists); the cloud
  // fetch below re-applies it since the DB itself has no playlist position column.
  const reorderPlaylists = (ids: string[]) => {
    setPlaylists((prev) => {
      const byId = new Map(prev.map((p) => [p.id, p]));
      const ordered = ids.map((id) => byId.get(id)).filter((p): p is Playlist => !!p);
      const missing = prev.filter((p) => !ids.includes(p.id));
      return [...ordered, ...missing];
    });
  };

  const updatePlaylist = (id: string, changes: { name: string; thumbnail: string | null }) => {
    setPlaylists((prev) =>
      prev.map((p) => (p.id === id ? { ...p, name: changes.name, thumbnail: changes.thumbnail } : p))
    );
    if (user) {
      if (changes.name) cloudRenamePlaylist(id, changes.name).catch(() => {});
      cloudUpdatePlaylistThumbnail(id, changes.thumbnail).catch(() => {});
    }
  };

  const addToPlaylist = (playlistId: string, trackId: string) => {
    const target = playlists.find((p) => p.id === playlistId);
    if (target?.trackIds.includes(trackId)) return; // already in the playlist
    setPlaylists((prev) =>
      prev.map((p) =>
        p.id === playlistId && !p.trackIds.includes(trackId) ? { ...p, trackIds: [...p.trackIds, trackId] } : p
      )
    );
    if (user) cloudAddToPlaylist(playlistId, trackId, target?.trackIds.length ?? 0).catch(() => {});
  };

  const removeFromPlaylist = (playlistId: string, trackId: string) => {
    setPlaylists((prev) =>
      prev.map((p) => (p.id === playlistId ? { ...p, trackIds: p.trackIds.filter((t) => t !== trackId) } : p))
    );
    if (user) cloudRemoveFromPlaylist(playlistId, trackId).catch(() => {});
  };

  const reorderPlaylistTracks = (playlistId: string, ids: string[]) => {
    setPlaylists((prev) => prev.map((p) => (p.id === playlistId ? { ...p, trackIds: ids } : p)));
    if (user) cloudReorderPlaylist(playlistId, ids).catch(() => {});
  };

  const updateTrack = (trackId: string, changes: { title: string; thumbnail: string | null }) => {
    let updated: Track | undefined;
    setTracks((prev) =>
      prev.map((t) => {
        if (t.id !== trackId) return t;
        updated = { ...t, ...changes };
        return updated;
      })
    );
    if (user && updated) cloudUpsertTrack(user.id, updated).catch(() => {});
  };

  const deleteTrack = (trackId: string) => {
    setTracks((prev) => prev.filter((t) => t.id !== trackId));
    setPlaylists((prev) => prev.map((p) => ({ ...p, trackIds: p.trackIds.filter((t) => t !== trackId) })));
    if (currentId === trackId) {
      setCurrentId(null);
      setIsPlaying(false);
    }
    // deleting the track row cascades to playlist_tracks in the DB
    if (user) cloudDeleteTrack(trackId).catch(() => {});
  };

  const selectView = (v: string) => {
    setView(v);
    setSidebarOpen(false);
  };

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <header className="flex shrink-0 items-center gap-3 border-b border-line bg-panel/90 px-4 py-3 backdrop-blur md:hidden">
        <button onClick={() => setSidebarOpen(true)} aria-label="Open menu" className="p-1 text-muted hover:text-ink">
          <MenuIcon />
        </button>
        <span className="font-semibold tracking-tight">SoundSea</span>
      </header>

      <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1">
        <Sidebar
          playlists={playlists}
          trackCount={tracks.length}
          view={view}
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onSelectView={selectView}
          onCreate={createPlaylist}
          onRename={renamePlaylist}
          onDelete={deletePlaylist}
          onReorder={reorderPlaylists}
        />

        <main className="flex min-w-0 flex-1 flex-col">
          {view === "settings" ? (
            <div key="settings" className="anim-view flex-1 overflow-y-auto overscroll-contain px-4 py-6 md:px-8 md:py-10">
              <SettingsPanel />
            </div>
          ) : viewPlaylist ? (
            // Spotify-style playlist view: the banner header scrolls with the list
            <div key={viewPlaylist.id} className="anim-view flex-1 overflow-y-auto overscroll-contain px-4 pb-6 md:px-8">
              <PlaylistHeader
                playlist={viewPlaylist}
                tracks={viewTracks}
                onPlay={() => playPlaylist(viewPlaylist.id)}
                onShuffle={() => shufflePlaylist(viewPlaylist.id)}
                onShare={() => sharePlaylist(viewPlaylist)}
                onSave={(changes) => updatePlaylist(viewPlaylist.id, changes)}
              />
              <TrackList
                tracks={viewTracks}
                emptyHint="This playlist is empty. Add tracks from your library with the three-dots menu on any track."
                currentId={currentId}
                isPlaying={isPlaying}
                playlists={playlists}
                isPlaylistView
                onPlay={(trackId) => playTrack(trackId, view)}
                onTogglePlay={togglePlay}
                onAddToPlaylist={addToPlaylist}
                onEdit={setEditingTrackId}
                onRemove={(trackId) => removeFromPlaylist(viewPlaylist.id, trackId)}
                onReorder={(ids) => reorderPlaylistTracks(viewPlaylist.id, ids)}
              />
            </div>
          ) : (
            <div key="library" className="anim-view flex min-h-0 flex-1 flex-col">
              {/* library: pinned download field + title, list scrolls below */}
              <div className="shrink-0 px-4 pt-5 md:px-8 md:pt-8">
                <DownloadForm downloading={downloading} error={downloadError} onDownload={handleDownload} />
                <div className="mt-6 mb-3 flex items-baseline justify-between gap-3">
                  <h1 className="truncate text-xl font-semibold tracking-tight">Library</h1>
                  <span className="shrink-0 text-sm text-muted">
                    {viewTracks.length} {viewTracks.length === 1 ? "track" : "tracks"}
                  </span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-6 md:px-8">
                <TrackList
                  tracks={viewTracks}
                  emptyHint="Paste a YouTube or TikTok link above to download your first track."
                  currentId={currentId}
                  isPlaying={isPlaying}
                  playlists={playlists}
                  isPlaylistView={false}
                  onPlay={(trackId) => playTrack(trackId, view)}
                  onTogglePlay={togglePlay}
                  onAddToPlaylist={addToPlaylist}
                  onEdit={setEditingTrackId}
                  onRemove={(trackId) => deleteTrack(trackId)}
                />
              </div>
            </div>
          )}
        </main>
      </div>

      <PlayerBar
        track={currentTrack}
        isPlaying={isPlaying}
        position={position}
        duration={duration}
        repeat={repeat}
        shuffle={shuffle}
        volume={volume}
        onTogglePlay={togglePlay}
        onPrev={goPrev}
        onNext={() => goNext(false)}
        onSeek={handleSeek}
        onCycleRepeat={cycleRepeat}
        onToggleShuffle={() => setShuffle((s) => !s)}
        onVolume={setVolume}
      />

      <audio
        ref={audioRef}
        src={currentTrack ? audioUrl(currentTrack.filename) : undefined}
        preload="metadata"
        onPlay={() => setIsPlaying(true)}
        onPause={(e) => {
          setIsPlaying(false);
          savePlayback(e.currentTarget.currentTime);
        }}
        onTimeUpdate={(e) => {
          const t = e.currentTarget.currentTime;
          setPosition(t);
          if (Date.now() - lastSaveRef.current > 3000) {
            lastSaveRef.current = Date.now();
            savePlayback(t);
          }
        }}
        onLoadedMetadata={(e) => {
          setDuration(e.currentTarget.duration);
          if (pendingRestoreRef.current !== null) {
            const t = Math.min(pendingRestoreRef.current, e.currentTarget.duration || pendingRestoreRef.current);
            e.currentTarget.currentTime = t;
            setPosition(t);
            pendingRestoreRef.current = null;
          }
        }}
        onEnded={handleEnded}
      />

      {editingTrackId && trackById.get(editingTrackId) && (
        <TrackEditModal
          track={trackById.get(editingTrackId)!}
          onClose={() => setEditingTrackId(null)}
          onSave={(changes) => updateTrack(editingTrackId, changes)}
        />
      )}
    </div>
  );
}
