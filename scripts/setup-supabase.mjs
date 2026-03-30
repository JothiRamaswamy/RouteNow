/**
 * RouteNow — Supabase one-time setup script
 *
 * Applies: table creation, RLS enable, RLS policies, seed data
 *
 * Run with: node scripts/setup-supabase.mjs
 * Requires: Node 18+ (uses built-in fetch)
 */

const PROJECT_REF = "iscnyauzzloyxdotporz";
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

if (!ACCESS_TOKEN) {
  console.error(
    "\n❌ Missing SUPABASE_ACCESS_TOKEN\n" +
    "Run with: SUPABASE_ACCESS_TOKEN=sbp_xxx node scripts/setup-supabase.mjs\n"
  );
  process.exit(1);
}

const API_BASE = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`;

async function runSQL(label, sql) {
  process.stdout.write(`  ${label}... `);
  const res = await fetch(API_BASE, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql }),
  });

  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }

  if (!res.ok) {
    console.log("❌ FAILED");
    console.error("   ", data?.message ?? data);
    process.exit(1);
  }
  console.log("✅");
  return data;
}

async function main() {
  console.log("\n🚀 RouteNow — Supabase setup\n");

  // ── 1. Create tables ──────────────────────────────────────────────────────

  console.log("📦 Creating tables:");

  await runSQL("saved_locations", `
    CREATE TABLE IF NOT EXISTS saved_locations (
      id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name       TEXT NOT NULL,
      address    TEXT NOT NULL,
      lat        DOUBLE PRECISION NOT NULL,
      lng        DOUBLE PRECISION NOT NULL,
      type       TEXT NOT NULL CHECK (type IN ('home', 'work', 'custom')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await runSQL("scheduled_trips", `
    CREATE TABLE IF NOT EXISTS scheduled_trips (
      id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      origin_address      TEXT NOT NULL,
      origin_lat          DOUBLE PRECISION NOT NULL,
      origin_lng          DOUBLE PRECISION NOT NULL,
      destination_address TEXT NOT NULL,
      destination_lat     DOUBLE PRECISION NOT NULL,
      destination_lng     DOUBLE PRECISION NOT NULL,
      arrive_by           TIMESTAMPTZ NOT NULL,
      alert_sent          BOOLEAN NOT NULL DEFAULT FALSE,
      created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await runSQL("scheduled_trips index", `
    CREATE INDEX IF NOT EXISTS idx_trips_upcoming
      ON scheduled_trips (arrive_by, alert_sent)
      WHERE alert_sent = FALSE;
  `);

  await runSQL("push_subscriptions", `
    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      endpoint   TEXT NOT NULL UNIQUE,
      p256dh     TEXT NOT NULL,
      auth       TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // ── 2. Enable RLS ─────────────────────────────────────────────────────────

  console.log("\n🔒 Enabling RLS:");

  await runSQL("saved_locations", `ALTER TABLE saved_locations ENABLE ROW LEVEL SECURITY;`);
  await runSQL("scheduled_trips", `ALTER TABLE scheduled_trips ENABLE ROW LEVEL SECURITY;`);
  await runSQL("push_subscriptions", `ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;`);

  // ── 3. RLS policies ───────────────────────────────────────────────────────
  // Strategy: anon role gets full access (personal single-user tool).
  // Server-side API routes use the service_role key which bypasses RLS entirely.

  console.log("\n📋 Creating RLS policies:");

  // Drop policies first so this script is idempotent (safe to re-run)
  await runSQL("drop old policies (safe)", `
    DO $$ BEGIN
      DROP POLICY IF EXISTS "anon_all_saved_locations"   ON saved_locations;
      DROP POLICY IF EXISTS "anon_all_scheduled_trips"   ON scheduled_trips;
      DROP POLICY IF EXISTS "anon_all_push_subscriptions" ON push_subscriptions;
    END $$;
  `);

  await runSQL("saved_locations → anon full access", `
    CREATE POLICY "anon_all_saved_locations" ON saved_locations
      FOR ALL TO anon
      USING (true)
      WITH CHECK (true);
  `);

  await runSQL("scheduled_trips → anon full access", `
    CREATE POLICY "anon_all_scheduled_trips" ON scheduled_trips
      FOR ALL TO anon
      USING (true)
      WITH CHECK (true);
  `);

  await runSQL("push_subscriptions → anon full access", `
    CREATE POLICY "anon_all_push_subscriptions" ON push_subscriptions
      FOR ALL TO anon
      USING (true)
      WITH CHECK (true);
  `);

  // ── 4. Seed default locations ─────────────────────────────────────────────

  console.log("\n🌱 Seeding default locations:");

  await runSQL("Home + Work rows", `
    INSERT INTO saved_locations (name, address, lat, lng, type)
    VALUES
      ('Home', 'Update this — your home address', 40.6935, -73.9857, 'home'),
      ('Work', 'Update this — your work address', 40.7484, -73.9967, 'work')
    ON CONFLICT DO NOTHING;
  `);

  // ── 5. Verify ─────────────────────────────────────────────────────────────

  console.log("\n🔍 Verifying:");

  const tables = await runSQL("check tables exist", `
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN ('saved_locations', 'scheduled_trips', 'push_subscriptions')
    ORDER BY table_name;
  `);

  const policies = await runSQL("check RLS policies", `
    SELECT tablename, policyname FROM pg_policies
    WHERE schemaname = 'public'
    ORDER BY tablename;
  `);

  const rows = await runSQL("check seed rows", `
    SELECT name, type FROM saved_locations ORDER BY type;
  `);

  console.log("\n✅ All done! Summary:");
  console.log("   Tables:", tables.map(r => r.table_name).join(", "));
  console.log("   Policies:", policies.map(r => `${r.tablename}/${r.policyname}`).join(", "));
  console.log("   Seed rows:", rows.map(r => `${r.name} (${r.type})`).join(", "));
  console.log("\n📍 Remember to update your Home and Work addresses in the app at /locations\n");
}

main().catch((err) => {
  console.error("\n❌ Unexpected error:", err.message);
  process.exit(1);
});
