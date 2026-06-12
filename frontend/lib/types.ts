export type Track = {
  id: string;
  title: string;
  filename: string;
  duration: number | null;
  thumbnail: string | null;
  addedAt: number;
};

export type Playlist = {
  id: string;
  name: string;
  trackIds: string[];
};

export type RepeatMode = "off" | "all" | "one";
