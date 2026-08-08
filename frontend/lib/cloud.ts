import { supabase } from "./supabase";
import { Playlist, Track } from "./types";

// All functions are no-ops when Supabase isn't configured, so callers can fire them
// unconditionally and they only do something for signed-in users.

export async function fetchLibrary(userId: string): Promise<{ tracks: Track[]; playlists: Playlist[] }> {
  if (!supabase) return { tracks: [], playlists: [] };

  const [{ data: trackRows }, { data: plRows }, { data: ptRows }] = await Promise.all([
    supabase.from("tracks").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    supabase.from("playlists").select("*").eq("user_id", userId).order("created_at", { ascending: true }),
    supabase.from("playlist_tracks").select("playlist_id, track_id, position"),
  ]);

  const tracks: Track[] = (trackRows ?? []).map((r) => ({
    id: r.id,
    title: r.title,
    filename: r.filename,
    duration: r.duration,
    thumbnail: r.thumbnail,
    addedAt: new Date(r.created_at).getTime(),
    sourceUrl: r.source_url ?? null,
  }));

  const byPlaylist = new Map<string, { track_id: string; position: number }[]>();
  for (const pt of ptRows ?? []) {
    if (!byPlaylist.has(pt.playlist_id)) byPlaylist.set(pt.playlist_id, []);
    byPlaylist.get(pt.playlist_id)!.push(pt);
  }

  const playlists: Playlist[] = (plRows ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    thumbnail: p.thumbnail ?? null,
    trackIds: (byPlaylist.get(p.id) ?? []).sort((a, b) => a.position - b.position).map((pt) => pt.track_id),
  }));

  return { tracks, playlists };
}

export async function cloudUpsertTrack(userId: string, t: Track) {
  if (!supabase) return;
  await supabase.from("tracks").upsert({
    id: t.id,
    user_id: userId,
    title: t.title,
    filename: t.filename,
    duration: t.duration,
    thumbnail: t.thumbnail,
    source_url: t.sourceUrl ?? null,
  });
}

export async function cloudDeleteTrack(trackId: string) {
  if (!supabase) return;
  await supabase.from("tracks").delete().eq("id", trackId);
}

export async function cloudCreatePlaylist(userId: string, p: Playlist) {
  if (!supabase) return;
  await supabase.from("playlists").insert({ id: p.id, user_id: userId, name: p.name });
}

export async function cloudRenamePlaylist(id: string, name: string) {
  if (!supabase) return;
  await supabase.from("playlists").update({ name }).eq("id", id);
}

// Best-effort: silently no-ops if the playlists.thumbnail column hasn't been added yet,
// so custom playlist covers never break the rest of the sync.
export async function cloudUpdatePlaylistThumbnail(id: string, thumbnail: string | null) {
  if (!supabase) return;
  try {
    await supabase.from("playlists").update({ thumbnail }).eq("id", id);
  } catch {}
}

export async function cloudDeletePlaylist(id: string) {
  if (!supabase) return;
  await supabase.from("playlists").delete().eq("id", id);
}

export async function cloudAddToPlaylist(playlistId: string, trackId: string, position: number) {
  if (!supabase) return;
  await supabase.from("playlist_tracks").upsert({ playlist_id: playlistId, track_id: trackId, position });
}

export async function cloudRemoveFromPlaylist(playlistId: string, trackId: string) {
  if (!supabase) return;
  await supabase.from("playlist_tracks").delete().eq("playlist_id", playlistId).eq("track_id", trackId);
}

export async function cloudReorderPlaylist(playlistId: string, orderedTrackIds: string[]) {
  if (!supabase) return;
  await supabase
    .from("playlist_tracks")
    .upsert(orderedTrackIds.map((trackId, i) => ({ playlist_id: playlistId, track_id: trackId, position: i })));
}

// One-time push of a localStorage library into the account (first sign-in on a device
// that already has tracks). Uses upsert so re-running is harmless.
export async function migrateLocalToCloud(userId: string, tracks: Track[], playlists: Playlist[]) {
  if (!supabase) return;
  if (tracks.length) {
    await supabase.from("tracks").upsert(
      tracks.map((t) => ({
        id: t.id,
        user_id: userId,
        title: t.title,
        filename: t.filename,
        duration: t.duration,
        thumbnail: t.thumbnail,
        source_url: t.sourceUrl ?? null,
      }))
    );
  }
  for (const p of playlists) {
    await supabase.from("playlists").upsert({ id: p.id, user_id: userId, name: p.name });
    if (p.trackIds.length) {
      await supabase
        .from("playlist_tracks")
        .upsert(p.trackIds.map((trackId, i) => ({ playlist_id: p.id, track_id: trackId, position: i })));
    }
  }
}
