-- Swipe entry point for the browser, and the partner-boost query for the server.

-- Records (or changes) your swipe in your pair. Returns the match only if this very call created it,
-- so the client knows when to show the match moment. Matching itself stays in the swipes trigger.
create function public.swipe(
  p_tmdb_id int,
  p_media_type text,
  p_decision text,
  p_title text,
  p_poster_path text default null,
  p_year int default null
) returns setof public.matches
language plpgsql security definer set search_path = '' as $$
declare v_pair uuid := public.my_pair_id();
begin
  if v_pair is null then raise exception 'no_pair'; end if;
  insert into public.swipes (pair_id, user_id, tmdb_id, media_type, decision, title, poster_path, year)
  values (v_pair, auth.uid(), p_tmdb_id, p_media_type, p_decision, p_title, p_poster_path, p_year)
  on conflict (user_id, tmdb_id, media_type) do update set decision = excluded.decision;

  -- now() is the transaction start, so only a match inserted by this call's trigger qualifies.
  return query select * from public.matches m
  where m.pair_id = v_pair and m.tmdb_id = p_tmdb_id and m.media_type = p_media_type and m.created_at = now();
end $$;

revoke execute on function public.swipe(int, text, text, text, text, int) from public, anon;
grant execute on function public.swipe(int, text, text, text, text, int) to authenticated;

-- Titles the partner liked that p_user hasn't swiped yet, newest first.
-- Service role only: the deck route mixes these in server-side so the list never reaches a browser.
create function public.boost_candidates(p_user uuid, p_limit int default 40)
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
  order by s.created_at desc
  limit p_limit
$$;

revoke execute on function public.boost_candidates(uuid, int) from public, anon, authenticated;
grant execute on function public.boost_candidates(uuid, int) to service_role;
