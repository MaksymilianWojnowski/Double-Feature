-- Double Feature: initial schema.
-- Every rule that matters lives here (pair size, match creation, visibility); the app never enforces them itself.

create schema if not exists private;

-- ───────────────────────── tables ─────────────────────────

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (char_length(btrim(display_name)) between 1 and 40),
  created_at timestamptz not null default now()
);

create table public.pairs (
  id uuid primary key default gen_random_uuid(),
  invite_code text not null unique,
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.pair_members (
  pair_id uuid not null references public.pairs (id) on delete cascade,
  user_id uuid not null unique references public.profiles (id) on delete cascade, -- one pair per user
  joined_at timestamptz not null default now(),
  primary key (pair_id, user_id)
);

create table public.pair_settings (
  pair_id uuid primary key references public.pairs (id) on delete cascade,
  region text not null default 'PL' check (region ~ '^[A-Z]{2}$'),
  provider_ids int[] not null default '{}',
  only_our_services boolean not null default false,
  content_type text not null default 'both' check (content_type in ('movie', 'tv', 'both')),
  filters jsonb not null default '{}' check (jsonb_typeof(filters) = 'object')
);

create table public.swipes (
  id bigint generated always as identity primary key,
  pair_id uuid not null references public.pairs (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  tmdb_id int not null check (tmdb_id > 0),
  media_type text not null check (media_type in ('movie', 'tv')),
  decision text not null check (decision in ('like', 'pass', 'seen')),
  title text not null,
  poster_path text,
  year int,
  created_at timestamptz not null default now(),
  unique (user_id, tmdb_id, media_type)
);
create index swipes_pair_title_idx on public.swipes (pair_id, media_type, tmdb_id);

create table public.matches (
  id bigint generated always as identity primary key,
  pair_id uuid not null references public.pairs (id) on delete cascade,
  tmdb_id int not null,
  media_type text not null check (media_type in ('movie', 'tv')),
  title text not null,
  poster_path text,
  year int,
  created_at timestamptz not null default now(),
  watched_at timestamptz,
  unique (pair_id, tmdb_id, media_type)
);

create table public.match_ratings (
  match_id bigint not null references public.matches (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  primary key (match_id, user_id)
);

-- ───────────────────────── helpers ─────────────────────────

-- The caller's pair. SECURITY DEFINER so RLS policies can use it without recursing into pair_members' own policy.
create function public.my_pair_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select pair_id from public.pair_members where user_id = auth.uid()
$$;

-- 8 chars from a 32-symbol alphabet without 0/O/1/I. Bytes 8–15 of a v4 UUID have random low 5 bits.
create function private.new_invite_code() returns text
language sql volatile set search_path = '' as $$
  select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', (get_byte(b, i) % 32) + 1, 1), '' order by i)
  from (select uuid_send(gen_random_uuid()) as b) s, generate_series(8, 15) as i
$$;

-- ───────────────────────── triggers ─────────────────────────

create function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
for each row execute function private.handle_new_user();

create function private.enforce_pair_size() returns trigger
language plpgsql set search_path = '' as $$
begin
  perform 1 from public.pairs where id = new.pair_id for update; -- serialize concurrent joins
  if (select count(*) from public.pair_members where pair_id = new.pair_id) >= 2 then
    raise exception 'pair_full';
  end if;
  return new;
end $$;

create trigger pair_members_max_two before insert on public.pair_members
for each row execute function private.enforce_pair_size();

-- Match detection. SECURITY DEFINER because the caller can't see the partner's swipes.
create function private.handle_swipe_change() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op in ('INSERT', 'UPDATE') and new.decision = 'like' then
    -- Two likes landing at once: whichever takes the lock second sees the other's committed row.
    perform pg_advisory_xact_lock(hashtextextended(new.pair_id::text || ':' || new.media_type || ':' || new.tmdb_id, 0));
    if exists (
      select 1 from public.swipes s
      where s.pair_id = new.pair_id and s.media_type = new.media_type and s.tmdb_id = new.tmdb_id
        and s.user_id <> new.user_id and s.decision = 'like'
    ) then
      insert into public.matches (pair_id, tmdb_id, media_type, title, poster_path, year)
      values (new.pair_id, new.tmdb_id, new.media_type, new.title, new.poster_path, new.year)
      on conflict (pair_id, tmdb_id, media_type) do nothing;
    end if;
  elsif (tg_op = 'DELETE' or tg_op = 'UPDATE') and old.decision = 'like' then
    -- Undo / change of mind: drop the match unless it was already watched.
    delete from public.matches
    where pair_id = old.pair_id and media_type = old.media_type and tmdb_id = old.tmdb_id and watched_at is null;
  end if;
  return null;
end $$;

create trigger swipes_match after insert or update of decision or delete on public.swipes
for each row execute function private.handle_swipe_change();

-- ───────────────────────── RPCs ─────────────────────────

create function public.create_pair() returns public.pairs
language plpgsql security definer set search_path = '' as $$
declare p public.pairs;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if exists (select 1 from public.pair_members where user_id = auth.uid()) then raise exception 'already_paired'; end if;
  insert into public.pairs (invite_code, created_by) values (private.new_invite_code(), auth.uid()) returning * into p;
  insert into public.pair_members (pair_id, user_id) values (p.id, auth.uid());
  insert into public.pair_settings (pair_id) values (p.id);
  return p;
end $$;

create function public.join_pair(code text) returns public.pairs
language plpgsql security definer set search_path = '' as $$
declare p public.pairs;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  select * into p from public.pairs where invite_code = upper(regexp_replace(code, '\s', '', 'g'));
  if p.id is null then raise exception 'invalid_code'; end if;
  if exists (select 1 from public.pair_members where user_id = auth.uid() and pair_id = p.id) then
    return p; -- opening your own invite link is a no-op
  end if;
  if exists (select 1 from public.pair_members where user_id = auth.uid()) then raise exception 'already_paired'; end if;
  insert into public.pair_members (pair_id, user_id) values (p.id, auth.uid()); -- trigger raises pair_full
  return p;
end $$;

-- Dissolves the pair for both people: members, settings, swipes, matches and ratings cascade.
create function public.leave_pair() returns void
language sql security definer set search_path = '' as $$
  delete from public.pairs where id = public.my_pair_id()
$$;

create function public.pair_stats()
returns table (my_swipes int, partner_swipes int, matches int, watched int)
language sql stable security definer set search_path = '' as $$
  select
    (select count(*) from public.swipes where pair_id = public.my_pair_id() and user_id = auth.uid())::int,
    (select count(*) from public.swipes where pair_id = public.my_pair_id() and user_id <> auth.uid())::int,
    (select count(*) from public.matches where pair_id = public.my_pair_id())::int,
    (select count(*) from public.matches where pair_id = public.my_pair_id() and watched_at is not null)::int
$$;

-- ───────────────────────── privileges ─────────────────────────
-- Explicit, so behaviour doesn't depend on Supabase's default grants.

revoke all on public.profiles, public.pairs, public.pair_members, public.pair_settings,
  public.swipes, public.matches, public.match_ratings from anon, authenticated;

grant select, update (display_name) on public.profiles to authenticated;
grant select on public.pairs, public.pair_members to authenticated;
grant select, update (region, provider_ids, only_our_services, content_type, filters) on public.pair_settings to authenticated;
grant select, insert (pair_id, tmdb_id, media_type, decision, title, poster_path, year),
  update (decision), delete on public.swipes to authenticated;
grant select, update (watched_at), delete on public.matches to authenticated;
grant select, insert (match_id, rating), update (rating), delete on public.match_ratings to authenticated;

revoke execute on function public.my_pair_id(), public.create_pair(), public.join_pair(text),
  public.leave_pair(), public.pair_stats() from public, anon;
grant execute on function public.my_pair_id(), public.create_pair(), public.join_pair(text),
  public.leave_pair(), public.pair_stats() to authenticated;
revoke execute on all functions in schema private from public, anon, authenticated;

-- ───────────────────────── row level security ─────────────────────────

alter table public.profiles enable row level security;
alter table public.pairs enable row level security;
alter table public.pair_members enable row level security;
alter table public.pair_settings enable row level security;
alter table public.swipes enable row level security;
alter table public.matches enable row level security;
alter table public.match_ratings enable row level security;

create policy "select: self or partner" on public.profiles for select to authenticated
  using (id = auth.uid() or id in (select user_id from public.pair_members where pair_id = public.my_pair_id()));
create policy "update: self" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy "select: member" on public.pairs for select to authenticated using (id = public.my_pair_id());
create policy "select: member" on public.pair_members for select to authenticated using (pair_id = public.my_pair_id());

create policy "select: member" on public.pair_settings for select to authenticated using (pair_id = public.my_pair_id());
create policy "update: member" on public.pair_settings for update to authenticated
  using (pair_id = public.my_pair_id()) with check (pair_id = public.my_pair_id());

-- Own rows only: a partner's likes never reach the other's browser (the deck's partner boost runs server-side).
create policy "select: own" on public.swipes for select to authenticated using (user_id = auth.uid());
create policy "insert: own, own pair" on public.swipes for insert to authenticated
  with check (user_id = auth.uid() and pair_id = public.my_pair_id());
create policy "update: own" on public.swipes for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid() and pair_id = public.my_pair_id());
create policy "delete: own" on public.swipes for delete to authenticated using (user_id = auth.uid());

create policy "select: member" on public.matches for select to authenticated using (pair_id = public.my_pair_id());
create policy "update: member" on public.matches for update to authenticated
  using (pair_id = public.my_pair_id()) with check (pair_id = public.my_pair_id());
create policy "delete: member" on public.matches for delete to authenticated using (pair_id = public.my_pair_id());

create policy "select: member" on public.match_ratings for select to authenticated
  using (exists (select 1 from public.matches m where m.id = match_id and m.pair_id = public.my_pair_id()));
create policy "insert: own, own pair" on public.match_ratings for insert to authenticated
  with check (user_id = auth.uid() and exists (select 1 from public.matches m where m.id = match_id and m.pair_id = public.my_pair_id()));
create policy "update: own" on public.match_ratings for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "delete: own" on public.match_ratings for delete to authenticated using (user_id = auth.uid());

-- ───────────────────────── realtime ─────────────────────────
-- Clients subscribe to INSERTs on matches; RLS decides who receives each event.
alter publication supabase_realtime add table public.matches;
