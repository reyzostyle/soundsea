-- SoundSea database schema.
-- Paste this whole file into the Supabase SQL Editor (New query) and Run.
-- Safe to re-run: policies/triggers are dropped first.

-- ─────────────────────────────────────────────────────────────
-- TABLES
-- ─────────────────────────────────────────────────────────────

create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  username    text unique not null,
  display_name text,
  avatar_url  text,
  created_at  timestamptz not null default now()
);

create table if not exists public.tracks (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  title      text not null,
  filename   text not null,
  duration   real,
  thumbnail  text,
  source_url text,
  created_at timestamptz not null default now()
);
create index if not exists tracks_user_id_idx on public.tracks(user_id);

create table if not exists public.playlists (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  is_public  boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists playlists_user_id_idx on public.playlists(user_id);

create table if not exists public.playlist_tracks (
  playlist_id uuid not null references public.playlists(id) on delete cascade,
  track_id    uuid not null references public.tracks(id) on delete cascade,
  position    int not null default 0,
  added_at    timestamptz not null default now(),
  primary key (playlist_id, track_id)
);

-- ─────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────

alter table public.profiles        enable row level security;
alter table public.tracks          enable row level security;
alter table public.playlists       enable row level security;
alter table public.playlist_tracks enable row level security;

-- profiles: anyone can read (public profile pages); only the owner can write
drop policy if exists profiles_select_all on public.profiles;
create policy profiles_select_all on public.profiles for select using (true);
drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles for insert with check (auth.uid() = id);
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles for update using (auth.uid() = id);

-- tracks: visible to the owner, or to anyone if the track sits in a public playlist
drop policy if exists tracks_select_own_or_public on public.tracks;
create policy tracks_select_own_or_public on public.tracks for select using (
  auth.uid() = user_id
  or exists (
    select 1 from public.playlist_tracks pt
    join public.playlists p on p.id = pt.playlist_id
    where pt.track_id = tracks.id and p.is_public
  )
);
drop policy if exists tracks_insert_own on public.tracks;
create policy tracks_insert_own on public.tracks for insert with check (auth.uid() = user_id);
drop policy if exists tracks_update_own on public.tracks;
create policy tracks_update_own on public.tracks for update using (auth.uid() = user_id);
drop policy if exists tracks_delete_own on public.tracks;
create policy tracks_delete_own on public.tracks for delete using (auth.uid() = user_id);

-- playlists: visible to the owner, or to anyone if marked public
drop policy if exists playlists_select_own_or_public on public.playlists;
create policy playlists_select_own_or_public on public.playlists for select using (
  auth.uid() = user_id or is_public
);
drop policy if exists playlists_insert_own on public.playlists;
create policy playlists_insert_own on public.playlists for insert with check (auth.uid() = user_id);
drop policy if exists playlists_update_own on public.playlists;
create policy playlists_update_own on public.playlists for update using (auth.uid() = user_id);
drop policy if exists playlists_delete_own on public.playlists;
create policy playlists_delete_own on public.playlists for delete using (auth.uid() = user_id);

-- playlist_tracks: readable when the parent playlist is readable; writable only by the playlist owner
drop policy if exists playlist_tracks_select_visible on public.playlist_tracks;
create policy playlist_tracks_select_visible on public.playlist_tracks for select using (
  exists (
    select 1 from public.playlists p
    where p.id = playlist_tracks.playlist_id
      and (p.user_id = auth.uid() or p.is_public)
  )
);
drop policy if exists playlist_tracks_modify_own on public.playlist_tracks;
create policy playlist_tracks_modify_own on public.playlist_tracks for all using (
  exists (
    select 1 from public.playlists p
    where p.id = playlist_tracks.playlist_id and p.user_id = auth.uid()
  )
) with check (
  exists (
    select 1 from public.playlists p
    where p.id = playlist_tracks.playlist_id and p.user_id = auth.uid()
  )
);

-- ─────────────────────────────────────────────────────────────
-- AUTO-CREATE A PROFILE ON SIGNUP
-- Username defaults to user_<first 8 chars of id>; the user can rename it later.
-- ─────────────────────────────────────────────────────────────

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, display_name, avatar_url)
  values (
    new.id,
    'user_' || substr(replace(new.id::text, '-', ''), 1, 8),
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();
