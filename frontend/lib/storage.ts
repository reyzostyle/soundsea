import { Playlist, Track } from "./types";

const TRACKS_KEY = "mp.tracks";
const PLAYLISTS_KEY = "mp.playlists";

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export const loadTracks = () => load<Track[]>(TRACKS_KEY, []);
export const loadPlaylists = () => load<Playlist[]>(PLAYLISTS_KEY, []);

export function saveTracks(tracks: Track[]) {
  try {
    localStorage.setItem(TRACKS_KEY, JSON.stringify(tracks));
  } catch {}
}

export function savePlaylists(playlists: Playlist[]) {
  try {
    localStorage.setItem(PLAYLISTS_KEY, JSON.stringify(playlists));
  } catch {}
}
