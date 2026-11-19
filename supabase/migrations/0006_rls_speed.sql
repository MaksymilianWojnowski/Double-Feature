-- Speed: every RLS policy calls auth.uid() and my_pair_id() through a subselect, so Postgres works
-- them out once per query instead of once per row (my_pair_id() even runs a query of its own each time).
-- Same rules and names; only how they're evaluated changes. Supabase advisor lint: auth_rls_initplan.

alter policy "select: self or partner" on public.profiles
  using (id = (select auth.uid()) or id in (select pm.user_id from public.pair_members pm where pm.pair_id = (select public.my_pair_id())));
alter policy "update: self" on public.profiles
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

alter policy "select: member" on public.pairs using (id = (select public.my_pair_id()));
alter policy "select: member" on public.pair_members using (pair_id = (select public.my_pair_id()));
alter policy "select: member" on public.pair_settings using (pair_id = (select public.my_pair_id()));
alter policy "update: member" on public.pair_settings
  using (pair_id = (select public.my_pair_id())) with check (pair_id = (select public.my_pair_id()));

alter policy "select: own" on public.swipes using (user_id = (select auth.uid()));
alter policy "insert: own, own pair" on public.swipes
  with check (user_id = (select auth.uid()) and pair_id = (select public.my_pair_id()));
alter policy "update: own" on public.swipes
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()) and pair_id = (select public.my_pair_id()));
alter policy "delete: own" on public.swipes using (user_id = (select auth.uid()));

alter policy "select: member" on public.matches using (pair_id = (select public.my_pair_id()));
alter policy "update: member" on public.matches
  using (pair_id = (select public.my_pair_id())) with check (pair_id = (select public.my_pair_id()));
alter policy "delete: member" on public.matches using (pair_id = (select public.my_pair_id()));

alter policy "select: member" on public.match_ratings
  using (exists (select 1 from public.matches m where m.id = match_ratings.match_id and m.pair_id = (select public.my_pair_id())));
alter policy "insert: own, own pair" on public.match_ratings
  with check (user_id = (select auth.uid())
    and exists (select 1 from public.matches m where m.id = match_ratings.match_id and m.pair_id = (select public.my_pair_id())));
alter policy "update: own" on public.match_ratings
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
alter policy "delete: own" on public.match_ratings using (user_id = (select auth.uid()));
