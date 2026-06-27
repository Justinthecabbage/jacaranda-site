-- Jacaranda Music Club — Supabase schema
-- Run this in Supabase Dashboard → SQL Editor

-- Community posts
create table if not exists public.posts (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    author_name text not null,
    title text not null,
    content text not null,
    created_at timestamptz not null default now()
);

-- Dismissal song requests (monthly voting)
create table if not exists public.song_requests (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    requester_name text not null,
    song_title text not null,
    artist text,
    status text not null default 'pending' check (status in ('pending', 'approved')),
    vote_count int not null default 0,
    created_at timestamptz not null default now()
);

-- One vote per user per song
create table if not exists public.song_votes (
    id uuid primary key default gen_random_uuid(),
    song_request_id uuid not null references public.song_requests(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    created_at timestamptz not null default now(),
    unique (song_request_id, user_id)
);

-- Keep vote_count in sync
create or replace function public.refresh_song_vote_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    if TG_OP = 'INSERT' then
        update public.song_requests
        set vote_count = vote_count + 1
        where id = NEW.song_request_id;
    elsif TG_OP = 'DELETE' then
        update public.song_requests
        set vote_count = greatest(vote_count - 1, 0)
        where id = OLD.song_request_id;
    end if;
    return null;
end;
$$;

drop trigger if exists song_votes_count_trigger on public.song_votes;
create trigger song_votes_count_trigger
    after insert or delete on public.song_votes
    for each row execute function public.refresh_song_vote_count();

-- Row Level Security
alter table public.posts enable row level security;
alter table public.song_requests enable row level security;
alter table public.song_votes enable row level security;

drop policy if exists "posts_select" on public.posts;
drop policy if exists "posts_insert" on public.posts;
create policy "posts_select" on public.posts for select to authenticated using (true);
create policy "posts_insert" on public.posts for insert to authenticated
    with check (auth.uid() = user_id);

drop policy if exists "songs_select" on public.song_requests;
drop policy if exists "songs_insert" on public.song_requests;
create policy "songs_select" on public.song_requests for select to authenticated using (true);
create policy "songs_insert" on public.song_requests for insert to authenticated
    with check (auth.uid() = user_id);

drop policy if exists "votes_select" on public.song_votes;
drop policy if exists "votes_insert" on public.song_votes;
drop policy if exists "votes_delete" on public.song_votes;
create policy "votes_select" on public.song_votes for select to authenticated using (true);
create policy "votes_insert" on public.song_votes for insert to authenticated
    with check (auth.uid() = user_id);
create policy "votes_delete" on public.song_votes for delete to authenticated
    using (auth.uid() = user_id);

-- Realtime updates for song board
alter publication supabase_realtime add table public.song_requests;
alter publication supabase_realtime add table public.song_votes;

-- Indexes
create index if not exists posts_created_at_idx on public.posts (created_at desc);
create index if not exists song_requests_votes_idx on public.song_requests (vote_count desc, created_at desc);
create index if not exists song_votes_user_idx on public.song_votes (user_id);
create index if not exists song_votes_song_idx on public.song_votes (song_request_id);

-- Case-insensitive duplicate check helper (optional, used by app logic)
create index if not exists song_requests_title_artist_idx
    on public.song_requests (lower(song_title), lower(coalesce(artist, '')));
