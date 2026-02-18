import type { BearReport } from './types'
import { supabase } from './supabase'

export type FetchReportsArgs = {
  minLat: number
  maxLat: number
  minLng: number
  maxLng: number
  sinceIso: string
  limit?: number
}

export async function getSession() {
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  return data.session ?? null
}

export async function sendMagicLink(email: string) {
  if (!supabase) return

  // Ensure redirect stays under the GitHub Pages base path.
  const baseUrl = `${window.location.origin}${import.meta.env.BASE_URL}`

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: baseUrl,
    },
  })

  if (error) throw error
}

export async function signOut() {
  if (!supabase) return
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function fetchReports(args: FetchReportsArgs): Promise<BearReport[]> {
  if (!supabase) return []

  const { minLat, maxLat, minLng, maxLng, sinceIso, limit = 200 } = args

  const { data, error } = await supabase
    .from('reports')
    .select('id, kind, note, lat, lng, created_at')
    .gte('created_at', sinceIso)
    .gte('lat', minLat)
    .lte('lat', maxLat)
    .gte('lng', minLng)
    .lte('lng', maxLng)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  if (!data) return []

  return data.map((r) => ({
    id: r.id as string,
    kind: r.kind as BearReport['kind'],
    note: (r.note as string | null) ?? undefined,
    lat: r.lat as number,
    lng: r.lng as number,
    createdAt: new Date(r.created_at as string).getTime(),
  }))
}

export async function insertReport(report: Omit<BearReport, 'id' | 'createdAt'> & { createdAt?: number }) {
  if (!supabase) return null

  const createdAt = report.createdAt ?? Date.now()
  const user = (await supabase.auth.getUser()).data.user
  if (!user) throw new Error('Not signed in')

  const { data, error } = await supabase
    .from('reports')
    .insert({
      user_id: user.id,
      kind: report.kind,
      note: report.note ?? null,
      lat: report.lat,
      lng: report.lng,
      created_at: new Date(createdAt).toISOString(),
    })
    .select('id, kind, note, lat, lng, created_at')
    .single()

  if (error) throw error
  if (!data) return null

  return {
    id: data.id as string,
    kind: data.kind as BearReport['kind'],
    note: (data.note as string | null) ?? undefined,
    lat: data.lat as number,
    lng: data.lng as number,
    createdAt: new Date(data.created_at as string).getTime(),
  } satisfies BearReport
}
