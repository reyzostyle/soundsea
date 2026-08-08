export type Track = {
  id: string;
  title: string;
  filename: string;
  duration: number | null;
  thumbnail: string | null;
  addedAt: number;
  /** the YouTube/TikTok link it was downloaded from; absent on older tracks */
  sourceUrl?: string | null;
};

export type Playlist = {
  id: string;
  name: string;
  trackIds: string[];
  thumbnail?: string | null;
};

export type RepeatMode = "off" | "all" | "one";
