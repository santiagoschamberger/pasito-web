// NOTE: server-only module. Imported exclusively by server components in this
// segment. Uses SUPABASE_SERVICE_ROLE_KEY (no NEXT_PUBLIC_ prefix), so it is
// never bundled into client JS.
import { createClient } from '@supabase/supabase-js'
import { isChallengeId } from './challenge-link.ts'

export { isChallengeId } from './challenge-link.ts'

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://trsbowwcigzayhdpfxvd.supabase.co'
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

// Service-role client, imported only by server components. We use it because the challenge
// leaderboard RPCs are granted to `authenticated` only, and these pages are
// public (no user session).
function admin() {
  if (!SERVICE_ROLE_KEY) return null
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export type BrandPrize = {
  title: string
  winnerCount: number
}

export type ChallengeWinner = {
  displayName: string | null
  rank: number | null
  drawOrder: number | null
  prizeType: 'physical' | 'pasitos' | 'none'
  pasitosAwarded: number
  prizeTitle: string | null
}

export type ChallengeSummary = {
  id: string
  title: string
  brandName: string | null
  brandLogoUrl: string | null
  isClosed: boolean
  endDate: string | null
}

export type ChallengeWithWinners = ChallengeSummary & {
  resultsStatus: 'pending' | 'published' | 'unavailable'
  winnerSelectionMode: string
  topNWinners: number
  pasitosPerWinner: number
  physicalPrizeWinnerCount: number
  physicalWinners: ChallengeWinner[]
  pasitosWinners: ChallengeWinner[]
}

// Public names were requested for this campaign only. Other challenge pages
// retain anonymous results; never opt campaigns in based on editable titles.
const PUBLIC_WINNER_NAMES = new Set(['b10109f4-823b-4195-8efe-97a5cf27831e'])

function parseBrandPrizes(raw: unknown): BrandPrize[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null
      const row = item as Record<string, unknown>
      const title =
        typeof row.title === 'string' && row.title.trim().length > 0
          ? row.title.trim()
          : null
      if (!title) return null
      const winnerCount =
        typeof row.winner_count === 'number' && Number.isInteger(row.winner_count)
          ? Math.max(1, row.winner_count)
          : 1
      return { title, winnerCount }
    })
    .filter((p): p is BrandPrize => p !== null)
}

// Maps a physical winner's position (draw order for raffles, rank otherwise) to
// the configured brand prize title. Mirrors the app's
// `_physicalPrizeTitleForWinner`.
function physicalPrizeTitle(
  prizes: BrandPrize[],
  position: number | null,
): string | null {
  if (position == null || position <= 0) return null
  let remaining = position
  for (const prize of prizes) {
    remaining -= prize.winnerCount
    if (remaining <= 0) return prize.title
  }
  return null
}

export async function fetchChallengeWithWinners(
  id: string,
): Promise<ChallengeWithWinners | null> {
  if (!isChallengeId(id)) return null
  id = id.trim().toLowerCase()
  const supabase = admin()
  if (!supabase) return null

  const { data: ch, error } = await supabase
    .from('challenges')
    .select(
      'id, title, brand_name, brand_logo_url, is_closed, end_date, winner_selection_mode, top_n_winners, pasitos_per_winner, physical_prize_winner_count, brand_prizes',
    )
    .eq('id', id)
    .eq('is_active', true)
    .maybeSingle()

  if (error || !ch) return null

  const challenge: ChallengeWithWinners = {
    id: ch.id as string,
    title: ch.title as string,
    brandName: (ch.brand_name as string | null) ?? null,
    brandLogoUrl: (ch.brand_logo_url as string | null) ?? null,
    isClosed: ch.is_closed === true,
    endDate: (ch.end_date as string | null) ?? null,
    winnerSelectionMode: (ch.winner_selection_mode as string) ?? 'ranking_top_n',
    topNWinners: (ch.top_n_winners as number | null) ?? 0,
    pasitosPerWinner: (ch.pasitos_per_winner as number | null) ?? 0,
    physicalPrizeWinnerCount: (ch.physical_prize_winner_count as number | null) ?? 0,
    resultsStatus: 'pending',
    physicalWinners: [],
    pasitosWinners: [],
  }
  // Do not publish partial results while a challenge is still being closed.
  if (!challenge.isClosed) return challenge

  const prizes = parseBrandPrizes(ch.brand_prizes)
  const isRaffle = ch.winner_selection_mode === 'raffle_top_n'

  const [participants, raffle] = await Promise.all([
    supabase
      .from('challenge_participants')
      .select('user_id, final_rank, pasitos_awarded, won, winner_prize_type')
      .eq('challenge_id', id)
      .eq('won', true),
    isRaffle
      ? supabase
          .from('challenge_raffle_entries')
          .select('user_id, draw_order')
          .eq('challenge_id', id)
          .eq('selected', true)
      : Promise.resolve({ data: [], error: null }),
  ])

  if (participants.error || raffle.error) {
    return { ...challenge, resultsStatus: 'unavailable' }
  }
  const winnerRows = participants.data ?? []
  if (winnerRows.length === 0) return challenge

  const drawOrderByUser = new Map(
    (raffle.data ?? []).map((r) => [
      (r as Record<string, unknown>).user_id as string,
      (r as Record<string, unknown>).draw_order as number,
    ]),
  )

  // A raffle result must have a recorded draw position; never substitute the
  // steps ranking or a provisional participant flag for the actual draw.
  if (isRaffle && winnerRows.some((row) => (drawOrderByUser.get(row.user_id) ?? 0) <= 0)) {
    return { ...challenge, resultsStatus: 'unavailable' }
  }

  const namesByUser = new Map<string, string>()
  if (PUBLIC_WINNER_NAMES.has(id)) {
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, display_name')
      .in('id', winnerRows.map((row) => row.user_id as string))
      .eq('hide_from_leaderboard', false)

    if (profileError) return { ...challenge, resultsStatus: 'unavailable' }
    for (const profile of profiles ?? []) {
      const name = typeof profile.display_name === 'string' ? profile.display_name.trim() : ''
      if (name) namesByUser.set(profile.id as string, name)
    }
  }

  const winners: ChallengeWinner[] = winnerRows.map((r) => {
    const userId = r.user_id as string
    const drawOrder = drawOrderByUser.get(userId) ?? null
    const prizeType = (r.winner_prize_type as ChallengeWinner['prizeType']) ?? 'none'
    const position = isRaffle ? drawOrder : (r.final_rank as number | null)
    return {
      displayName: namesByUser.get(userId) ?? null,
      rank: (r.final_rank as number | null) ?? null,
      drawOrder,
      prizeType,
      pasitosAwarded: (r.pasitos_awarded as number | null) ?? 0,
      prizeTitle:
        prizeType === 'physical' ? physicalPrizeTitle(prizes, position) : null,
    }
  })

  const sortByPosition = (a: ChallengeWinner, b: ChallengeWinner) => {
    const av = (isRaffle ? a.drawOrder : a.rank) ?? Number.MAX_SAFE_INTEGER
    const bv = (isRaffle ? b.drawOrder : b.rank) ?? Number.MAX_SAFE_INTEGER
    return av - bv
  }

  const physicalWinners = winners
    .filter((w) => w.prizeType === 'physical')
    .sort(sortByPosition)
  const pasitosWinners = winners
    .filter((w) => w.prizeType === 'pasitos')
    .sort(sortByPosition)

  return {
    ...challenge,
    resultsStatus: 'published',
    physicalWinners,
    pasitosWinners,
  }
}

export async function fetchRecentChallenges(): Promise<ChallengeSummary[]> {
  const supabase = admin()
  if (!supabase) return []

  const { data, error } = await supabase
    .from('challenges')
    .select('id, title, brand_name, brand_logo_url, is_closed, end_date')
    .eq('is_active', true)
    .order('is_closed', { ascending: true })
    .order('end_date', { ascending: false })
    .limit(12)

  if (error || !data) return []

  return data.map((c) => ({
    id: c.id as string,
    title: c.title as string,
    brandName: (c.brand_name as string | null) ?? null,
    brandLogoUrl: (c.brand_logo_url as string | null) ?? null,
    isClosed: c.is_closed === true,
    endDate: (c.end_date as string | null) ?? null,
  }))
}
