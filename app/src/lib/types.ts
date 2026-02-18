export type ReportKind = 'sighting' | 'sign'

export type BearReport = {
  id: string
  kind: ReportKind
  note?: string
  lat: number
  lng: number
  createdAt: number // epoch ms
}
