-- Public library: people publish tracks from their library, anyone can browse them
-- and add one to their own library in a tap instead of hunting for it on TikTok.
-- Run in the Supabase SQL Editor. Safe to re-run.

-- A published track is a normal track row with is_public set. Adding someone's track
-- to your library creates your own row pointing at the same audio file, with
-- saved_from naming the published original; that is what "adds" counts.
alter table public.tracks add column if not exists is_public boolean not null default false;
alter table public.tracks add column if not exists published_at timestamptz;
alter table public.tracks add column if not exists saved_from uuid references public.tracks(id) on delete set null;

create index if not exists tracks_public_idx on public.tracks (published_at desc) where is_public;
create index if not exists tracks_saved_from_idx on public.tracks (saved_from);

-- anyone (signed in or not) can read published tracks
drop policy if exists tracks_select_own_or_public on public.tracks;
create policy tracks_select_own_or_public on public.tracks for select using (
  auth.uid() = user_id
  or is_public
  or exists (
    select 1 from public.playlist_tracks pt
    join public.playlists p on p.id = pt.playlist_id
    where pt.track_id = tracks.id and p.is_public
  )
);

-- What the Discover screen reads: published tracks with who published them and how
-- many people added them. Runs as its owner so the add count can see rows the viewer
-- can't; it only ever exposes tracks that are public.
create or replace view public.public_library as
select
  t.id,
  t.title,
  t.filename,
  t.duration,
  t.thumbnail,
  t.source_url,
  t.published_at,
  t.user_id,
  p.username,
  p.display_name,
  p.avatar_url,
  (select count(*) from public.tracks s where s.saved_from = t.id)::int as adds
from public.tracks t
left join public.profiles p on p.id = t.user_id
where t.is_public;

grant select on public.public_library to anon, authenticated;
