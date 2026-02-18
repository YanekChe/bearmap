import type { BearReport } from './types'

const KEY = 'bearmap.reports.v0'

export function loadReports(): BearReport[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as BearReport[]
    if (!Array.isArray(parsed)) return []
    return parsed
  } catch {
    return []
  }
}

export function saveReports(reports: BearReport[]) {
  localStorage.setItem(KEY, JSON.stringify(reports))
}
