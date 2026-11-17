import { getMyPair } from '@/lib/pair'
import type { PairSettings } from '@/lib/deck/discover-params'
import { PosterBackdrop } from '@/components/ui/poster-backdrop'
import { watchRegions } from '@/lib/tmdb/client'
import { SettingsForm } from './settings-form'

export default async function SettingsPage() {
  const { supabase, pair } = await getMyPair()
  const { data: settings, error } = await supabase
    .from('pair_settings')
    .select('region, provider_ids, only_our_services, content_type, filters')
    .single<PairSettings>()
  if (error || !settings || !pair) throw error ?? new Error('pair_settings missing')
  const regions = await watchRegions().catch(() => [settings.region]) // TMDB down: keep the current one usable

  return (
    <>
      <PosterBackdrop />
      <SettingsForm pairId={pair.id} initial={settings} regions={regions} />
    </>
  )
}
