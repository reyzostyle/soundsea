-- Adds a custom cover image to playlists so editing a playlist's photo syncs to the
-- account across devices. Optional: without it, playlist covers fall back to the first
-- track's thumbnail and custom covers just stay local. Run in the Supabase SQL Editor.

alter table public.playlists add column if not exists thumbnail text;
