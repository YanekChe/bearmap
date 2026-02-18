-- BearMap Supabase schema (MVP)

-- Enable required extensions
create extension if not exists pgcrypto;

-- Reports table
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  kind text not null check (kind in ('sighting','sign')),
  note text,
  lat double precision not null,
  lng double precision not null,
  created_at timestamptz not null default now()
);

create index if not exists reports_created_at_idx on public.reports (created_at desc);
create index if not exists reports_lat_idx on public.reports (lat);
create index if not exists reports_lng_idx on public.reports (lng);

-- RLS
alter table public.reports enable row level security;

-- Authenticated users can read reports
create policy if not exists "reports_select_authenticated" on public.reports
for select
to authenticated
using (true);

-- Authenticated users can insert only as themselves
create policy if not exists "reports_insert_own" on public.reports
for insert
to authenticated
with check (auth.uid() = user_id);
