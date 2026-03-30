-- RouteNow — Initial Schema
-- Run this in your Supabase SQL editor or apply via supabase db push

-- ─── Saved locations ───────────────────────────────────────────────────────────
create table if not exists saved_locations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  address     text not null,
  lat         double precision not null,
  lng         double precision not null,
  type        text not null check (type in ('home', 'work', 'custom')),
  created_at  timestamptz not null default now()
);

-- ─── Scheduled trips ───────────────────────────────────────────────────────────
create table if not exists scheduled_trips (
  id                    uuid primary key default gen_random_uuid(),
  origin_address        text not null,
  origin_lat            double precision not null,
  origin_lng            double precision not null,
  destination_address   text not null,
  destination_lat       double precision not null,
  destination_lng       double precision not null,
  arrive_by             timestamptz not null,
  alert_sent            boolean not null default false,
  created_at            timestamptz not null default now()
);

-- Index for cron query: upcoming trips not yet alerted
create index if not exists idx_trips_upcoming
  on scheduled_trips (arrive_by, alert_sent)
  where alert_sent = false;

-- ─── Push subscriptions ────────────────────────────────────────────────────────
create table if not exists push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  created_at  timestamptz not null default now()
);

-- ─── Seed: default saved locations ────────────────────────────────────────────
-- Update these with your actual addresses and coordinates before using the app.
insert into saved_locations (name, address, lat, lng, type) values
  ('Home',  'Your Home Address, Brooklyn, NY 11201', 40.6935, -73.9857, 'home'),
  ('Work',  'Your Work Address, Manhattan, NY 10001', 40.7484, -73.9967, 'work')
on conflict do nothing;
