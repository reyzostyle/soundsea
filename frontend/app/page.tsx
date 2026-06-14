"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Playlist, RepeatMode, Track } from "@/lib/types";
import { loadPlaylists, loadTracks, savePlaylists, saveTracks } from "@/lib/storage";
import { API_BASE, audioUrl } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import {
  cloudAddToPlaylist,
  cloudCreatePlaylist,
  cloudDeletePlaylist,
  cloudDeleteTrack,
  cloudRemoveFromPlaylist,
  cloudRenamePlaylist,
  cloudReorderPlaylist,
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

  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    setTracks(loadTracks());
    setPlaylists(loadPlaylists());
    setHydrated(true);
  }, []);
  useEffect(() => {
    if (hydrated) saveTracks(tracks);
  }, [tracks, hydrated]);
  useEffect(() => {
    if (hydrated) savePlaylists(playlists);
  }, [playlists, hydrated]);

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
          setPlaylists(cloud.playlists);
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
      if (source) setQueueSource(source);
      if (id === currentId) {
        const a = audioRef.current;
        if (a) {
          a.currentTime = 0;
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
    [queue, currentId, repeat, playTrack]
  );

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
  // Register only seek handlers (not prev/next), so the lock screen shows the
  // skip-10-seconds controls and they actually scrub within the track.
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
    const seekBy = (delta: number) => {
      const a = audioRef.current;
      if (!a) return;
      const t = Math.max(0, Math.min(a.duration || 0, a.currentTime + delta));
      a.currentTime = t;
      setPosition(t);
    };
    ms.setActionHandler("play", () => togglePlay());
    ms.setActionHandler("pause", () => togglePlay());
    ms.setActionHandler("seekbackward", (d) => seekBy(-(d.seekOffset || 10)));
    ms.setActionHandler("seekforward", (d) => seekBy(d.seekOffset || 10));
    ms.setActionHandler("seekto", (d) => {
      const a = audioRef.current;
      if (a && typeof d.seekTime === "number") {
        a.currentTime = d.seekTime;
        setPosition(d.seekTime);
      }
    });
    return () => {
      for (const action of ["play", "pause", "seekbackward", "seekforward", "seekto"] as const) {
        try {
          ms.setActionHandler(action, null);
        } catch {}
      }
    };
  }, [currentTrack, togglePlay]);

  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
  }, [isPlaying]);

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
      };
      setTracks((prev) => [track, ...prev]);
      if (user) cloudUpsertTrack(user.id, track, url).catch(() => {});
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

  const moveInPlaylist = (playlistId: string, trackId: string, dir: -1 | 1) => {
    let reordered: string[] | undefined;
    setPlaylists((prev) =>
      prev.map((p) => {
        if (p.id !== playlistId) return p;
        const ids = [...p.trackIds];
        const idx = ids.indexOf(trackId);
        const j = idx + dir;
        if (idx < 0 || j < 0 || j >= ids.length) return p;
        [ids[idx], ids[j]] = [ids[j], ids[idx]];
        reordered = ids;
        return { ...p, trackIds: ids };
      })
    );
    if (user && reordered) cloudReorderPlaylist(playlistId, reordered).catch(() => {});
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
        />

        <main className="flex min-w-0 flex-1 flex-col">
          {view === "settings" ? (
            <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8 md:py-10">
              <SettingsPanel />
            </div>
          ) : (
            <>
              {/* pinned: download field + section title stay put while the list scrolls */}
              <div className="shrink-0 px-4 pt-5 md:px-8 md:pt-8">
                <DownloadForm downloading={downloading} error={downloadError} onDownload={handleDownload} />
                <div className="mt-6 mb-3 flex items-baseline justify-between gap-3">
                  <h1 className="truncate text-xl font-semibold tracking-tight">
                    {viewPlaylist ? viewPlaylist.name : "Library"}
                  </h1>
                  <span className="shrink-0 text-sm text-muted">
                    {viewTracks.length} {viewTracks.length === 1 ? "track" : "tracks"}
                  </span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-4 pb-6 md:px-8">
                <TrackList
                  tracks={viewTracks}
                  emptyHint={
                    viewPlaylist
                      ? "This playlist is empty. Add tracks from your library with the + button on any track."
                      : "Paste a YouTube or TikTok link above to download your first track."
                  }
                  currentId={currentId}
                  isPlaying={isPlaying}
                  playlists={playlists}
                  isPlaylistView={!!viewPlaylist}
                  onPlay={(trackId) => playTrack(trackId, view)}
                  onTogglePlay={togglePlay}
                  onAddToPlaylist={addToPlaylist}
                  onEdit={setEditingTrackId}
                  onMove={(trackId, dir) => viewPlaylist && moveInPlaylist(viewPlaylist.id, trackId, dir)}
                  onRemove={(trackId) =>
                    viewPlaylist ? removeFromPlaylist(viewPlaylist.id, trackId) : deleteTrack(trackId)
                  }
                />
              </div>
            </>
          )}
        </main>
      </div>

      <PlayerBar
        track={currentTrack}
        isPlaying={isPlaying}
        position={position}
        duration={duration}
        repeat={repeat}
        onTogglePlay={togglePlay}
        onPrev={goPrev}
        onNext={() => goNext(false)}
        onSeek={handleSeek}
        onCycleRepeat={cycleRepeat}
      />

      <audio
        ref={audioRef}
        src={currentTrack ? audioUrl(currentTrack.filename) : undefined}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={(e) => setPosition(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
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
