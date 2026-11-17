import { getMyPair } from '@/lib/pair'
import { PosterBackdrop } from '@/components/ui/poster-backdrop'
import { SwipesView, type SwipeRow } from './swipes-view'

// shortcut: newest 1000 swipes only, no paging; add paging if someone ever swipes more than that.
const LIMIT = 1000

export default async function SwipesPage() {
  const { supabase } = await getMyPair()
  const [{ data: swipes, error }, { data: matches }] = await Promise.all([
    supabase // RLS: only your own swipes
      .from('swipes')
      .select('tmdb_id, media_type, decision, title, poster_path, year')
      .order('created_at', { ascending: false })
      .limit(LIMIT)
      .returns<SwipeRow[]>(),
    supabase.from('matches').select('tmdb_id, media_type').returns<Pick<SwipeRow, 'tmdb_id' | 'media_type'>[]>(),
  ])
  if (error) throw error

  return (
    <>
      <PosterBackdrop />
      <SwipesView initial={swipes ?? []} matched={(matches ?? []).map((m) => `${m.media_type}:${m.tmdb_id}`)} />
    </>
  )
}
