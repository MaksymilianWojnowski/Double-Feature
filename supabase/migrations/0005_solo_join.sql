-- Solo mode: you can swipe alone (a pair with just you) and join your partner's pair later.
-- Joining from a solo pair moves your swipes along, turns titles you both already liked into matches,
-- and deletes the solo pair. Joining while your pair has a partner is still refused ('already_paired').
-- All in one transaction: if the target pair is full, nothing changes.

create or replace function public.join_pair(code text) returns public.pairs
language plpgsql security definer set search_path = '' as $$
declare
  p public.pairs;
  mine uuid := public.my_pair_id();
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  select * into p from public.pairs where invite_code = upper(regexp_replace(code, '\s', '', 'g'));
  if p.id is null then raise exception 'invalid_code'; end if;
  if mine = p.id then return p; end if; -- opening your own invite link is a no-op

  if mine is not null then
    if exists (select 1 from public.pair_members where pair_id = mine and user_id <> auth.uid()) then
      raise exception 'already_paired';
    end if;
    -- Solo: bring your swipes, then drop the solo pair (cascades its settings and your membership).
    update public.swipes set pair_id = p.id where pair_id = mine and user_id = auth.uid();
    delete from public.pairs where id = mine;
  end if;

  insert into public.pair_members (pair_id, user_id) values (p.id, auth.uid()); -- trigger raises pair_full

  -- Moving rows doesn't run the match trigger (it fires on decision changes), so match the backlog here.
  insert into public.matches (pair_id, tmdb_id, media_type, title, poster_path, year)
  select p.id, s.tmdb_id, s.media_type, s.title, s.poster_path, s.year
  from public.swipes s
  where s.pair_id = p.id and s.user_id = auth.uid() and s.decision = 'like'
    and exists (
      select 1 from public.swipes o
      where o.pair_id = p.id and o.user_id <> auth.uid() and o.decision = 'like'
        and o.tmdb_id = s.tmdb_id and o.media_type = s.media_type
    )
  on conflict (pair_id, tmdb_id, media_type) do nothing;

  return p;
end $$;
