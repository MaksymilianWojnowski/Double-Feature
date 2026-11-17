-- Web push subscriptions for match notifications. One row per browser/device (its endpoint).
-- Only the server touches this table (service role, via /api/push): no grants or policies for app users.

create table public.push_subscriptions (
  endpoint text primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  p256dh text not null,
  auth text not null,
  locale text not null default 'en' check (locale ~ '^[a-z]{2}$'), -- language of the notification text
  created_at timestamptz not null default now()
);
create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;
revoke all on public.push_subscriptions from anon, authenticated;

-- Unrelated fix that rides along: likes made in the same instant came back in random order.
-- Ties now break by insertion order (id), so "newest first" is deterministic.
create or replace function public.boost_candidates(p_user uuid, p_limit int default 40)
returns table (tmdb_id int, media_type text, title text, poster_path text, year int)
language sql stable set search_path = '' as $$
  select s.tmdb_id, s.media_type, s.title, s.poster_path, s.year
  from public.swipes s
  join public.pair_members me on me.user_id = p_user and me.pair_id = s.pair_id
  where s.user_id <> p_user
    and s.decision = 'like'
    and not exists (
      select 1 from public.swipes mine
      where mine.user_id = p_user and mine.tmdb_id = s.tmdb_id and mine.media_type = s.media_type
    )
  order by s.created_at desc, s.id desc
  limit p_limit
$$;
