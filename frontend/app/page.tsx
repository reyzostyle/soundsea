"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Playlist, RepeatMode, Track } from "@/lib/types";
import { loadPlaylists, loadTracks, savePlaylists, saveTracks } from "@/lib/storage";
import { API_BASE, audioUrl } from "@/lib/api";
import DownloadForm from "@/components/DownloadForm";
import Sidebar from "@/components/Sidebar";
import TrackList from "@/components/TrackList";
import PlayerBar from "@/components/PlayerBar";
import SettingsPanel from "@/components/SettingsPanel";
import { MenuIcon } from "@/components/Icons";

export default function Home() {
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
      return true;
    } catch (e) {
      setDownloadError(e instanceof Error ? e.message : "Download failed");
      return false;
    } finally {
      setDownloading(false);
    }
  }, []);

  // --- playlists ---

  const createPlaylist = (name: string) => {
    const pl: Playlist = { id: crypto.randomUUID(), name: name.trim() || "New playlist", trackIds: [] };
    setPlaylists((prev) => [...prev, pl]);
    setView(pl.id);
  };

  const renamePlaylist = (id: string, name: string) =>
    setPlaylists((prev) => prev.map((p) => (p.id === id ? { ...p, name: name.trim() || p.name } : p)));

  const deletePlaylist = (id: string) => {
    setPlaylists((prev) => prev.filter((p) => p.id !== id));
    if (view === id) setView("library");
    if (queueSource === id) setQueueSource("library");
  };

  const addToPlaylist = (playlistId: string, trackId: string) =>
    setPlaylists((prev) =>
      prev.map((p) =>
        p.id === playlistId && !p.trackIds.includes(trackId) ? { ...p, trackIds: [...p.trackIds, trackId] } : p
      )
    );

  const removeFromPlaylist = (playlistId: string, trackId: string) =>
    setPlaylists((prev) =>
      prev.map((p) => (p.id === playlistId ? { ...p, trackIds: p.trackIds.filter((t) => t !== trackId) } : p))
    );

  const deleteTrack = (trackId: string) => {
    setTracks((prev) => prev.filter((t) => t.id !== trackId));
    setPlaylists((prev) => prev.map((p) => ({ ...p, trackIds: p.trackIds.filter((t) => t !== trackId) })));
    if (currentId === trackId) {
      setCurrentId(null);
      setIsPlaying(false);
    }
  };

  const selectView = (v: string) => {
    setView(v);
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-panel/90 px-4 py-3 backdrop-blur md:hidden">
        <button onClick={() => setSidebarOpen(true)} aria-label="Open menu" className="p-1 text-muted hover:text-ink">
          <MenuIcon />
        </button>
        <span className="font-semibold tracking-tight">SoundSea</span>
      </header>

      <div className="mx-auto flex max-w-6xl">
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

        <main className="min-w-0 flex-1 px-4 pt-6 pb-44 md:px-8 md:pt-10">
          {view === "settings" ? (
            <SettingsPanel />
          ) : (
            <>
              <DownloadForm downloading={downloading} error={downloadError} onDownload={handleDownload} />

              <div className="mb-4 flex items-baseline justify-between gap-3">
                <h1 className="truncate text-xl font-semibold tracking-tight">
                  {viewPlaylist ? viewPlaylist.name : "Library"}
                </h1>
                <span className="shrink-0 text-sm text-muted">
                  {viewTracks.length} {viewTracks.length === 1 ? "track" : "tracks"}
                </span>
              </div>

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
                onRemove={(trackId) =>
                  viewPlaylist ? removeFromPlaylist(viewPlaylist.id, trackId) : deleteTrack(trackId)
                }
              />
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
    </div>
  );
}
