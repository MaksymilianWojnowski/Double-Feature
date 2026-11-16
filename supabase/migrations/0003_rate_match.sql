-- Your 1–5 rating of a watched match; null clears it.
-- Security invoker: the match_ratings RLS policies decide (your rating, a match in your pair).
-- A function rather than a client upsert, so ON CONFLICT updates only `rating`.
create function public.rate_match(p_match_id bigint, p_rating smallint) returns void
language plpgsql set search_path = '' as $$
begin
  if p_rating is null then
    delete from public.match_ratings where match_id = p_match_id and user_id = auth.uid();
  else
    insert into public.match_ratings (match_id, rating) values (p_match_id, p_rating)
    on conflict (match_id, user_id) do update set rating = excluded.rating;
  end if;
end $$;

revoke execute on function public.rate_match(bigint, smallint) from public, anon;
grant execute on function public.rate_match(bigint, smallint) to authenticated;
